#!/usr/bin/env bash
# Finish HTTPS for EyeOn on the SHARED VPS (docs/DEPLOYMENT.md "Shared server").
# Run on the server as root once the DNS A record for the hostname exists:
#
#   bash /opt/eyeon/scripts/shared_vps_enable_tls.sh
#
# The front-door nginx also serves other production sites, so every step that could affect
# them is checked first and rolled back on failure:
#   1. the hostname must already resolve to this server (otherwise Let's Encrypt fails and
#      burns rate limit),
#   2. generic upstream names (frontend/backend) inside nginx must still resolve to the
#      front-door project, not to EyeOn (see the 2026-09-21 note in docker-compose.shared.yml),
#   3. `nginx -t` must pass before any reload; the previous site file is restored if it doesn't.

set -euo pipefail

HOST="${HOST:-eyeon.motolinkgps.com}"
NGINX="${NGINX:-kosaibari-nginx}"
CERTBOT="${CERTBOT:-kosaibari-certbot}"
CONF_DIR="${CONF_DIR:-/root/kosaibari/nginx/conf.d}"
FRONT_NET="${FRONT_NET:-kosaibari_kosaibari-network}"
SITE_SRC="${SITE_SRC:-/opt/eyeon/infra/nginx/eyeon.shared.conf}"
SITE="$CONF_DIR/eyeon.conf"

say()  { printf "\n\033[1;36m[tls]\033[0m %s\n" "$*"; }
fail() { printf "\n\033[1;31m[fail]\033[0m %s\n" "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || fail "Run as root."
[[ -f "$SITE_SRC" ]] || fail "Missing $SITE_SRC"

say "1/5 DNS: $HOST must point at this server"
my_ip=$(curl -fsS -m 10 https://api.ipify.org)
dns_ip=$(dig +short "$HOST" A @1.1.1.1 | tail -1)
[[ -n "$dns_ip" ]] || fail "$HOST has no A record yet. Add:  A  ${HOST%%.*}  ->  $my_ip  at the DNS host, wait a few minutes, re-run."
[[ "$dns_ip" == "$my_ip" ]] || fail "$HOST resolves to $dns_ip, but this server is $my_ip."

say "2/5 Front-door nginx is attached to eyeon_default and other sites' upstreams are untouched"
docker network connect eyeon_default "$NGINX" 2>/dev/null || true
for name in frontend backend; do
  want=$(docker ps -q --filter "network=$FRONT_NET" | xargs -r docker inspect \
           --format "{{with index .NetworkSettings.Networks \"$FRONT_NET\"}}{{.Aliases}} {{.IPAddress}}{{end}}" \
         | awk -v n="$name" '$0 ~ "[\\[ ]" n "[\\] ]" {print $NF}' | head -1)
  got=$(docker exec "$NGINX" getent hosts "$name" </dev/null | awk '{print $1}' | head -1 || true)
  if [[ -n "$want" && "$got" != "$want" ]]; then
    docker network disconnect eyeon_default "$NGINX" || true
    fail "'$name' inside $NGINX resolves to $got, expected $want. Detached from eyeon_default; nginx was not reloaded."
  fi
done
docker exec "$NGINX" getent hosts eyeon-backend eyeon-frontend </dev/null >/dev/null \
  || fail "eyeon-backend / eyeon-frontend do not resolve inside $NGINX. Is the EyeOn stack up?"

say "3/5 Certificate (webroot through $CERTBOT)"
if docker exec "$NGINX" test -f "/etc/letsencrypt/live/$HOST/fullchain.pem" </dev/null; then
  echo "certificate already present - skipping"
else
  docker exec "$CERTBOT" certbot certonly --webroot -w /var/www/certbot -d "$HOST" \
    --non-interactive --agree-tos --dry-run </dev/null
  docker exec "$CERTBOT" certbot certonly --webroot -w /var/www/certbot -d "$HOST" \
    --non-interactive --agree-tos </dev/null
fi

say "4/5 Install the HTTPS site, test, reload"
backup=""
if [[ -f "$SITE" ]]; then backup="$SITE.bak.$(date +%s)"; cp "$SITE" "$backup"; fi
sed "s/eyeon\.motolinkgps\.com/$HOST/g" "$SITE_SRC" > "$SITE"
if ! docker exec "$NGINX" nginx -t </dev/null; then
  if [[ -n "$backup" ]]; then mv "$backup" "$SITE"; else rm -f "$SITE"; fi
  fail "nginx -t failed. Previous site file restored; nginx was NOT reloaded."
fi
docker exec "$NGINX" nginx -s reload </dev/null
[[ -n "$backup" ]] && rm -f "$backup"
sleep 2

say "5/5 Verify"
code=$(curl -s -o /dev/null -w '%{http_code}' -m 15 "https://$HOST/login")
health=$(curl -s -m 15 "https://$HOST/api/v1/actuator/health")
echo "  https://$HOST/login                    -> $code"
echo "  https://$HOST/api/v1/actuator/health   -> $health"
[[ "$code" == "200" ]] || fail "Dashboard did not answer 200."
[[ "$health" == *'"UP"'* ]] || fail "Backend health is not UP through nginx."

say "Done. Renewal is handled by $CERTBOT's 12-hourly 'certbot renew' and $NGINX's 6-hourly reload."
echo "Bootstrap admin login:  grep EYEON_SEED_ADMIN /opt/eyeon/.env"
