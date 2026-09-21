#!/usr/bin/env bash
# EyeOn single-VPS deploy script — IP-only, no TLS yet.
# Run on a fresh Ubuntu 22.04+ host as root or with sudo.
# Pauses at two checkpoints. See docs/DEPLOYMENT.md.

set -euo pipefail

# ---------------------------------------------------------------------------
# Config — override via env vars before invoking.
# ---------------------------------------------------------------------------
REPO_URL="${REPO_URL:-https://github.com/mahfuzcmt/eyeon.git}"
REPO_DIR="${REPO_DIR:-/opt/eyeon}"
PUBLIC_IP="${PUBLIC_IP:-$(curl -fsS https://api.ipify.org || echo 127.0.0.1)}"
FRONTEND_PORT="${FRONTEND_PORT:-3001}"
BACKEND_PORT="${BACKEND_PORT:-8081}"
NETTY_PORT="${NETTY_PORT:-5024}"

log()   { printf "\n\033[1;36m[deploy]\033[0m %s\n" "$*"; }
warn()  { printf "\n\033[1;33m[warn]\033[0m %s\n" "$*"; }
fail()  { printf "\n\033[1;31m[fail]\033[0m %s\n" "$*" >&2; exit 1; }
prompt_continue() {
  local label="$1"; local msg="${2:-Continue?}"
  printf "\n\033[1;35m[CHECKPOINT %s]\033[0m %s [y/N] " "$label" "$msg"
  read -r ans
  [[ "$ans" =~ ^[Yy]$ ]] || fail "Aborted at $label."
}

# ---------------------------------------------------------------------------
# 0. Sanity checks
# ---------------------------------------------------------------------------
[[ $EUID -eq 0 ]] || fail "Run as root (or via sudo). Solo-ops setup; we'll harden later."
. /etc/os-release
[[ "$ID" =~ ^(ubuntu|debian)$ ]] || fail "Expected Ubuntu/Debian, found $ID. Adapt apt commands manually."

log "Detected $PRETTY_NAME on public IP $PUBLIC_IP"

if [[ "${ROTATE_PASSWORD_DONE:-no}" != "yes" ]]; then
  warn "You shared the root password in a chat. Rotate it BEFORE continuing:"
  warn "  passwd"
  warn "Then re-run with:  ROTATE_PASSWORD_DONE=yes bash $0"
  fail "Refusing to deploy with a known-compromised credential."
fi

# ---------------------------------------------------------------------------
# 1. Install Docker, compose plugin, ufw, git, python3 (for simulator), curl
# ---------------------------------------------------------------------------
log "Installing system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -yqq ca-certificates curl gnupg lsb-release ufw git python3 python3-pip jq

if ! command -v docker >/dev/null 2>&1; then
  log "Installing Docker..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/$ID/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$ID $(lsb_release -cs) stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -yqq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
fi

# ---------------------------------------------------------------------------
# 2. Firewall — open only what we need
# ---------------------------------------------------------------------------
log "Configuring ufw firewall..."
ufw --force reset >/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp                       comment 'ssh'
ufw allow ${BACKEND_PORT}/tcp          comment 'eyeon backend rest+ws'
ufw allow ${FRONTEND_PORT}/tcp         comment 'eyeon frontend'
ufw allow ${NETTY_PORT}/tcp            comment 'eyeon gt06 tcp'
ufw --force enable

# ---------------------------------------------------------------------------
# 3. Clone or update repo
# ---------------------------------------------------------------------------
if [[ ! -d "$REPO_DIR/.git" ]]; then
  log "Cloning $REPO_URL into $REPO_DIR..."
  mkdir -p "$(dirname "$REPO_DIR")"
  git clone "$REPO_URL" "$REPO_DIR"
else
  log "Updating existing checkout at $REPO_DIR..."
  git -C "$REPO_DIR" fetch --all --prune
  git -C "$REPO_DIR" reset --hard origin/main
fi

cd "$REPO_DIR"

