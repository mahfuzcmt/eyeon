# EyeOn Deployment

Two phases. Phase 1 brings the stack up on a single VPS over plain HTTP at the public IP. Phase 2 adds nginx + Let's Encrypt TLS once DNS is ready. Phase 1 is what `scripts/deploy_vps.sh` automates.

This document supersedes the AWS Mumbai outline in CLAUDE.md §15.2 for single-VPS deployments. AWS guidance still applies if/when this stack outgrows one box.

## Phase 1 — single VPS, IP-only

### Target
- One Ubuntu 22.04+ VPS with a public IPv4
- Backend (Spring Boot + Netty TCP), Postgres+PostGIS, Redis, and Next.js frontend co-located
- No TLS, no nginx, no domain — accessed at `http://<public-ip>:3000`

### Prerequisites (you, before running the script)
- [ ] **Rotate the root password** if it was ever shared in plaintext. Then `passwd` on the box.
- [ ] Mapbox public token from <https://account.mapbox.com/access-tokens/> (restrict by URL referrer once DNS is in place)
- [ ] Optional: SSL Wireless SMS API token (without it, alarms still appear in the dashboard but no SMS dispatch)

### Run

SSH to the box, then:

```bash
# Confirm you've rotated the password
passwd

# Pull the script (or git clone the repo first and run scripts/deploy_vps.sh from there)
curl -fsSL https://raw.githubusercontent.com/mahfuzcmt/eyeon/main/scripts/deploy_vps.sh -o /tmp/deploy.sh
chmod +x /tmp/deploy.sh
ROTATE_PASSWORD_DONE=yes bash /tmp/deploy.sh
```

The script pauses at two checkpoints:

1. **Checkpoint 1 (after server prep)** — Docker, firewall, repo, `.env` are in place. Nothing customer-facing yet. Press `y` to build images.
2. **Checkpoint 2 (after first smoke)** — backend healthy, frontend serves, GT06 simulator delivered a packet. Press `y` to leave the stack running.

### What the script does, in order

1. Verifies Ubuntu/Debian
2. Installs Docker, docker-compose plugin, ufw, git, python3
3. Resets ufw and opens 22 (ssh), 8080 (backend), 3000 (frontend), 5023 (Netty TCP)
4. Clones `https://github.com/mahfuzcmt/eyeon.git` into `/opt/eyeon` (or pulls if exists)
5. Generates `/opt/eyeon/.env` with random JWT secret + Postgres password (chmod 600)
6. Prompts for Mapbox token
7. **Pauses for checkpoint 1**
8. `docker compose -f docker-compose.prod.yml build` — JDK 21 + Node 22 compile on the VPS (5–10 min on a small box)
9. `docker compose -f docker-compose.prod.yml up -d`
10. Waits for backend healthcheck `/api/v1/actuator/health`
11. Smokes: backend health, frontend HTTP 200, simulated GT06 packet
12. **Pauses for checkpoint 2**

### Verifying the deploy

```bash
# Backend up?
curl http://<public-ip>:8080/api/v1/actuator/health

# Frontend up?
curl -I http://<public-ip>:3000

# What's running?
docker compose -f /opt/eyeon/docker-compose.prod.yml --env-file /opt/eyeon/.env ps

# Tail logs
docker compose -f /opt/eyeon/docker-compose.prod.yml --env-file /opt/eyeon/.env logs -f --tail 100
```

### Logging in for the first time

The deploy script bootstraps a single admin user on first run via Spring's `DataSeeder` (gated by `EYEON_SEED_ENABLED`, which the script enables in `.env`). Flyway V2 only seeds the demo org + one demo device — the user comes from `DataSeeder` so the BCrypt hash is computed at runtime.

The script prints the email + generated password **once at the end** of the first deploy. Save it. The password also lives in `/opt/eyeon/.env` (chmod 600).

To re-display the credentials later:

```bash
grep '^EYEON_SEED_ADMIN_' /opt/eyeon/.env
```

To verify the user actually exists in the DB:

```bash
docker exec -it eyeon-postgres psql -U eyeon -d eyeon -c "SELECT email, role, is_active FROM users;"
```

`DataSeeder` is idempotent — it short-circuits if any user already exists, so subsequent deploys won't recreate it or change the password. **Change the password from the dashboard immediately after first login.**

### Pointing a real GT06 device

Configure the device via SMS (per CLAUDE.md §7.4):

```
SERVER,0,<public-ip>,5023,0#
APN,gpinternet#
GMT,E,6,0#
TIMER,30,300#
GPRS,ON#
```

Watch the backend logs for the login packet:

