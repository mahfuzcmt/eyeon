#!/usr/bin/env python3
"""Post-deploy smoke test for trusted places. Runs ON the server; cleans up after itself."""
import json
import secrets
import subprocess
import sys
import time
import urllib.error
import urllib.request

IMEI = "864290069999999"
LAT, LNG = 23.8103, 90.4125


def sh(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True).stdout.strip()


ip = sh("docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' eyeon-backend")
BASE = f"http://{ip}:8081/api/v1"
# The test never uses a real person's credentials. It creates a throw-away ORG_ADMIN with a
# random password (bcrypt via pgcrypto, the same $2a$12 format the app writes) in the demo
# organization, and deletes it again in the cleanup block even if the run fails.
DEMO_ORG = "00000000-0000-0000-0000-000000000001"
SMOKE_EMAIL = f"smoke-{secrets.token_hex(4)}@eyeon.invalid"
SMOKE_PASSWORD = secrets.token_urlsafe(24)
TOKEN = None
failures = []
gid = None
bid = None


def call(method, path, body=None, expect=(200, 201, 204)):
    req = urllib.request.Request(BASE + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None)
    req.add_header("Content-Type", "application/json")
    if TOKEN:
        req.add_header("Authorization", "Bearer " + TOKEN)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            code, raw = r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        code, raw = e.code, e.read().decode()
    data = json.loads(raw) if raw.strip().startswith(("{", "[")) else raw
    return code, data


def check(label, ok, detail=""):
    print(("  PASS  " if ok else "  FAIL  ") + label + (f"   [{detail}]" if detail and not ok else ""))
    if not ok:
        failures.append(label)


def sim(lat, lng, count=3, sos=False):
    cmd = ["python3", "/opt/eyeon/scripts/simulate_device.py", "--host", "127.0.0.1", "--port", "5024",
           "--imei", IMEI, "--lat", str(lat), "--lng", str(lng), "--count", str(count), "--interval", "1"]
    if sos:
        cmd.append("--sos")
    out = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    time.sleep(3)  # ingestion side effects run off the Netty thread
    return out.returncode


def psql(sql):
    return sh(f'docker exec eyeon-postgres psql -U eyeon -d eyeon -Atc "{sql}"')


def unwrap(d):
    return d["data"] if isinstance(d, dict) and "data" in d else d


