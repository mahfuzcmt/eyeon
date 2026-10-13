#!/usr/bin/env python3
"""
Live test for the super-admin tracker delete (DELETE /admin/devices/{imei}).

Runs ON the server (needs docker + the EyeOn stack). A simulated tracker with a made-up IMEI
connects and is auto-registered, an ORG_ADMIN is refused, a SUPER_ADMIN deletes it and every
row for it is gone. Temporary users are removed again, even when a check fails.

    python3 /opt/eyeon/scripts/smoke_admin_delete.py
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
KID = "864290069990077"
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



# ---------------------------------------------------------------- the test
try:
    psql(f"delete from devices where imei = '{KID}'")
    sim(KID, LAT, LNG, count=3)  # no SOS: it would text real admins of the demo org
    time.sleep(3)
    check("simulated tracker auto-registered", psql(f"select count(*) from devices where imei = '{KID}'") == "1")
    check("its locations were stored", int(psql(f"select count(*) from locations where device_imei = '{KID}'") or 0) > 0)

    _, org_admin = make_user("ORG_ADMIN", "orgadmin")
    _, sup = make_user("SUPER_ADMIN", "super")
    check("two temporary accounts can log in", bool(org_admin and sup))

    code, _ = call(org_admin, "DELETE", f"/admin/devices/{KID}")
    check("an org admin may not delete (403)", code == 403, str(code))
    check("... and the tracker is still there", psql(f"select count(*) from devices where imei = '{KID}'") == "1")

    code, _ = call(sup, "DELETE", f"/admin/devices/{KID}")
    check("super admin deletes the tracker (204)", code == 204, str(code))
    for table, col in (("devices", "imei"), ("locations", "device_imei"), ("alarms", "device_imei"),
                       ("subscriptions", "device_imei"), ("tracker_settings", "device_imei")):
        n = psql(f"select count(*) from {table} where {col} = '{KID}'")
        check(f"no {table} rows left", n == "0", n)
    check("the delete is audited",
          psql(f"select count(*) from audit_log where action = 'ADMIN_DEVICE_DELETE' and resource_id = '{KID}'") != "0")
    code, _ = call(sup, "DELETE", f"/admin/devices/{KID}")
    check("deleting again is 404", code == 404, str(code))
finally:
    smoke_users = f"select id from users where email like 'smoke-%-{TAG}@eyeon.invalid'"
    for stmt in (f"delete from refresh_tokens where user_id in ({smoke_users})",
                 f"delete from audit_log where user_id in ({smoke_users})",
                 f"delete from users where email like 'smoke-%-{TAG}@eyeon.invalid'"):
        psql(stmt)
    # If the delete failed, remove the simulated tracker by hand.
    for t in ("locations", "alarms", "subscriptions", "tracker_settings", "daily_checks"):
        psql(f"delete from {t} where device_imei = '{KID}'")
    psql(f"delete from devices where imei = '{KID}'")

print("\n" + ("ALL PASSED" if not failures else f"{len(failures)} FAILED: {failures}"))
sys.exit(1 if failures else 0)
