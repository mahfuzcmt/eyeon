# CLAUDE.md — EyeOn Vehicle GPS Tracking Platform

> This file is the canonical specification for building the Vehicle GPS Tracking Platform with Claude Code.
> When working in this codebase, Claude Code MUST read this file first and align all changes to its decisions.
> Updates to architecture, data model, or stack must be reflected here in the same PR.

---

## 1. Project Overview

**Product Name (brand):** EyeOn

**Origin:** EyeOn was forked from the MotoLink/PingPath codebase on 2026-09-21 (working tree copy, fresh git history, no shared remote). The two products evolve independently from that point; changes are not synced back.

**Naming (full rename completed 2026-09-21):** Everything says **EyeOn** / `eyeon`. Java package `com.webinnovation.eyeon`, main class `EyeOnApplication`, Maven `artifactId`/`finalName` `eyeon`, `spring.application.name: eyeon`, config-property prefix `eyeon.*`, env vars `EYEON_*`, Postgres database + user `eyeon`/`eyeon_dev`, Docker container names `eyeon-*`, frontend package `eyeon-frontend`, mobile package `eyeon-mobile`, Android/iOS package + bundle id `com.webinnovation.eyeon`, URL scheme `eyeon`, nginx upstreams `eyeon_backend`/`eyeon_frontend`, deploy path `/opt/eyeon`. Flyway migrations V1-V5 kept their filenames and version numbers but their header comments now say EyeOn; this is safe because EyeOn starts from an empty database. **Never point EyeOn at a PingPath/MotoLink database** - the Flyway checksums will not match and the DB/user names differ.

No inherited `motolink`/`pingpath` identifiers remain in the tree. (Correction 2026-09-21: `frontend/public/eyeon-logo.png` and `.jpg` were still the MOTOLINK wordmark and were shown in the marketing header/footer; both were deleted and replaced by the inline `components/brand/EyeOnLogo.tsx`.) The one deliberate exception is `wordpress-theme/brands-data.json`, which lists an unrelated third-party electronics brand also called "Motolink".

**Production (since 2026-09-21):** `https://eyeon.motolinkgps.com` on the shared VPS `ns.tracker.com` (`103.187.22.131`), which also runs PingPath/MotoLink production and other apps. Use `docker-compose.shared.yml`, never `scripts/deploy_vps.sh`, on that box - see `docs/DEPLOYMENT.md` "Shared server", including the rule that compose services must be named `eyeon-*` (a generic `frontend`/`backend` service name took kosailagbe.com down for ~25 s). Trackers connect to `103.187.22.131:5024`.

**Domain placeholders:** `eyeongps.com`, `app.eyeongps.com`, `api.eyeongps.com`, `mobile.eyeongps.app`, `admin@eyeon.local`, SMS sender id `EYEON`. Replace these with the real EyeOn domain/sender before any deploy.

**Primary audience (changed 2026-09-21): family safety.** EyeOn is sold mainly as a tracker for **children and elderly relatives** - a small device in a bag, on a lanyard or on the wrist, and a phone app for the carer (poster tagline: `চোখে চোখে রাখুন, ও যেখানেই থাকুক।`). Headline features: live location, safe-zone (trusted place) alerts, geofence, SOS button, route history, long battery, fully Bengali app. The app user is the carer, never the wearer. The roadmap for this audience is [`docs/FAMILY_SAFETY_PLAN.md`](docs/FAMILY_SAFETY_PLAN.md); it audits each poster feature against the code and takes precedence over §16 Phases 7-14 for prioritisation. The vehicle/fleet capability below is inherited, still works, and remains a secondary market - but no fleet vocabulary (vehicle, driver, fuel, ignition) should appear on a screen a family user can reach.

