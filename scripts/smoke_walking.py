#!/usr/bin/env python3
"""
Live test: does the map follow someone walking?

A throw-away tracker lies still for a while (real GPS wobble recorded from a parked 2G
tracker, speed 0), then walks about 13 m every 10 s - also at speed 0, which is what the
family trackers report at walking pace. A throw-away parent listens to the live feed exactly
as the app does (/user/queue/locations/batch) and polls the REST last position like the
app's fallback. The script prints, for every fix, how far the shown position is behind
where the tracker really was and how long the live update took.

Runs ON the server (needs docker + the EyeOn stack). Creates its own user and tracker in
the demo organization and deletes them again, even when a check fails. Standard library only.

    python3 /opt/eyeon/scripts/smoke_walking.py
"""
import base64
import json
import math
import os
import secrets
import socket
import statistics
import struct
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from simulate_device import build_location_v3, build_login  # noqa: E402

DEMO_ORG = "00000000-0000-0000-0000-000000000001"
KID = "864290069997" + f"{secrets.randbelow(1000):03d}"
TAG = secrets.token_hex(3)
STILL = [  # a parked 2G tracker on production, 2026-10-21, all speed 0
    (23.751249, 90.390711), (23.751318, 90.390791), (23.751300, 90.390773), (23.751340, 90.390720),
    (23.751264, 90.390862), (23.751353, 90.390684), (23.751124, 90.390827), (23.751193, 90.390800),
]
WALK_FIXES = 15
STEP_LAT, STEP_LNG = 0.000085, 0.000090   # about 13 m north-east per fix
INTERVAL_S = 10
failures = []


def sh(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True).stdout.strip()


def psql(sql):
    return sh(f'docker exec eyeon-postgres psql -U eyeon -d eyeon -Atc "{sql}"')


IP = sh("docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' eyeon-backend")
BASE = f"http://{IP}:8081/api/v1"


def check(label, ok, detail=""):
    print(("  PASS  " if ok else "  FAIL  ") + label + (f"   [{detail}]" if detail else ""))
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
            raw = r.read()
    except urllib.error.HTTPError as e:
        raw = e.read()
    try:
        data = json.loads(raw.decode())
    except Exception:
        return None
    return data.get("data", data) if isinstance(data, dict) else data


def dist(a, b):
    r = 6_371_000
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


class LiveFeed(threading.Thread):
    """Minimal WebSocket + STOMP 1.2 client that records every location it receives, with the time."""

    def __init__(self, token):
        super().__init__(daemon=True)
        self.got = []          # (received_at, lat, lng, speed)
        self.stop = False
        self.s = socket.create_connection((IP, 8081), timeout=5)
        key = base64.b64encode(os.urandom(16)).decode()
        self.s.sendall((f"GET /api/v1/ws HTTP/1.1\r\nHost: {IP}:8081\r\nUpgrade: websocket\r\n"
                        f"Connection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n"
                        f"Sec-WebSocket-Protocol: v12.stomp\r\n\r\n").encode())
        head = b""
        while b"\r\n\r\n" not in head:
            head += self.s.recv(1)
        if b" 101 " not in head.split(b"\r\n")[0]:
            raise ConnectionError(head.split(b"\r\n")[0].decode())
        self.buf = b""
        self._send(f"CONNECT\naccept-version:1.2\nheart-beat:0,0\nAuthorization:Bearer {token}\n\n\0")
        self._send("SUBSCRIBE\nid:loc\ndestination:/user/queue/locations/batch\n\n\0")

    def _send(self, text):
        data, mask = text.encode(), os.urandom(4)
        n = len(data)
        head = bytearray([0x81])
        if n < 126:
            head.append(0x80 | n)
        else:
            head += bytes([0x80 | 126]) + struct.pack(">H", n)
        self.s.sendall(bytes(head) + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(data)))

    def run(self):
        self.s.settimeout(0.5)
        msg = b""
        while not self.stop:
            try:
                chunk = self.s.recv(65536)
                if not chunk:
                    return
                self.buf += chunk
            except socket.timeout:
                continue
            while len(self.buf) >= 2:
                b1, b2 = self.buf[0], self.buf[1]
                n, off = b2 & 0x7F, 2
                if n == 126:
                    if len(self.buf) < 4:
                        break
                    n, off = struct.unpack(">H", self.buf[2:4])[0], 4
                elif n == 127:
                    if len(self.buf) < 10:
                        break
                    n, off = struct.unpack(">Q", self.buf[2:10])[0], 10
                if len(self.buf) < off + n:
                    break
                payload, self.buf = self.buf[off:off + n], self.buf[off + n:]
                if b1 & 0x0F in (0, 1):
                    msg += payload
                    if b1 & 0x80:
                        self._parse(msg.decode("utf-8", "replace"))
                        msg = b""

    def _parse(self, text):
        now = time.time()
        for raw in text.split("\0"):
            raw = raw.lstrip("\n")
            if not raw.startswith("MESSAGE"):
                continue
            body = raw.partition("\n\n")[2]
            try:
                for loc in json.loads(body):
                    if loc.get("imei") == KID:
                        self.got.append((now, loc["latitude"], loc["longitude"], loc.get("speed")))
            except Exception:
                pass