# ---------------------------------------------------------------------------
# 4. Build .env (idempotent — preserves existing secrets if file exists)
# ---------------------------------------------------------------------------
ENV_FILE="$REPO_DIR/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  log "Generating fresh .env..."
  POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '=+/' | head -c 32)
  JWT_SECRET=$(openssl rand -base64 48)
  SEED_ADMIN_PASSWORD=$(openssl rand -base64 18 | tr -d '=+/' | head -c 20)
  SEED_ADMIN_EMAIL="${SEED_ADMIN_EMAIL:-admin@eyeon.local}"

  printf "Mapbox public token (https://account.mapbox.com/access-tokens/): "
  read -r MAPBOX_TOKEN
  [[ -n "$MAPBOX_TOKEN" ]] || fail "Mapbox token is required for the frontend build."

  printf "Google Maps JS API key (press Enter to skip — dashboard falls back to OSM tiles): "
  read -r GOOGLE_MAPS_API_KEY
  GOOGLE_MAPS_API_KEY="${GOOGLE_MAPS_API_KEY:-}"

  printf "SSL Wireless SMS API token (press Enter to skip — alarms won't dispatch SMS): "
  read -r SSL_SMS_API_TOKEN
  SSL_SMS_API_TOKEN="${SSL_SMS_API_TOKEN:-}"

  cat > "$ENV_FILE" <<EOF
# EyeOn production env — auto-generated by deploy_vps.sh on $(date -u +%Y-%m-%dT%H:%M:%SZ)
# Never commit. Regenerate carefully — losing JWT_SECRET invalidates all sessions.

POSTGRES_DB=eyeon
POSTGRES_USER=eyeon
POSTGRES_PASSWORD=$POSTGRES_PASSWORD

JWT_SECRET=$JWT_SECRET
JWT_ACCESS_TTL_MINUTES=60
JWT_REFRESH_TTL_DAYS=30

NETTY_TCP_PORT=$NETTY_PORT

# CORS — must include the origin the browser will use. IP-only for now.
EYEON_CORS_ALLOWED_ORIGINS=http://$PUBLIC_IP:$FRONTEND_PORT

# Frontend build args (NEXT_PUBLIC_* baked into bundle)
NEXT_PUBLIC_API_BASE=/api/proxy
NEXT_PUBLIC_WS_BASE=ws://$PUBLIC_IP:$BACKEND_PORT/ws
NEXT_PUBLIC_MAPBOX_TOKEN=$MAPBOX_TOKEN
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$GOOGLE_MAPS_API_KEY

# Frontend runtime
SESSION_COOKIE_NAME=eyeon_session
SESSION_COOKIE_MAX_AGE=86400

# SSL Wireless SMS (optional — leave blank to disable SMS dispatch)
SSL_SMS_API_TOKEN=$SSL_SMS_API_TOKEN
SSL_SMS_SENDER_ID=EYEON

# Bootstrap admin user — DataSeeder runs once on first backend start.
# Idempotent: skipped if any user already exists in the DB.
EYEON_SEED_ENABLED=true
EYEON_SEED_ADMIN_EMAIL=$SEED_ADMIN_EMAIL
EYEON_SEED_ADMIN_PASSWORD=$SEED_ADMIN_PASSWORD
EOF
  chmod 600 "$ENV_FILE"
  log "Wrote $ENV_FILE (chmod 600)."
  PRINT_BOOTSTRAP_CREDS=yes
else
  log "Reusing existing $ENV_FILE."
  PRINT_BOOTSTRAP_CREDS=no

  # Upsert vars introduced after the first deploy (the block above only runs
  # when .env is first generated). NEXT_PUBLIC_* values are baked into the
  # frontend bundle at build time, so the rebuild below picks them up.
  if ! grep -q '^NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=..*' "$ENV_FILE"; then
    if [[ -z "${GOOGLE_MAPS_API_KEY:-}" ]]; then
      printf "Google Maps JS API key (press Enter to skip — dashboard falls back to OSM tiles): "
      read -r GOOGLE_MAPS_API_KEY
    fi
    if [[ -n "${GOOGLE_MAPS_API_KEY:-}" ]]; then
      sed -i '/^NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=/d' "$ENV_FILE"
      printf 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=%s\n' "$GOOGLE_MAPS_API_KEY" >> "$ENV_FILE"
      log "Added NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to $ENV_FILE."
    else
      warn "No Google Maps key set — dashboard keeps the OSM fallback map."
    fi
  fi
fi

