# ADL Moto Viewer Analysis & EyeOn Development Plan

> Analysis Date: 2026-09-14
> Reference: https://pro.adlmotoviewer.cloud/
> Source: [ADL Moto Viewer Official](https://adlmotoviewer.com/), [App Store](https://apps.apple.com/us/app/adl-gps-tracker/id6748377576)

---

## 1. ADL Moto Viewer Platform Overview

### 1.1 What ADL Moto Viewer Is

ADL Moto Viewer is an **Automobile IoT AI Solution** platform providing GPS tracking and fleet management. Based on the `gpscdn.com` CDN usage, it appears to be built on a **Chinese GPS tracking white-label platform** (likely Huawei/Jimi GPS ecosystem), similar to how AutoNemo uses GPSWox.

### 1.2 ADL Moto Viewer Features (From Research)

**Core Tracking Features:**
- ✅ Real-time GPS tracking
- ✅ History playback (route replay)
- ✅ Alarm recording & notifications
- ✅ Business dashboards
- ✅ Remote fleet management
- ✅ Cost control analytics

**Advanced IoT Features:**
- ✅ Video + Telematics integration (dashcam with speed/location overlay)
- ✅ Passenger counting sensors
- ✅ Temperature monitoring (cold chain)
- ✅ Driver safety monitoring (AI fatigue/distraction detection)
- ✅ Fuel monitoring
- ✅ Engine diagnostics

### 1.3 ADL Branding & Colors

From their website CSS analysis:
- **Primary Color:** Red `#FF0000` / `#FF2B2B`
- **Secondary Color:** Orange `#FBBC34` (rgb(251,188,52))
- **Neutral:** White, Black, Grays
- **UI Style:** High contrast, professional

---

## 2. Current EyeOn Features (What You Have)

### 2.1 Core Features ✅ (Already Implemented)

| Feature | Status | Location |
|---------|--------|----------|
| Real-time GPS Tracking | ✅ Done | `FleetMap.tsx`, `useLiveLocations.ts` |
| Live Map with Markers | ✅ Done | `FleetMap.tsx` |
| Device List Sidebar | ✅ Done | `DeviceList.tsx` |
| Route History/Playback | ✅ Done | `RouteHistoryPanel.tsx`, `HistoryTab.tsx` |
| Trip Detection | ✅ Done | `trips/page.tsx` |
| Geofencing | ✅ Done | `GeofenceEditor.tsx`, `geofences/page.tsx` |
| Alarms & Notifications | ✅ Done | `AlarmList.tsx`, `AlarmBanner.tsx` |
| Speed Monitoring | ✅ Done | `Speedometer.tsx`, overspeed alerts |
| Device Commands | ✅ Done | Cut fuel, restore fuel, query |
| Multi-tenant | ✅ Done | Org-based isolation |
| Bengali/English i18n | ✅ Done | `i18n.ts` |
| Mobile App | ✅ Done | React Native with Expo |
| KPI Dashboard | ✅ Done | `KpiStrip.tsx` |
| Reports | ✅ Done | `reports/page.tsx` |
| Settings | ✅ Done | `settings/page.tsx` |
| Audit Log | ✅ Done | `audit-log/page.tsx` |
| Rules/Alerts | ✅ Done | `rules/page.tsx` |
| Scheduled Tasks | ✅ Done | `scheduled/page.tsx` |
| Google Maps Integration | ✅ Done | `leaflet.ts` with Google tiles |
| Traffic Overlay | ✅ Done | `FleetMap.tsx` |
| Vehicle Status (Moving/Idle/Stopped) | ✅ Done | 6-state model |
| GSM Signal Display | ✅ Done | Signal bars in sidebar |
| Battery Status | ✅ Done | Battery indicator |
| Live Tracking Panel | ✅ Done | `LiveTrackingPanel.tsx` |
| Address Geocoding | ✅ Done | Nominatim reverse geocoding |

### 2.2 EyeOn Current Color Scheme

```typescript
// From tailwind.config.ts
brand: {
  50: "#E6F4FF",
  400: "#29A3EE",  // Light cyan
  500: "#0284C7",  // Primary blue
  800: "#1B3A5F",  // Navy blue
  900: "#0C2340",  // Darkest navy
},
status: {
  moving: "#10B981",   // Green
  idle: "#8B5CF6",     // Purple
  stopped: "#EF4444",  // Red
  offline: "#94A3B8",  // Gray
  expired: "#6B7280",  // Dark gray
  nodata: "#F59E0B",   // Amber
},
alarm: {
  red: "#EF4444",
  amber: "#F59E0B",
  green: "#10B981",
}
```

---

## 3. Gap Analysis: What ADL Has That EyeOn Needs

### 3.1 MANDATORY VTS Features (P0 - Must Have)

These are basic VTS features every tracking platform needs:

| Feature | ADL | EyeOn | Priority | Notes |
|---------|-----|----------|----------|-------|
| Real-time Tracking | ✅ | ✅ | Done | |
| History Playback | ✅ | ✅ | Done | |
| Geofencing | ✅ | ✅ | Done | |
| Alarms | ✅ | ✅ | Done | |
| Reports | ✅ | ✅ | Done | Need PDF/Excel export |
| Device Groups | ✅ | ❌ | **P0** | Group vehicles by branch/type |
| Driver Management | ✅ | ❌ | **P0** | Assign drivers to vehicles |
| Share Location Link | ✅ | ❌ | **P0** | Temp public tracking link |
| Export Data (CSV/Excel) | ✅ | 🔸 | **P0** | Need proper export |
| Ignition (ACC) Status | ✅ | ✅ | Done | |
| External Power Status | ✅ | ✅ | Done | |

### 3.2 Important Features (P1 - High Priority)

| Feature | ADL | EyeOn | Priority | Notes |
|---------|-----|----------|----------|-------|
| Fuel Monitoring | ✅ | ❌ | P1 | Requires fuel sensor hardware |
| Maintenance Scheduler | ✅ | ❌ | P1 | Oil change, service reminders |
| Driver Behavior Score | ✅ | ❌ | P1 | Harsh braking, acceleration |
| POI (Points of Interest) | ✅ | ❌ | P1 | Mark important locations |
| Route Planning | ✅ | ❌ | P1 | Plan optimal routes |
| Multi-user Sub-accounts | ✅ | ✅ | Done | Already have roles |
| SMS Alerts | ✅ | ✅ | Done | SSL Wireless ready |
| Push Notifications | ✅ | ✅ | Done | Expo Push Service |

### 3.3 Advanced Features (P2 - Medium Priority)

| Feature | ADL | EyeOn | Priority | Notes |
|---------|-----|----------|----------|-------|
| Video/Dashcam Integration | ✅ | ❌ | P2 | Hardware dependent |
| AI Driver Monitoring | ✅ | ❌ | P2 | Fatigue detection |
| Passenger Counting | ✅ | ❌ | P2 | Bus/transport use case |
| Temperature Monitoring | ✅ | ❌ | P2 | Cold chain logistics |
| OBD-II Diagnostics | ✅ | ❌ | P2 | Engine codes |

### 3.4 Nice-to-Have Features (P3 - Low Priority)

| Feature | ADL | EyeOn | Priority | Notes |
|---------|-----|----------|----------|-------|
| 3D Map View | ✅ | ❌ | P3 | Visual enhancement |
| Street View | ✅ | ❌ | P3 | Google Street View link |
| Traffic Layer | ✅ | ✅ | Done | |
| Dark Mode | ? | ❌ | P3 | User preference |

---

## 4. UI/UX Improvement Plan

### 4.1 ADL-Style Layout Changes

Based on typical Chinese GPS platforms like ADL/GPSWox:

**Current EyeOn Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ [EyeOn] [Nav Icons...] [User] [Logout]               │ ← Top Bar (slim, 40px)
├──────────────┬──────────────────────────────────────────┤
│ Device List  │                                          │
│ (320px)      │              MAP                         │
│              │                                          │
│              │                                          │
│              ├──────────────────────────────────────────┤
│              │        Device Detail Panel               │
└──────────────┴──────────────────────────────────────────┘
```

**Proposed ADL-Style Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ [☰] [Logo] [Home][Map][Vehicles][Geofences][...] [🔔][👤]│ ← Keep current
├──────────────┬──────────────────────────────────────────┤
│ ┌──────────┐ │  ┌─────────────────────────────────────┐ │
│ │Search    │ │  │ Map Controls (zoom/layers/traffic) │ │
│ ├──────────┤ │  └─────────────────────────────────────┘ │
│ │[Chips]   │ │                                          │
│ │All Moving│ │              GOOGLE MAP                  │
│ │Idle Stop │ │                                          │
│ ├──────────┤ │  [Vehicle markers with labels]           │
│ │[Actions] │ │                                          │
│ ├──────────┤ │  ┌─────────────────────────────────────┐ │
│ │Vehicle 1 │ │  │ Live Status: 🟢 LIVE | 5/2/1        │ │
│ │Vehicle 2 │ │  └─────────────────────────────────────┘ │
│ │Vehicle 3 │ │                                          │
│ │...       │ │  ┌─────────────────────────────────────┐ │
│ │          │ │  │      Bottom Detail Panel            │ │
│ └──────────┘ │  │ [Name] [Speed] [Status] [Actions]   │ │
└──────────────┴──┴─────────────────────────────────────┴─┘
```

### 4.2 Color Scheme Options

**Option A: Keep EyeOn Blue Theme (Recommended)**
- Differentiates from ADL's red theme
- Cyan/Blue is more professional for enterprise
- Already implemented and tested

**Option B: Adopt ADL Red Theme**
```typescript
brand: {
  50: "#FFF5F5",
  100: "#FFE0E0",
  500: "#FF2B2B",  // ADL primary red
  600: "#E60000",
  700: "#CC0000",
},
accent: {
  orange: "#FBBC34",  // ADL secondary
}
```

### 4.3 Icon System

Current EyeOn uses inline SVG icons (good approach). To match ADL:

**Status Icons (keep current):**
- 🟢 Moving (green dot)
- 🟣 Idle (purple dot)
- 🔴 Stopped (red dot)
- ⚫ Offline (gray dot)

**Vehicle Icons (keep current realistic top-down):**
- Already have: Car, Motorcycle, Truck, Bus, CNG
- Match ADL by adding: Van, Pickup, Bicycle, Ship, Plane

**Action Icons (enhance):**
| Action | Current | ADL Style |
|--------|---------|-----------|
| History | ✅ Polyline | Same |
| Track | ✅ Crosshair | Same |
| Geofence | ✅ Hexagon | Same |
| Command | ✅ Terminal | Same |
| Share | 🔸 Need | + Share icon |
| Export | 🔸 Need | + Download icon |

---

## 5. Development Plan

### Phase 1: Core VTS Parity (2-3 weeks)

**Week 1-2: Device Groups & Organization**
```
Priority: P0 - MANDATORY

Tasks:
1. [ ] Database: Add `device_groups` table
   - id, org_id, name, color, parent_group_id
   - device_group_assignments (device_id, group_id)

2. [ ] Backend: GroupService, GroupController
   - CRUD operations
   - Assign/unassign devices
   - Nested groups support

3. [ ] Frontend: Group Management UI
   - Groups sidebar section (collapsible)
   - Drag-drop devices to groups
   - Group color picker
   - Filter map by group

4. [ ] Frontend: Device list grouping
   - Show group headers in sidebar
   - Group counts in chips
```

**Week 2-3: Driver Management**
```
Priority: P0 - MANDATORY

Tasks:
1. [ ] Database: Add `drivers` table
   - id, org_id, name, phone, license_no, photo_url
   - license_expiry, emergency_contact
   - current_device_imei (nullable)

2. [ ] Backend: DriverService, DriverController
   - CRUD operations
   - Assign driver to vehicle
   - Driver history (which vehicles driven)

3. [ ] Frontend: Drivers page
   - Driver list with photos
   - Assign to vehicle dropdown
   - Driver details panel

4. [ ] Frontend: Show driver in vehicle popup
   - Driver name + photo in marker popup
   - Driver in device list item
```

**Week 3: Share Location Link**
```
Priority: P0 - MANDATORY

Tasks:
1. [ ] Database: Add `shared_links` table
   - id, org_id, device_imei, token (UUID)
   - expires_at, created_by, is_active
   - view_count, last_viewed_at

2. [ ] Backend: ShareService, ShareController
   - Generate share link with expiry
   - Public endpoint: GET /share/{token}
   - No auth required for public view

3. [ ] Frontend: Share button in device popup
   - Generate link modal
   - Copy to clipboard
   - Set expiry (1h, 24h, 7d, 30d)

4. [ ] Public tracking page
   - /track/{token} - public route
   - Simple map + vehicle marker
   - No sidebar, no auth
   - EyeOn branding watermark
```

### Phase 2: Data Export & Reports (1-2 weeks)

**Week 4: Export Functionality**
```
Priority: P0 - MANDATORY

Tasks:
1. [ ] Backend: ExportService
   - CSV export for locations, trips, alarms
   - Excel export with formatting
   - PDF reports with charts

2. [ ] Frontend: Export buttons
   - Export button in each list page
   - Date range picker
   - Format selector (CSV/Excel/PDF)
   - Download progress indicator

3. [ ] Scheduled reports
   - Daily/weekly/monthly email
   - Report templates
   - Org-level settings
```

### Phase 3: UI Polish (1-2 weeks)

**Week 5-6: Visual Refinements**
```
Priority: P1 - Important

Tasks:
1. [ ] Enhance device popup
   - Add driver info section
   - Add "Share" button
   - Add "Navigate" button (open in Google Maps)
   - Better address display

2. [ ] Sidebar improvements
   - Collapsible groups
   - Better search (search by driver too)
   - Quick actions on hover

3. [ ] Map enhancements
   - Cluster markers when zoomed out
   - Show direction arrow on moving vehicles
   - Better label positioning

4. [ ] Mobile responsive
   - Bottom sheet on mobile
   - Touch-friendly controls
   - Swipe gestures
```

### Phase 4: Advanced Features (Future)

**Month 2+: Nice-to-have**
```
Priority: P1-P2

Tasks:
1. [ ] Fuel Monitoring (requires hardware)
2. [ ] Maintenance Scheduler
3. [ ] Driver Behavior Score
4. [ ] POI Management
5. [ ] Route Planning
6. [ ] OBD-II Integration (requires adapter)
```

---

## 6. Database Schema Changes

### 6.1 New Tables Required

```sql
-- V8__add_device_groups.sql
CREATE TABLE device_groups (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name          VARCHAR(255) NOT NULL,
    color         VARCHAR(20) DEFAULT '#3B82F6',
    parent_id     UUID REFERENCES device_groups(id) ON DELETE SET NULL,
    sort_order    INTEGER DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(org_id, name)
);

CREATE TABLE device_group_assignments (
    device_imei   VARCHAR(20) NOT NULL,
    group_id      UUID NOT NULL REFERENCES device_groups(id) ON DELETE CASCADE,
    assigned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (device_imei, group_id)
);

CREATE INDEX idx_device_groups_org ON device_groups(org_id);
CREATE INDEX idx_group_assignments_device ON device_group_assignments(device_imei);

-- V9__add_drivers.sql
CREATE TABLE drivers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    phone           VARCHAR(50),
    email           VARCHAR(255),
    license_no      VARCHAR(100),
    license_expiry  DATE,
    nid_no          VARCHAR(50),  -- Bangladesh National ID
    photo_url       TEXT,
    emergency_name  VARCHAR(255),
    emergency_phone VARCHAR(50),
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE, INACTIVE, SUSPENDED
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE driver_assignments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id       UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    device_imei     VARCHAR(20) NOT NULL,
    org_id          UUID NOT NULL,
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    unassigned_at   TIMESTAMPTZ,
    is_current      BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_drivers_org ON drivers(org_id);
CREATE INDEX idx_driver_assignments_current ON driver_assignments(device_imei) WHERE is_current = true;

-- V10__add_shared_links.sql
CREATE TABLE shared_links (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    device_imei     VARCHAR(20) NOT NULL,
    token           VARCHAR(64) UNIQUE NOT NULL,
    name            VARCHAR(255),  -- Optional friendly name
    expires_at      TIMESTAMPTZ NOT NULL,
    created_by      UUID REFERENCES users(id),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    view_count      INTEGER NOT NULL DEFAULT 0,
    last_viewed_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shared_links_token ON shared_links(token) WHERE is_active = true;
CREATE INDEX idx_shared_links_org ON shared_links(org_id);

-- V11__add_pois.sql
CREATE TABLE points_of_interest (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    category        VARCHAR(50),  -- OFFICE, WAREHOUSE, GAS_STATION, CUSTOMER, etc.
    icon            VARCHAR(50) DEFAULT 'pin',
    color           VARCHAR(20) DEFAULT '#3B82F6',
    geom            GEOGRAPHY(POINT, 4326) NOT NULL,
    latitude        DOUBLE PRECISION NOT NULL,
    longitude       DOUBLE PRECISION NOT NULL,
    address         TEXT,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pois_org ON points_of_interest(org_id);
CREATE INDEX idx_pois_geom ON points_of_interest USING GIST(geom);
```

---

## 7. API Endpoints to Add

### 7.1 Groups API
```
GET    /api/v1/groups                   → Group[]
POST   /api/v1/groups                   { name, color, parentId } → Group
PATCH  /api/v1/groups/:id               → Group
DELETE /api/v1/groups/:id               → 204
POST   /api/v1/groups/:id/devices/:imei → 204 (assign)
DELETE /api/v1/groups/:id/devices/:imei → 204 (unassign)
GET    /api/v1/groups/:id/devices       → Device[]
```

### 7.2 Drivers API
```
GET    /api/v1/drivers                  → Driver[]
POST   /api/v1/drivers                  { name, phone, licenseNo, ... } → Driver
GET    /api/v1/drivers/:id              → Driver
PATCH  /api/v1/drivers/:id              → Driver
DELETE /api/v1/drivers/:id              → 204
POST   /api/v1/drivers/:id/assign/:imei → 204 (assign to vehicle)
DELETE /api/v1/drivers/:id/assign       → 204 (unassign)
GET    /api/v1/drivers/:id/history      → Assignment[]
```

### 7.3 Share API
```
POST   /api/v1/share                    { imei, expiresIn } → { token, url }
GET    /api/v1/share                    → SharedLink[] (my org's links)
DELETE /api/v1/share/:id                → 204 (revoke)

# Public endpoint (no auth)
GET    /api/v1/public/track/:token      → { device, location, expiresAt }
```

### 7.4 Export API
```
GET    /api/v1/export/locations         ?imei=&from=&to=&format=csv|xlsx
GET    /api/v1/export/trips             ?imei=&from=&to=&format=csv|xlsx
GET    /api/v1/export/alarms            ?from=&to=&format=csv|xlsx
GET    /api/v1/export/report/daily      ?date=&format=pdf|xlsx
GET    /api/v1/export/report/fleet      ?from=&to=&format=pdf
```

### 7.5 POI API
```
GET    /api/v1/pois                     → POI[]
POST   /api/v1/pois                     { name, category, lat, lng, ... } → POI
PATCH  /api/v1/pois/:id                 → POI
DELETE /api/v1/pois/:id                 → 204
GET    /api/v1/pois/nearby              ?lat=&lng=&radius= → POI[]
```

---

## 8. Frontend Components to Add

### 8.1 New Pages
```
/dashboard/groups           # Group management
/dashboard/drivers          # Driver management
/dashboard/drivers/:id      # Driver detail
/dashboard/pois             # Points of Interest
/track/:token               # Public tracking page (no auth)
```

### 8.2 New Components
```
components/
├── group/
│   ├── GroupList.tsx           # Sidebar group tree
│   ├── GroupManagement.tsx     # Full page CRUD
│   └── GroupColorPicker.tsx
├── driver/
│   ├── DriverList.tsx
│   ├── DriverCard.tsx
│   ├── DriverAssignModal.tsx
│   └── DriverPhotoUpload.tsx
├── share/
│   ├── ShareModal.tsx          # Generate link modal
│   ├── ShareLinkList.tsx       # Manage existing links
│   └── PublicTrackingPage.tsx  # Public view
├── export/
│   ├── ExportButton.tsx
│   ├── ExportModal.tsx         # Date range + format
│   └── ExportProgress.tsx
├── poi/
│   ├── PoiList.tsx
│   ├── PoiMarker.tsx
│   └── PoiEditor.tsx
```

---

## 9. Priority Summary

### P0 - Must Have Before Launch (4-6 weeks)
1. ✅ Real-time tracking (done)
2. ✅ History playback (done)
3. ✅ Geofencing (done)
4. ✅ Alarms (done)
5. ⬜ Device Groups
6. ⬜ Driver Management
7. ⬜ Share Location Link
8. ⬜ Data Export (CSV/Excel)
9. ⬜ PDF Reports

### P1 - Important (2-4 weeks after P0)
1. ⬜ Maintenance Scheduler
2. ⬜ POI Management
3. ⬜ Driver Behavior Score
4. ⬜ Enhanced Mobile App

### P2 - Future Roadmap
1. ⬜ Fuel Monitoring (hardware required)
2. ⬜ OBD-II Integration
3. ⬜ Dashcam Integration
4. ⬜ AI Driver Monitoring

---

## 10. Recommendations

### 10.1 Keep EyeOn's Strengths
- **Blue/Cyan theme** - More professional than ADL's red
- **Glass UI style** - Modern and distinctive
- **Leaflet with Google tiles** - Best of both worlds
- **6-state vehicle status** - More granular than competitors

### 10.2 Adopt from ADL
- **Device grouping** - Essential for fleet organization
- **Driver management** - Critical for accountability
- **Share link** - Great for customer transparency
- **Cleaner popup design** - GoMax-style simplicity

### 10.3 Differentiate from ADL
- **Bengali-first UI** - ADL is English-only in Bangladesh
- **bKash billing** - Native payment integration
- **Owned stack** - Unlike white-label competitors
- **Better mobile app** - React Native with Expo

---

*Document Version: 1.0*
*Last Updated: 2026-09-14*
