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

The backend (Spring Boot on `8081` + Netty TCP on `5024`) and frontend (Next.js on `3001`) are not yet implemented — that's Phase 1, see `CLAUDE.md` §16.

---

## Repository layout

```
eyeon/
├── CLAUDE.md             # Canonical spec — read first
├── docker-compose.yml    # Local Postgres + Redis
├── .env.example          # Required environment variables
├── backend/              # Spring Boot 3.3 + Netty + JdbcTemplate (Phase 1)
├── frontend/             # Next.js 15 + Tailwind + Mapbox (Phase 2)
├── infra/                # Terraform + Nginx config (Phase 6)
├── scripts/              # Device simulator, load test (Phase 1, Phase 6)
└── docs/                 # GT06 protocol notes, API ref, runbook
```

---

## Status

**Current phase:** Pre-Phase 1 — repo skeleton only. No application code yet.

See `CLAUDE.md` §16 for the 6-phase, 12-week build plan.