# ---------------------------------------------------------------------------
# CHECKPOINT 1 — server prep done, no customer-facing services yet
# ---------------------------------------------------------------------------
log "Server prep complete:"
log "  - Docker installed"
log "  - Firewall: 22, $BACKEND_PORT, $FRONTEND_PORT, $NETTY_PORT open; everything else denied"
log "  - Repo at $REPO_DIR"
log "  - $ENV_FILE generated (Postgres + JWT secrets baked in)"
log "  - Mapbox token written into .env (frontend build will succeed)"
log "Next: docker compose build (slow — JDK + Node compile on this box)"
prompt_continue "1/2" "Build images and bring stack up?"

# ---------------------------------------------------------------------------
# 5. Build + bring up
# ---------------------------------------------------------------------------
log "Building images (this takes 5-10 min on a small VPS)..."
docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" build

log "Starting stack..."
docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" up -d

# ---------------------------------------------------------------------------
# 6. Wait for backend health
# ---------------------------------------------------------------------------
log "Waiting for backend healthcheck (up to 3 minutes)..."
for i in {1..36}; do
  if docker inspect --format='{{.State.Health.Status}}' eyeon-backend 2>/dev/null | grep -q healthy; then
    log "Backend healthy after ${i}x5s."
    break
  fi
  if [[ $i -eq 36 ]]; then
    docker compose -f docker-compose.prod.yml logs --tail 80 backend
    fail "Backend never became healthy. Logs above."
  fi
  sleep 5
done

# ---------------------------------------------------------------------------
# 7. Smoke tests
# ---------------------------------------------------------------------------
log "Smoke: GET /api/v1/actuator/health"
HEALTH=$(curl -fsS "http://localhost:$BACKEND_PORT/api/v1/actuator/health")
echo "  $HEALTH"
echo "$HEALTH" | jq -e '.status == "UP"' >/dev/null || fail "Health is not UP."

log "Smoke: frontend serves a 200 on /"
FE_CODE=$(curl -fsS -o /dev/null -w '%{http_code}' "http://localhost:$FRONTEND_PORT/")
echo "  HTTP $FE_CODE"
[[ "$FE_CODE" =~ ^(200|307|308)$ ]] || fail "Frontend not responding (got $FE_CODE)."

log "Smoke: simulator → Netty TCP on $PUBLIC_IP:$NETTY_PORT (1 packet)"
if [[ -f "$REPO_DIR/scripts/simulate_device.py" ]]; then
  python3 "$REPO_DIR/scripts/simulate_device.py" \
      --host 127.0.0.1 --port "$NETTY_PORT" --imei 864290061234567 --packets 1 \
      || warn "Simulator returned non-zero — check backend logs (the device may still be unprovisioned in DB, which is expected)."
else
  warn "scripts/simulate_device.py not found — skipping TCP smoke."
fi

# ---------------------------------------------------------------------------
# CHECKPOINT 2 — first smoke passed. Decide whether to leave it running.
# ---------------------------------------------------------------------------
log "Stack is up:"
log "  Frontend: http://$PUBLIC_IP:$FRONTEND_PORT"
log "  Backend:  http://$PUBLIC_IP:$BACKEND_PORT/api/v1/actuator/health"
log "  Netty:    $PUBLIC_IP:$NETTY_PORT  (point a real GT06 here)"
log "Login: see seeded admin in V2__seed_data.sql for credentials, or create one via the API."
prompt_continue "2/2" "Smoke looks good — leave the stack running?"

log "Deploy complete. Tail logs with:"
log "  docker compose -f docker-compose.prod.yml --env-file $ENV_FILE logs -f"

if [[ "$PRINT_BOOTSTRAP_CREDS" == "yes" ]]; then
  cat <<EOF

============================================================
  BOOTSTRAP ADMIN CREDENTIALS — SAVE NOW, SHOWN ONCE
============================================================
  URL:      http://$PUBLIC_IP:$FRONTEND_PORT
  Email:    $(grep '^EYEON_SEED_ADMIN_EMAIL=' "$ENV_FILE" | cut -d= -f2-)
  Password: $(grep '^EYEON_SEED_ADMIN_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)

  This password lives in $ENV_FILE (chmod 600).
  Change it via the dashboard immediately after first login.
============================================================
EOF
fi

log ""
log "Next steps (not done by this script — see docs/DEPLOYMENT.md):"
log "  - Point ns.tracker.com at $PUBLIC_IP, then run the TLS upgrade phase"
log "  - Disable PermitRootLogin / PasswordAuthentication in /etc/ssh/sshd_config"
log "  - Switch to SSH key auth"