try:
    made = psql(f"insert into users (org_id, email, password_hash, full_name, role, see_all_devices) values "
                f"('{DEMO_ORG}', '{SMOKE_EMAIL}', crypt('{SMOKE_PASSWORD}', gen_salt('bf', 12)), 'Smoke test', 'ORG_ADMIN', true)")
    check("temporary admin created", made == "INSERT 0 1", made)
    code, d = call("POST", "/auth/login", {"email": SMOKE_EMAIL, "password": SMOKE_PASSWORD})
    d = unwrap(d)
    TOKEN = d.get("accessToken") if isinstance(d, dict) else None
    check("login as temporary admin", code == 200 and bool(TOKEN), f"{code} {str(d)[:120]}")
    if not TOKEN:
        sys.exit(1)

    # Devices are not created over REST: a tracker auto-registers on first login.
    code, d = call("POST", "/devices", {"imei": IMEI})
    check("unsupported method is a 405, not a 500", code == 405, f"{code} {str(d)[:160]}")
    sim(LAT + 0.05, LNG)  # first contact, far from the place: auto-registers the device
    check("tracker auto-registered", psql(f"select count(*) from devices where imei='{IMEI}'") == "1")

    # --- editing a person (the edit form once failed with "vehicleType must be one of [CAR ...]")
    code, d = call("PATCH", f"/devices/{IMEI}", {"name": "Smoke Jannatun", "vehicleType": "GIRL", "vehiclePlate": "Class 5"})
    dv = unwrap(d)
    check("edit person: name + type GIRL + class", code == 200 and isinstance(dv, dict) and dv.get("vehicleType") == "GIRL"
          and dv.get("name") == "Smoke Jannatun" and dv.get("vehiclePlate") == "Class 5", f"{code} {str(d)[:200]}")
    code, d = call("PATCH", f"/devices/{IMEI}", {"vehicleType": "boy"})
    check("person type is case-insensitive", code == 200 and unwrap(d).get("vehicleType") == "BOY", f"{code} {str(d)[:160]}")
    code, d = call("PATCH", f"/devices/{IMEI}", {"vehicleType": "CAR"})
    check("vehicle types are rejected with a 400", code == 400, f"{code} {str(d)[:160]}")

    code, d = call("POST", "/geofences", {"name": "Smoke Home", "type": "CIRCLE", "notifyOn": "BOTH", "kind": "TRUSTED_PLACE",
                                         "placeType": "HOME", "center": {"lat": LAT, "lng": LNG}, "radiusM": 150, "imeis": [IMEI]})
    g = unwrap(d)
    gid = g.get("id") if isinstance(g, dict) else None
    check("create trusted place (V19 insert)", code == 201 and g.get("kind") == "TRUSTED_PLACE" and g.get("placeType") == "HOME"
          and g.get("minDwellS") == 60 and g.get("exitBufferM") == 30, f"{code} {str(d)[:200]}")

    code, d = call("POST", "/geofences", {"name": "Smoke tiny", "type": "CIRCLE", "kind": "TRUSTED_PLACE",
                                         "center": {"lat": LAT, "lng": LNG}, "radiusM": 50})
    msg = (d.get("error") or {}).get("message", "") if isinstance(d, dict) else ""
    check("trusted place under 80 m is a 400 with the reason", code == 400 and "80" in msg, f"{code} {str(d)[:160]}")

    code, d = call("PATCH", f"/geofences/{gid}", {"name": "Smoke Home 2", "minDwellS": 0})
    g = unwrap(d)
    check("PATCH name + minDwellS", code == 200 and g.get("name") == "Smoke Home 2" and g.get("minDwellS") == 0, f"{code} {str(d)[:200]}")

    code, d = call("GET", "/geofences?kind=TRUSTED_PLACE")
    check("list ?kind=TRUSTED_PLACE includes it", code == 200 and any(x["id"] == gid for x in unwrap(d)), f"{code} {str(d)[:160]}")
    code, d = call("GET", "/geofences?kind=BOUNDARY")
    check("list ?kind=BOUNDARY excludes it", code == 200 and all(x["id"] != gid for x in unwrap(d)), f"{code} {str(d)[:160]}")
    code, d = call("GET", "/geofences")
    check("list without kind (null param path)", code == 200 and any(x["id"] == gid for x in unwrap(d)), f"{code} {str(d)[:160]}")

    # --- evaluation SQL: seed inside, leave, come back (minDwellS=0 commits at once)
    check("simulator: packet inside", sim(LAT, LNG) == 0)
    st = psql(f"select is_inside from geofence_states where geofence_id='{gid}' and device_imei='{IMEI}'")
    n0 = psql(f"select count(*) from alarms where device_imei='{IMEI}' and type like 'PLACE_%'")
    check("first sample seeds state = inside, no alarm", st == "t" and n0 == "0", f"state={st!r} alarms={n0}")
    sim(LAT + 0.01, LNG)
    sim(LAT, LNG)
    types = psql(f"select string_agg(type || ':' || severity, ',' order by ts, created_at) from alarms where device_imei='{IMEI}' and type like 'PLACE_%'")
    check("left then arrived raised as INFO", types == "PLACE_LEFT:INFO,PLACE_ARRIVED:INFO", f"alarms={types!r}")
    meta = psql(f"select metadata->>'geofenceName' || '/' || (metadata->>'placeType') from alarms where device_imei='{IMEI}' and type='PLACE_LEFT' limit 1")
    check("alarm metadata carries place name + type", meta == "Smoke Home 2/HOME", f"meta={meta!r}")

    # --- drift guards: 60 s dwell, one stray point outside must NOT fire
    call("PATCH", f"/geofences/{gid}", {"minDwellS": 60})
    sim(LAT + 0.01, LNG)
    pend = psql(f"select is_inside, pending_inside from geofence_states where geofence_id='{gid}' and device_imei='{IMEI}'")
    check("stray point outside becomes a candidate only", pend == "t|f", f"state={pend!r}")
    sim(LAT, LNG)
    pend = psql(f"select is_inside, coalesce(pending_inside::text,'null') from geofence_states where geofence_id='{gid}' and device_imei='{IMEI}'")
    n = psql(f"select count(*) from alarms where device_imei='{IMEI}' and type like 'PLACE_%'")
    check("next point inside cancels it, no extra alarm", pend == "t|null" and n == "2", f"state={pend!r} alarms={n}")

    # --- exit buffer: ~156-167 m from centre = outside the 150 m edge but inside the 30 m buffer
    sim(LAT + 0.00140, LNG, count=2)
    pend = psql(f"select is_inside, coalesce(pending_inside::text,'null') from geofence_states where geofence_id='{gid}' and device_imei='{IMEI}'")
    check("15 m past the edge is ignored (ST_DWithin buffer)", pend == "t|null", f"state={pend!r}")

    # --- people, not vehicles: activity comes from location points and no trip is ever opened
    code, d = call("GET", f"/devices/{IMEI}/activity")
    act = unwrap(d)
    check("activity summary from location points", code == 200 and isinstance(act, dict) and act.get("points", 0) > 0
          and act.get("distanceM", -1) >= 0 and act.get("maxSpeed", 0) > 0, f"{code} {str(d)[:200]}")
    code, d = call("GET", f"/devices/{IMEI}/activity/daily")
    days = unwrap(d)
    check("daily activity has today (Asia/Dhaka)", code == 200 and isinstance(days, list) and len(days) >= 1
          and len(days[0].get("date", "")) == 10, f"{code} {str(d)[:200]}")
    ntrips = psql(f"select count(*) from trips where device_imei='{IMEI}'")
    check("no trips are created (eyeon.trips.enabled=false)", ntrips == "0", f"trips={ntrips}")

    # --- SOS must reach the parent by SMS (it used to be sent to a null recipient)
    env = dict(l.split("=", 1) for l in open("/opt/eyeon/.env").read().splitlines() if "=" in l and not l.startswith("#"))
    if env.get("SSL_SMS_API_TOKEN", "").strip():
        print("  SKIP  SOS SMS checks: a real SMS provider is configured and this test must never text a made-up number")
    else:
        parent_phone = "01500000123"
        psql(f"insert into users (org_id, email, phone, password_hash, full_name, role) values "
             f"('{DEMO_ORG}', 'smoke-parent-{secrets.token_hex(3)}@eyeon.invalid', '{parent_phone}', 'x', 'Smoke parent', 'ORG_USER')")
        psql(f"insert into user_devices (user_id, device_imei) select id, '{IMEI}' from users where email like 'smoke-parent-%@eyeon.invalid'")
        sh(f"docker exec eyeon-redis redis-cli del sms:alarm:{IMEI}:SOS")
        t0 = time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime())
        sim(LAT, LNG, count=2, sos=True)
        time.sleep(3)
        sev = psql(f"select severity from alarms where device_imei='{IMEI}' and type='SOS' order by ts desc limit 1")
        check("SOS packet raises a CRITICAL alarm", sev == "CRITICAL", f"severity={sev!r}")
        logs = sh(f"docker logs --since {t0}Z eyeon-backend 2>&1")
        stub = [l for l in logs.splitlines() if "[SMS-STUB]" in l and "to=8801500000123" in l]
        check("SOS SMS composed for the assigned parent's number", len(stub) == 1, f"stub lines={len(stub)}")
        body = stub[0] if stub else ""
        child = psql(f"select name from devices where imei='{IMEI}'")
        check("SMS says SOS, names the child and carries a map link",
              "EyeOn SOS!" in body and bool(child) and child in body
              and "https://maps.google.com/?q=23.81" in body, body[-220:])
        handed = [l for l in logs.splitlines() if "SMS handed to provider" in l]
        check("dispatch is logged, and stub mode is called out",
              any("for 1/1" in l and "STUB MODE" in l for l in handed), (handed[-1][-180:] if handed else "no dispatch line"))

        sim(LAT, LNG, count=2, sos=True)   # child keeps pressing
        time.sleep(3)
        logs2 = sh(f"docker logs --since {t0}Z eyeon-backend 2>&1")
        n_sms = len([l for l in logs2.splitlines() if "[SMS-STUB]" in l and "to=8801500000123" in l])
        n_sos = psql(f"select count(*) from alarms where device_imei='{IMEI}' and type='SOS'")
        check("second SOS is recorded but not texted again (cooldown)", n_sms == 1 and n_sos == "2" and "suppressed" in logs2,
              f"sms={n_sms} sos_alarms={n_sos}")

    # --- boundaries: crossing the border raises WARNING alarms (the severity that is pushed to phones)
    BLAT = LAT + 0.03   # 3 km from the place above, so the two zones never interact
    code, d = call("POST", "/geofences", {"name": "Smoke border", "type": "CIRCLE", "notifyOn": "BOTH", "kind": "BOUNDARY",
                                         "center": {"lat": BLAT, "lng": LNG}, "radiusM": 200, "imeis": [IMEI]})
    b = unwrap(d)
    bid = b.get("id") if isinstance(b, dict) else None
    check("create boundary", code == 201 and b.get("kind") == "BOUNDARY", f"{code} {str(d)[:200]}")
    call("PATCH", f"/geofences/{bid}", {"minDwellS": 0})
    sim(BLAT, LNG)
    st = psql(f"select is_inside from geofence_states where geofence_id='{bid}' and device_imei='{IMEI}'")
    n0 = psql(f"select count(*) from alarms where device_imei='{IMEI}' and type like 'GEOFENCE_%'")
    check("boundary: first sample seeds state = inside, no alarm", st == "t" and n0 == "0", f"state={st!r} alarms={n0}")
    sim(BLAT + 0.01, LNG)
    sim(BLAT, LNG)
    types = psql(f"select string_agg(type || ':' || severity, ',' order by ts, created_at) from alarms where device_imei='{IMEI}' and type like 'GEOFENCE_%'")
    check("boundary: leaving is a WARNING, coming back is INFO",
          types == "GEOFENCE_EXIT:WARNING,GEOFENCE_ENTER:INFO", f"alarms={types!r}")
    meta = psql(f"select metadata->>'geofenceName' || '/' || (metadata->>'geofenceKind') from alarms where device_imei='{IMEI}' and type='GEOFENCE_EXIT' limit 1")
    check("boundary alarm metadata carries its name + kind", meta == "Smoke border/BOUNDARY", f"meta={meta!r}")
    call("PATCH", f"/geofences/{bid}", {"notifyOn": "EXIT"})
    sim(BLAT + 0.01, LNG)
    sim(BLAT, LNG)
    types = psql(f"select string_agg(type, ',' order by ts, created_at) from alarms where device_imei='{IMEI}' and type like 'GEOFENCE_%'")
    check("boundary: notifyOn=EXIT alerts on leaving only",
          types == "GEOFENCE_EXIT,GEOFENCE_ENTER,GEOFENCE_EXIT", f"alarms={types!r}")

    code, d = call("PATCH", f"/geofences/{gid}", {"radiusM": 300})
    left = psql(f"select count(*) from geofence_states where geofence_id='{gid}'")
    check("reshaping resets state", code == 200 and left == "0", f"{code} rows={left}")

    errs = sh("docker logs --since 10m eyeon-backend 2>&1 | grep -c 'Geofence evaluation failed'")
    check("no 'Geofence evaluation failed' in backend log", errs == "0", f"count={errs}")
