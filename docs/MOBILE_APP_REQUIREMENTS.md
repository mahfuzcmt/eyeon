# EyeOn Mobile App — Requirements (derived from AutoNemo UX video, 2026-07-03)

> Requirements distilled from a 4:16 screen-recording of the AutoNemo Android app (a GPSWox
> Flutter white-label). This captures the **feature set and UX flow to match**; EyeOn builds
> its own implementation against its own backend. Screen refs (S#/T#) map to extracted frames.
> Target: React Native + Expo app (CLAUDE.md §16 Phase 5), talking to the EyeOn REST + STOMP backend.

## 0. Navigation shell

Bottom tab bar, 5 tabs (persistent): **Home · Map · Vehicles · Alerts · More**.
Brand header ("motolink" logo) with a **filter** icon on Map/Alerts.

---

## 1. Login  *(not shown in video — spec from brand + CLAUDE.md §8.1, §14)*

- Email + password, "remember me", "forgot password".
- Bengali / English toggle.
- On success store JWT (secure storage), route to Home.
- Backend: `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`.

## 2. Home  *(T0, S21)*

**Fleet Status** summary cards with live counts: **Moving · Idle · Stopped · Offline**.
**Single Vehicle Stats** — a vehicle picker + today's rollup for the selected device:
- Route Length (km), Move Duration, Stop Duration, Idle Duration, Top Speed (kph), Fuel Cost (BDT).
- Backend: fleet counts from `GET /devices/locations/last` (derive status) + a dashboard/stats endpoint
  (EyeOn already added KPI/dashboard endpoints — reuse `DashboardController`).

## 3. Map (live fleet)  *(S1, T1, T15, T17)*

Full-screen map (EyeOn uses **Google Maps** as base layer since 2026-07-12 — OSM/Mapbox data misses Bangladesh roads/POIs; free OSM fallback when no key).
- Vehicle markers = colored vehicle icon rotated by course; label = plate.
- Controls (bottom): **Refresh** · **Locate Me** (center on user GPS) · **zoom + / −**.
- Top: **Map View** dropdown (Normal/Satellite) · **Show Traffic** checkbox · **filter** icon.
- Initial load via REST last-known, then live updates via STOMP WS.
- Backend: `GET /devices/locations/last` → seed; subscribe `/topic/org/{orgId}/locations`.

## 4. Vehicles list  *(S18, T16, T18)*

- **Search Vehicle** text box.
- Filter chips with counts: **All · Moving · Idle · Stopped · Expired · Offline · No Data**.
- Vehicle card: icon, plate (e.g. `DM-GHA-32-3223`), "Stopped since 0H 18M 2S", status pills
  (**Stopped/Moving/Idle**, **Ignition OFF/ON**, **Charging**), speed (KM/H),
  "Last updated …", **"Expires on …"** (subscription date).
- Tap card → Vehicle detail.
- Backend: `GET /devices?status=&q=` + last-known location + subscription expiry.

## 5. Vehicle detail — 4 tabs: **Track · Calendar View · History · Statistics**

### 5.1 Track  *(S3–S17, T9–T13)*
- Map centered on the vehicle; marker with a red pulse radius when stopped/parked.
- Left vertical quick-action rail: center/follow, refresh, **engine lock** (padlock), etc.
- Bottom telemetry strip: **GPS** level · **GSM** level · **Ignition** · **Charging** · **speedometer gauge** (0–160, live kmph).
- **More Options** bottom sheet (6): **Update Icon**, **Directions** (opens Google Maps),
  **Fuel Cost/Liter** (numeric modal), **Mileage/Liter**, **Share Location**, **Update Odometer**.
- **Update Icon** picker: Car · Motorcycle · CNG · Pickup · Scooter · Truck · Bus · Boat.
- Backend: `GET /devices/{imei}/locations/last`, WS live; command endpoints for engine lock
  (`POST /devices/{imei}/commands/cut-fuel` / `restore-fuel` → GT06 `DYD`/`HFYD`, CLAUDE.md §7.5).

### 5.2 Calendar View  *(S2, T3, T7)*
- Month calendar; each day cell shows that day's **distance (km)**.
- **Start time / End time** pickers; presets **Today · Yesterday · This Week · Last Week**.
- **Stop Interval** selector: **3 / 5 / 10 / 30 min** (min stop duration to count as a stop).
- **"View playback history"** button → History/playback.

### 5.3 History / Playback  *(T4, T5, T6)* — **"live moving" + "moving history"**
- Route **polyline** on map with **P markers** at parking/stops.
- Animated **moving marker** with live **Kmph** readout.
- Playback controls: **restart · play/pause · speed (1× …)**; also 5min/10min sampling toggle.
- Segment list splitting the day into **Trip** and **Stop** rows, each with:
  - **Distance** (km), **Start** time, **Duration**, **End** time,
  - **location lat/lng + "Fetch address"** (reverse-geocode on demand).
  - Header KPIs: max kph, total km, date.
- Backend: `GET /trips?device=&from=&to=` (Trip/Stop segments) + `GET /trips/:id/points` (polyline).
  EyeOn's `TripService` already computes start/end/distance/idle — surface stop segments too.

### 5.4 Statistics  *(T2)* — today's rollup for the vehicle
- Today's distance; current **location** (address); **"Stopped since"**; **subscription "Expires on"**; last trip distance.
- **Today's Statistics**: Odometer, Fuel Mileage (Km/L), Fuel Consumption (L), Fuel Cost (BDT),
  Avg Speed, Max Speed, Moving / Stop / Idle durations.
- Device health: **Battery %**, **GPS level**, **GSM level**, **Odometer**, **Engine Locked (Yes/No)**.
- **Server Time**.

## 6. Alerts  *(T19)*
- List of alert/alarm events (type, vehicle, time, location).
- **Filter** icon (by type/severity/date/vehicle).
- Disclaimer banner about GPS/coverage gaps.
- Backend: `GET /alarms?type=&severity=&unack=&from=&to=`, `PATCH /alarms/:id/acknowledge`;
  live via `/topic/org/{orgId}/alarms`.

## 7. More
- **Reports** catalog *(T20)*: General information, Drives and stops, Travel sheet, Speed report,
  Geofences, Events, Fuel level, Temperature, Odometer, Ignition ON/OFF, Routes, More Reports.
  Report generator *(S20)*: Devices · Date filter · Stops (>1 min) · Format (**pdf**) → **Generate**.
  Backend: `GET /reports/*` (CLAUDE.md §8.8).
- **My Rewards & Refer a Friend** *(S19)*: points (Available/Lifetime/Used), referral link + Share,
  Rewards History, Redeem. → **out of current EyeOn scope; roadmap item (loyalty).**
- Settings, language toggle, logout (standard).

---

## 8. Backend gaps to note (features in the video not yet in EyeOn scope)
- **Loyalty / referral / rewards** system — not in CLAUDE.md; defer to roadmap.
- **Fuel Cost/Liter & Mileage/Liter** per-vehicle settings + fuel consumption stats — needs a
  fuel model; EyeOn has fuel sensor as post-Phase-4 (see `COMPETITIVE_ANALYSIS.md`).
- **Update Odometer**, **Share Location** (public share link), **Temperature** reports — new endpoints.
- **Subscription "Expires on"** surfaced per-vehicle — EyeOn has `subscriptions` table; expose it on device DTO.

## 9. Priority (what the user explicitly asked for)
Login · Map (Refresh, Locate Me) · Vehicles · Alerts · live-moving playback ·
moving history with start/end time, location, distance → **Sections 1, 3, 4, 5.3, 6 above.**
These map cleanly onto existing EyeOn endpoints (`/auth`, `/devices/locations/last`, `/devices`,
`/trips`, `/alarms`) — no backend blockers for the core set.
