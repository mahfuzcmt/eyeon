# Competitive Analysis — AutoNemo (primary reference competitor)

> Last updated: 2026-07-03. EyeOn's closest full-service reference in the Bangladesh GPS
> tracking market. This doc informs product scope (§16 phases), pricing (§1), and app strategy (Phase 5).

## 1. Company snapshot

| Attribute | AutoNemo (Autonemo Limited) |
|---|---|
| Founded | 2022, Bangladesh |
| Positioning | "Country's best GPS tracking"; claims **150+ corporate clients** |
| Regulatory | BTRC approval, VTS certification, BASSIS, ECAB |
| Web dashboard | `vts.autonemo.com.bd` |
| Marketing site | `autonemogps.com` |
| Apps | iOS: *AutoNemo GPS Pro*, *AutoNemo Vehicle Tracking*; Android: `com.autonemovtsgpswox.track` |
| Telecom partners | Grameenphone, Banglalink, Robi |

## 2. KEY FINDING — they are a GPSWox white-label, not a custom platform

The Android package name is **`com.autonemovts`gpswox`.track`**. The `gpswox` substring reveals AutoNemo
resells **[GPSWox](https://www.gpswox.com/)** — an off-the-shelf, self-hosted white-label GPS tracking
platform — under their own brand. Their apps are the GPSWox reference apps (Flutter-based) reskinned; their
dashboard is a rebranded GPSWox web UI.

**Strategic implications for EyeOn:**
- They **cannot deeply customize** — no native bKash/Nagad billing, no true Bengali-first UX, no bespoke
  corporate features. They are limited to what GPSWox ships.
- Their recent UI overhaul drew **negative reviews** ("disgusting UX", "features hard to find", "live
  tracking worse than before") — a generic platform they don't control.
- **EyeOn owns its full stack** (Netty GT06 server, PostGIS, custom Next.js dashboard, custom apps).
  This is the moat: we customize what they can't. Own the platform they rent.

## 3. Feature inventory (parity targets)

Features AutoNemo advertises — treat as the **minimum parity checklist** for EyeOn:

**Tracking & monitoring**
- Real-time tracking (map + satellite view)
- Route replay / history
- Daily mileage + calendar-view mileage insights
- Parking location + duration
- Real-time **fuel monitoring** (claims up to 30% fuel savings) — via fuel sensor hardware
- Temperature monitoring; general IoT data collection

**Alerts & safety**
- Automated/configurable alerts, geofence alerts (SMS / email / push)
- Driver behavior monitoring
- Vehicle health monitoring
- **E-lock / immobilization** (cut engine remotely — maps to our GT06 `DYD`/`HFYD` commands, §6.7)
- Video telematics / dashcam integration
- Load monitoring

**Fleet / vertical solutions**
- Motorcycle tracking, school bus management, public transport, field-force tracking, asset tracking
- HR solution via PiHR partnership

**Corporate tier** (`autonemogps.com/corporate`)
- Dedicated Key Account Manager + named corporate sales contacts
- "Seamless API connectivity", customized reports, customized assistance
- "Fleets of any size" scalability
- NOTE: no self-service multi-user hierarchy, SLA, or onboarding flow is publicly documented — a **gap EyeOn can beat**.

**Mobile app** (Flutter, iOS + Android)
- 500+ device model support, all notifications, fuel reports, monthly driving/stoppage reports
- Map/satellite toggle, geofence drawing, address search, nearby POI ETA, calendar mileage view

## 4. Hardware & pricing benchmark (published, one-time BDT; subscription not shown online)

| Device class | AutoNemo price | Warranty |
|---|---|---|
| Classic (Bike/CNG/Auto) | ৳4,000 | 1 yr |
| Standard | ৳6,000 | 2 yr |
| Premium (no voice) | ৳8,000 | 3 yr |
| Classic w/ Voice | ৳5,000 | 1 yr |
| Standard w/ Voice | ৳7,000 | 2 yr |
| Premium w/ Voice | ৳9,000 | 3 yr |
| OBD Plug & Play (standard) | ৳6,000 | 1 yr |
| OBD Premium w/ Fuel | ৳12,000 | 1 yr |
| Wired w/ Fuel | ৳15,000 | 1 yr |
| Fuel sensor + EU premium device | ৳45,000 | 1 yr |
| Wireless portable | ৳10,000 | 1 yr |
| 4G dual dashcams (Jimi) | ৳14,500–20,500 | — |

- **Subscription:** industry reference ~**৳500/vehicle/month** (not published on their pricing page).
  EyeOn's ৳200–500 band (§1) is competitive.
- Hardware partners cited: Teltonika, Seeworld, Redtiger, Mechatronics, JimiIOT, **Concox**, BSJ, Botslab.
  (Concox = our GT06 target family — protocol compatibility confirmed.)

## 5. Where EyeOn wins (differentiation thesis)

| Dimension | AutoNemo (GPSWox rental) | EyeOn (owned stack) |
|---|---|---|
| Platform control | Locked to GPSWox features | Full control — build anything |
| Payments | Manual / generic | **Native bKash + Nagad** billing & webhooks |
| Language | Partial / generic i18n | **Bengali-first** UX, Hind Siliguri, BDT `৳` formatting |
| UX quality | Poorly reviewed generic UI | Purpose-built mission-control dashboard |
| Corporate self-service | Manual, account-manager-gated | Multi-tenant, roles, API, self-serve (§8, §11) |
| Apps | Reskinned GPSWox Flutter apps | Custom RN/Expo apps, our brand (Phase 5) |
| Data ownership | On GPSWox server model | Our AWS/VPS, our schema, our reports |

## 6. Watch-outs / things to match before launch

1. **Fuel monitoring** is a headline seller here — needs the fuel-sensor hardware variant + decoding path. Not in current phase scope; flag as post-Phase-4.
2. **Dashcam / video telematics** — a growing upsell (Jimi/Redtiger). Out of GT06 scope; partner-integration item, note for roadmap.
3. **Certifications** (BTRC / VTS / BASSIS) — AutoNemo leads with these for corporate trust. EyeOn will need equivalent regulatory approval to win corporate/government fleets. Track as a business (non-code) task.
4. **Named-account corporate sales motion** — they sell corporate via relationships + WhatsApp, not self-serve. EyeOn's edge is a genuine self-service corporate console; make sure it's demo-ready.

## 7. Legal note on referencing competitor apps

Reviewing AutoNemo's apps for **feature/UX ideas is legal** — functionality and ideas are not copyrightable.
**Copying their code, screens, artwork, brand, or repackaging their APK is not**, and both app stores auto-reject
copycats (Apple Guideline 4.1 Copycats / 4.3 Spam; Google Play repackaging/impersonation policy). EyeOn builds
its own implementation of the same feature set under its own brand.

## Sources
- https://autonemogps.com/ , /pricing/ , /corporate/
- https://vts.autonemo.com.bd/ (dashboard)
- https://play.google.com/store/apps/details?id=com.autonemovtsgpswox.track
- https://apps.apple.com/us/app/autonemo-gps-pro/id1621927611
- https://www.gpswox.com/ (white-label platform)