finally:
    print("  ----  cleanup")
    tables = psql("select table_name || ':' || column_name from information_schema.columns "
                  "where table_schema='public' and column_name in ('device_imei','imei') and table_name <> 'devices' order by 1").split()
    stmts = [f"delete from {t.split(':')[0]} where {t.split(':')[1]}='{IMEI}'" for t in tables]
    sh(f"docker exec eyeon-redis redis-cli del sms:alarm:{IMEI}:SOS")
    stmts += ["delete from refresh_tokens where user_id in (select id from users where email like 'smoke-%@eyeon.invalid')",
              "delete from audit_log where user_id in (select id from users where email like 'smoke-%@eyeon.invalid')",
              "delete from users where email like 'smoke-%@eyeon.invalid'",
              "delete from geofences where name like 'Smoke %'", f"delete from devices where imei='{IMEI}'",
              f"delete from audit_log where resource_id in ('{IMEI}', '{gid}', '{bid}')"]
    for sql in stmts:
        r = psql(sql)
        if r and r != "DELETE 0":
            print("        " + sql.split(" where")[0] + " -> " + r)
    sh(f"docker exec eyeon-redis redis-cli del device:last:{IMEI}")
    rest = psql(f"select (select count(*) from devices where imei='{IMEI}') + (select count(*) from geofences where name like 'Smoke %') + (select count(*) from alarms where device_imei='{IMEI}') + (select count(*) from subscriptions where device_imei='{IMEI}') + (select count(*) from locations where device_imei='{IMEI}') + (select count(*) from users where email like 'smoke-%@eyeon.invalid')")
    check("test data removed", rest == "0", f"leftover rows={rest}")

print("\nRESULT:", "ALL PASSED" if not failures else f"{len(failures)} FAILED: {failures}")
sys.exit(1 if failures else 0)
