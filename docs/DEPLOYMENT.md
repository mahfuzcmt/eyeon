# EyeOn Deployment

Two phases. Phase 1 brings the stack up on a single VPS over plain HTTP at the public IP. Phase 2 adds nginx + Let's Encrypt TLS once DNS is ready. Phase 1 is what `scripts/deploy_vps.sh` automates.

This document supersedes the AWS Mumbai outline in CLAUDE.md §15.2 for single-VPS deployments. AWS guidance still applies if/when this stack outgrows one box.

## Phase 1 — single VPS, IP-only

### Target
- One Ubuntu 22.04+ VPS with a public IPv4
- Backend (Spring Boot + Netty TCP), Postgres+PostGIS, Redis, and Next.js frontend co-located
- No TLS, no nginx, no domain — accessed at `http://<public-ip>:3001`

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
3. Resets ufw and opens 22 (ssh), 8081 (backend), 3001 (frontend), 5024 (Netty TCP)
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
curl http://<public-ip>:8081/api/v1/actuator/health

# Frontend up?
curl -I http://<public-ip>:3001

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
SERVER,1,eyeon.motolinkgps.com,5024,0#   # mode 1 = domain; survives a server IP change
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

# Open 80/443, close 3001/8081 from the public internet (nginx now proxies them)
ufw allow 80/tcp
ufw allow 443/tcp
ufw delete allow 3001/tcp
ufw delete allow 8081/tcp
# 5024 stays open — Netty TCP is direct, not proxied (GT06 doesn't speak TLS)
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

## Shared server (current production, since 2026-09-21)

EyeOn runs on `103.159.37.145` (until 2026-10-18 `ns.tracker.com` / `103.187.22.131`), a **shared** VPS that also hosts PingPath/MotoLink
production and several unrelated apps. **Do not run `scripts/deploy_vps.sh` there**: it resets `ufw`
(dropping WireGuard and PingPath's tracker port), expects free host ports `8081`/`3001` (both taken)
and assumes it owns ports 80/443 (owned by the `kosaibari-nginx` container).

| What | Where |
|---|---|
| Code + `.env` (mode 600, secrets generated on the box) | `/opt/eyeon` |
| Compose file | `docker-compose.shared.yml` (project `eyeon`, network `eyeon_default`) |
| Published host ports | **`5024` only** (GT06). REST/WS/dashboard are reached by container name |
| Front door | `kosaibari-nginx`, site file `/root/kosaibari/nginx/conf.d/eyeon.conf` (source: `infra/nginx/eyeon.shared.conf`) |
| Certificates | `kosaibari-certbot` (webroot, renews every 12 h) |
| Memory ceilings | backend 768 MB (`-Xmx400m`), postgres 384 MB, frontend 384 MB, redis 128 MB |
| Bootstrap admin | `grep EYEON_SEED_ADMIN /opt/eyeon/.env` — change the password after first login |

### Deploying a new version

The box is too small to run Maven next to its neighbours, so the jar is built on a dev machine.

```bash
# on your machine
cd backend && ./mvnw -DskipTests package && cd ..          # -> backend/target/eyeon.jar (Java 21 bytecode)
rsync -az --delete --exclude '.git/' --exclude 'node_modules/' --exclude '.next/' --exclude '.env*' \
      --exclude 'mobile/' --exclude 'backend/target/' --filter 'P .env' ./ root@103.159.37.145:/opt/eyeon/
rsync -az backend/target/eyeon.jar root@103.159.37.145:/opt/eyeon/backend/target/eyeon.jar

# on the server
cd /opt/eyeon
docker compose -f docker-compose.shared.yml --env-file .env up -d --build eyeon-backend
nice -n 15 ionice -c3 docker compose -f docker-compose.shared.yml --env-file .env build eyeon-frontend   # ~3 min, heap capped at 1 GB
docker compose -f docker-compose.shared.yml --env-file .env up -d eyeon-frontend
# end-to-end checks against the live stack; each removes its own data. Run detached and under a lock:
# an SSH drop leaves the remote run going, and two overlapping runs delete each other's test data.
nohup flock -n /tmp/eyeon-smoke.lock sh -c "python3 scripts/smoke_trusted_places.py; python3 scripts/smoke_privacy.py" > /tmp/eyeon-smoke.log 2>&1 &
```

Never use `down -v` (it deletes the database volume `eyeon_postgres_data`).

### HTTPS

Needs a DNS `A` record for the hostname pointing at the server. Then, on the server:

```bash
bash /opt/eyeon/scripts/shared_vps_enable_tls.sh
```

It refuses to run without DNS, checks that other sites' upstream names still resolve correctly inside
the shared nginx, does a Let's Encrypt dry run before the real request, runs `nginx -t` before any reload
and restores the previous site file if the test fails.

HTTPS went live 2026-09-21 (certificate valid to 2026-12-20, renewed automatically by `kosaibari-certbot`).

**Let's Encrypt "Timeout during connect" is intermittent on this host.** The first real request failed at
*secondary validation* (one remote vantage point could not reach port 80) right after a successful dry run;
the retry minutes later succeeded. The certbot log shows the same failure for `motolinkgps.com` in the past,
and those renewals still went through. Nothing local blocks port 80. If it happens: re-run the script, at most
3 times per hour (the limit is 5 failed validations per hostname per hour). If a renewal ever fails for days,
check `docker exec kosaibari-certbot certbot certificates` - `certbot renew` retries every 12 hours on its own.

### Rules for the shared nginx (learned the hard way)

1. **EyeOn's compose services must be named `eyeon-*`.** Compose registers the service name as a DNS
   alias, and Docker answers a name from the first attached network *alphabetically* that knows it.
   `kosailagbe.conf` proxies to the generic names `frontend:3000` / `backend:8082`; when nginx joined
   `eyeon_default` while EyeOn's services were still called `frontend`/`backend`, `eyeon_…` sorted before
   `kosaibari_…` and kosailagbe.com served 502 for about 25 seconds (2026-09-21). PingPath has the same
   generic aliases but `pingpath_…` sorts after `kosaibari_…`, so it never showed.
2. **Check resolution before reloading.** nginx only re-resolves upstream names on reload/restart, so
   after `docker network connect`, run `docker exec kosaibari-nginx getent hosts frontend backend` and
   compare with kosaibari's IPs *before* `nginx -s reload`. A wrong answer can then be undone with
   `docker network disconnect` at zero cost.
3. **Upstreams in `eyeon.conf` are variables + `resolver 127.0.0.11`**, never static names. With a
   static `proxy_pass http://eyeon-backend:8081` nginx refuses to *start* when EyeOn is down, taking
   every site on that nginx with it.
4. `docker network connect` does not survive `kosaibari-nginx` being **recreated** (neither does
   PingPath's attachment — it is not declared in kosaibari's compose file either). After a recreate:
   `docker network connect eyeon_default kosaibari-nginx` and the same for `pingpath_default`.
   Until then EyeOn answers 502 (rule 3), while motolinkgps.com's static upstreams stop nginx from starting.

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
