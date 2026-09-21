# EyeOn

Multi-tenant SaaS for vehicle GPS fleet tracking, built around the Concox GT06 hardware family. Targets the Bangladesh market: motorbike anti-theft, ride-sharing fleets, delivery riders, CNG/taxi operators, school vans, logistics. Native Android + iOS apps for professional and corporate clients.

> **Origin:** EyeOn was forked from the MotoLink/PingPath codebase on 2026-09-21 - working-tree copy, fresh git history, no shared remote - and was then fully renamed to `eyeon` (package, artifact, config prefix, env vars, database, containers, bundle ids). The two products evolve independently; changes are not synced back. See [`CLAUDE.md`](./CLAUDE.md) section 1.

See [`CLAUDE.md`](./CLAUDE.md) for the canonical product, architecture, and protocol specification. Read it before opening a PR. Competitor teardown: [`docs/COMPETITIVE_ANALYSIS.md`](./docs/COMPETITIVE_ANALYSIS.md).

---

## Quick start (local dev)

Bring up the data services:

```bash
cp .env.example .env
docker compose up -d
```

This starts:

| Service    | Port | Purpose                              |
|------------|------|--------------------------------------|
| PostgreSQL | 5433 | App database (PostGIS 3.4 enabled); container port is 5432 |
| Redis      | 6380 | Hot cache + location pub/sub channel; container port is 6379 |

Then run the backend and frontend (they are not in `docker-compose.yml`; that file
only brings up the data services):

```bash
# Backend — REST + WebSocket on :8081, Netty GT06 TCP ingest on :5024
cd backend && ./mvnw spring-boot:run

# Frontend — Next.js dev server on :3001
cd frontend && npm install && npm run dev

# Mobile (optional) — Expo dev client
cd mobile && npm install && npm start
```

Every port is +1 from PingPath/MotoLink so both stacks can run at once — see
`CLAUDE.md` §3.3. To point a device simulator at the TCP server:

```bash
python3 scripts/simulate_device.py --imei 864290061234567 --host 127.0.0.1 --port 5024
```

---

## Repository layout

```
eyeon/
├── CLAUDE.md             # Canonical spec — read first
├── docker-compose.yml    # Local Postgres + Redis
├── docker-compose.prod.yml  # Single-VPS production stack
├── .env.example          # Required environment variables
├── backend/              # Spring Boot 3.3 + Netty GT06 server + JdbcTemplate
├── frontend/             # Next.js 15 App Router + Tailwind + Leaflet
├── mobile/               # Expo / React Native app (Android + iOS)
├── infra/nginx/          # Reverse-proxy config (infra/terraform is still empty)
├── scripts/              # deploy_vps.sh, GT06 device simulator
└── docs/                 # GT06 protocol notes, deployment, competitor analysis
```

---

## Status

Inherited from the MotoLink/PingPath fork, so the launch-phase feature work is
largely built rather than pending:

- **Backend** — 24 REST controllers, 18 Flyway migrations, GT06 protocol decoder
  (0x12 V1.8 / 0x22 V3 / 0x32 V4 / 0xA0 4G), Netty TCP ingest, STOMP WebSocket
  fanout, geofences, trips, alarms + alarm rules, device commands,
  reports/Excel export, subscriptions, SSL Wireless SMS, Expo push.
  10 test classes, 36 tests.
- **Frontend** — dashboard (live map, devices, geofences, trips, alarms, rules,
  drivers, reports, scheduled commands, audit log, admin, settings) plus a
  Bengali/English marketing site and public share links.
- **Mobile** — Expo app: login, live map, vehicle list, device detail, alerts,
  circle geofences, push notifications.

Not yet done: CI (`.github/workflows` is empty), Terraform
(`infra/terraform` is empty), Prometheus/Grafana monitoring, load testing, and
frontend tests. Deployment today is `scripts/deploy_vps.sh` onto a single VPS —
see [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md).

**No payment gateway is implemented.** `BillingController` exposes read-only
subscription endpoints only; there is no bKash or Nagad checkout, execute call
or webhook anywhere in `backend/src`, and no `BillingService`. The `payments`
table has a `bkash_trx_id` column and the marketing site advertises
"bKash & Nagad Billing", so the landing page currently promises more than the
backend delivers — worth closing before launch (`CLAUDE.md` §12.1).

`CLAUDE.md` §16's per-phase checkboxes were audited against the tree on
2026-09-21 and now carry a `↳` note wherever an item is only partly done, so
that section is the detailed breakdown behind this summary.