def main():
    email, password = f"smoke-walk-{TAG}@eyeon.invalid", secrets.token_urlsafe(18)
    psql(f"insert into devices (org_id, imei, name) values ('{DEMO_ORG}', '{KID}', 'Smoke walker {TAG}')")
    psql(f"insert into users (org_id, email, password_hash, full_name, role) values "
         f"('{DEMO_ORG}', '{email}', crypt('{password}', gen_salt('bf', 12)), 'Smoke walker', 'ORG_ADMIN')")
    login = call(None, "POST", "/auth/login", {"email": email, "password": password})
    token = login.get("accessToken") if isinstance(login, dict) else None
    check("logged in as a throw-away parent", bool(token))
    if not token:
        return
    feed = LiveFeed(token)
    feed.start()
    time.sleep(2)

    sent = []          # (phase, sent_at, lat, lng)
    rest = []          # (polled_at, lat, lng)
    stop_poll = threading.Event()

    def poll():
        while not stop_poll.is_set():
            d = call(token, "GET", f"/devices/{KID}/locations/last")
            if isinstance(d, dict) and "latitude" in d:
                rest.append((time.time(), d["latitude"], d["longitude"]))
            stop_poll.wait(5)

    poller = threading.Thread(target=poll, daemon=True)
    poller.start()

    with socket.create_connection(("127.0.0.1", 5024), timeout=10) as sock:
        serial = 1
        sock.sendall(build_login(KID, serial))
        sock.recv(64)
        path = [("still", p) for p in STILL]
        start = STILL[-1]
        path += [("walk", (start[0] + i * STEP_LAT, start[1] + i * STEP_LNG)) for i in range(1, WALK_FIXES + 1)]
        for phase, (lat, lng) in path:
            serial += 1
            sock.sendall(build_location_v3(lat, lng, 0, 45, serial))
            sent.append((phase, time.time(), lat, lng))
            sock.settimeout(5)
            try:
                sock.recv(64)
            except socket.timeout:
                pass
            time.sleep(INTERVAL_S)
    time.sleep(5)
    stop_poll.set()
    feed.stop = True

    # ------------------------------------------------------------------ report
    def shown_at(t, rows):
        last = None
        for r in rows:
            if r[0] <= t:
                last = r
        return last

    print(f"\n  fix  phase  true position           live: shown, behind, delay     REST poll: behind")
    walk_lag_live, walk_lag_rest, delays = [], [], []
    for i, (phase, t, lat, lng) in enumerate(sent):
        nxt = sent[i + 1][1] if i + 1 < len(sent) else t + INTERVAL_S
        # The first live message for this fix: the first one received after it was sent.
        arrivals = [g for g in feed.got if t <= g[0] < nxt + 4]
        live = arrivals[0] if arrivals else None
        if live:
            delays.append(live[0] - t)
        # What the map shows just before the next fix is sent.
        l_end = shown_at(nxt - 0.1, feed.got)
        r_end = shown_at(nxt - 0.1, rest)
        behind_live = dist((lat, lng), l_end[1:3]) if l_end else float("nan")
        behind_rest = dist((lat, lng), r_end[1:3]) if r_end else float("nan")
        if phase == "walk":
            walk_lag_live.append(behind_live)
            walk_lag_rest.append(behind_rest)
        print(f"  {i + 1:>3}  {phase:<5}  {lat:.6f},{lng:.6f}   "
              f"{'%.1f s' % (live[0] - t) if live else 'no msg':>8}  behind {behind_live:6.1f} m     "
              f"behind {behind_rest:6.1f} m")

    moved = len({(round(g[1], 6), round(g[2], 6)) for g in feed.got})
    still_shown = {(round(g[1], 6), round(g[2], 6)) for g in feed.got if g[0] < sent[len(STILL) - 1][1] + INTERVAL_S}
    print()
    print(f"  live messages: {len(feed.got)}, distinct positions shown: {moved}")
    if delays:
        print(f"  live delay after each fix: median {statistics.median(delays):.1f} s, max {max(delays):.1f} s")
    print(f"  walking, live map behind the walker: median {statistics.median(walk_lag_live):.1f} m, "
          f"max {max(walk_lag_live):.1f} m")
    print(f"  walking, REST map behind the walker: median {statistics.median(walk_lag_rest):.1f} m, "
          f"max {max(walk_lag_rest):.1f} m")
    check("live feed delivered every fix", len(delays) == len(sent), f"{len(delays)} of {len(sent)}")
    check("live update within 5 s of the fix", bool(delays) and max(delays) <= 5, f"max {max(delays or [0]):.1f} s")
    check("still tracker shown on at most 2 spots", len(still_shown) <= 2, f"{len(still_shown)} spots")
    check("walking: shown position at most 20 m behind (median)", statistics.median(walk_lag_live) <= 20,
          f"median {statistics.median(walk_lag_live):.1f} m")
    check("walking: never more than 45 m behind after the first 4 fixes", max(walk_lag_live[4:]) <= 45,
          f"max {max(walk_lag_live[4:]):.1f} m")


try:
    main()
finally:
    users = f"select id from users where email = 'smoke-walk-{TAG}@eyeon.invalid'"
    for stmt in (f"delete from locations where device_imei = '{KID}'",
                 f"delete from alarms where device_imei = '{KID}'",
                 f"delete from refresh_tokens where user_id in ({users})",
                 f"delete from audit_log where user_id in ({users})",
                 f"delete from users where email = 'smoke-walk-{TAG}@eyeon.invalid'",
                 f"delete from devices where imei = '{KID}'"):
        psql(stmt)
    left = psql(f"select (select count(*) from devices where imei = '{KID}') + "
                f"(select count(*) from locations where device_imei = '{KID}')")
    print(f"\n  cleanup: {'done' if left == '0' else 'LEFT ' + left + ' rows'}")
    print("\nFAILED: " + ", ".join(failures) if failures else "\nALL PASSED")
    sys.exit(1 if failures else 0)
