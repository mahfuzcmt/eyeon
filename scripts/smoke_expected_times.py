#!/usr/bin/env python3
"""Post-deploy smoke test for expected times with grace (V29). Runs ON the server; cleans up after itself.

A throw-away person is put inside a place whose arrival time is the current minute: the
minute sweep must send ARRIVED_ON_TIME. A second place it never visits must be probed
(daily_checks PROBED), not alerted, inside the grace."""
import json
import secrets
import subprocess
import sys
import time
import urllib.error
import urllib.request

IMEI = "864290069999998"
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
sid = None


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


from datetime import datetime, timezone, timedelta

try:
    made = psql(f"insert into users (org_id, email, password_hash, full_name, role, see_all_devices) values "
                f"('{DEMO_ORG}', '{SMOKE_EMAIL}', crypt('{SMOKE_PASSWORD}', gen_salt('bf', 12)), 'Smoke test', 'ORG_ADMIN', true)")
    check("temporary admin created", made == "INSERT 0 1", made)
    code, d = call("POST", "/auth/login", {"email": SMOKE_EMAIL, "password": SMOKE_PASSWORD})
    TOKEN = unwrap(d).get("accessToken") if isinstance(unwrap(d), dict) else None
    check("login as temporary admin", code == 200 and bool(TOKEN), f"{code}")
    if not TOKEN:
        sys.exit(1)

    sim(LAT + 0.05, LNG)
    check("tracker auto-registered", psql(f"select count(*) from devices where imei='{IMEI}'") == "1")

    def place(name, lat, lng):
        code, d = call("POST", "/geofences", {"name": name, "type": "CIRCLE", "notifyOn": "BOTH", "kind": "TRUSTED_PLACE",
                                             "placeType": "SCHOOL", "center": {"lat": lat, "lng": lng}, "radiusM": 150,
                                             "imeis": [IMEI]})
        g = unwrap(d)
        check(f"create {name}", code == 201, f"{code} {str(d)[:160]}")
        call("PATCH", f"/geofences/{g['id']}", {"minDwellS": 0})
        return g["id"]

    gid = place("Smoke School", LAT, LNG)
    sid = place("Smoke Coaching", LAT + 0.02, LNG)
    check("simulator: packet inside Smoke School", sim(LAT, LNG) == 0)
    st = psql(f"select is_inside from geofence_states where geofence_id='{gid}' and device_imei='{IMEI}'")
    check("state inside School", st == "t", f"state={st!r}")

    dhaka = datetime.now(timezone(timedelta(hours=6)))
    hhmm, weekday = dhaka.strftime("%H:%M"), dhaka.isoweekday()
    code, d = call("POST", f"/geofences/{gid}/schedules", {"kind": "ARRIVE_BY", "time": hhmm, "weekdays": [weekday], "graceMinutes": 10})
    s = unwrap(d)
    check("schedule with grace 10 created", code == 201 and s.get("graceMinutes") == 10, f"{code} {str(d)[:160]}")
    code, d = call("POST", f"/geofences/{sid}/schedules", {"kind": "ARRIVE_BY", "time": hhmm, "weekdays": [weekday]})
    check("grace defaults to 10", code == 201 and unwrap(d).get("graceMinutes") == 10, f"{code} {str(d)[:160]}")
    code, d = call("POST", f"/geofences/{gid}/schedules", {"kind": "LEAVE_BY", "time": "12:00", "weekdays": [1], "graceMinutes": 500})
    check("grace over 120 is a 400", code == 400, f"{code} {str(d)[:160]}")
    code, d = call("GET", f"/geofences/{gid}/schedules")
    check("list shows graceMinutes", code == 200 and [x.get("graceMinutes") for x in unwrap(d)] == [10], f"{code} {str(d)[:160]}")

    print("  ....  waiting for the minute sweep (up to 100 s)")
    got = ""
    for _ in range(20):
        time.sleep(5)
        got = psql(f"select type || ':' || severity || ':' || (metadata->>'graceMinutes') || ':' || (metadata->>'geofenceName') "
                   f"from alarms where device_imei='{IMEI}' and type='ARRIVED_ON_TIME'")
        probed = psql(f"select status from daily_checks where device_imei='{IMEI}' and check_key like 'schedule:%' and status='PROBED'")
        if got and probed:
            break
    check("ARRIVED_ON_TIME raised as INFO with grace and place", got == "ARRIVED_ON_TIME:INFO:10:Smoke School", f"got={got!r}")
    check("place not reached is probed, not alerted, inside the grace", probed == "PROBED", f"probed={probed!r}")
    n = psql(f"select count(*) from alarms where device_imei='{IMEI}' and type='NOT_ARRIVED'")
    check("no NOT_ARRIVED inside the grace", n == "0", f"count={n}")
    owner = psql(f"select metadata->>'geofenceOwnerId' = (select id::text from users where email='{SMOKE_EMAIL}') "
                 f"from alarms where device_imei='{IMEI}' and type='ARRIVED_ON_TIME'")
    check("alarm belongs to the place owner", owner == "t", f"owner={owner!r}")
    errs = sh("docker logs --since 5m eyeon-backend 2>&1 | grep -c 'Expected-time check failed'")
    check("no 'Expected-time check failed' in backend log", errs == "0", f"count={errs}")
finally:
    print("  ----  cleanup")
    tables = psql("select table_name || ':' || column_name from information_schema.columns "
                  "where table_schema='public' and column_name in ('device_imei','imei') and table_name <> 'devices' order by 1").split()
    stmts = [f"delete from {t.split(':')[0]} where {t.split(':')[1]}='{IMEI}'" for t in tables]
    stmts += ["delete from refresh_tokens where user_id in (select id from users where email like 'smoke-%@eyeon.invalid')",
              "delete from audit_log where user_id in (select id from users where email like 'smoke-%@eyeon.invalid')",
              "delete from user_notification_settings where user_id in (select id from users where email like 'smoke-%@eyeon.invalid')",
              "delete from geofences where name like 'Smoke %'",
              "delete from users where email like 'smoke-%@eyeon.invalid'",
              f"delete from devices where imei='{IMEI}'",
              f"delete from audit_log where resource_id in ('{IMEI}', '{gid}', '{sid}')"]
    for sql in stmts:
        r = psql(sql)
        if r and r != "DELETE 0":
            print("        " + sql.split(" where")[0] + " -> " + r)
    sh(f"docker exec eyeon-redis redis-cli del device:last:{IMEI}")
    rest = psql(f"select (select count(*) from devices where imei='{IMEI}') + (select count(*) from geofences where name like 'Smoke %') + (select count(*) from alarms where device_imei='{IMEI}') + (select count(*) from locations where device_imei='{IMEI}') + (select count(*) from daily_checks where device_imei='{IMEI}') + (select count(*) from users where email like 'smoke-%@eyeon.invalid')")
    check("test data removed", rest == "0", f"leftover rows={rest}")

print("\nRESULT:", "ALL PASSED" if not failures else f"{len(failures)} FAILED: {failures}")
sys.exit(1 if failures else 0)
