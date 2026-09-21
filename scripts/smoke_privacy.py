#!/usr/bin/env python3
"""
Live privacy test: in one school, parent A sees only child 1 and parent B only child 2 -
over REST, over the live WebSocket feed, and for their own trusted places and geofences.

Runs ON the server (needs docker + the EyeOn stack). Creates throw-away users and trackers in
the demo organization and deletes them again, even when a check fails. Standard library only.

    python3 /opt/eyeon/scripts/smoke_privacy.py
"""
import base64
import json
import os
import secrets
import socket
import struct
import subprocess
import sys
import time
import urllib.error
import urllib.request

DEMO_ORG = "00000000-0000-0000-0000-000000000001"
KID1, KID2 = "864290069990001", "864290069990002"
LAT, LNG = 23.8103, 90.4125
TAG = secrets.token_hex(3)
failures = []


def sh(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True).stdout.strip()


def psql(sql):
    return sh(f'docker exec eyeon-postgres psql -U eyeon -d eyeon -Atc "{sql}"')


IP = sh("docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' eyeon-backend")
BASE = f"http://{IP}:8081/api/v1"


def check(label, ok, detail=""):
    print(("  PASS  " if ok else "  FAIL  ") + label + (f"   [{detail}]" if detail and not ok else ""))
    if not ok:
        failures.append(label)


def call(token, method, path, body=None):
    req = urllib.request.Request(BASE + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            code, raw = r.status, r.read()
    except urllib.error.HTTPError as e:
        code, raw = e.code, e.read()
    try:
        data = json.loads(raw.decode()) if raw[:1] in (b"{", b"[") else raw
    except Exception:
        data = raw
    if isinstance(data, dict) and "data" in data:
        data = data["data"]
    return code, data


def make_user(role, label):
    email, password = f"smoke-{label}-{TAG}@eyeon.invalid", secrets.token_urlsafe(18)
    psql(f"insert into users (org_id, email, password_hash, full_name, role) values "
         f"('{DEMO_ORG}', '{email}', crypt('{password}', gen_salt('bf', 12)), 'Smoke {label}', '{role}')")
    uid = psql(f"select id from users where email = '{email}'")
    code, d = call(None, "POST", "/auth/login", {"email": email, "password": password})
    return uid, (d.get("accessToken") if isinstance(d, dict) else None)


def sim(imei, lat, lng, count=3, sos=False):
    cmd = ["python3", "/opt/eyeon/scripts/simulate_device.py", "--host", "127.0.0.1", "--port", "5024",
           "--imei", imei, "--lat", str(lat), "--lng", str(lng), "--count", str(count), "--interval", "1"]
    if sos:
        cmd.append("--sos")
    subprocess.run(cmd, capture_output=True, text=True, timeout=60)


# ---------------------------------------------------------------- minimal WebSocket + STOMP client
class Stomp:
    """Just enough RFC 6455 + STOMP 1.2 to CONNECT, SUBSCRIBE and collect MESSAGE / ERROR frames."""

    def __init__(self, token):
        self.s = socket.create_connection((IP, 8081), timeout=5)
        key = base64.b64encode(os.urandom(16)).decode()
        self.s.sendall((f"GET /api/v1/ws HTTP/1.1\r\nHost: {IP}:8081\r\nUpgrade: websocket\r\n"
                        f"Connection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n"
                        f"Sec-WebSocket-Protocol: v12.stomp\r\n\r\n").encode())
        head = b""
        while b"\r\n\r\n" not in head:
            chunk = self.s.recv(1)
            if not chunk:
                raise ConnectionError("closed during handshake")
            head += chunk
        if b" 101 " not in head.split(b"\r\n")[0]:
            raise ConnectionError(head.split(b"\r\n")[0].decode())
        self.buf = b""
        self.frames = []
        self._send(f"CONNECT\naccept-version:1.2\nheart-beat:0,0\nAuthorization:Bearer {token}\n\n\0")
        self._read(3)

    def _send(self, text):
        data, mask = text.encode(), os.urandom(4)
        n = len(data)
        head = bytearray([0x81])
        if n < 126:
            head.append(0x80 | n)
        elif n < 65536:
            head += bytes([0x80 | 126]) + struct.pack(">H", n)
        else:
            head += bytes([0x80 | 127]) + struct.pack(">Q", n)
        self.s.sendall(bytes(head) + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(data)))

    def subscribe(self, dest, sid):
        self._send(f"SUBSCRIBE\nid:{sid}\ndestination:{dest}\n\n\0")

    def _read(self, seconds):
        end, msg = time.time() + seconds, b""
        self.s.settimeout(0.5)
        while time.time() < end:
            try:
                chunk = self.s.recv(65536)
                if not chunk:
                    self.frames.append(("CLOSED", {}, ""))
                    return
                self.buf += chunk
            except socket.timeout:
                continue
            while len(self.buf) >= 2:
                b1, b2 = self.buf[0], self.buf[1]
                n, off = b2 & 0x7F, 2
                if n == 126:
                    if len(self.buf) < 4: break
                    n, off = struct.unpack(">H", self.buf[2:4])[0], 4
                elif n == 127:
                    if len(self.buf) < 10: break
                    n, off = struct.unpack(">Q", self.buf[2:10])[0], 10
                if len(self.buf) < off + n:
                    break
                payload, self.buf = self.buf[off:off + n], self.buf[off + n:]
                opcode = b1 & 0x0F
                if opcode == 8:
                    self.frames.append(("CLOSED", {}, ""))
                    return
                if opcode in (1, 0):
                    msg += payload
                    if b1 & 0x80:
                        self._parse(msg.decode("utf-8", "replace"))
                        msg = b""

    def _parse(self, text):
        for raw in text.split("\0"):
            raw = raw.lstrip("\n")
            if not raw:
                continue
            head, _, body = raw.partition("\n\n")
            lines = head.split("\n")
            headers = dict(l.split(":", 1) for l in lines[1:] if ":" in l)
            self.frames.append((lines[0], headers, body))

    def collect(self, seconds):
        self._read(seconds)
        return self.frames

    def close(self):
        try:
            self.s.close()
        except Exception:
            pass