**People, not vehicles (decided 2026-09-21).** The tracked thing is a **person** - a child such as Rafi, Mahim or Jannatun - never a vehicle, and the corporate customer is a **school** (also coaching centres, madrasas, day-care); a family is simply a small organization. Consequences that are now implemented:
- **No trips.** Trips are an ignition concept. `TripService` is off unless `eyeon.trips.enabled=true` (default false; `TripServiceDisabledTest`), and the trips page, trip reports/exports, the Drivers and Scheduled-commands sections and every engine cut/restore control are removed from web and mobile (mobile: track tab, controls tab, the engine-locked badge and the `cutFuel`/`restoreFuel` client functions; the backend `/commands/cut-fuel` and `/restore-fuel` endpoints still exist but nothing calls them). Day statistics come from **`GET /devices/{imei}/activity`** and **`/activity/daily`** (`ActivityRepository`, window functions over `locations`): distance and moving time count only segments where the tracker reported >= 2 km/h, segments faster than 45 m/s (GPS jumps) or spanning a gap over 10 min are ignored. The history tab is the whole day's route with playback plus a plain-language timeline built from `PLACE_ARRIVED` / `PLACE_LEFT` / `GEOFENCE_*` / `SOS` alarms.
- **Vocabulary.** UI says person/people (`সদস্য`), never vehicle/fleet/driver/plate. `devices.vehicle_plate` is shown as "Class / ID (optional)"; `devices.vehicle_type` stores a person type `BOY` / `GIRL` / `PERSON` (anything else, including legacy `CAR`, renders as `PERSON`). `PATCH /devices/:imei` validates the type against `domain.enums.PersonType` and answers 400 `INVALID_PERSON_TYPE` otherwise (until 2026-09-21 it still required CAR/MOTORBIKE/..., so saving the edit form failed). Labels always put the **name first**, then class/ID, then IMEI. Column and DTO names (`vehiclePlate`, `vehicleType`) are inherited and unchanged - do not rename them without a migration plan.
- **Markers** are upright round avatars from `frontend/src/lib/personIcons.ts` (a person's face is never rotated); a small heading pointer appears only while moving. The mobile WebView map (`mobile/src/components/WebMap.tsx`) draws the same avatars: the badge never rotates, a separate `.ptr` layer carries the heading pointer, and callers set `MapVehicle.moving` so it only appears while moving. Keep the two implementations visually in sync.
- **Website** (`components/landing/*`) is rewritten for parents and schools and opens in Bengali. It must never show clients, testimonials, statistics, certifications, prices or specs that are not real: `PARTNER_SCHOOLS` in `pages/HomePage.tsx` and the testimonials array are empty by design and render nothing until real, consenting entries are added. The inherited site displayed logos of companies that were never EyeOn customers, invented testimonials and "150+ companies / BTRC certified"; all removed. The old `components/marketing/*`, `/industries` and `/products/[id]` are deleted.

**Product (inherited platform):** Multi-tenant SaaS platform for vehicle GPS fleet tracking, built around the Concox GT06 family of cellular GPS hardware trackers. Targets the Bangladesh market initially: motorbike anti-theft, ride-sharing fleets, delivery riders (Pathao/Foodpanda partners), CNG/taxi operators, school van services, logistics fleets. Native **Android + iOS** apps serve professional and corporate fleet clients (see §16 Phase 5).

**Owner:** Mahfuz Ahmed — Web Innovation
**Region:** Bangladesh (primary), with architecture that can serve other South Asian markets without rework.

**Business model:**
- One-time hardware sale: ৳3,000–8,000 per device + installation (benchmark: AutoNemo ৳4,000–9,000; see §23)
- Recurring SaaS subscription: ৳200–500/month per vehicle
- Tiered plans: Basic (live tracking + history), Pro (geofencing + alerts), Enterprise (API + multi-user + custom reports)

**Why this exists:**
- Existing Bangladesh GPS providers (FleetGuru, Tracker BD, Sebadex) ship dated UIs and English-only dashboards
- The market leader, **AutoNemo, is a GPSWox white-label reseller** (Android pkg `com.autonemovtsgpswox.track`) — they rent a generic platform and cannot deeply customize it. EyeOn owns its full stack, which is the core competitive edge. See `docs/COMPETITIVE_ANALYSIS.md`.
- Motorbike anti-theft is an underserved high-volume segment in Dhaka
- bKash/Nagad billing integration is missing from international platforms (Wialon, GPSWox)
- Bengali UI is required for last-mile workshop and end-user adoption

---

## 2. Tech Stack — Locked Decisions

| Layer | Technology | Version | Rationale |
|---|---|---|---|
| Backend language | Java | 21 (LTS) | Aligns with team expertise, virtual threads for connection scaling |
| Backend framework | Spring Boot | 3.3.4 | Modern, AOT support, latest virtual thread integration |
| TCP server | Netty | 4.1.114.Final | Industry standard for binary protocol servers |
| Database | PostgreSQL | 16.x | Reliable, mature; PostGIS for geospatial |
| Geospatial extension | PostGIS | 3.4 | Geofencing, distance queries, spatial indexes |
| Cache + pub/sub | Redis | 7.x | Last-known position cache, location event broadcasting |
| Message queue (later phase) | RabbitMQ | 3.13.x | Only when scaling beyond ~10K vehicles |
| Migrations | Flyway | 10.x | Versioned schema, no Liquibase XML |
| Auth | Spring Security + JJWT | 0.12.6 | Stateless JWT, refresh tokens |
| Frontend framework | Next.js | 15.x (App Router) | SSR + RSC, file-based routing |
| Frontend language | TypeScript | 5.x (strict mode) | No `any` allowed |
| UI framework | Tailwind CSS | 3.4.x | Utility-first, no design system framework |
| Map library | Leaflet + Google Maps base layer | Leaflet 1.9.x, `leaflet.gridlayer.googlemutant` 0.14.x | Switched from OSM tiles 2026-07-12: OSM misses Bangladesh roads/buildings/POIs. Google JS API rendered as a Leaflet layer (web `frontend/src/lib/leaflet.ts`, mobile WebView `mobile/src/components/WebMap.tsx`); free OSM/Esri fallback when `*_GOOGLE_MAPS_API_KEY` is unset. Mapbox no longer used. **Per-org key (2026-09-16, V14):** `organizations.google_maps_api_key` lets a customer bring their own browser key (Settings → Organization → Map, ORG_ADMIN; `PATCH /orgs/me { googleMapsApiKey }`, blank clears). Web applies it via `setGoogleMapsApiKey()` in `DashboardShell`; mobile reads it from `/orgs/me` on session start. Falls back to the platform env key. **Production** (2026-09-21) uses the same browser key as MotoLink (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `/opt/eyeon/.env`, compiled into the frontend at build time - a rebuild is needed after changing it); verified in a real browser with no `*MapError`. The mobile app reads the org key from `/orgs/me` or `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` at build time, otherwise it shows OpenStreetMap. |
| WebSocket client | @stomp/stompjs | 7.x | STOMP over WebSocket, matches Spring's broker |
| Mobile (Phase 5) | React Native + Expo | 51.x | Cross-platform end-user app |
| Container | Docker | 24+ | Local dev + production parity |
| Cloud | AWS Mumbai (ap-south-1) | — | Lowest latency to Bangladesh; consider OCI later for cost |
| CI/CD | GitHub Actions | — | Test, build, push image, deploy |
| Logging | Logback + JSON | — | Structured logs to CloudWatch |
| Monitoring | Prometheus + Grafana | — | Self-hosted on AWS EC2 |

**Forbidden choices** (do not introduce without updating this doc):
- Hibernate / JPA for hot-write paths — use `JdbcTemplate` for location inserts (orders of magnitude faster for time-series writes)
- MongoDB — PostgreSQL with PostGIS handles our scale
- Kafka — RabbitMQ is sufficient until proven otherwise
- React Router or Pages Router on the frontend — App Router only
- CSS-in-JS — Tailwind only
- Material UI / Ant Design / Chakra — custom Tailwind components only

---

## 3. Architecture

### 3.1 High-Level Components

```
┌─────────────────────┐
│ GT06 Vehicle Device │  Concox GT06N / Teltonika / Coban
│ (cellular SIM)      │
└──────────┬──────────┘
           │ TCP binary (port 5024)
           ▼
┌─────────────────────┐
│ Netty TCP Server    │  GT06 frame decoder + protocol handler
│ (in Spring Boot)    │  Sends ACK responses synchronously
└──────────┬──────────┘
           │ Decoded LocationData / AlarmData
           ▼
┌─────────────────────┐
│ Spring Boot Service │  LocationService → save + publish
│ Layer               │  AlarmService, GeofenceService, TripService
└──────┬───────┬──────┘
       │       │
       ▼       ▼
  ┌────────┐ ┌──────┐
  │PG +    │ │Redis │  PostGIS for cold storage + geofences
  │PostGIS │ │      │  Redis for hot cache + pub/sub
  └────────┘ └──┬───┘
                │ pub/sub: "location-events"
                ▼
         ┌─────────────┐
         │ WebSocket   │  STOMP over SockJS
         │ Gateway     │  Filters by org_id
         └──────┬──────┘
                │ wss://
                ▼
         ┌─────────────┐
         │ Next.js     │  Mapbox GL JS
         │ Dashboard   │  React Native (Phase 5)
         └─────────────┘
```

### 3.2 Critical Data Flow Rules

1. **Every location packet that passes CRC** is persisted to `locations` table. No filtering at ingestion.
2. **Every location** writes to Redis hot cache `device:last:{imei}` with 24-hour TTL.
3. **Every location** publishes to Redis channel `location-events` for WebSocket fanout.
4. **Side effects** (geofence checks, alarm dispatch, trip detection) hang off the same event — never block the ingestion path.
5. **WebSocket fanout filters by org_id** at the gateway. Never broadcast to all clients and filter on the browser.
6. **TCP ACKs are synchronous and immediate** — GT06 devices disconnect after 5 seconds without an ACK, causing reconnect storms.
7. **`devices.last_seen_at` is the server's receive time, never the packet's own clock** (fixed 2026-10-01). `locations.ts` keeps the tracker's time. A tracker without a GPS fix, or one replaying buffered points, stamps packets with an old time; writing that into `last_seen_at` made `DeviceStatusJob` (OFFLINE after 5 min) flip a connected, newly added tracker to OFFLINE within a minute of every location packet. Test: `LocationServiceTest.lastSeenIsServerReceiveTimeNotThePacketClock`.

### 3.3 Network Topology

- Netty TCP server: port `5024` (TCP, public, no TLS — GT06 doesn't support TLS)
- REST API: port `8081` (HTTPS via Nginx in prod)
- WebSocket: port `8081` (same backend, different path `/ws`)
- Frontend: port `3001` (dev), behind CloudFront in prod
- PostgreSQL: container port `5432`, published on host `5433` (private subnet only)
- Redis: container port `6379`, published on host `6380` (private subnet only)

**Every port is deliberately +1 from PingPath/MotoLink** (which uses 5023 / 8080 / 3000 / 5432 / 6379) so both stacks can run on the same machine at once. The session cookie is `eyeon_session` rather than `pp_session` for the same reason: browser cookies are shared across ports on the same host, so two stacks on `localhost` would otherwise clobber each other's login. Docker container names are `eyeon-*` and the compose project name comes from the `eyeon/` directory, so volumes are namespaced too.

---

## 4. Project Structure

```
eyeon/
├── CLAUDE.md                           # This file
├── README.md                           # Quick start
├── docker-compose.yml                  # Local dev orchestration
├── docker-compose.prod.yml             # Production override
├── .env.example
├── .github/workflows/
│   ├── backend.yml                     # CI for backend
│   └── frontend.yml                    # CI for frontend
│
├── backend/
│   ├── Dockerfile
│   ├── pom.xml
│   ├── src/main/java/com/webinnovation/eyeon/
│   │   ├── EyeOnApplication.java
│   │   │
│   │   ├── config/
│   │   │   ├── RedisConfig.java        # Pub/sub listener, RedisTemplate
│   │   │   ├── SecurityConfig.java     # JWT filter, endpoint rules
│   │   │   ├── WebSocketConfig.java    # STOMP broker registration
│   │   │   ├── NettyServerConfig.java  # Bootstrap, channel pipeline
│   │   │   ├── JacksonConfig.java      # Date/time module, snake_case
│   │   │   └── AsyncConfig.java        # Virtual thread executor
│   │   │
│   │   ├── netty/
│   │   │   ├── NettyServer.java        # Lifecycle: start, stop
│   │   │   ├── Gt06FrameDecoder.java   # Splits TCP stream into frames
│   │   │   ├── Gt06Handler.java        # Dispatches to protocol handlers
│   │   │   └── ChecksumUtil.java       # CRC-ITU implementation
│   │   │
│   │   ├── protocol/
│   │   │   ├── PacketType.java         # Enum: LOGIN, LOCATION_*, HEARTBEAT, ALARM, RFID, COMMAND_REPLY
│   │   │   ├── LoginPacket.java        # 0x01
│   │   │   ├── LocationPacket.java     # 0x12, 0x22, 0x32, 0xA0 (variant in field)
│   │   │   ├── HeartbeatPacket.java    # 0x13
│   │   │   ├── AlarmPacket.java        # 0x16
│   │   │   ├── RfidPacket.java         # 0x17
│   │   │   ├── CommandReplyPacket.java # 0x15
│   │   │   ├── PacketDecoder.java      # Routes by protocol number
│   │   │   ├── PacketEncoder.java      # Builds 0x80 server commands
│   │   │   └── AlarmType.java          # Enum mapping 0x01 SOS, 0xF2 Collision, etc
│   │   │
│   │   ├── domain/                     # POJOs / records, no JPA entities
│   │   │   ├── Organization.java
│   │   │   ├── User.java
│   │   │   ├── Device.java
│   │   │   ├── Location.java
│   │   │   ├── Alarm.java
│   │   │   ├── Geofence.java
│   │   │   ├── Trip.java
│   │   │   ├── Subscription.java
│   │   │   └── enums/
│   │   │       ├── DeviceStatus.java   # ONLINE, OFFLINE, NEVER_CONNECTED
│   │   │       ├── UserRole.java       # SUPER_ADMIN, ORG_ADMIN, ORG_USER
│   │   │       └── PlanTier.java       # BASIC, PRO, ENTERPRISE
│   │   │
│   │   ├── repository/                 # JdbcTemplate-based DAOs
│   │   │   ├── DeviceRepository.java
│   │   │   ├── LocationRepository.java
│   │   │   ├── AlarmRepository.java
│   │   │   ├── GeofenceRepository.java
│   │   │   ├── TripRepository.java
│   │   │   ├── OrganizationRepository.java
│   │   │   ├── UserRepository.java
│   │   │   └── SubscriptionRepository.java
│   │   │
│   │   ├── service/
│   │   │   ├── LocationService.java    # save + publish (HOT PATH)
│   │   │   ├── DeviceService.java      # provision, status, ownership lookup
│   │   │   ├── AlarmService.java       # dispatch SMS/push
│   │   │   ├── GeofenceService.java    # ST_Contains evaluation
│   │   │   ├── TripService.java        # ACC on/off → trip records
│   │   │   ├── AuthService.java        # login, JWT issue, refresh
│   │   │   ├── OrgService.java         # CRUD orgs, user invites
│   │   │   ├── ReportService.java      # daily / monthly PDF + Excel
│   │   │   ├── BillingService.java     # bKash subscription
│   │   │   ├── SmsService.java         # SSL Wireless integration
│   │   │   ├── PushService.java        # Expo Push Service (relays FCM/APNs)
│   │   │   ├── DeviceProvisioningService.java  # SMS-based GT06 config
│   │   │   └── DeviceCommandService.java       # 0x80 packet builder + dispatcher
│   │   │
│   │   ├── api/                        # REST controllers
│   │   │   ├── AuthController.java
│   │   │   ├── DeviceController.java
│   │   │   ├── LocationController.java
│   │   │   ├── GeofenceController.java
│   │   │   ├── TripController.java
│   │   │   ├── AlarmController.java
│   │   │   ├── ReportController.java
│   │   │   ├── OrgController.java
│   │   │   ├── BillingController.java
│   │   │   └── HealthController.java
│   │   │
│   │   ├── dto/                        # Request/response records
│   │   │   ├── auth/
│   │   │   ├── device/
│   │   │   ├── location/
│   │   │   ├── geofence/
│   │   │   ├── trip/
│   │   │   ├── alarm/
│   │   │   └── common/
│   │   │
│   │   ├── ws/
│   │   │   ├── LocationFanout.java     # Redis sub → STOMP topic
│   │   │   └── AlarmFanout.java        # Same for alarms
│   │   │
│   │   ├── security/
│   │   │   ├── JwtFilter.java
│   │   │   ├── JwtService.java
│   │   │   ├── TenantContext.java      # ThreadLocal org_id
│   │   │   └── TenantInterceptor.java  # Sets context per request
│   │   │
│   │   ├── job/
│   │   │   ├── DeviceStatusJob.java    # Mark offline if no heartbeat 10min
│   │   │   ├── ReportGenerationJob.java
│   │   │   ├── SubscriptionRenewalJob.java
│   │   │   └── DataRetentionJob.java   # Archive locations > 90 days
│   │   │
│   │   ├── exception/
│   │   │   ├── GlobalExceptionHandler.java
│   │   │   ├── DomainException.java
│   │   │   ├── NotFoundException.java
│   │   │   └── ForbiddenException.java
│   │   │
│   │   └── util/
│   │       ├── HexUtil.java
│   │       ├── DateTimeUtil.java
│   │       └── BangladeshLocale.java
│   │
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   ├── application-dev.yml
│   │   ├── application-prod.yml
│   │   ├── logback-spring.xml
│   │   └── db/migration/
│   │       ├── V1__initial_schema.sql
│   │       ├── V2__seed_data.sql
│   │       ├── V3__add_geofence_tables.sql
│   │       ├── V4__add_trips.sql
│   │       └── V5__add_subscriptions.sql
│   │
│   └── src/test/java/com/webinnovation/eyeon/
│       ├── netty/
│       │   ├── Gt06FrameDecoderTest.java
│       │   └── Gt06HandlerTest.java
│       ├── protocol/
│       │   └── PacketDecoderTest.java
│       └── service/
│           ├── LocationServiceTest.java
│           └── GeofenceServiceTest.java
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.js
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── .env.local.example
│   │
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                # Landing → redirect to /login or /dashboard
│   │   │   ├── globals.css
│   │   │   │
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   ├── dashboard/
│   │   │   │   ├── layout.tsx          # App shell with sidebar
│   │   │   │   ├── page.tsx            # Live fleet map (default view)
│   │   │   │   ├── devices/
│   │   │   │   │   ├── page.tsx        # Device list
│   │   │   │   │   └── [id]/page.tsx   # Device detail + trip history
│   │   │   │   ├── geofences/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── trips/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── alarms/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── reports/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── settings/
│   │   │   │   │   ├── page.tsx        # Org settings
│   │   │   │   │   ├── users/page.tsx  # Team management
│   │   │   │   │   └── billing/page.tsx # bKash subscription
│   │   │   │   └── admin/              # Super admin only
│   │   │   │       ├── orgs/page.tsx
│   │   │   │       └── devices/page.tsx
│   │   │   │
│   │   │   └── api/                    # Next.js API routes (proxy to backend)
│   │   │       └── proxy/[...path]/route.ts
│   │   │
│   │   ├── components/
│   │   │   ├── ui/                     # Atoms: Button, Input, Card, etc.
│   │   │   ├── map/
│   │   │   │   ├── FleetMap.tsx        # Live map with markers
│   │   │   │   ├── VehicleMarker.tsx
│   │   │   │   ├── TripPlayback.tsx    # Replay historical trips
│   │   │   │   └── GeofenceEditor.tsx
│   │   │   ├── device/
│   │   │   │   ├── DeviceList.tsx
│   │   │   │   ├── DeviceCard.tsx
│   │   │   │   ├── DeviceProvisioning.tsx
│   │   │   │   └── DeviceCommandPanel.tsx  # Cut fuel, query, etc.
│   │   │   ├── alarm/
│   │   │   │   ├── AlarmList.tsx
│   │   │   │   └── AlarmBanner.tsx
│   │   │   └── shell/
│   │   │       ├── Sidebar.tsx
│   │   │       ├── Topbar.tsx
│   │   │       └── LanguageToggle.tsx  # Bengali / English
│   │   │
│   │   ├── lib/
│   │   │   ├── api.ts                  # Axios instance, interceptors
│   │   │   ├── ws.ts                   # STOMP client
│   │   │   ├── auth.ts                 # JWT storage, refresh
│   │   │   ├── i18n.ts                 # Bengali / English strings
│   │   │   ├── format.ts               # Numbers, dates in BD locale
│   │   │   └── mapbox.ts               # Token, default style, helpers
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useDevices.ts
│   │   │   ├── useLiveLocations.ts
│   │   │   └── useGeofences.ts
│   │   │
│   │   ├── types/
│   │   │   ├── api.ts                  # API response types
│   │   │   └── domain.ts               # Domain types matching backend
│   │   │
│   │   └── styles/
│   │       └── (additional Tailwind layers if needed)
│   │
│   └── public/
│       ├── logo.svg
│       └── favicon.ico
│
├── mobile/                             # Phase 5 — React Native end-user app
│   └── (built later)
│
├── infra/
│   ├── nginx/
│   │   └── nginx.conf
│   ├── terraform/                      # AWS infrastructure as code
│   │   ├── main.tf
│   │   ├── ec2.tf
│   │   ├── rds.tf
│   │   ├── elasticache.tf
│   │   └── networking.tf
│   └── ansible/                        # Server config (alternative)
│       └── playbook.yml
│
├── scripts/
│   ├── seed_dev_data.sql
│   ├── simulate_device.py              # Python GT06 device simulator for testing
│   └── load_test.py                    # 1000 simulated devices
│
└── docs/
    ├── ARCHITECTURE.md
    ├── GT06_PROTOCOL.md                # Annotated from Concox doc
    ├── API.md                           # Full REST API reference
    ├── DEPLOYMENT.md
    ├── BANGLADESH_INTEGRATIONS.md      # bKash, SSL Wireless, APNs
    └── DEVICE_PROVISIONING.md          # Workshop technician guide (Bengali + English)
```

---

## 5. Database Schema

All tables use UUID primary keys (`gen_random_uuid()`), `created_at` and `updated_at` timestamps, and explicit `org_id` for multi-tenant filtering.

### 5.1 Core Tables

```sql
-- ============================================================
-- V1__initial_schema.sql
-- ============================================================
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----- Organizations (tenants) -----
CREATE TABLE organizations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(255) NOT NULL,
    slug          VARCHAR(100) UNIQUE NOT NULL,
    plan_tier     VARCHAR(50) NOT NULL DEFAULT 'BASIC',
    status        VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE, SUSPENDED, CANCELLED
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address       TEXT,
    locale        VARCHAR(10) DEFAULT 'bn-BD',
    timezone      VARCHAR(50) DEFAULT 'Asia/Dhaka',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----- Users -----
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email         VARCHAR(255) UNIQUE NOT NULL,
    phone         VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(255),
    role          VARCHAR(50) NOT NULL DEFAULT 'ORG_USER', -- SUPER_ADMIN, ORG_ADMIN, ORG_USER
    is_active     BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_org ON users(org_id);

-- ----- Devices -----
CREATE TABLE devices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    imei            VARCHAR(20) UNIQUE NOT NULL,
    name            VARCHAR(255),
    sim_msisdn      VARCHAR(20),                 -- SIM phone number
    sim_iccid       VARCHAR(30),                 -- SIM ICCID
    vehicle_plate   VARCHAR(50),
    vehicle_type    VARCHAR(50),                 -- MOTORBIKE, CAR, TRUCK, CNG, BUS
    protocol        VARCHAR(20) NOT NULL DEFAULT 'GT06',
    protocol_variant VARCHAR(10),                -- V1.8, V3, V4, 4G
    model           VARCHAR(100),                -- Concox GT06N etc.
    status          VARCHAR(50) NOT NULL DEFAULT 'NEVER_CONNECTED',  -- ONLINE, OFFLINE, NEVER_CONNECTED
    last_seen_at    TIMESTAMPTZ,
    last_location   GEOGRAPHY(POINT, 4326),
    last_speed      INTEGER,
    last_course     INTEGER,
    last_voltage_mv INTEGER,
    icon_color      VARCHAR(20) DEFAULT '#E8900A',
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_devices_org ON devices(org_id);
CREATE INDEX idx_devices_imei ON devices(imei);
CREATE INDEX idx_devices_status ON devices(org_id, status);

-- ----- Locations (time-series) -----
CREATE TABLE locations (
    id            BIGSERIAL PRIMARY KEY,
    device_imei   VARCHAR(20) NOT NULL,
    org_id        UUID NOT NULL,                  -- denormalized for query speed
    ts            TIMESTAMPTZ NOT NULL,
    received_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    geom          GEOGRAPHY(POINT, 4326) NOT NULL,
    latitude      DOUBLE PRECISION NOT NULL,
    longitude     DOUBLE PRECISION NOT NULL,
    speed         INTEGER NOT NULL DEFAULT 0,     -- km/h
    course        INTEGER NOT NULL DEFAULT 0,     -- 0-360 degrees
    altitude      INTEGER,
    satellites    INTEGER,
    valid         BOOLEAN NOT NULL DEFAULT true,  -- GPS fix valid
    acc_on        BOOLEAN,                        -- Ignition on/off
    voltage_mv    INTEGER,                         -- External voltage in millivolts
    mileage_m     BIGINT,                          -- Cumulative meters
    raw_payload   BYTEA                            -- Optional: store raw frame for debugging
);

CREATE INDEX idx_locations_device_ts ON locations(device_imei, ts DESC);
CREATE INDEX idx_locations_org_ts ON locations(org_id, ts DESC);
CREATE INDEX idx_locations_geom ON locations USING GIST(geom);

-- Partition by month for retention/performance (optional Phase 2)
-- ALTER TABLE locations ... PARTITION BY RANGE (ts);

-- ----- Alarms -----
CREATE TABLE alarms (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id        UUID NOT NULL,
    device_imei   VARCHAR(20) NOT NULL,
    type          VARCHAR(50) NOT NULL,           -- SOS, POWER_CUT, SHOCK, OVERSPEED, GEOFENCE_ENTER, GEOFENCE_EXIT, COLLISION, ACC_ON, ACC_OFF
    severity      VARCHAR(20) NOT NULL,           -- INFO, WARNING, CRITICAL
    ts            TIMESTAMPTZ NOT NULL,
    geom          GEOGRAPHY(POINT, 4326),
    latitude      DOUBLE PRECISION,
    longitude     DOUBLE PRECISION,
    acknowledged  BOOLEAN NOT NULL DEFAULT false,
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMPTZ,
    metadata      JSONB DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alarms_org_ts ON alarms(org_id, ts DESC);
CREATE INDEX idx_alarms_device ON alarms(device_imei, ts DESC);
CREATE INDEX idx_alarms_unack ON alarms(org_id, acknowledged, ts DESC) WHERE acknowledged = false;

-- ----- Geofences -----
CREATE TABLE geofences (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name          VARCHAR(255) NOT NULL,
    type          VARCHAR(20) NOT NULL,           -- CIRCLE, POLYGON
    geom          GEOGRAPHY NOT NULL,             -- Polygon for both (circle = polygon approximation)
    radius_m      INTEGER,                         -- Only for CIRCLE type
    center        GEOGRAPHY(POINT, 4326),         -- Only for CIRCLE type
    color         VARCHAR(20) DEFAULT '#0F2742',
    notify_on     VARCHAR(20) NOT NULL DEFAULT 'BOTH',  -- ENTER, EXIT, BOTH
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_geofences_org ON geofences(org_id) WHERE is_active = true;
CREATE INDEX idx_geofences_geom ON geofences USING GIST(geom) WHERE is_active = true;

-- Many-to-many: which devices are watched by which geofences
CREATE TABLE geofence_devices (
    geofence_id   UUID NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
    device_imei   VARCHAR(20) NOT NULL,
    PRIMARY KEY (geofence_id, device_imei)
);

-- Track current state to fire enter/exit transitions (no double-firing)
CREATE TABLE geofence_states (
    geofence_id   UUID NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
    device_imei   VARCHAR(20) NOT NULL,
    is_inside     BOOLEAN NOT NULL,
    last_change_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (geofence_id, device_imei)
);

-- ----- Trips -----
CREATE TABLE trips (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id        UUID NOT NULL,
    device_imei   VARCHAR(20) NOT NULL,
    started_at    TIMESTAMPTZ NOT NULL,
    ended_at      TIMESTAMPTZ,
    start_geom    GEOGRAPHY(POINT, 4326),
    end_geom      GEOGRAPHY(POINT, 4326),
    distance_m    INTEGER NOT NULL DEFAULT 0,
    duration_s    INTEGER,
    max_speed     INTEGER NOT NULL DEFAULT 0,
    avg_speed     INTEGER NOT NULL DEFAULT 0,
    idle_time_s   INTEGER NOT NULL DEFAULT 0,
    status        VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS', -- IN_PROGRESS, COMPLETED
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trips_org_started ON trips(org_id, started_at DESC);
CREATE INDEX idx_trips_device_started ON trips(device_imei, started_at DESC);
CREATE INDEX idx_trips_in_progress ON trips(device_imei) WHERE status = 'IN_PROGRESS';

-- ----- Subscriptions / Billing -----
CREATE TABLE subscriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    device_imei     VARCHAR(20) NOT NULL,
    plan_tier       VARCHAR(50) NOT NULL,
    monthly_price_bdt INTEGER NOT NULL,
    started_at      DATE NOT NULL,
    next_due_at     DATE NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, GRACE, SUSPENDED, CANCELLED
    auto_renew      BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id),
    org_id          UUID NOT NULL,
    amount_bdt      INTEGER NOT NULL,
    method          VARCHAR(20) NOT NULL,        -- BKASH, NAGAD, BANK, CASH
    bkash_trx_id    VARCHAR(100),                 -- bKash transaction ID
    nagad_ref       VARCHAR(100),
    status          VARCHAR(20) NOT NULL,        -- PENDING, SUCCESS, FAILED, REFUNDED
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----- Audit log -----
CREATE TABLE audit_log (
    id            BIGSERIAL PRIMARY KEY,
    org_id        UUID,
    user_id       UUID,
    action        VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id   VARCHAR(100),
    metadata      JSONB,
    ip_address    INET,
    user_agent    TEXT,
    ts            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_org_ts ON audit_log(org_id, ts DESC);
```

### 5.2 Schema Conventions

- **Always include `org_id`** on tenant-scoped tables, even when joinable through another table. Denormalization buys query speed.
- **All timestamps are `TIMESTAMPTZ`** stored in UTC. Display layer converts to `Asia/Dhaka`.
- **Geographic coordinates** use SRID 4326 (WGS84) — the GPS standard.
- **Use `geography` not `geometry`** for storage — automatic distance in meters, no projection issues.
- **Speed in km/h, distance in meters, voltage in millivolts** — integer fields, no floats for these.

---

## 6. GT06 Protocol Implementation

### 6.1 Frame Structure

The protocol has **two frame variants** that share semantics but differ in the length field:

| Variant | Start bytes | Length field | Usage |
|---|---|---|---|
| Standard | `0x78 0x78` | 1 byte | Login, location, heartbeat, alarm, RFID, server commands |
| Extended | `0x79 0x79` | 2 bytes | ICCID upload, voltage data, photos (some variants) |

All frames end with `0x0D 0x0A`.

```
[Start:2] [Length:1or2] [ProtocolNumber:1] [Content:N] [Serial:2] [CRC-ITU:2] [Stop:2]
```

### 6.2 Protocol Numbers — Complete List

| Hex | Type | Direction | Variant Notes |
|---|---|---|---|
| `0x01` | Login | Device → Server | First packet after TCP connect |
| `0x12` | Location V1.8 | Device → Server | Lat/lng = (deg×60 + min) × 30000 |
| `0x22` | Location V3 | Device → Server | Lat/lng = raw / 1800000.0; includes ACC, mileage |
| `0x32` | Location V4 | Device → Server | V3 + 4-byte cell ID, voltage, ACC time |
| `0xA0` | Location 4G | Device → Server | 4-byte LAC, 8-byte cell ID, 1-or-2 byte MNC |
| `0x13` | Heartbeat / Status | Device → Server | Sent every ~3 minutes |
| `0x16` | Alarm | Device → Server | Location + status + alarm code |
| `0x17` | RFID swipe | Device → Server | Driver identification |
| `0x15` | Command reply | Device → Server | Response to 0x80 server command |
| `0x80` | Server command | Server → Device | DYD, HFYD, DWXX, SETUP, etc. |
| `0x1A` | Address query | Device → Server | Phone-initiated |

### 6.3 Coordinate Encoding — CRITICAL

This is the #1 source of bugs. **Different protocol variants use different formulas.**

**V1.8 (0x12):**
```
raw = readUInt32(buf)
decimal = raw / 30000.0      // result is in minutes
degrees = floor(decimal / 60) + (decimal % 60) / 60.0
```

**V3 / V4 / 4G (0x22, 0x32, 0xA0):**
```
raw = readUInt32(buf)
degrees = raw / 1800000.0    // direct division
```

**Sign:** Course-status field, byte 1 — the hemisphere bits are **asymmetric** (per the Concox doc and Traccar's `Gt06ProtocolDecoder`; corrected 2026-07-08, commit `ef669db` fixed the code but not this doc):
- **Latitude, bit 10 (0x0400): 0 = South, 1 = North** — a Dhaka device sends 1
- **Longitude, bit 11 (0x0800): 0 = East, 1 = West** — a Dhaka device sends 0

Getting this symmetric ("bit set = N/E") puts every Bangladesh vehicle at (23.78, −90.42) — the Gulf of Mexico.

### 6.4 Login Handler (0x01) — Detailed

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class LoginHandler {

    private final DeviceService deviceService;
    private final PacketEncoder encoder;

    public void handle(ChannelHandlerContext ctx, ByteBuf frame, int serial) {
        // Frame is positioned right after protocol number byte
        // Next 8 bytes are the BCD-encoded IMEI (15 digits packed into 8 bytes with leading 0 nibble)
        byte[] imeiBytes = new byte[8];
        frame.readBytes(imeiBytes);
        String imei = decodeBcdImei(imeiBytes);

        log.info("Login from IMEI={} channel={}", imei, ctx.channel().id());

        // Always ACK first — even if device is unknown
        ByteBuf ack = encoder.buildLoginAck(serial);
        ctx.writeAndFlush(ack);

        // Look up org
        Optional<Device> deviceOpt = deviceService.findByImei(imei);
        if (deviceOpt.isEmpty()) {
            log.warn("Unregistered IMEI {} — keeping connection but flagging", imei);
            ctx.channel().attr(IMEI_KEY).set(imei);
            ctx.channel().attr(REGISTERED_KEY).set(false);
            // DO NOT disconnect — burns customer GPRS in reconnect loop
            return;
        }

        Device device = deviceOpt.get();
        ctx.channel().attr(IMEI_KEY).set(imei);
        ctx.channel().attr(ORG_ID_KEY).set(device.getOrgId());
        ctx.channel().attr(REGISTERED_KEY).set(true);

        deviceService.markOnline(imei);
    }

    private String decodeBcdImei(byte[] bcd) {
        StringBuilder sb = new StringBuilder(15);
        for (byte b : bcd) {
            sb.append((b >> 4) & 0x0F);
            sb.append(b & 0x0F);
        }
        return sb.length() > 15 ? sb.substring(sb.length() - 15) : sb.toString();
    }
}
```

### 6.5 Location Handler — Variant-Aware

```java
public LocationData decode(ByteBuf buf, int protocolNumber) {
    LocationData loc = new LocationData();
    loc.setTimestamp(decodeDateTime(buf));   // 6 bytes UTC

    int gpsByte = buf.readUnsignedByte();
    loc.setGpsInfoLength((gpsByte >> 4) & 0x0F);
    loc.setSatellites(gpsByte & 0x0F);

    long latRaw = buf.readUnsignedInt();
    long lonRaw = buf.readUnsignedInt();
    loc.setSpeed(buf.readUnsignedByte());

    int courseStatus = buf.readUnsignedShort();
    loc.setCourse(courseStatus & 0x03FF);
    loc.setValid((courseStatus & 0x1000) != 0);
    // Asymmetric hemisphere bits (see §6.3): lat bit CLEAR = south, lng bit SET = west
    boolean south = (courseStatus & 0x0400) == 0;
    boolean west  = (courseStatus & 0x0800) != 0;

    double lat, lon;
    if (protocolNumber == 0x12) {
        // V1.8: degrees-minutes encoding
        lat = (latRaw / 30000.0) / 60.0;
        lon = (lonRaw / 30000.0) / 60.0;
    } else {
        // V3, V4, 4G: direct division
        lat = latRaw / 1800000.0;
        lon = lonRaw / 1800000.0;
    }
    if (south) lat = -lat;
    if (west)  lon = -lon;
    loc.setLatitude(lat);
    loc.setLongitude(lon);

    // LBS (cell tower) data — variant differences for 4G
    if (protocolNumber == 0xA0) {
        // 4G: 2-byte MCC (high bit signals MNC length), 1-or-2 byte MNC, 4-byte LAC, 8-byte cell ID
        int mcc = buf.readUnsignedShort();
        boolean mncLong = (mcc & 0x8000) != 0;
        loc.setMcc(mcc & 0x7FFF);
        loc.setMnc(mncLong ? buf.readUnsignedShort() : buf.readUnsignedByte());
        loc.setLac((int) buf.readUnsignedInt());
        loc.setCellId(buf.readLong());
    } else {
        loc.setMcc(buf.readUnsignedShort());
        loc.setMnc(buf.readUnsignedByte());
        loc.setLac(buf.readUnsignedShort());
        loc.setCellId(read24BitInt(buf));
    }

    // V3/V4/4G additional fields
    if (protocolNumber == 0x22 || protocolNumber == 0x32 || protocolNumber == 0xA0) {
        loc.setAccOn(buf.readUnsignedByte() == 1);
        loc.setUploadMode(buf.readUnsignedByte());
        loc.setRealtimeFlag(buf.readUnsignedByte());
        loc.setMileageMeters(buf.readUnsignedInt() * 1000L);  // km → m
    }

    if (protocolNumber == 0x32 || protocolNumber == 0xA0) {
        loc.setVoltageMv(buf.readUnsignedShort() * 10);  // 0.01V → mV
    }
    if (protocolNumber == 0x32) {
        loc.setAccOnTimeSeconds(buf.readUnsignedInt());
        buf.skipBytes(2);  // reserved
    }

    return loc;
}
```

### 6.6 CRC-ITU (X.25 CRC-16)

**This is NOT standard CRC-16 — and it is the REFLECTED (X.25) variant.** An earlier
revision of this section showed the MSB-first non-reflected table; that variant
produces different values and real Concox devices reject it (corrected 2026-07-12
after `scripts/simulate_device.py` shipped with the non-reflected version and every
simulator frame was dropped with "CRC mismatch"). The shipped
`netty/ChecksumUtil.java` is the reference:

```java
public final class ChecksumUtil {
    private static final int[] TABLE = new int[256];
    static {
        // Reflected polynomial 0x8408 (0x1021 bit-reversed), init 0xFFFF, XOR-out 0xFFFF
        for (int i = 0; i < 256; i++) {
            int crc = i;
            for (int j = 0; j < 8; j++) {
                crc = (crc & 1) != 0 ? (crc >>> 1) ^ 0x8408 : crc >>> 1;
            }
            TABLE[i] = crc;
        }
    }

    public static int crcItu(ByteBuf buf, int offset, int length) {
        int crc = 0xFFFF;
        for (int i = 0; i < length; i++) {
            crc = (crc >>> 8) ^ TABLE[(crc ^ buf.getByte(offset + i)) & 0xFF];
        }
        return crc ^ 0xFFFF;
    }
}
```

CRC is computed over: `[Length] [ProtocolNumber] [Content] [Serial]` — i.e. everything between the start bits and the CRC field itself.

### 6.7 Server Command Packets (0x80)

Used to send commands like cut fuel (`DYD`), restore fuel (`HFYD`), query address (`DWXX`).

```
[0x78 0x78] [Length] [0x80] [CmdLen:1] [ServerFlag:4] [CmdContent:M ASCII] [Serial:2] [CRC:2] [0x0D 0x0A]
```

**Important:** Command content is ASCII (e.g., `"DYD,000000#"`), CmdLen = 4 (server flag) + length of ASCII string.

### 6.8 Alarm Codes (from Concox doc, latter byte of Alarm/Language field)

```java
public enum AlarmType {
    NORMAL(0x00),
    SOS(0x01),
    POWER_CUT(0x02),
    SHOCK(0x03),
    OVERSPEED(0x06),
    GEOFENCE_OUT(0x09),
    EXTERNAL_LOW_VOLTAGE(0x0E),
    REMOVE(0x13),
    DOOR(0x14),
    BATTERY_LOW(0x19),
    URGENT_ACCELERATION(0xF0),
    URGENT_DECELERATION(0xF1),
    COLLISION(0xF2),
    ACC_ON(0xFE),
    ACC_OFF(0xFF);

    public final int code;
    AlarmType(int code) { this.code = code; }
}
```

---

## 7. Backend Service Contracts

### 7.1 LocationService (HOT PATH)

```java
public interface LocationService {
    /** Persist + cache + publish. Called from Netty handler thread — must be fast. */
    void saveAndBroadcast(LocationData loc);

    /** Most recent N locations for a device. */
    List<Location> getHistory(String imei, Instant from, Instant to, int limit);

    /** Last-known position from Redis hot cache. */
    Optional<Location> getLastKnown(String imei);

    /** All last-known positions for an org (for dashboard initial load). */
    List<Location> getAllLastKnown(UUID orgId);

    /** Locations within a bounding box — for map viewport queries. */
    List<Location> getInBoundingBox(UUID orgId, double minLat, double minLng,
                                    double maxLat, double maxLng, Instant since);
}
```

### 7.2 GeofenceService

```java
public interface GeofenceService {
    Geofence create(UUID orgId, GeofenceCreateRequest req);
    Geofence update(UUID orgId, UUID id, GeofenceUpdateRequest req);
    void delete(UUID orgId, UUID id);
    List<Geofence> listForOrg(UUID orgId);
    void assignToDevice(UUID orgId, UUID geofenceId, String imei);
    void unassignFromDevice(UUID orgId, UUID geofenceId, String imei);

    /** Called from LocationService after every save. Fires alarms on transitions. */
    void evaluate(LocationData loc);
}
```

`evaluate` queries for all geofences assigned to the device, runs `ST_Contains(geom, point)` for each, compares against the previous state in `geofence_states`, and fires `GEOFENCE_ENTER` / `GEOFENCE_EXIT` alarms only on transitions.

### 7.3 TripService

```java
public interface TripService {
    /** Called from LocationService after every save. Detects start/end. */
    void onLocation(Location loc, Device device);

    List<Trip> listForDevice(String imei, Instant from, Instant to);
    Trip getById(UUID orgId, UUID tripId);
    List<Location> getTripPoints(UUID orgId, UUID tripId);
}
```

**Trip detection rules:**
- **Start:** ACC transitions from off to on, OR speed > 5 km/h after 5+ minutes stationary
- **End:** ACC transitions from on to off AND speed = 0 for 3+ minutes, OR no movement for 10+ minutes
- **Distance:** sum of `ST_Distance` between consecutive points
- **Idle time:** time spent with speed=0 and ACC=on within the trip

### 7.4 DeviceProvisioningService

```java
public interface DeviceProvisioningService {
    /**
     * Sends GT06 SMS configuration to a SIM number.
     * Pushes commands one-by-one with 8-second delays via SMS gateway.
     */
    ProvisioningResult provision(String imei, String simMsisdn, ProvisioningConfig config);

    /** Wait for the device to call back with its first login packet. */
    boolean awaitFirstConnection(String imei, Duration timeout);
}

@Value
public class ProvisioningConfig {
    String adminPhone;       // SOS,A
    String apn;              // gpinternet, internet, blweb
    String serverHost;       // track.yourdomain.com
    int serverPort;          // 5024
    int gmtOffsetHours;      // 6 for Bangladesh
    int reportIntervalAccOn; // seconds, e.g. 30
    int reportIntervalAccOff; // seconds, e.g. 300
    String devicePassword;   // default 123456
}
```

The service generates these SMS commands in order:
```
SOS,A,{adminPhone}#
APN,{apn}#
SERVER,1,{serverHost},{serverPort},0#
GMT,E,{gmtOffsetHours},0#
TIMER,{accOn},{accOff}#
GPRS,ON#
RESET#
```

### 7.5 DeviceCommandService

Sends 0x80 packets to connected devices.

```java
public interface DeviceCommandService {
    CompletableFuture<String> cutFuel(String imei);             // DYD,{password}#
    CompletableFuture<String> restoreFuel(String imei);         // HFYD,{password}#
    CompletableFuture<String> queryAddress(String imei);        // DWXX,{password}#
    CompletableFuture<String> setOverspeedThreshold(String imei, int kmh);
    CompletableFuture<String> setCollisionAlarm(String imei, boolean enabled, int sensitivity);
    CompletableFuture<String> reboot(String imei);

    /** Generic raw command escape hatch. */
    CompletableFuture<String> sendRaw(String imei, String command, Duration timeout);
}
```

Uses an in-memory map of `imei → Channel` (populated by login handler) to find the open TCP connection. Tracks pending commands by serial number; resolves the future when the matching 0x15 reply arrives.

### 7.6 AlarmService

```java
public interface AlarmService {
    /** Triggered by AlarmPacket from device or by GeofenceService/TripService. */
    Alarm raise(UUID orgId, String imei, AlarmType type, double lat, double lng,
                Map<String, Object> metadata);

    void acknowledge(UUID orgId, UUID alarmId, UUID userId);
    List<Alarm> listForOrg(UUID orgId, AlarmFilter filter);

    /** Async: dispatch SMS + push + email per org notification settings. */
    void dispatch(Alarm alarm);
}
```

### 7.7 SmsService (SSL Wireless)

```java
public interface SmsService {
    /** Send transactional SMS. Returns provider message ID. */
    String send(String msisdn, String text);

    /** Bulk send (provisioning device commands). */
    Map<String, String> sendBulk(Map<String, String> recipientToText);
}
```

Implementation hits SSL Wireless API (`https://smsplus.sslwireless.com/api/v3/send-sms`).

**Critical-alarm SMS (implemented 2026-09-21; before that `AlarmService.raise` passed a `null` recipient, so no SOS text ever reached anyone).** Every CRITICAL alarm (SOS, REMOVE, POWER_CUT, COLLISION) calls `AlarmSmsService.sendCriticalAlarmSms` (`@Async`), which:
- texts every active user of the org **who has a phone number** and can see that tracker: users assigned to it in `user_devices` (the parents), plus ORG_ADMIN / SUPER_ADMIN / `see_all_devices` - the same visibility rule as push (`UserRepository.listAlarmSmsRecipients`);
- sends one message per distinct number, max `eyeon.sms.alarm-max-recipients` (10);
- texts at most once per tracker per alarm type per `eyeon.sms.alarm-cooldown-seconds` (120, Redis key `sms:alarm:{imei}:{type}`), because a held-down button repeats the packet; the alarm itself is still recorded every time. If Redis is down it sends anyway;
- writes the text with `NotificationComposer.composeSms` in the org's locale: `EyeOn SOS! রাফি-এর জরুরি সাহায্য দরকার। সময় সকাল ৮:০২। ম্যাপ: https://maps.google.com/?q=…`. Bengali is Unicode SMS (70 chars/segment), so this is 2 billed segments per parent;
- logs a WARN when **nobody** with a phone can see the tracker - the case that used to fail silently.

It only delivers when `SSL_SMS_API_TOKEN` is set; without it every message is logged as `[SMS-STUB]` and the dispatch line says `STUB MODE`. Parents must have a phone number on their user (Settings → Users) and be assigned to the child. Verified end to end on production with `scripts/smoke_trusted_places.py` (simulator `--sos` sends a real `0x16` packet with code `0x01`); that test skips its SMS checks when a real token is configured so it never texts a made-up number.

---

## 8. REST API Specification

**Base URL:** `https://api.eyeongps.com/api/v1`
**Auth:** `Authorization: Bearer {jwt}` on all endpoints except `/auth/*`

### 8.1 Auth

```
POST /auth/login              { email, password } → { accessToken, refreshToken, user, org }
POST /auth/refresh            { refreshToken } → { accessToken }
POST /auth/logout             {} → 204
POST /auth/change-password    { currentPassword, newPassword } → { accessToken, refreshToken }  (revokes all other sessions)
POST /auth/forgot-password    { email } → 204 always; texts a 6-digit code (15 min, 5 attempts, 3 codes/15 min) to users.phone via SSL Wireless (log stub when SSL_SMS_API_TOKEN is blank)
POST /auth/reset-password     { email, code, newPassword } → 204   (V16 password_reset_codes, hashed; implemented 2026-09-16)
GET  /auth/me                 → { user, org }
```

### 8.2 Organizations & Users

```
GET    /orgs/me               → { id, name, plan, ... }
PATCH  /orgs/me               { name, contact_email, ... } → { ... }

GET    /orgs/me/users         → User[]
POST   /orgs/me/users         { email, role, full_name } → User  (sends invite email)
PATCH  /orgs/me/users/:id     { role, is_active } → User
DELETE /orgs/me/users/:id     → 204
```

### 8.3 Devices

```
GET    /devices               ?status=ONLINE&q=plate → Device[]
POST   /devices               { imei, name, sim_msisdn, vehicle_plate, vehicle_type } → Device
GET    /devices/:imei         → Device
PATCH  /devices/:imei         { name, vehicle_plate, ... } → Device
DELETE /devices/:imei         → 204

POST   /devices/:imei/provision   { adminPhone, apn } → ProvisioningResult
POST   /devices/:imei/commands/cut-fuel       → { reply: "DYD=Success!" }
POST   /devices/:imei/commands/restore-fuel   → { reply: "HFYD=Success!" }
POST   /devices/:imei/commands/query-address  → { reply: "DWXX=Lat:..." }
POST   /devices/:imei/commands/raw            { command: "SPDADD,ON,10,2#" } → { reply }
```

### 8.4 Locations

```
GET /devices/:imei/locations/last           → Location
GET /devices/:imei/locations                ?from=ISO&to=ISO&limit=1000 → Location[]
GET /devices/locations/last                 → Location[]  (all devices, last-known)
GET /locations/in-bbox                      ?minLat&minLng&maxLat&maxLng&since=ISO → Location[]
```

### 8.5 Geofences

```
GET    /geofences                       ?kind=TRUSTED_PLACE|BOUNDARY → Geofence[]
POST   /geofences                       { name, type: "CIRCLE", center: {lat, lng}, radius_m, notify_on } → Geofence
POST   /geofences                       { name, type: "POLYGON", points: [{lat, lng}], notify_on } → Geofence
PATCH  /geofences/:id                   { name, notifyOn, color, kind, placeType, address, center, radiusM, polygon, exitBufferM, minDwellS } → Geofence
                                        (all optional; implemented 2026-09-21. Sending geometry or exitBufferM deletes that zone's geofence_states rows so the next sample re-seeds silently.)
DELETE /geofences/:id                   → 204
POST   /geofences/:id/devices/:imei     → 204  (assign)
DELETE /geofences/:id/devices/:imei     → 204  (unassign)
```

**Trusted places (V19, 2026-09-21).** `POST /geofences` also accepts `kind` (`TRUSTED_PLACE` | `BOUNDARY`, default `BOUNDARY`), `placeType` (`HOME SCHOOL COACHING MOSQUE HOSPITAL RELATIVE OTHER`) and `address`; `notifyOn` gained `NONE`. A trusted place must be a `CIRCLE` of 80-5000 m. Trusted places raise **`PLACE_ARRIVED` / `PLACE_LEFT`** (severity INFO, but pushed - the one exception to "INFO is never pushed" in `AlarmService.raise`); boundaries keep `GEOFENCE_ENTER` / `GEOFENCE_EXIT` (WARNING). Alarm metadata carries `geofenceId`, `geofenceName`, `geofenceKind`, `placeType`.

**Drift guards (`service/GeofenceTransition`, pure + unit-tested).** A crossing is first stored as a candidate in `geofence_states.pending_inside/pending_since` and commits only when a later sample agrees at least `min_dwell_s` (default 60) after it was first seen; leaving also requires being more than `exit_buffer_m` (default 30) beyond the edge (`ST_DWithin`). The alarm is stamped with the crossing time, not the confirmation time. Cost: alerts arrive `min_dwell_s` + one reporting interval late.

**Notification wording (`service/NotificationComposer`, pure + unit-tested).** Push title/body are composed per language - Bengali or English - from `push_tokens.locale` (V19; the language that phone's app is set to, sent by the mobile app on `POST /users/me/push-tokens { token, platform, locale }` and re-sent when the language changes), falling back to `organizations.locale`. There is **no `users.locale` column**, contrary to §12.3. Bengali templates are deliberately verb-free ("রাফি এখন School-এ") because verb endings change with respect and the backend does not know whether the wearer is a child or a grandparent. Place events use Android channel `arrivals` (normal importance); everything else uses `alarms`. Critical-alarm SMS is described in §7.7.

### 8.6 Activity (replaces Trips)

```
GET /devices/:imei/activity          ?from=ISO&to=ISO → { distanceM, movingS, stillS, maxSpeed, points, firstTs, lastTs }   (default: last 24 h)
GET /devices/:imei/activity/daily    ?from=ISO&to=ISO → [{ date: "YYYY-MM-DD" (Asia/Dhaka), distanceM, movingS, points }]   (max 93 days)
```

The `/trips` endpoints below still exist in the backend but nothing in EyeOn calls them and no trips are created while `eyeon.trips.enabled=false`.


```
GET /trips                          ?from=ISO&to=ISO&device=imei → Trip[]
GET /trips/:id                      → Trip
GET /trips/:id/points               → Location[]  (for replay)
```

### 8.7 Alarms

```
GET   /alarms                       ?type=&severity=&unack=true&from=&to= → Alarm[]
PATCH /alarms/:id/acknowledge       → Alarm
```

### 8.8 Reports

```
GET /reports/daily        ?date=YYYY-MM-DD&format=pdf|xlsx     → file
GET /reports/monthly      ?month=YYYY-MM&format=pdf|xlsx       → file
GET /reports/trip-summary ?device=imei&from=ISO&to=ISO         → file
```

### 8.9 Billing

```
GET  /billing/subscriptions               → Subscription[]
POST /billing/checkout/bkash              { subscription_id } → { redirect_url }
POST /billing/webhooks/bkash              (called by bKash on payment completion)
GET  /billing/invoices                    → Invoice[]
```

### 8.10 Standard Response Format

`IllegalArgumentException` → 400 `VALIDATION`, unreadable body → 400 `MALFORMED_REQUEST`, wrong HTTP method → 405 (added 2026-09-21; before that all three surfaced as a 500 "An unexpected error occurred"). The prod JSON log line carries the root-cause stack trace in an `ex` field (`ProdLogPatternTest`).

**Success:**
```json
{ "data": { ... } }   // or { "data": [ ... ], "page": { "total": 123, "limit": 50, "offset": 0 } }
```

**Error:**
```json
{ "error": { "code": "DEVICE_NOT_FOUND", "message": "...", "details": { ... } } }
```

HTTP status codes: 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 422 Unprocessable, 500 Internal.

---

## 9. WebSocket Specification

**Endpoint:** `wss://api.eyeongps.com/ws` (STOMP over SockJS fallback)
**Auth:** JWT in `Authorization` header during STOMP CONNECT frame.

### 9.0 Per-user delivery (since 2026-09-21) - read this first

**Live data is delivered per user, never per organization.** Clients subscribe to:

```
/user/queue/locations/batch   LocationView[] every ~10 s - only the children this user may see
/user/queue/alarms            AlarmView - child visible to this user; a geofence/place alarm only to its owner
/user/queue/locations         (single-location producer is currently unused)
```

`ws/LiveAudience` resolves, per organization, which user may see which child (admins and `see_all_devices` = everyone, others = their `user_devices` rows). It is cached for 30 s and invalidated by every user / assignment change in `OrgController`; `BatchLocationFanout` and `AlarmFanout` send each user a filtered copy with `convertAndSendToUser`. `StompAuthChannelInterceptor` **refuses** any `/topic/org/...` subscription. The topics below are historical: they sent every child's live position to every parent in a school (§9.3's org check did not stop that), and the mobile app listened on `/topic/org/{orgId}/locations`, which nothing published, so it never updated live. Covered by `LiveFanoutPrivacyTest` and, end to end, `scripts/smoke_privacy.py`.

### 9.1 Server → Client Topics (historical - closed)

```
/topic/org/{orgId}/locations     LocationEvent on every device location
/topic/org/{orgId}/alarms        AlarmEvent on every new alarm
/topic/org/{orgId}/devices/status DeviceStatusEvent on online/offline transitions
```

### 9.2 LocationEvent JSON

```json
{
  "imei": "864290061234567",
  "ts": "2026-05-07T10:23:45Z",
  "lat": 23.8103,
  "lng": 90.4125,
  "speed": 32,
  "course": 145,
  "valid": true,
  "accOn": true,
  "voltageMv": 12340
}
```

### 9.3 Subscription Authorization

Server-side `ChannelInterceptor` on STOMP SUBSCRIBE: parse the topic, extract `orgId`, compare against the authenticated user's `orgId`. Reject with `MessageDeliveryException` if mismatch.

---

## 10. Frontend — Page-by-Page Spec

### 10.1 Design Direction

**Aesthetic (changed 2026-09-21): warm, calm, family safety.** Light theme. Deep teal + warm yellow taken from the product poster; rounded corners; rounded, friendly type; large controls. Carers of elderly relatives are a core audience, so **every text/background pair must be >= 4.5:1 (WCAG AA)** and nothing renders below 12px. The earlier "mission-control dark theme" and the ADL Moto Viewer blue (`#0421bc`) are retired; the ADL *layout* of the monitor screen (§10.3) is kept.

**Color tokens** (source of truth: `frontend/tailwind.config.ts`; mobile mirror: `mobile/src/theme.ts`):
```js
colors: {
  brand:   { 50: '#E8F5F2', 500: '#0F6B5C' /* primary teal, 6.4:1 on white */, 600: '#0C5A4D', 900: '#052822' },
  sun:     { 100: '#FFEEC2', 400: '#FFC857' /* accent; pair with ink-900, never white */, 600: '#D9971F' },
  surface: { 0: '#ffffff', 100: '#EEF4F2' /* page bg */, 300: '#D2DEDA' /* border */ },
  ink:     { 400: '#637370' /* lightest text allowed */, 500: '#52625F', 700: '#2B3B38', 900: '#0B2E28' },
  alarm:   { red: '#D92D20', amber: '#B45309', green: '#15803D' },   // dark enough to use as text
  status:  { moving: '#16A34A', stopped: '#2563EB', idle: '#D97706', offline: '#6B7A77' },
}
```

**Typography** (self-hosted via `@fontsource`, loaded in `app/layout.tsx`):
- Body: `Nunito` 16px (17px for `lang="bn"`)
- Headings / `font-display`: `Baloo Da 2` - covers Latin and Bengali, matches the poster
- Bengali body: `Hind Siliguri`
- Monospace data (IMEI, coords): `JetBrains Mono`
- Mobile still uses the system font (no `expo-font` yet); sizes and colours match.

**Controls:** buttons and inputs are 40px tall with a 10px radius (44px under `@media (pointer: coarse)`; 52px `PrimaryButton` on mobile), chips and status pills are fully rounded, panels 12px, modals 16px. Keyboard focus is a 3px teal ring and must never be removed. Brand mark: `components/brand/EyeOnLogo.tsx` (eye with a location-pin pupil).

### 10.2 `/login`

- Centered card on dark background with subtle map tile texture overlay
- Brand logo top
- Email + password fields, "remember me" toggle
- "Forgot password?" link
- Bengali / English toggle in top-right corner

### 10.3 `/dashboard` (default landing)

Reworked 2026-09-15 to match (and tidy up) the ADL Moto Viewer live-monitoring screen, our main competitor reference (`docs/COMPETITIVE_ANALYSIS.md`). Light theme, Leaflet with Google/OSM base layer.

- Full-bleed map; the 52px icon rail is the only fixed chrome on Monitor (the secondary nav panel only appears for sections with sub-pages)
- **Floating vehicle panel** (340px card over the map, collapsible via edge handle): search → `All / Online / Offline / Inactive` tabs with counts → sort (`Speed / Name / Last update / Status`) + "Show all on map" → **group accordion** (Ungrouped first, then the user's own groups — groups and alarm rules are per user since V18 (`device_groups.owner_user_id`, `device_group_members`, `alarm_rules.owner_user_id`); collapse state in localStorage). Row = visibility checkbox, small vehicle icon, name, status text (`58 km/h` moving · `Idle 4 h 55 min` · stop duration for parked · `Offline 1 d 14 h` · `Expired` · `No Data`), online dot, `⋮` menu. **Unticking a row hides that vehicle from the map** (ADL behaviour).
- **Popup card** opens on row click / marker click / top-bar search (`FleetMap.createPopupContent`): name + edit pencil, IMEI, `speed (heading, state)` line, 2-column grid (driver, ignition, GPS time, positioning, power, battery, mileage, satellites), coordinates, reverse-geocoded address, and an action bar: Playback · Live · Navigate (Google Maps directions) · Geofence · Street view · Command · Share · Details. Buttons dispatch a `vehicleAction` window event handled by `dashboard/page.tsx`; auto-pan runs only on open, not on the periodic content refresh.
- Plate labels are hidden below zoom 13 except for the selected vehicle (`LABEL_MIN_ZOOM`); markers cluster below zoom 16.
- Top bar: global vehicle search (name / plate / IMEI / SIM → focuses the vehicle, or deep-links `/dashboard?focus={imei}` from other pages), brand + Live pill, notifications, language, user menu. No fake refresh counter — the real countdown sits bottom-right beside the freshness indicator.
- KPI strip floats top-centre of the map area (z ≥ 1000, above Leaflet panes).
- Real-time updates via WebSocket batches; marker moves animate with CSS transitions.
- **Alarm notifications (2026-09-16, V15):** every alarm that arrives live pops up as a toast on any dashboard page (`components/alarm/AlarmToast.tsx`, mounted in `DashboardShell`), optionally with a synthesized tone (`lib/alarmSound.ts`; CRITICAL repeats until acknowledged). Which types pop up / sound / push to the phone is per user: `user_notification_settings` (V15), `GET/PUT /users/me/notification-settings`, edited under Settings → Notifications (matrix + "Test sound" + "Preview popup"). `PushService` filters Expo pushes by each user's `push_types`. The alarm center (`/dashboard/alarms`) filters by type/severity/vehicle/date/unacked (`GET /alarms?type&severity&imei&from&to&unacked`), opens a map modal per alarm and exports Excel. Live STOMP alarm payloads use `imei`, not `deviceImei`; `useAlarms` normalises them. **ADL parity (V17):** `/dashboard/alarms` has *Alarm overview* (device × type counts, `GET /alarms/overview`, `/exports/alarm-overview.xlsx`) and *Alarm details* tabs; acknowledging opens a *Process* dialog (`POST /alarms/{id}/acknowledge {result: HANDLED|FALSE_ALARM|NO_ACTION, notes}`). Rules gained `PARKING_TIMEOUT` / `OFFLINE_TIMEOUT` / `IDLE_TIMEOUT` (threshold = minutes) evaluated by `AlarmRuleService.sweepStateRules()` every minute, raising `PARKING_TIMEOUT` / `OFFLINE_TIMEOUT` / `ENGINE_IDLE`. ADL's screens are documented in `docs/ADL_ALARM_SYSTEM.md`.
- Initial load: REST `/devices/locations/last`, then subscribe WS; the map fits the whole fleet once per map instance (flag reset on unmount so StrictMode/remount refits).

### 10.4 `/dashboard/devices`

- Table view: IMEI, name, vehicle plate, status, last seen, signal, speed, voltage
- Row actions: View on map, Edit, Provision, Send command, Suspend
- Top: "Add device" button → modal with form
- Filters: status, vehicle type, online/offline
- Bulk select for assigning to geofences

### 10.5 `/dashboard/devices/[id]`

- Three-panel layout: Map (left, 60%), Tabs (right, 40%)
- Tabs: Live, Trips, Alarms, Settings, Provision, Commands
- **Trips tab:** Date range picker, trip list, click trip to play back on map (animated polyline + moving marker, speed control)

### 10.6 `/dashboard/geofences`

- Map with all geofences drawn as polygons / circles
- Sidebar: list of geofences with toggles
- Top button: "Draw new" → enters drawing mode (click points for polygon, drag for circle)
- Each geofence has notification settings, assigned devices

### 10.7 `/dashboard/alarms`

- Filterable list: severity, type, date range, acknowledged
- Critical alarms (SOS, Collision) highlighted with pulsing red border
- Click alarm → opens map at location with timestamp
- "Acknowledge" button writes back to API

### 10.8 `/dashboard/reports`

- Pre-built reports: Daily fleet activity, Monthly trip summary, Geofence violations, Speed violations
- Date range, vehicle filter, format dropdown (PDF / Excel)
- Generated reports list below with download links

### 10.9 `/dashboard/settings/billing`

- Subscription cards: one per device with plan tier, next due date, status
- Bulk "Renew all" → bKash checkout
- Invoice history table

---

## 11. Multi-Tenancy

### 11.1 Implementation

- **Every database table** for tenant data has `org_id UUID NOT NULL`
- **Every repository method** that returns tenant data takes `orgId` as the first parameter
- **JWT contains `orgId`** in claims
- **`TenantContext`** is a `ThreadLocal<UUID>` set by `JwtFilter` on every request; cleared in `finally`
- **`@PreAuthorize("@orgGuard.matches(#orgId)")`** on controller methods that take an explicit org ID

### 11.2a Per-user privacy inside an organization (since 2026-09-21)

A school is one organization with many families, so org-level isolation is not enough. **A parent (ORG_USER without `see_all_devices`) may only ever read data about children assigned to them in `user_devices`.**
- **Every endpoint that takes an IMEI calls `DeviceAccessService.requireVisible(imei)`** (org + per-user, 404 either way). Until 2026-09-21 locations, activity, commands, share links, per-device reports/exports and `/devices/locations/last` checked only the organization, so any parent could read any child's history by IMEI.
- Organization-wide reports/exports/trips call `requireSeesAll()` (403 for parents); the Reports menu is `adminOnly`. Alarm exports and the dashboard KPIs are filtered to what the caller may see instead.
- **Geofences and trusted places are per user** (V21 `geofences.owner_user_id`, like groups/rules in V18): only the owner lists, edits, deletes or assigns them - not even an ORG_ADMIN sees another user's - and a place can only be attached to children the owner can see. Their alarms carry `metadata.geofenceOwnerId`; `AlarmRepository.OWNER_FILTER` / `visibleTo`, push (`PushTokenRepository ... onlyUserId`) and `AlarmFanout` deliver them to the owner alone, so a school admin is not told that a child reached a parent's private Home. If the owner loses access to the child, the place stops alerting. Two parents of the same child each keep their own places.
- `DeviceAccessService.visibleImeis(UUID)` (used by background code) returned an **empty set for admins** until 2026-09-21 (`Optional.map` of a null result), which silently disabled admins' "all children" alarm rules; see `DeviceAccessServiceTest`.
- Live test: `scripts/smoke_privacy.py` (two parents, one child each: 11 REST routes, place ownership, the WebSocket feed, alarm lists).

### 11.2 Cross-Tenant Protection

- Devices are looked up by `imei` AND `orgId` together — never just `imei` from a user-context query
- Background jobs that operate on data without a request context use system-level access tokens with explicit `orgId` parameter
- Audit log captures every cross-org or admin-level access

### 11.3 Super Admin

- `role = SUPER_ADMIN` users can switch into any org via `X-Org-Id` header
- All super-admin actions logged to `audit_log` with `action = SUPER_ADMIN_ACCESS`
- Separate `/admin` UI section, hidden from regular users

---

## 12. Bangladesh Integrations

### 12.1 bKash Payment Gateway

**Sandbox:** `https://tokenized.sandbox.bka.sh/v1.2.0-beta`
**Production:** `https://tokenized.pay.bka.sh/v1.2.0-beta`

**Flow:**
1. User clicks "Renew" → backend calls bKash `/tokenized/checkout/create` with `amount`, `merchantInvoiceNumber`, `payerReference`
2. Backend returns `bkashURL` to frontend
3. Frontend redirects user to bKash hosted checkout
4. User completes payment on bKash; bKash redirects back to `callbackURL`
5. Backend `/billing/webhooks/bkash` validates the payment via `/tokenized/checkout/execute`
6. On success, mark subscription paid + extend `next_due_at`

**Required env:**
```
BKASH_APP_KEY=
BKASH_APP_SECRET=
BKASH_USERNAME=
BKASH_PASSWORD=
BKASH_BASE_URL=https://tokenized.sandbox.bka.sh/v1.2.0-beta
BKASH_CALLBACK_URL=https://api.eyeongps.com/api/v1/billing/webhooks/bkash
```

**Library:** No official Java SDK. Use Spring `RestClient` with manual API calls.

### 12.2 SSL Wireless SMS

**Endpoint:** `https://smsplus.sslwireless.com/api/v3/send-sms`
**Method:** POST JSON

```json
{
  "api_token": "...",
  "sid": "EYEON",
  "msisdn": "8801XXXXXXXXX",
  "sms": "Your alarm: SOS triggered at 23.81, 90.41",
  "csms_id": "uuid-per-message"
}
```

**Required env:**
```
SSL_SMS_API_TOKEN=
SSL_SMS_SENDER_ID=EYEON
```

**Templates** for all transactional SMS in `bn-BD` and `en-US`, stored in `/sms-templates/` on disk or DB.

### 12.3 Bengali Language

- All UI strings in `lib/i18n.ts` with keys in English, values in both `en` and `bn`
- Language preference stored in `users.locale`, falls back to `organizations.locale`
- Numbers: format with `Intl.NumberFormat('bn-BD')` for Bengali numerals
- Dates: format with `Intl.DateTimeFormat('bn-BD', { timeZone: 'Asia/Dhaka' })`
- All SMS templates have Bengali variants
- Currency: BDT shown as `৳` symbol; format `৳ ৩৪০` for Bengali, `BDT 340` for English

### 12.4 Time Zone

- **Storage:** UTC always. `TIMESTAMPTZ` columns. Java code uses `Instant`, never `LocalDateTime`.
- **Display:** Convert at the React layer to `Asia/Dhaka` using user's locale
- **Reports:** Generated in `Asia/Dhaka` for human readability

---

## 13. Background Jobs

Implemented as `@Scheduled` Spring methods or Quartz, depending on persistence needs.

```java
@Scheduled(fixedRate = 60_000)   // every minute
public void markStaleDevicesOffline() { ... }
// Mark device OFFLINE if no heartbeat or location in last 10 minutes

@Scheduled(cron = "0 5 0 * * *", zone = "Asia/Dhaka")  // 00:05 daily
public void generateDailyReports() { ... }

@Scheduled(cron = "0 0 9 * * *", zone = "Asia/Dhaka")  // 09:00 daily
public void sendSubscriptionRenewalReminders() { ... }
// Reminder 7 days before due, 3 days before, on due date

@Scheduled(cron = "0 0 2 * * SUN", zone = "Asia/Dhaka")  // Sun 02:00
public void archiveOldLocations() { ... }
// Move locations > 90 days old to archive table or S3

@Scheduled(fixedRate = 30_000)  // every 30s
public void checkPendingDeviceCommands() { ... }
// Time out commands that haven't received a 0x15 reply
```

---

## 14. Authentication & Security

### 14.1 JWT Structure

```json
{
  "sub": "user-uuid",
  "org": "org-uuid",
  "role": "ORG_ADMIN",
  "iat": 1700000000,
  "exp": 1700003600
}
```

- Access token: 1 hour expiry
- Refresh token: 30 days, stored hashed in DB, rotates on each use
- Algorithm: HS256 with strong secret (32+ random bytes, env var)

### 14.2 Password Hashing

- Self-service: Settings → Account (change) and `/login/forgot` (SMS code reset). The Next.js BFF rotates the session cookie on change (`api/auth/change-password`); users without a phone must ask an ORG_ADMIN, who can set passwords via `PATCH /orgs/me/users/:id`.
- BCrypt with strength 12
- Forbid passwords < 8 chars, no complexity requirements (length is the meaningful factor)
- Track `password_changed_at` for forced rotation policies

### 14.3 Rate Limiting

- Login: 5 attempts per 15 minutes per IP
- API: 100 req/sec per user
- Provisioning SMS: 10 per hour per org (cost protection)

### 14.4 CORS

- Production: only `https://app.eyeongps.com`
- Dev: `http://localhost:3001`

### 14.5 Secrets Management

Environment variables only. Never commit. Use AWS Parameter Store or Secrets Manager in production.

---

## 15. Build & Deployment

### 15.1 Local Development (`docker-compose.yml`)

Services:
- `postgres` (postgres:16-alpine + postgis 3.4)
- `redis` (redis:7-alpine)
- `backend` (built from `./backend`)
- `frontend` (built from `./frontend`)

```bash
cp .env.example .env
docker compose up --build
# Backend: http://localhost:8081
# Frontend: http://localhost:3001
# Netty TCP: localhost:5024 (point your device simulator here)
```

### 15.2 Production — AWS Mumbai

**Recommended layout:**

| Service | AWS resource | Sizing (start) |
|---|---|---|
| Backend | ECS Fargate (2 tasks for HA) or single t3.medium EC2 | 2 vCPU, 4 GB |
| TCP Server | Same backend instance, port 5024 in NLB | — |
| PostgreSQL | RDS db.t3.medium, multi-AZ | 100 GB gp3 |
| Redis | ElastiCache cache.t3.micro | — |
| Frontend | CloudFront + S3 | — |
| Domain | Route 53 | — |
| TLS | ACM certificate | — |
| Logs | CloudWatch + retention 30 days | — |

**Estimated cost (Mumbai region, 100–500 vehicles):** $80–120/month.

### 15.3 CI/CD

GitHub Actions:
- On PR: run tests, build, lint
- On merge to `main`: build Docker images, push to ECR, deploy via ECS task update

---

## 16. Development Plan & Roadmap

### 16.1 Timeline Overview

```
2026 Q3-Q4 LAUNCH PLAN                    2027 ADVANCED ROADMAP
─────────────────────────────────────     ─────────────────────────────────────
│ Week │ 1-2 │ 3-4 │ 5-6 │ 7-8 │ 9-10 │ 11-12 │     │ M4 │ M5 │ M6-7 │ M8-9 │ M10-11 │ M12+ │
├──────┼─────┼─────┼─────┼─────┼──────┼───────┤     ├────┼────┼──────┼──────┼────────┼──────┤
│Phase │  1  │  2  │  3  │  4  │   5  │   6   │     │  7 │  8 │   9  │ 10-11│   12-13│  14  │
│      │Found│Dash │ Ops │ BD  │Mobile│ Prod  │     │Fleet│Fuel│  AI  │Track/│  IoT/  │ EV/  │
│      │ation│board│     │Polish│ App │Harden │     │ 2.0 │Mnt │      │Logis │Enterpr │Future│
└──────┴─────┴─────┴─────┴─────┴──────┴───────┘     └────┴────┴──────┴──────┴────────┴──────┘
        ▲                         ▲                       ▲                            ▲
        │                         │                       │                            │
   MVP Backend              First Customer           Enterprise              Market Leader
```

### 16.2 Resource Requirements

| Role | Phase 1-6 (Launch) | Phase 7-14 (Scale) | Notes |
|------|-------------------|-------------------|-------|
| **Backend Developer** | 1 FTE | 2 FTE | Java/Spring, Netty, PostgreSQL |
| **Frontend Developer** | 1 FTE | 1-2 FTE | Next.js, React Native |
| **DevOps/Infra** | 0.5 FTE | 1 FTE | AWS, Docker, CI/CD |
| **QA Engineer** | 0.5 FTE | 1 FTE | Manual + automated testing |
| **ML Engineer** | — | 1 FTE (Phase 9+) | Python, TensorFlow/PyTorch |
| **Product Manager** | 0.5 FTE | 1 FTE | Requirements, customer feedback |
| **Designer** | 0.25 FTE | 0.5 FTE | UI/UX, Bengali localization |

**Infrastructure Costs (Monthly Estimates):**
| Phase | AWS Mumbai | Notes |
|-------|-----------|-------|
| 1-4 (Dev) | $50-80 | VPS, dev database |
| 5-6 (Staging) | $100-150 | RDS, ElastiCache, ECS |
| Production (100 vehicles) | $120-180 | Full stack |
| Production (1000 vehicles) | $300-500 | Scaled instances |
| Production (10K vehicles) | $800-1200 | Multi-AZ, RabbitMQ |

### 16.3 Sprint Structure

Each phase follows a 2-week sprint cycle:

```
Week 1                              Week 2
┌─────────────────────────────────┐ ┌─────────────────────────────────┐
│ Day 1-2: Planning & Design      │ │ Day 8-9: Integration & Polish   │
│ Day 3-5: Core Implementation    │ │ Day 10: Testing & Bug Fixes     │
│ Day 6-7: Component Development  │ │ Day 11-12: Documentation        │
│                                 │ │ Day 13-14: Demo & Review        │
└─────────────────────────────────┘ └─────────────────────────────────┘
```

**Sprint Ceremonies:**
- **Sprint Planning** (Day 1, 2hr): Define sprint goals, break down tasks
- **Daily Standup** (15min): Progress, blockers, plans
- **Code Review**: All PRs require review before merge
- **Sprint Demo** (Day 14, 1hr): Demonstrate completed features
- **Retrospective** (Day 14, 30min): What worked, what didn't, improvements

### 16.4 Key Milestones

| Milestone | Target Date | Success Criteria |
|-----------|-------------|------------------|
| **M1: Backend MVP** | Week 2 | GT06 device connects, location stored, REST API working |
| **M2: Live Dashboard** | Week 4 | Real-time map with WebSocket updates, login works |
| **M3: Operations Ready** | Week 6 | Geofencing, trips, alarms, basic reports functional |
| **M4: Bangladesh Launch** | Week 8 | bKash billing, Bengali UI, SMS alerts live |
| **M5: Mobile App Beta** | Week 10 | APK installable, push notifications working |
| **M6: Production Launch** | Week 12 | First paying customer live with monitoring |
| **M7: Enterprise Features** | Month 4 | Fleet groups, KPIs, driver management |
| **M8: AI Integration** | Month 7 | Predictive maintenance, driver scores |
| **M9: Full Platform** | Month 12 | All Phase 14 features, market leader position |

### 16.5 Phase Dependencies

```
Phase 1 (Foundation)
    │
    ├──► Phase 2 (Dashboard) ──► Phase 3 (Operations)
    │                                   │
    │                                   ▼
    │                            Phase 4 (BD Polish)
    │                                   │
    │                                   ├──► Phase 5 (Mobile)
    │                                   │
    │                                   ▼
    │                            Phase 6 (Production)
    │                                   │
    ▼                                   ▼
Phase 7 (Fleet 2.0) ◄─────────────── LAUNCH
    │
    ├──► Phase 8 (Fuel/Maintenance)
    │           │
    │           ▼
    │    Phase 9 (AI) ◄── Requires 3+ months of data
    │
    ├──► Phase 10 (Maps) ── Can run parallel
    │
    ├──► Phase 11 (Logistics) ── Requires Phase 7
    │
    └──► Phase 12 (IoT) ── Hardware partnerships needed
            │
            ▼
      Phase 13 (Enterprise)
            │
            ▼
      Phase 14 (EV/Future)
```

### 16.6 Risk Assessment & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **GT06 protocol bugs** | High | High | Extensive unit tests, real device testing, Traccar reference |
| **bKash integration delays** | Medium | High | Start sandbox early, have Nagad backup, support manual payment |
| **Device provisioning failures** | Medium | Medium | Clear SMS templates, fallback to manual config, video guides |
| **VPS performance issues** | Low | High | Load testing, auto-scaling readiness, monitoring alerts |
| **Bengali font rendering** | Low | Medium | Test on multiple Android devices, fallback fonts |
| **Competitor response** | Medium | Medium | Focus on differentiation (Bengali UX, bKash, owned stack) |
| **Hardware supply chain** | Medium | High | Multiple supplier relationships, stock buffer |
| **Team scaling challenges** | Medium | Medium | Documentation-first culture, onboarding guides |

### 16.7 Definition of Done (DoD)

A feature is considered **DONE** when:

- [ ] Code implemented and follows project conventions
- [ ] Unit tests written with >80% coverage for new code
- [ ] Integration tests pass
- [ ] Code reviewed and approved
- [ ] Documentation updated (API docs, CLAUDE.md if needed)
- [ ] Bengali translations added (if user-facing)
- [ ] Manual testing completed on target devices
- [ ] No critical/high severity bugs
- [ ] Deployed to staging and verified
- [ ] Product owner accepted

### 16.8 Communication Plan

| Channel | Purpose | Frequency |
|---------|---------|-----------|
| **GitHub Issues** | Task tracking, bugs | Continuous |
| **GitHub PRs** | Code review, discussion | Per change |
| **Slack/Discord** | Quick questions, updates | Daily |
| **Weekly Sync** | Progress review, blockers | Weekly (1hr) |
| **Sprint Demo** | Feature showcase | Bi-weekly |
| **Monthly Review** | Roadmap assessment | Monthly |

---

### Family-safety track (current priority)

Steps F0-F7 in [`docs/FAMILY_SAFETY_PLAN.md`](docs/FAMILY_SAFETY_PLAN.md): F0 visual restyle (done 2026-09-21) · F1 SOS SMS recipients (done 2026-09-21, see §7.7) · F2 trusted places: `V19`, `PATCH /geofences/:id`, drift guards (done 2026-09-21) · F3 bilingual push composer + `arrivals` channel (done for push; SMS wording not done) · F4 Places UI: mobile `app/places.tsx` + `app/place-new.tsx`, web Places/Boundaries tabs with edit mode (done) · F5 person avatars + vocabulary sweep · F6 day timeline / who-is-where-now · F7 marketing rewrite. F2-F4 are covered by unit tests and typecheck/build only: **the V19 migration and the new SQL have not been run against PostgreSQL, and nothing has been tried on a device or a real tracker.** See §8.5.

### Launch Phases (12-Week Plan)

### Phase 1 — Foundation (Weeks 1–2)

> **Checkbox status, audited 2026-09-21 against the tree.** `[x]` means verified present in
> this repository. An unchecked box with a `↳` note is partly done or not started, and the
> note says which. Phases 8, 9, 11 and 14 have no notes because nothing in them exists yet.
> Ticks describe code that is present, not code that has been load-tested or run in production.

**Goal:** A real GT06 device can connect, log in, and have its location stored and visible via REST API.

- [x] Bootstrap Spring Boot project with all dependencies
- [x] Flyway migrations V1–V2 (schema + seed data)  
      ↳ schema is now at V20 (V20 turns the V2 vehicle demo rows into a school demo: "EyeOn Demo School" / "Rafi", guarded so user-renamed rows are untouched)
- [x] Netty TCP server + frame decoder (0x78 0x78 and 0x79 0x79 variants)
- [x] CRC-ITU implementation with unit tests  
      ↳ `ChecksumUtilTest`
- [x] LoginHandler with IMEI extraction  
      ↳ `Gt06Handler.handleLogin`, auto-registers unknown IMEIs
- [x] LocationHandler for V1.8 + V3 + V4 + 4G variants  
      ↳ 0x12 / 0x22 / 0x32 / 0xA0 in `PacketType`
- [x] HeartbeatHandler with status decode  
      ↳ plus the Jimi heartbeat variant
- [x] LocationService.saveAndBroadcast (DB + Redis)
- [x] DeviceService basic CRUD
- [x] REST: `/devices`, `/devices/{imei}/locations/last`, `/devices/{imei}/locations`
- [x] JWT auth + multi-tenant TenantContext
- [x] Python device simulator script in `/scripts/simulate_device.py`
- [ ] Integration test: simulator → Netty → DB → REST returns location  
      ↳ **not done** — Testcontainers is a `pom.xml` dependency but no test uses it; all 10 test classes are unit tests

**Exit criteria:** A real Concox GT06N tracker connects to the dev server and its position is queryable via REST. Multi-tenant isolation tested.

### Phase 2 — Live Dashboard (Weeks 3–4)

**Goal:** A user can log in, see live vehicles on a Mapbox map, and they update in real time.

- [x] Next.js 15 project with Tailwind + Mapbox  
      ↳ Leaflet + Google/OSM base layer, not Mapbox — see §2
- [x] Login page + auth flow + JWT storage in HTTP-only cookie  
      ↳ `frontend/src/lib/session.ts`, httpOnly + sameSite=lax
- [x] Dashboard layout (sidebar + map)
- [x] FleetMap component with initial REST fetch + WebSocket subscription
- [x] STOMP WebSocket gateway on backend with org-scoped topics  
      ↳ `StompAuthChannelInterceptor`
- [x] LocationFanout: Redis sub → STOMP topic  
      ↳ plus `BatchLocationFanout` and `AlarmFanout`
- [x] Custom vehicle marker SVG + smooth animation
- [x] Device list sidebar with online/offline indicators
- [x] Click marker → device detail panel
- [x] Bengali / English language toggle (i18n basic strings)

**Exit criteria:** Open dashboard, see all org devices on map, watch positions update live. Bengali toggle works.

### Phase 3 — Operations (Weeks 5–6)

**Goal:** Geofencing, trips, alarms, basic reports.

- [x] Geofence schema, repository, service
- [x] GeofenceService.evaluate() called from LocationService  
      ↳ `LocationService` line ~112
- [x] Geofence editor UI (draw circle and polygon on map)  
      ↳ `components/geofence/GeofenceEditor.tsx`, both CIRCLE and POLYGON
- [x] Trip detection logic (ACC on/off + idle-based fallback)
- [x] Trip list page + replay UI (animated polyline)  
      ↳ `components/trip/TripReplay.tsx`, rAF-driven polyline
- [x] Alarm pipeline: 0x16 packet → Alarm record → SMS + WS broadcast  
      ↳ `AlarmService` publishes to Redis and dispatches SMS + push
- [x] AlarmList page, acknowledge action, alarm banner
- [ ] Daily / monthly reports (Apache POI for Excel, OpenPDF for PDF)  
      ↳ **partial** — Excel via Apache POI (`ExcelExportService`, `/exports/*.xlsx`) is done; there is no PDF output and no OpenPDF/iText dependency
- [x] Background job: stale device → OFFLINE  
      ↳ `DeviceStatusJob`
- [x] DeviceCommandService: cut fuel / restore / query address from UI  
      ↳ `DYD` / `HFYD` / `DWXX` + `CommandSheet.tsx`

**Exit criteria:** Drawing a geofence around a building and driving in/out triggers an alarm and sends an SMS. Trip with start/end appears on report.

### Phase 4 — Bangladesh Polish (Weeks 7–8)

**Goal:** Production-ready for Bangladesh customers.

- [ ] SSL Wireless SMS integration with Bengali templates  
      ↳ **partial** — the SSL Wireless client is done (`SmsService`, with a log stub when the token is blank), but message bodies are English strings built at each call site; there are no Bengali templates
- [ ] bKash subscription billing + webhooks  
      ↳ **not started** — `BillingController` is read-only subscription queries; there is no `BillingService`, checkout, execute call or webhook anywhere in `backend/src`, yet the marketing site advertises bKash/Nagad billing
- [ ] DeviceProvisioningService: SMS-based GT06 config from admin UI  
      ↳ **not started** — no such service exists; devices are configured by hand over SMS
- [x] Org/User management UI (invite, roles, suspend)  
      ↳ Settings → Org / Users tabs, admin-only
- [x] All UI strings translated to Bengali (Hind Siliguri font)  
      ↳ `lib/i18n.ts` + `LanguageContext.tsx`; Hind Siliguri Bengali subsets are imported in `layout.tsx`. Not audited string-by-string
- [x] Numbers/dates formatted for `bn-BD`  
      ↳ `lib/format.ts`
- [x] BDT pricing display with `৳` symbol
- [ ] Audit log + super-admin org-switch UI  
      ↳ **partial** — `audit_log`, `AuditController` and `/dashboard/audit-log` are done, and super admins get an admin console with an org filter; there is no `X-Org-Id` org-switch (the header is only listed in the CORS config, nothing reads it)
- [ ] Bengali installation guide PDF in `/docs`  
      ↳ **not done** — no such file in `docs/`

**Exit criteria:** A new customer can sign up, pay via bKash, provision their first device entirely in Bengali, and start tracking.

### Phase 5 — Mobile App (Weeks 9–10)

**Goal:** End-user (vehicle owner) mobile app.

- [x] React Native (Expo) project setup
- [x] Login + JWT
- [x] Live map screen with own vehicles
- [x] Trip history screen
- [x] Push notifications for alarms — via **Expo Push Service** (relays through FCM on Android / APNs on iOS). Chosen over direct FCM so the backend needs no Firebase credentials and the app stays Expo Go-compatible (no native build). Backend `PushService` POSTs to `exp.host`; tokens live in `push_tokens` (V7), registered via `POST/DELETE /users/me/push-tokens`; WARNING/CRITICAL alarms only.
- [x] Geofence creation (basic) — circle-only on mobile: tap-to-place center on the WebView map, radius presets, notify-on choice, fleet assignment (preselects all vehicles). List screen with delete. Polygon drawing stays web-dashboard-only.
- [ ] iOS + Android builds via EAS Build  
      ↳ **partial** — `mobile/eas.json` defines development/preview/production profiles, but only Android apk build types; no iOS profile and no evidence a build has been produced

**Exit criteria:** APK installable, owner sees own bike live on map, gets push when SOS button pressed.

### Phase 6 — Production Hardening (Weeks 11–12)

**Goal:** Deploy to AWS Mumbai with monitoring, backups, runbook.

- [ ] Terraform infra (EC2, RDS, ElastiCache, NLB for TCP, CloudFront)  
      ↳ `infra/terraform/` contains only a `.gitkeep`
- [ ] CI/CD pipeline GitHub Actions → ECR → ECS  
      ↳ `.github/workflows/` contains only a `.gitkeep`
- [ ] Prometheus + Grafana dashboards (TCP connections, packet rate, DB queries)  
      ↳ no monitoring config anywhere in the tree
- [ ] CloudWatch alerts (high error rate, low free disk, etc.)
- [ ] RDS automated backups + tested restore
- [ ] Load test: 1000 simulated devices for 24 hours
- [ ] Runbook in `/docs/RUNBOOK.md`: common incidents and fixes  
      ↳ not present
- [ ] DNS, SSL cert, soft-launch with first paying customer

**Exit criteria:** First paying customer is live, monitoring shows healthy metrics, on-call runbook is in place.

Nothing in Phase 6 is done. Deployment today is `scripts/deploy_vps.sh` onto a single
Ubuntu VPS with `docker-compose.prod.yml` and `infra/nginx/nginx.conf` — a different path
from the AWS/ECS/Terraform plan above. See `docs/DEPLOYMENT.md`.

---

### Advanced Roadmap (Post-Launch Phases)

The following phases represent the evolution toward a next-generation AI-powered fleet management platform. These are prioritized by market demand and technical dependencies.

### Phase 7 — Advanced Fleet Management (Month 4)

**Goal:** Enterprise-grade fleet operations with KPIs and driver monitoring.

- [ ] **Fleet Dashboard 2.0** — unified view with fleet-wide KPIs, health indicators, utilization metrics  
      ↳ **partial** — `DashboardService.snapshot()` returns device/alarm/trip counts and distance-today, shown as the KPI strip; no health indicators or utilization metrics
- [x] **Vehicle Groups** — logical groupings (by branch, type, route, driver)  
      ↳ `device_groups` (V11) + per-user ownership (V18), `DeviceGroupService`, group accordion in the vehicle panel
- [ ] **Branch Management** — multi-location support with per-branch admins and reporting
- [ ] **KPI Dashboard** — fleet utilization, on-time delivery, idle time, fuel efficiency metrics  
      ↳ **not started** — none of these four metrics are computed; see the Fleet Dashboard 2.0 note above
- [ ] **Driver Behavior Basics** — harsh braking detection, rapid acceleration, harsh cornering (from accelerometer data)  
      ↳ **partial** — the GT06 reports harsh acceleration/deceleration/collision itself (0xF0/0xF1/0xF2) and those are stored as alarms; there is no per-driver detection, aggregation or scoring
- [x] **Driver Assignment** — link drivers to vehicles, track driver-specific metrics  
      ↳ `drivers` + `driver_assignments` (V12), `DriverService`, `/dashboard/drivers`

**Exit criteria:** Fleet manager can view branch-level KPIs, assign drivers, and see basic driving behavior scores.

### Phase 8 — Fuel & Maintenance Intelligence (Month 5)

**Goal:** Reduce operational costs through fuel monitoring and proactive maintenance.

- [ ] **Fuel Sensor Integration** — support for capacitive/ultrasonic fuel sensors (RS232/RS485)
- [ ] **Fuel Theft Detection** — sudden drop alerts with location and timestamp
- [ ] **Fuel Efficiency Reports** — L/100km, cost per km, fuel consumption trends
- [ ] **Cost Analysis Dashboard** — fuel costs, maintenance costs, total cost of ownership per vehicle
- [ ] **Service Scheduler** — oil change, tire rotation, inspection reminders based on mileage/time
- [ ] **Battery Health Monitoring** — vehicle battery voltage trends, low battery alerts
- [ ] **TPMS Integration** — tire pressure monitoring via BLE sensors (future hardware)

**Exit criteria:** Fleet manager receives fuel theft alert, views fuel efficiency report, and gets maintenance reminder.

### Phase 9 — AI & Predictive Analytics (Month 6–7)

**Goal:** AI-powered insights for proactive fleet management.

- [ ] **Fleet Health Score** — ML model combining vehicle age, maintenance history, fuel efficiency, sensor data
- [ ] **Driver Safety Score** — composite score from harsh events, speeding, fatigue indicators, seat belt usage
- [ ] **Predictive Maintenance** — ML predictions for brake wear, battery replacement, engine issues based on patterns
- [ ] **AI Assistant (Chat)** — natural language queries ("Show me vehicles due for service", "Which driver has the most speeding events?")
- [ ] **Smart Recommendations** — automated suggestions (route optimization, driver training needs, vehicle replacement timing)
- [ ] **Anomaly Detection** — unusual patterns in location, fuel, or behavior flagged automatically

**Tech stack additions:** Python ML service (FastAPI), Redis ML feature store, scheduled model retraining jobs.

**Exit criteria:** AI assistant answers fleet queries, predictive maintenance alert prevents a breakdown.

#### 9.1 AI Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EyeOn AI Platform                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │ Spring Boot  │───►│   Kafka /    │───►│  Python ML   │                   │
│  │   Backend    │    │  RabbitMQ    │    │   Service    │                   │
│  └──────────────┘    └──────────────┘    └──────┬───────┘                   │
│         │                                        │                           │
│         │                                        ▼                           │
│         │                               ┌──────────────┐                     │
│         │                               │ Redis ML     │                     │
│         │                               │ Feature Store│                     │
│         │                               └──────────────┘                     │
│         │                                        │                           │
│         ▼                                        ▼                           │
│  ┌──────────────┐                       ┌──────────────┐                     │
│  │  PostgreSQL  │◄──────────────────────│  ML Models   │                     │
│  │  (scores,    │                       │  (scikit,    │                     │
│  │  predictions)│                       │   PyTorch)   │                     │
│  └──────────────┘                       └──────────────┘                     │
│         │                                        │                           │
│         ▼                                        ▼                           │
│  ┌──────────────┐                       ┌──────────────┐                     │
│  │   Next.js    │◄──────────────────────│  AI Chat     │                     │
│  │  Dashboard   │      WebSocket        │  (Claude/    │                     │
│  │              │                       │   OpenAI)    │                     │
│  └──────────────┘                       └──────────────┘                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 9.2 Data Pipeline

**Raw Data Sources (from existing tables):**

| Source Table | Data Points | Update Frequency |
|--------------|-------------|------------------|
| `locations` | lat, lng, speed, course, acc_on, voltage | Real-time |
| `alarms` | type (SOS, SHOCK, OVERSPEED, COLLISION) | Event-driven |
| `trips` | distance, duration, max_speed, avg_speed, idle_time | Per trip |
| `devices` | vehicle_type, model, created_at (age) | On change |
| `fuel_readings` (Phase 8) | liters, consumption_rate | Per reading |
| `maintenance_logs` (Phase 8) | service_type, mileage, cost | On service |

**Feature Engineering Pipeline:**

```sql
-- Daily driver behavior aggregation (scheduled job)
CREATE TABLE driver_daily_metrics (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL,
    device_imei     VARCHAR(20) NOT NULL,
    date            DATE NOT NULL,

    -- Driving behavior
    total_distance_km       DECIMAL(10,2),
    total_drive_time_min    INTEGER,
    harsh_braking_count     INTEGER DEFAULT 0,
    harsh_accel_count       INTEGER DEFAULT 0,
    harsh_cornering_count   INTEGER DEFAULT 0,
    overspeed_count         INTEGER DEFAULT 0,
    overspeed_duration_sec  INTEGER DEFAULT 0,
    max_speed_kmh           INTEGER,
    avg_speed_kmh           DECIMAL(5,2),

    -- Efficiency
    idle_time_min           INTEGER DEFAULT 0,
    fuel_consumed_liters    DECIMAL(8,2),
    fuel_efficiency_km_l    DECIMAL(6,2),

    -- Safety events
    sos_count               INTEGER DEFAULT 0,
    collision_count         INTEGER DEFAULT 0,

    -- Computed scores (0-100)
    safety_score            INTEGER,
    efficiency_score        INTEGER,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(device_imei, date)
);

CREATE INDEX idx_driver_metrics_org_date ON driver_daily_metrics(org_id, date DESC);
CREATE INDEX idx_driver_metrics_device ON driver_daily_metrics(device_imei, date DESC);

-- Vehicle health snapshots
CREATE TABLE vehicle_health_snapshots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL,
    device_imei     VARCHAR(20) NOT NULL,
    snapshot_date   DATE NOT NULL,

    -- Vehicle info
    vehicle_age_days        INTEGER,
    total_mileage_km        BIGINT,

    -- Battery health
    avg_voltage_mv          INTEGER,
    min_voltage_mv          INTEGER,
    voltage_drop_events     INTEGER DEFAULT 0,

    -- Engine indicators (from OBD if available)
    avg_engine_temp_c       INTEGER,
    dtc_codes               TEXT[],

    -- Maintenance
    days_since_last_service INTEGER,
    km_since_last_service   INTEGER,

    -- Computed health score (0-100)
    health_score            INTEGER,
    predicted_issues        JSONB DEFAULT '[]'::jsonb,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(device_imei, snapshot_date)
);

-- AI predictions log
CREATE TABLE ai_predictions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL,
    device_imei     VARCHAR(20) NOT NULL,
    prediction_type VARCHAR(50) NOT NULL,  -- MAINTENANCE, BREAKDOWN, ANOMALY, DRIVER_RISK

    predicted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    prediction      JSONB NOT NULL,        -- Model output
    confidence      DECIMAL(4,3) NOT NULL, -- 0.000 to 1.000

    -- Outcome tracking
    outcome_at      TIMESTAMPTZ,
    outcome         JSONB,
    was_accurate    BOOLEAN,

    model_version   VARCHAR(50) NOT NULL,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_predictions_org_type ON ai_predictions(org_id, prediction_type, predicted_at DESC);
CREATE INDEX idx_predictions_accuracy ON ai_predictions(prediction_type, was_accurate) WHERE outcome_at IS NOT NULL;
```

#### 9.3 ML Models Specification

**Model 1: Driver Safety Score**

```yaml
model_name: driver_safety_scorer
type: Gradient Boosting (XGBoost)
update_frequency: Daily batch
training_data: 90 days rolling window

features:
  behavioral:
    - harsh_braking_per_100km: float
    - harsh_accel_per_100km: float
    - overspeed_percentage: float  # % of drive time over limit
    - night_driving_ratio: float   # % between 10pm-6am
    - avg_continuous_drive_hours: float

  historical:
    - collision_count_30d: int
    - sos_count_30d: int
    - alarm_count_30d: int
    - score_trend_7d: float  # improving or declining

  contextual:
    - vehicle_type: categorical
    - route_complexity: float  # urban vs highway ratio

output:
  safety_score: int  # 0-100
  risk_factors: list[str]  # ["excessive_speeding", "fatigue_risk"]
  improvement_tips: list[str]

thresholds:
  excellent: 85-100
  good: 70-84
  needs_improvement: 50-69
  high_risk: 0-49
```

**Model 2: Fleet Health Score**

```yaml
model_name: vehicle_health_predictor
type: Random Forest + LSTM (hybrid)
update_frequency: Daily batch
training_data: Full vehicle history

features:
  static:
    - vehicle_age_days: int
    - vehicle_type: categorical
    - manufacturer: categorical (if known)

  telemetry:
    - avg_daily_mileage: float
    - voltage_stability: float  # std dev of readings
    - voltage_trend_7d: float
    - engine_temp_anomalies: int

  maintenance:
    - days_since_service: int
    - km_since_service: int
    - service_adherence_ratio: float  # on-time vs late

  usage_patterns:
    - heavy_load_ratio: float  # inferred from accel patterns
    - harsh_usage_score: float
    - idle_ratio: float

output:
  health_score: int  # 0-100
  predicted_issues:
    - issue_type: str  # "battery", "brakes", "engine"
    - probability: float
    - estimated_days_to_failure: int
    - recommended_action: str

alerts:
  critical: health_score < 30 OR any issue probability > 0.8
  warning: health_score < 50 OR any issue probability > 0.5
```

**Model 3: Anomaly Detection**

```yaml
model_name: fleet_anomaly_detector
type: Isolation Forest + Autoencoder
update_frequency: Real-time (streaming)
training_data: 30 days normal behavior baseline

detection_types:
  location_anomaly:
    features: [lat, lng, time_of_day, day_of_week]
    trigger: Vehicle in unusual location for time

  behavior_anomaly:
    features: [speed_pattern, stop_frequency, route_deviation]
    trigger: Driving pattern deviates from baseline

  fuel_anomaly:
    features: [consumption_rate, sudden_drops, refill_patterns]
    trigger: Unexpected fuel loss (theft indicator)

  usage_anomaly:
    features: [daily_mileage, active_hours, weekend_usage]
    trigger: Unusual usage pattern (possible unauthorized use)

output:
  anomaly_type: str
  severity: float  # 0-1
  description: str
  evidence: list[dict]  # supporting data points
  recommended_action: str
```

#### 9.4 AI Assistant (Chat) Specification

**Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Chat Assistant                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User Query ──► Intent Classifier ──► Query Router           │
│                       │                    │                 │
│                       ▼                    ▼                 │
│              ┌────────────────┐   ┌────────────────┐        │
│              │ Simple Queries │   │ Complex Queries│        │
│              │ (SQL + Rules)  │   │ (LLM + RAG)    │        │
│              └───────┬────────┘   └───────┬────────┘        │
│                      │                    │                 │
│                      ▼                    ▼                 │
│              ┌────────────────────────────────────┐         │
│              │     Response Generator             │         │
│              │  (Natural Language + Charts)       │         │
│              └────────────────────────────────────┘         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Supported Query Types:**

```yaml
simple_queries:  # Direct SQL, no LLM needed
  examples:
    - "How many vehicles are online?"
    - "Show me today's trips for BA-1234"
    - "Which vehicles are overspeeding right now?"
  handler: sql_executor
  response_time: < 500ms

analytical_queries:  # Aggregation + computation
  examples:
    - "What's our fleet's average fuel efficiency this month?"
    - "Compare driver scores between Dhaka and Chittagong branches"
    - "Show me the trend of harsh braking events over 30 days"
  handler: analytics_engine
  response_time: < 2s

predictive_queries:  # ML model inference
  examples:
    - "Which vehicles are likely to need maintenance soon?"
    - "Predict fuel costs for next month"
    - "Which drivers are at high risk of accidents?"
  handler: ml_inference
  response_time: < 3s

complex_queries:  # LLM + RAG for open-ended questions
  examples:
    - "Why is vehicle BA-5678 consuming more fuel than usual?"
    - "What can we do to improve our fleet efficiency?"
    - "Analyze the root cause of increased maintenance costs"
  handler: llm_rag
  response_time: < 10s
```

**API Endpoint:**

```
POST /api/v1/ai/chat
Authorization: Bearer {jwt}

Request:
{
  "message": "Which drivers need safety training?",
  "context": {
    "org_id": "uuid",
    "conversation_id": "uuid",  // for multi-turn
    "filters": {
      "branch_id": "uuid",  // optional
      "date_range": "last_30_days"
    }
  }
}

Response:
{
  "response": {
    "text": "Based on safety scores, 3 drivers need attention:\n1. Driver A (score: 42) - excessive speeding...",
    "data": [
      {"driver": "Driver A", "score": 42, "issues": ["speeding", "harsh_braking"]},
      ...
    ],
    "visualization": {
      "type": "bar_chart",
      "config": { ... }
    },
    "suggested_actions": [
      {"action": "Schedule training", "drivers": ["driver_a_id", ...]},
      {"action": "View detailed reports", "link": "/dashboard/drivers/safety"}
    ]
  },
  "confidence": 0.92,
  "sources": ["driver_daily_metrics", "ai_predictions"],
  "conversation_id": "uuid"
}
```

**LLM Integration (Claude API):**

```python
# ai_service/llm/claude_client.py
from anthropic import Anthropic

class FleetAIAssistant:
    def __init__(self):
        self.client = Anthropic()
        self.model = "claude-sonnet-4-20250514"

    async def analyze_query(self, query: str, context: dict) -> dict:
        # Build context from fleet data
        fleet_context = await self._build_fleet_context(context)

        response = await self.client.messages.create(
            model=self.model,
            max_tokens=1024,
            system="""You are EyeOn AI, a fleet management assistant for Bangladesh.
            You help fleet managers understand their vehicle data, driver performance,
            and make data-driven decisions. Always be specific with numbers and
            actionable with recommendations. Respond in English or Bengali based on
            the user's language preference.""",
            messages=[
                {"role": "user", "content": f"""
                Fleet Context:
                {fleet_context}

                User Query: {query}

                Provide a helpful, data-driven response with specific numbers
                and actionable recommendations.
                """}
            ]
        )

        return self._parse_response(response)
```

#### 9.5 Python ML Service Structure

```
ai_service/
├── Dockerfile
├── requirements.txt
├── pyproject.toml
│
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry
│   ├── config.py               # Settings from env
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes/
│   │   │   ├── health.py       # /health, /ready
│   │   │   ├── scores.py       # /scores/driver, /scores/vehicle
│   │   │   ├── predictions.py  # /predict/maintenance, /predict/anomaly
│   │   │   ├── chat.py         # /chat
│   │   │   └── training.py     # /train/trigger (admin only)
│   │   └── dependencies.py     # Auth, DB connections
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── driver_safety.py    # XGBoost model
│   │   ├── vehicle_health.py   # Random Forest + LSTM
│   │   ├── anomaly.py          # Isolation Forest
│   │   └── base.py             # Abstract model class
│   │
│   ├── features/
│   │   ├── __init__.py
│   │   ├── driver_features.py  # Feature extraction
│   │   ├── vehicle_features.py
│   │   └── pipeline.py         # Sklearn pipelines
│   │
│   ├── llm/
│   │   ├── __init__.py
│   │   ├── claude_client.py    # Anthropic API client
│   │   ├── prompts.py          # System prompts
│   │   ├── rag.py              # Retrieval augmented generation
│   │   └── intent.py           # Query classification
│   │
│   ├── data/
│   │   ├── __init__.py
│   │   ├── postgres.py         # SQLAlchemy async
│   │   ├── redis.py            # Feature store client
│   │   └── schemas.py          # Pydantic models
│   │
│   ├── jobs/
│   │   ├── __init__.py
│   │   ├── daily_scoring.py    # Compute daily scores
│   │   ├── model_training.py   # Retrain models
│   │   └── feature_refresh.py  # Update feature store
│   │
│   └── utils/
│       ├── __init__.py
│       ├── logging.py
│       └── metrics.py          # Prometheus metrics
│
├── models/                     # Serialized model files
│   ├── driver_safety_v1.joblib
│   ├── vehicle_health_v1.joblib
│   └── anomaly_detector_v1.joblib
│
├── tests/
│   ├── __init__.py
│   ├── test_models.py
│   ├── test_features.py
│   └── test_api.py
│
└── scripts/
    ├── train_initial_models.py
    └── backfill_features.py
```

#### 9.6 API Endpoints (FastAPI)

```python
# ai_service/app/main.py
from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel

app = FastAPI(title="EyeOn AI Service", version="1.0.0")

# ─────────────────────────────────────────────────────────────
# Health & Readiness
# ─────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "healthy", "models_loaded": True}

# ─────────────────────────────────────────────────────────────
# Scoring Endpoints
# ─────────────────────────────────────────────────────────────

class DriverScoreRequest(BaseModel):
    org_id: str
    device_imei: str
    date: str | None = None  # defaults to today

class DriverScoreResponse(BaseModel):
    device_imei: str
    safety_score: int
    efficiency_score: int
    risk_factors: list[str]
    improvement_tips: list[str]
    trend: str  # "improving", "stable", "declining"

@app.post("/api/v1/scores/driver", response_model=DriverScoreResponse)
async def get_driver_score(req: DriverScoreRequest):
    """Get driver safety and efficiency scores."""
    ...

@app.post("/api/v1/scores/driver/batch")
async def get_driver_scores_batch(org_id: str):
    """Get all driver scores for an organization."""
    ...

class VehicleHealthRequest(BaseModel):
    org_id: str
    device_imei: str

class VehicleHealthResponse(BaseModel):
    device_imei: str
    health_score: int
    predicted_issues: list[dict]
    days_to_next_service: int
    recommended_actions: list[str]

@app.post("/api/v1/scores/vehicle", response_model=VehicleHealthResponse)
async def get_vehicle_health(req: VehicleHealthRequest):
    """Get vehicle health score and predictions."""
    ...

# ─────────────────────────────────────────────────────────────
# Prediction Endpoints
# ─────────────────────────────────────────────────────────────

@app.post("/api/v1/predict/maintenance")
async def predict_maintenance(org_id: str, days_ahead: int = 30):
    """Predict which vehicles will need maintenance in N days."""
    ...

@app.post("/api/v1/predict/anomalies")
async def detect_anomalies(org_id: str, hours_back: int = 24):
    """Detect anomalies in fleet behavior."""
    ...

# ─────────────────────────────────────────────────────────────
# AI Chat
# ─────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None
    language: str = "en"  # "en" or "bn"

class ChatResponse(BaseModel):
    text: str
    data: dict | None = None
    visualization: dict | None = None
    suggested_actions: list[dict] = []
    conversation_id: str

@app.post("/api/v1/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, org_id: str = Depends(get_org_from_token)):
    """AI assistant chat endpoint."""
    ...

# ─────────────────────────────────────────────────────────────
# Admin / Training
# ─────────────────────────────────────────────────────────────

@app.post("/api/v1/admin/train/{model_name}")
async def trigger_training(model_name: str, admin_key: str = Depends(verify_admin)):
    """Trigger model retraining (admin only)."""
    ...

@app.get("/api/v1/admin/models")
async def list_models(admin_key: str = Depends(verify_admin)):
    """List deployed models and versions."""
    ...
```

#### 9.7 Integration with Spring Boot Backend

```java
// backend/src/main/java/com/webinnovation/eyeon/service/AiService.java
@Service
@RequiredArgsConstructor
@Slf4j
public class AiService {

    private final WebClient aiServiceClient;  // Points to Python service
    private final RedisTemplate<String, Object> redis;

    /**
     * Get driver safety score (cached for 1 hour).
     */
    public Mono<DriverScore> getDriverScore(String imei) {
        String cacheKey = "ai:score:driver:" + imei;

        // Check cache first
        DriverScore cached = (DriverScore) redis.opsForValue().get(cacheKey);
        if (cached != null) {
            return Mono.just(cached);
        }

        return aiServiceClient.post()
            .uri("/api/v1/scores/driver")
            .bodyValue(Map.of("device_imei", imei))
            .retrieve()
            .bodyToMono(DriverScore.class)
            .doOnNext(score -> {
                redis.opsForValue().set(cacheKey, score, Duration.ofHours(1));
            });
    }

    /**
     * AI Chat - proxy to Python service with org context.
     */
    public Mono<ChatResponse> chat(UUID orgId, String message, String conversationId) {
        return aiServiceClient.post()
            .uri("/api/v1/chat")
            .header("X-Org-Id", orgId.toString())
            .bodyValue(Map.of(
                "message", message,
                "conversation_id", conversationId
            ))
            .retrieve()
            .bodyToMono(ChatResponse.class);
    }

    /**
     * Get vehicles predicted to need maintenance.
     */
    public Mono<List<MaintenancePrediction>> predictMaintenance(UUID orgId, int daysAhead) {
        return aiServiceClient.post()
            .uri(uriBuilder -> uriBuilder
                .path("/api/v1/predict/maintenance")
                .queryParam("org_id", orgId)
                .queryParam("days_ahead", daysAhead)
                .build())
            .retrieve()
            .bodyToFlux(MaintenancePrediction.class)
            .collectList();
    }
}
```

#### 9.8 Training Pipeline

```yaml
# Scheduled jobs for model training and scoring

daily_scoring_job:
  schedule: "0 2 * * *"  # 2 AM daily (after midnight data settles)
  tasks:
    - name: compute_driver_daily_metrics
      query: |
        INSERT INTO driver_daily_metrics (...)
        SELECT ... FROM locations, alarms, trips
        WHERE date = CURRENT_DATE - 1

    - name: compute_vehicle_health_snapshots
      query: |
        INSERT INTO vehicle_health_snapshots (...)
        SELECT ... FROM devices, locations, maintenance_logs
        WHERE snapshot_date = CURRENT_DATE

    - name: run_safety_scoring
      endpoint: POST /api/v1/scores/driver/batch

    - name: run_health_scoring
      endpoint: POST /api/v1/scores/vehicle/batch

    - name: run_anomaly_detection
      endpoint: POST /api/v1/predict/anomalies

    - name: generate_predictions
      endpoint: POST /api/v1/predict/maintenance

weekly_training_job:
  schedule: "0 3 * * SUN"  # Sunday 3 AM
  tasks:
    - name: retrain_driver_safety_model
      endpoint: POST /api/v1/admin/train/driver_safety

    - name: retrain_vehicle_health_model
      endpoint: POST /api/v1/admin/train/vehicle_health

    - name: update_anomaly_baseline
      endpoint: POST /api/v1/admin/train/anomaly_detector

    - name: validate_model_accuracy
      script: scripts/validate_predictions.py
```

#### 9.9 Docker Compose Addition

```yaml
# Add to docker-compose.prod.yml

services:
  # ... existing services ...

  ai-service:
    build:
      context: ./ai_service
      dockerfile: Dockerfile
    container_name: eyeon-ai
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      REDIS_URL: redis://redis:6379/1
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      MODEL_PATH: /app/models
      LOG_LEVEL: INFO
    volumes:
      - ai_models:/app/models
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    # Internal only - accessed via backend
    expose:
      - "8000"

volumes:
  ai_models:
```

#### 9.10 Environment Variables

```bash
# Add to .env for AI service

# Anthropic Claude API (for AI Chat)
ANTHROPIC_API_KEY=sk-ant-...

# AI Service config
AI_SERVICE_URL=http://ai-service:8000
AI_MODEL_DRIVER_SAFETY=driver_safety_v1
AI_MODEL_VEHICLE_HEALTH=vehicle_health_v1
AI_MODEL_ANOMALY=anomaly_v1

# Feature store (Redis DB 1)
AI_REDIS_DB=1
AI_FEATURE_TTL_HOURS=24

# Training config
AI_TRAINING_MIN_SAMPLES=1000
AI_TRAINING_WINDOW_DAYS=90
```

#### 9.11 Frontend Integration

```typescript
// frontend/src/lib/ai.ts

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  data?: Record<string, unknown>;
  visualization?: ChartConfig;
  suggestedActions?: Array<{ action: string; link?: string }>;
}

export interface DriverScore {
  deviceImei: string;
  safetyScore: number;
  efficiencyScore: number;
  riskFactors: string[];
  improvementTips: string[];
  trend: 'improving' | 'stable' | 'declining';
}

export interface VehicleHealth {
  deviceImei: string;
  healthScore: number;
  predictedIssues: Array<{
    issueType: string;
    probability: number;
    estimatedDaysToFailure: number;
    recommendedAction: string;
  }>;
  daysToNextService: number;
}

// API calls
export async function sendChatMessage(message: string, conversationId?: string): Promise<ChatMessage> {
  const res = await api.post('/ai/chat', { message, conversationId });
  return res.data;
}

export async function getDriverScore(imei: string): Promise<DriverScore> {
  const res = await api.get(`/ai/scores/driver/${imei}`);
  return res.data;
}

export async function getFleetHealthSummary(): Promise<{
  averageScore: number;
  vehiclesAtRisk: number;
  upcomingMaintenance: number;
}> {
  const res = await api.get('/ai/fleet/health-summary');
  return res.data;
}
```

#### 9.12 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Driver score accuracy | >85% | Compare predicted risk vs actual incidents |
| Maintenance prediction | >70% precision | Predicted issues that occurred within window |
| Anomaly detection | <5% false positive | User feedback on alerts |
| Chat response time | <3s (simple), <10s (complex) | P95 latency |
| Chat accuracy | >90% user satisfaction | Thumbs up/down feedback |
| Model freshness | <7 days | Time since last training |
| Feature latency | <100ms | Redis feature store reads |

### Phase 10 — Enhanced Tracking & Maps (Month 7–8)

**Goal:** Rich map experience with contextual data overlays.

- [ ] **3D Map View** — building extrusion, terrain (Mapbox GL JS 3D features or Google 3D tiles)
- [ ] **Traffic Overlay** — real-time traffic data on routes (Google Traffic API)
- [ ] **Weather Integration** — weather conditions at vehicle locations, severe weather alerts
- [ ] **ETA Calculations** — accurate arrival time based on traffic, driver behavior, historical patterns
- [x] **Street View Integration** — click location to see Google Street View  
      ↳ link-out only: the vehicle popup's Street view action opens Google Maps in a new tab, it is not an embedded panorama
- [ ] **Historical Traffic Playback** — replay trips with traffic conditions at the time

**Exit criteria:** User views 3D map with traffic overlay, sees ETA for in-progress deliveries.

### Phase 11 — Logistics & Delivery (Month 8–9)

**Goal:** Full logistics and last-mile delivery management.

- [ ] **ePOD (Electronic Proof of Delivery)** — driver app captures signature, photo, timestamp at delivery
- [ ] **QR Code Delivery Verification** — scan package QR to confirm delivery
- [ ] **Shipment Tracking** — end-to-end package tracking with customer-facing tracking page
- [ ] **Route Optimization** — multi-stop route planning with traffic-aware sequencing
- [ ] **Delivery Time Windows** — schedule deliveries, alert on late arrivals
- [ ] **Customer Notifications** — SMS/WhatsApp alerts for "Driver is 10 minutes away"

**Exit criteria:** Delivery driver completes delivery with ePOD, customer receives notification and can track.

### Phase 12 — IoT & Hardware Integration (Month 9–10)

**Goal:** Connect additional sensors and hardware for comprehensive telematics.

- [ ] **Temperature Sensors** — cold chain monitoring for pharma/food logistics (BLE or wired sensors)
- [ ] **Door Sensors** — cargo door open/close alerts with location
- [ ] **RFID Driver ID** — driver swipe to start vehicle, automatic driver assignment  
      ↳ `PacketType.RFID` (0x17) is defined but `Gt06Handler` has no case for it, so swipes are dropped
- [ ] **Dashcam Integration** — live streaming, event-triggered recording, AI incident detection
- [ ] **BLE Beacon Support** — asset tracking within vehicles, trailer attachment detection
- [ ] **OBD-II Integration** — direct vehicle diagnostics, DTC codes, real-time engine data

**Hardware partnerships required.** API-first design for third-party sensor integration.

**Exit criteria:** Temperature alert triggers for cold chain vehicle, dashcam footage accessible after harsh braking event.

### Phase 13 — Enterprise & Security (Month 10–11)

**Goal:** Enterprise-grade security and white-label capabilities.

- [ ] **White Label Platform** — custom branding, domain, logo for resellers
- [ ] **Multi-Company Management** — parent company oversees subsidiaries, consolidated reporting
- [ ] **Enhanced API** — GraphQL API, webhooks, rate limiting tiers, API key management
- [ ] **Advanced Audit Logs** — detailed action logging, compliance reports, data export  
      ↳ **partial** — `audit_log`, `AuditController` and `/dashboard/audit-log` exist; no compliance reports and no export endpoint
- [ ] **2FA (Two-Factor Authentication)** — SMS/authenticator app for all users
- [ ] **Biometric Login** — fingerprint/face ID on mobile app
- [ ] **Device Binding** — lock app to specific devices, prevent unauthorized access
- [ ] **Role-Based Permissions** — granular permissions (view-only, edit, admin per feature)  
      ↳ **partial** — three fixed roles (SUPER_ADMIN / ORG_ADMIN / ORG_USER) plus per-user device assignments (V8); no per-feature granularity

**Exit criteria:** Reseller deploys white-label instance, enterprise client passes security audit.

### Phase 14 — EV, Specialty & Innovation (Month 11–12+)

**Goal:** Future-proof platform with EV support and innovative features.

**EV Fleet Support:**
- [ ] **EV Battery Monitoring** — state of charge, battery health, range estimation
- [ ] **Charging Station Integration** — find nearby chargers, charging session tracking
- [ ] **Range Anxiety Alerts** — warn when range insufficient to reach destination
- [ ] **Charging Cost Tracking** — kWh consumed, cost per charge, comparison to fuel

**Specialty Modes:**
- [ ] **School Bus Tracking** — parent app, stop arrival notifications, student RFID check-in
- [ ] **Family Mode** — simplified UI for personal vehicle tracking, teen driver monitoring
- [ ] **Carbon Footprint Report** — CO2 emissions per vehicle/fleet, sustainability metrics

**Innovation Features:**
- [ ] **Gamification** — driver leaderboards, safety badges, fuel efficiency challenges, rewards
- [ ] **Android Auto / CarPlay Integration** — in-vehicle display of alerts and navigation
- [ ] **Voice Commands** — "Hey EyeOn, where is vehicle BD-123?"
- [ ] **AR Navigation** — augmented reality directions for drivers (experimental)

**Exit criteria:** EV fleet operational with charging tracking, school parents receive bus arrival notifications.

---

### Feature Priority Matrix

| Priority | Category | Features | Business Impact |
|----------|----------|----------|-----------------|
| **P0** (Must Have) | Core | Phases 1–6 | Launch readiness |
| **P1** (High) | Fleet Ops | Phase 7 (Fleet Dashboard, Groups, Driver) | Enterprise sales |
| **P1** (High) | Cost Savings | Phase 8 (Fuel, Maintenance) | Clear ROI for customers |
| **P2** (Medium) | AI | Phase 9 (Scores, Predictions, Assistant) | Differentiation |
| **P2** (Medium) | Logistics | Phase 11 (ePOD, Shipment) | New market segment |
| **P3** (Low) | Enhanced UX | Phase 10 (3D, Traffic, Weather) | User delight |
| **P3** (Low) | Enterprise | Phase 13 (White Label, API) | Reseller channel |
| **P4** (Future) | Innovation | Phase 14 (EV, Gamification, AR) | Market leadership |

---

## 17. Testing Strategy

### 17.1 Unit Tests (mandatory for these areas)

- **Protocol parser:** for every variant (V1.8, V3, V4, 4G), at minimum: login, location, heartbeat, alarm, command reply. Use real packet captures from the Concox doc as fixtures.
- **CRC-ITU:** assert known-good CRCs from doc examples
- **Coordinate decoding:** assert lat/lng for each variant against doc-provided examples
- **GeofenceService.evaluate:** test ENTER/EXIT transitions, no double-fire
- **Trip detection:** test start/end conditions

### 17.2 Integration Tests

- Embedded Postgres + Testcontainers
- Full pipeline test: simulator sends packet → Netty → DB → REST returns
- WebSocket subscription test: connect, subscribe, expect message after publish

### 17.3 Load Test

- Python `simulate_device.py` to spawn N concurrent device sessions sending at realistic rates
- Target: 1000 simultaneous devices on a single t3.medium with p99 latency < 100ms

### 17.4 Manual Test Checklist (pre-release)

- Real GT06 device end-to-end on production
- Real bKash sandbox payment
- Real SSL Wireless SMS to actual phone number
- Bengali UI on Android Chrome (font rendering)
- WebSocket reconnect after network drop

---

## 18. Common Pitfalls — Read Before Coding

0. **Packets that arrive before the login lookup finishes are queued, not dropped (fixed 2026-09-21).** `handleLogin` ACKs at once and resolves the IMEI off the event loop; until 2026-09-21 any location/alarm/heartbeat arriving in that window was ACKed and discarded, so the first location of every session was lost (live: 6 of 9 stored) and an SOS sent right after login never reached anyone. Now each connection gets a `netty/LoginGate` at login: packets submitted before the lookup finishes wait (bounded, 64) and are released in arrival order as one task; an unknown tracker's queue is discarded as before; the gate is resolved in a `finally`, so a failing lookup cannot strand packets. **New packet handlers must go through `gateOf(ctx).submit(...)`**, not read `REGISTERED_KEY`/`IMEI_KEY` directly. Tests: `LoginGateTest`, `Gt06HandlerLoginRaceTest` (slow lookup + location + SOS with real frames). Live after the fix: 9 of 9 stored, and an SOS sent as the first packet after login is stored as CRITICAL.

1. **CRC-ITU is not standard CRC-16.** Use the polynomial 0x1021, init 0xFFFF, no reflection, XOR-out 0xFFFF. Verify against the doc examples in section 6.6.

2. **Coordinate encoding differs by variant.** V1.8 uses degrees-minutes × 30000. V3/V4/4G use raw / 1800000. Mixing them up puts your vehicle in the wrong country.

3. **Login response timing.** Devices disconnect after 5 seconds without an ACK. Send the ACK from the Netty channel before any DB lookup. Move all heavy work to a separate executor.

4. **Don't disconnect unregistered IMEIs.** Reply normally to login and heartbeat; flag as unauthorized in app layer. Disconnecting causes reconnect loops that burn the customer's data plan.

5. **GT06 0x79 0x79 frames use 2-byte length.** Both variants must be decoded in the frame splitter or you'll silently drop ICCID/voltage packets.

6. **All times are UTC over the wire and in DB.** Convert to `Asia/Dhaka` only at the display layer.

7. **GT06 password defaults to `123456`.** It's part of every server command (`DYD,123456#`). Customer-changeable but most devices ship with the default.

8. **APN matters more than people think.** Wrong APN = no data = no connection. Bangladesh APNs: `gpinternet` (GP), `internet` (Robi), `blweb` (Banglalink), `gprsunl` (Teletalk).

9. **Multi-tenant filter at the WebSocket gateway.** Never broadcast to all clients and filter in the browser — that's a privacy leak and an instant CVE.

10. **Hot path = no JPA.** `LocationService.saveAndBroadcast` runs on every packet (potentially thousands per second). Use `JdbcTemplate` with prepared statements. JPA's first-level cache and dirty checking will kill you.

11. **Always seed the dashboard from REST first.** WebSocket only delivers new events; an empty map until the first packet arrives is a bad UX.

12. **CRC over what exactly?** From byte 2 (length) through end of serial. Not over start bits. Not over stop bits. Not over the CRC field itself.

13. **`SERVER` SMS format is mode-strict.** `SERVER,1,domain,port,0#` requires a domain. `SERVER,0,IP,port,0#` requires an IP. Mixing the mode flag fails silently.

14. **bKash sandbox tokens expire after 1 hour.** Refresh per request or cache with TTL. Don't share tokens across instances.

15. **Mapbox markers don't auto-rotate with course.** Pass `rotation: course` when creating the marker, and update it on each position change. Forgetting this gives you "vehicles" facing one fixed direction.

---

## 19. Code Style

### 19.1 Java

- Spring Boot conventions
- Lombok `@Value`, `@Data`, `@Builder`, `@RequiredArgsConstructor` — not `@AllArgsConstructor` (forces ordering bugs)
- Records for DTOs (Java 21)
- `var` for local types when obvious; explicit types for public method signatures
- Always write tests for hot paths (protocol decoder, location pipeline)
- Logging: SLF4J, structured with key=value fields

### 19.2 TypeScript

- `strict: true`, `noUnusedLocals`, `noUnusedParameters`
- No `any` — use `unknown` and narrow
- Type imports: `import type { ... }` for type-only imports
- API responses typed in `/types/api.ts` matching backend DTOs exactly

### 19.3 React

- Functional components only, hooks for state
- File naming: `PascalCase.tsx` for components, `camelCase.ts` for utilities
- Tailwind utility-first; one-off CSS modules only when justified
- No prop drilling > 2 levels — extract a context

### 19.4 SQL

- Lowercase keywords (personal preference — adjust if team disagrees, then update doc)
- Snake_case identifiers
- Migrations are immutable once merged — never edit V1 once V2 exists; add V3

### 19.5 Commit Style

- Conventional commits: `feat: add geofence editor`, `fix: correct V1.8 lat decoding`
- One concern per PR
- PR description references CLAUDE.md sections affected

---

## 20. Working with Claude Code in this Repo

### 20.1 Before any task

1. Read this CLAUDE.md (full file, not just the relevant section)
2. Read the section most relevant to the task
3. Check `/docs/GT06_PROTOCOL.md` if working on the protocol layer
4. Check existing tests for conventions

### 20.2 When in doubt

- **Decision not in this doc?** Pause and ask. If the answer is generally useful, update this doc in the same PR.
- **Conflict between this doc and the code?** This doc wins; fix the code OR update this doc explicitly with rationale.

### 20.3 What NOT to do

- Don't introduce new dependencies without checking section 2
- Don't change a Phase 1 component while working on a Phase 4 task
- Don't add features outside the current phase scope; note them as Phase N+1 work
- Don't write JPA entities for time-series tables
- Don't leave `console.log` or `System.out.println` in commits

### 20.4 What TO do

- Write tests alongside code, not after
- When adding a REST endpoint, add the type to `/types/api.ts` AND update `/docs/API.md`
- When adding a DB column, write the migration AND the rollback note in the migration file header
- When fixing a protocol bug, add a unit test with the actual byte stream that broke

---

## 21. References

- Concox GT06 Communication Protocol (V3.0, 2025-07-15) — `/docs/GT06_PROTOCOL.md`
- Traccar source code (Apache License 2.0) for GT06 protocol details — https://github.com/traccar/traccar
- Spring Boot 3.3 reference — https://docs.spring.io/spring-boot/docs/3.3.x/reference/html/
- Netty user guide — https://netty.io/wiki/user-guide-for-4.x.html
- Mapbox GL JS docs — https://docs.mapbox.com/mapbox-gl-js/api/
- bKash Tokenized Checkout — https://developer.bka.sh/docs
- SSL Wireless SMS API — https://smsplus.sslwireless.com/api-doc
- PostGIS reference — https://postgis.net/docs/

---

## 22. Glossary

- **GT06** — Concox's binary GPS tracker protocol; de facto standard for budget Chinese trackers
- **IMEI** — International Mobile Equipment Identity, 15-digit unique device ID
- **ACC** — Accessory line, vehicle ignition status (on/off)
- **APN** — Access Point Name, cellular data configuration
- **LBS** — Location Based Service, cell tower triangulation fallback when GPS is unavailable
- **MCC/MNC/LAC/CellID** — Mobile country / network / area / tower identifiers
- **Geofence** — Geographic boundary that triggers alerts when crossed
- **Heartbeat** — Periodic packet device sends to confirm the TCP connection is alive
- **Hot path** — Code path that runs on every device packet; performance-critical
- **White-label** — Reselling a third-party platform (e.g. GPSWox) under one's own brand; the opposite of EyeOn's owned-stack model

---

## 23. Competitive Positioning

Full teardown lives in [`docs/COMPETITIVE_ANALYSIS.md`](docs/COMPETITIVE_ANALYSIS.md). Summary:

- **Primary competitor: AutoNemo (Autonemo Limited)** — claims 150+ corporate clients, BTRC/VTS/BASSIS certified, iOS + Android apps.
- **They are a GPSWox white-label** (Android pkg `com.autonemovtsgpswox.track`). They rent a generic platform and can't deeply customize it — hence weak reviews on their reskinned UI and no native bKash billing.
- **EyeOn's moat is owning the full stack** (Netty GT06 server → PostGIS → custom dashboard → custom apps). We build what they can't customize: Bengali-first UX, native bKash/Nagad, bespoke corporate self-service.
- **Parity checklist** (match before/around launch): real-time track + route replay, fuel monitoring, geofence alerts, driver behavior, e-lock/immobilization (GT06 `DYD`/`HFYD`), fleet/vertical solutions (bike, school bus, asset). Fuel-sensor hardware and dashcam/video telematics are post-Phase-4 roadmap items.
- **Pricing benchmark:** AutoNemo hardware ৳4,000–9,000 one-time; ~৳500/vehicle/month subscription. EyeOn's ৳200–500/month band is competitive.
- **Non-code blocker for corporate:** BTRC/VTS-type certification is a trust prerequisite for corporate/government fleets — track as a business task.

---

*Last updated: 2026-09-21. Update the date when you change anything substantive.*