```bash
docker compose -f /opt/eyeon/docker-compose.prod.yml --env-file /opt/eyeon/.env logs -f backend | grep -i 'login\|imei'
```

## Phase 2 — add nginx + TLS + DNS

Run this only after Phase 1 is stable and you have a domain ready.

### Prerequisites
- DNS A record pointing your hostname (e.g. `ns.tracker.com`) at the VPS public IP, propagated (verify with `dig +short ns.tracker.com`)
- Let's Encrypt rate limits in mind (5 certs per domain per week — don't loop on cert issuance during testing)

### Steps

```bash
apt-get install -y nginx certbot python3-certbot-nginx

# Install the bundled config (created in this repo at infra/nginx/nginx.conf)
cp /opt/eyeon/infra/nginx/nginx.conf /etc/nginx/sites-available/eyeon
ln -sf /etc/nginx/sites-available/eyeon /etc/nginx/sites-enabled/eyeon
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Issue cert + auto-edit nginx config
certbot --nginx -d <your-hostname> --non-interactive --agree-tos -m <your-email>

# Update CORS + WS origins in /opt/eyeon/.env:
#   EYEON_CORS_ALLOWED_ORIGINS=https://<your-hostname>
#   NEXT_PUBLIC_WS_BASE=wss://<your-hostname>/ws
# Then rebuild frontend (Mapbox token + WS_BASE are baked in):
docker compose -f /opt/eyeon/docker-compose.prod.yml --env-file /opt/eyeon/.env up -d --build frontend backend

# Open 80/443, close 3000/8080 from the public internet (nginx now proxies them)
ufw allow 80/tcp
ufw allow 443/tcp
ufw delete allow 3000/tcp
ufw delete allow 8080/tcp
# 5023 stays open — Netty TCP is direct, not proxied (GT06 doesn't speak TLS)
```

### After Phase 2: harden SSH

```bash
# /etc/ssh/sshd_config
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes

# Add your public key to /home/<user>/.ssh/authorized_keys for a non-root deploy user, then:
systemctl restart sshd
```

## Operations

### Updating to a new version

```bash
cd /opt/eyeon
git pull origin main
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

The `up -d --build` recreates only changed services. Backend restart causes ~30 seconds of GT06 device disconnect; devices reconnect automatically.

### Backups

Postgres data lives in the `postgres_data` named volume. Daily dump to local disk:

```bash
# Add to root's crontab
0 2 * * * docker exec eyeon-postgres pg_dump -U eyeon eyeon | gzip > /var/backups/eyeon-$(date +\%F).sql.gz
0 3 * * * find /var/backups -name 'eyeon-*.sql.gz' -mtime +14 -delete
```

For real durability, sync `/var/backups/` to S3 or B2 daily.

### Rollback

If a deploy breaks something:

```bash
cd /opt/eyeon
git log --oneline -10
git checkout <previous-good-sha>
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

If a migration breaks: stop the backend, restore the most recent dump, fix the migration, redeploy.

## Known gaps in this Phase 1 deploy

These are documented in CLAUDE.md but not yet implemented. The stack runs without them; features depending on them fail gracefully or silently.

- **Billing / bKash** — billing module not implemented; subscription enforcement is open
- **Device provisioning over SMS** — `DeviceProvisioningService` not implemented; provision devices manually via `POST /devices` then SMS-configure each device by hand
- **Push notifications (FCM)** — not implemented; alarms surface in the dashboard only
- **Background jobs** — only `DeviceStatusJob` runs. `SubscriptionRenewalJob`, `ReportGenerationJob`, `DataRetentionJob` absent.
- **TenantInterceptor** — `TenantContext` exists but isn't auto-populated per request. Multi-tenant isolation currently relies on explicit `orgId` parameters in service calls — review before letting a second customer onto the box.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `docker compose build` fails on `mvn dependency:go-offline` | Build host can't reach Maven Central | Check VPS DNS / outbound 443; retry |
| Backend healthcheck never goes green | Flyway migration error | `docker logs eyeon-backend` and inspect SQL |
| Frontend builds but map is blank | Missing/invalid Mapbox token | Edit `.env`, set `NEXT_PUBLIC_MAPBOX_TOKEN`, `up -d --build frontend` |
| Browser CORS error on login | `EYEON_CORS_ALLOWED_ORIGINS` doesn't include the origin in the URL bar | Edit `.env`, restart backend |
| Device connects then disconnects every 5s | Backend not sending login ACK fast enough, or unregistered IMEI flow broken | Check backend logs for the IMEI; CLAUDE.md §6.4 / §18.3 |
| `502` from nginx in Phase 2 | Backend container not on the same docker network as nginx, or nginx pointing at wrong port | `docker network inspect eyeon_default` |