def messages(frames, dest):
    out = []
    for cmd, h, body in frames:
        if cmd == "MESSAGE" and h.get("destination") == dest:
            try:
                out.append(json.loads(body))
            except Exception:
                pass
    return out


# ---------------------------------------------------------------- the test
gids = []
try:
    admin_id, admin = make_user("ORG_ADMIN", "admin")
    pa_id, pa = make_user("ORG_USER", "parentA")
    pb_id, pb = make_user("ORG_USER", "parentB")
    check("three temporary accounts can log in", bool(admin and pa and pb))

    sim(KID1, LAT, LNG)                 # first contact auto-registers both trackers
    sim(KID2, LAT + 0.02, LNG)
    psql(f"update devices set name = 'Smoke Rafi {TAG}' where imei = '{KID1}'")
    psql(f"update devices set name = 'Smoke Mahim {TAG}' where imei = '{KID2}'")
    # Assign through the admin API (the real path: it also refreshes the live audience at once).
    for uid, imei in ((pa_id, KID1), (pb_id, KID2)):
        code, _ = call(admin, "POST", f"/orgs/me/users/{uid}/devices", {"deviceImeis": [imei]})
        check(f"admin assigns {imei[-4:]} to its parent", code in (200, 201), str(code))

    # --- REST: parent A sees child 1 only
    _, devs = call(pa, "GET", "/devices")
    seen = {d["imei"] for d in devs} if isinstance(devs, list) else set()
    check("parent A's list has Rafi and not Mahim", KID1 in seen and KID2 not in seen, str(seen))
    _, last = call(pa, "GET", "/devices/locations/last")
    seen = {l["imei"] for l in last} if isinstance(last, list) else set()
    check("parent A's map load has only Rafi", seen == {KID1}, str(seen))

    forbidden = {
        "location history": ("GET", f"/devices/{KID2}/locations"),
        "last location": ("GET", f"/devices/{KID2}/locations/last"),
        "day activity": ("GET", f"/devices/{KID2}/activity"),
        "daily activity": ("GET", f"/devices/{KID2}/activity/daily"),
        "tracker online": ("GET", f"/devices/{KID2}/commands/online"),
        "alarms for device": ("GET", f"/alarms/device/{KID2}"),
        "share-link list": ("GET", f"/share-links/device/{KID2}"),
        "monthly report": ("GET", f"/reports/monthly-summary?device={KID2}&month=2026-09"),
        "location export": ("GET", f"/exports/locations.xlsx?device={KID2}&from=2026-09-20&to=2026-09-21"),
    }
    for label, (m, path) in forbidden.items():
        code, _ = call(pa, m, path)
        check(f"parent A cannot read Mahim's {label} (404)", code == 404, str(code))
    code, _ = call(pa, "POST", "/share-links", {"deviceImei": KID2, "expiresInHours": 1})
    check("parent A cannot create a share link for Mahim (404)", code == 404, str(code))
    code, _ = call(pa, "GET", "/reports/alarms.csv?from=2026-09-01&to=2026-09-21")
    check("organization-wide report is admin-only (403)", code == 403, str(code))
    code, _ = call(pa, "GET", f"/devices/{KID1}/activity")
    check("parent A can read Rafi's day activity", code == 200, str(code))
    _, kpis = call(pa, "GET", "/dashboard/kpis")
    check("parent A's dashboard counts only Rafi", isinstance(kpis, dict) and kpis.get("devicesTotal") == 1,
          str(kpis)[:160])

    # --- geofences / trusted places are per user
    code, g = call(pa, "POST", "/geofences", {"name": f"Smoke Home {TAG}", "type": "CIRCLE", "kind": "TRUSTED_PLACE",
                                            "placeType": "HOME", "center": {"lat": LAT, "lng": LNG}, "radiusM": 150,
                                            "imeis": [KID1]})
    gid = g.get("id") if isinstance(g, dict) else None
    if gid:
        gids.append(gid)
    check("parent A creates a trusted place for Rafi", code == 201 and gid, f"{code} {str(g)[:120]}")
    code, _ = call(pa, "POST", "/geofences", {"name": f"Smoke Spy {TAG}", "type": "CIRCLE", "kind": "TRUSTED_PLACE",
                                            "center": {"lat": LAT, "lng": LNG}, "radiusM": 150, "imeis": [KID2]})
    check("parent A cannot attach a place to Mahim (404)", code == 404, str(code))
    for who, tok in (("parent B", pb), ("the school admin", admin)):
        _, lst = call(tok, "GET", "/geofences")
        check(f"{who} does not see parent A's place", isinstance(lst, list) and all(x["id"] != gid for x in lst))
    for m, path, body in (("GET", f"/geofences/{gid}", None), ("PATCH", f"/geofences/{gid}", {"name": "hijack"}),
                          ("DELETE", f"/geofences/{gid}", None)):
        code, _ = call(pb, m, path, body)
        check(f"parent B cannot {m} parent A's place (404)", code == 404, str(code))
    call(pa, "PATCH", f"/geofences/{gid}", {"minDwellS": 0})
    # A first reading only records where Rafi is (no alert); put him inside Home first.
    sim(KID1, LAT, LNG, count=2)
    time.sleep(2)

    # --- live WebSocket feed
    try:
        spy = Stomp(pb)
        spy.subscribe(f"/topic/org/{DEMO_ORG}/locations/batch", "s0")
        frames = spy.collect(3)
        check("organization-wide live topic is refused", any(c in ("ERROR", "CLOSED") for c, _, _ in frames),
              str([c for c, _, _ in frames]))
        spy.close()

        wa, wb, wadm = Stomp(pa), Stomp(pb), Stomp(admin)
        for w in (wa, wb, wadm):
            w.subscribe("/user/queue/locations/batch", "loc")
            w.subscribe("/user/queue/alarms", "alm")
        time.sleep(1)
        sim(KID1, LAT + 0.01, LNG)      # Rafi leaves Home (dwell 0 -> immediate PLACE_LEFT)
        sim(KID2, LAT + 0.02, LNG, sos=True)
        fa, fb, fadm = wa.collect(14), wb.collect(1), wadm.collect(1)

        def imeis(frames):
            return {loc.get("imei") for batch in messages(frames, "/user/queue/locations/batch") for loc in batch}

        def alarm_types(frames):
            return {(a.get("imei"), a.get("type")) for a in messages(frames, "/user/queue/alarms")}

        check("live: parent A receives Rafi's positions only", imeis(fa) == {KID1}, str(imeis(fa)))
        check("live: parent B receives Mahim's positions only", imeis(fb) == {KID2}, str(imeis(fb)))
        check("live: the admin receives both", {KID1, KID2} <= imeis(fadm), str(imeis(fadm)))
        check("live: Mahim's SOS reaches parent B and the admin, not parent A",
              (KID2, "SOS") in alarm_types(fb) and (KID2, "SOS") in alarm_types(fadm)
              and (KID2, "SOS") not in alarm_types(fa), f"A={alarm_types(fa)} B={alarm_types(fb)}")
        check("live: 'Rafi left Home' reaches parent A only",
              (KID1, "PLACE_LEFT") in alarm_types(fa) and (KID1, "PLACE_LEFT") not in alarm_types(fadm),
              f"A={alarm_types(fa)} admin={alarm_types(fadm)}")
        for w in (wa, wb, wadm):
            w.close()
    except Exception as e:
        check("live WebSocket checks ran", False, repr(e))

    # --- alarm lists follow the same rules
    _, la = call(pa, "GET", "/alarms?limit=200")
    _, ladm = call(admin, "GET", "/alarms?limit=200")
    ta = {(a["deviceImei"], a["type"]) for a in la} if isinstance(la, list) else set()
    tadm = {(a["deviceImei"], a["type"]) for a in ladm} if isinstance(ladm, list) else set()
    check("alarm list: parent A has 'left Home' and no Mahim alarms",
          (KID1, "PLACE_LEFT") in ta and not any(i == KID2 for i, _ in ta), str(ta))
    check("alarm list: the admin has Mahim's SOS but not parent A's private place alert",
          (KID2, "SOS") in tadm and (KID1, "PLACE_LEFT") not in tadm, str(tadm))
finally:
    print("  ----  cleanup")
    for imei in (KID1, KID2):
        sh(f"docker exec eyeon-redis redis-cli del device:last:{imei} sms:alarm:{imei}:SOS")
    tables = psql("select table_name || ':' || column_name from information_schema.columns "
                  "where table_schema='public' and column_name in ('device_imei','imei') and table_name <> 'devices' order by 1").split()
    stmts = [f"delete from {t.split(':')[0]} where {t.split(':')[1]} in ('{KID1}','{KID2}')" for t in tables]
    smoke_users = f"select id from users where email like 'smoke-%-{TAG}@eyeon.invalid'"
    stmts += [f"delete from refresh_tokens where user_id in ({smoke_users})",
              f"delete from audit_log where user_id in ({smoke_users})",
              f"delete from geofences where owner_user_id in ({smoke_users})",
              f"delete from users where email like 'smoke-%-{TAG}@eyeon.invalid'",
              f"delete from devices where imei in ('{KID1}','{KID2}')"]
    for sql in stmts:
        r = psql(sql)
        if r and r != "DELETE 0":
            print("        " + sql.split(" where")[0] + " -> " + r)
    left = psql(f"select (select count(*) from users where email like 'smoke-%-{TAG}@eyeon.invalid')"
                f" + (select count(*) from devices where imei in ('{KID1}','{KID2}'))"
                f" + (select count(*) from locations where device_imei in ('{KID1}','{KID2}'))")
    check("test data removed", left == "0", f"leftover rows={left}")

print("\nRESULT:", "ALL PASSED" if not failures else f"{len(failures)} FAILED: {failures}")
sys.exit(1 if failures else 0)
