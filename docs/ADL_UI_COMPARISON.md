# ADL Moto Viewer vs EyeOn UI Comparison

## Executive Summary

This document compares ADL Moto Viewer's UI/UX with EyeOn and outlines the mandatory VTS features that need to be implemented to match or exceed ADL's functionality.

---

## 1. ADL Moto Viewer UI Analysis

### 1.1 Color Scheme

| Element | ADL Color | Hex Code | EyeOn Current |
|---------|-----------|----------|------------------|
| Primary Brand | Red | #FF0000 / #E62E2E | Blue #0284C7 |
| Sidebar Background | Dark Navy | #001529 | Blue #1B3A5F |
| Primary Button | Blue (Ant Design) | #1890FF | Blue #0284C7 |
| Online Status | Green | #52C41A | Green #22C55E |
| Offline Status | Red/Orange | #FF4D4F | Red #EF4444 |
| Moving Vehicle | Blue | #1890FF | Blue |
| Stopped Vehicle | Yellow/Orange | #FAAD14 | Blue (stopped) |
| Background | White | #FFFFFF | Slate #0F172A |

### 1.2 Layout Structure

```
┌──────────────────────────────────────────────────────────────────┐
│                         TOP BAR                                   │
│ [Customer: name] [Search...] [Devices][Customer] [Lang] [User]   │
├────────┬─────────────────────────────────────────────────────────┤
│        │                                                          │
│ SIDE   │           DEVICE LIST            │       MAP            │
│ BAR    │  ┌─────────────────────────────┐ │                      │
│        │  │ [Search] [All][Online]...   │ │   [Cluster markers]  │
│ Monitor│  │ ▼ Ungrouped (8)             │ │                      │
│        │  │   ☑ DM-TA 11-6273  8km/h ● │ │   [Vehicle popup]    │
│ Stats  │  │   ☑ DMT-18-1670  12km/h ●  │ │                      │
│        │  │ ▼ TANK LORY (1)             │ │                      │
│ Manage │  │ ▼ CAVERD VAN (50)           │ │   [Map controls]     │
│        │  │ ▼ PICKUP (3)                │ │                      │
│Customer│  └─────────────────────────────┘ │                      │
│        │                                  │                      │
└────────┴─────────────────────────────────┴──────────────────────┘
```

### 1.3 Key UI Components

#### A. Sidebar Navigation (Vertical)
- **Monitor** - Live tracking (default)
- **Statistics** - Fleet analytics
- **Manage** - Device/geofence/alarm management
- **Customer** - Sub-customer management

#### B. Device List Panel
- Search by IMEI/Name/SIM
- Status tabs: All(73) | Online(70) | Offline(3) | Inactive(0)
- Speed filter dropdown
- "Include sub customer" checkbox
- **Collapsible Device Groups:**
  - Edit group button
  - Delete group button
  - Vehicle count in parentheses

#### C. Vehicle Row Item
```
☑ [Name: DM-TA 11-6273] [8km/h] [🚗] [●] [⋮]
   ├─ Checkbox for selection
   ├─ Device name (clickable)
   ├─ Speed indicator
   ├─ Vehicle type icon
   ├─ Status dot (green=online)
   └─ Menu (more actions)
```

#### D. Vehicle Info Popup
```
┌────────────────────────────────────────────────┐
│ DM-TA 11-6273 ✏️                        [X]  │
│ 863019808288522                                │
│ 8km/h(Southwest,Moving)                    ●   │
├────────────────────────────────────────────────┤
│ 👤 --              📶 ON(36m44s)              │
│ 📡 2026/09/14 14:40  📍 GPS                   │
│ 🕐 2026/09/14 14:40  🔌 Wired                 │
│ ⏱️ 5978KM          📏 74.52KM                 │
│ 🚀 10              👥 2                       │
│ 📍 24.093269,90.545616                        │
│ 🏠 Z3025, Nalgaon, বাংলাদেশ                   │
├────────────────────────────────────────────────┤
│ [🔄][📍][📌][👤][📐][📤][📑]                  │
│ History|Navigate|Track|Driver|Fence|Share|Note│
└────────────────────────────────────────────────┘
```

#### E. Map Features
- Google Maps base layer
- Vehicle clustering (shows count)
- Direction arrows on vehicles
- Real-time position updates
- "Refresh in X seconds" indicator
- Map controls (zoom, layer toggle)

---

## 2. EyeOn Current State

### 2.1 What We Already Have ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Live Map Tracking | ✅ Done | Google Maps + Leaflet |
| Vehicle Markers | ✅ Done | 6-state color coding |
| WebSocket Updates | ✅ Done | Real-time position |
| Status Filters | ✅ Done | Moving/Idle/Stopped/Offline |
| Vehicle List | ✅ Done | Search, filter, click-to-focus |
| Vehicle Popup | ✅ Done | Basic info + quick actions |
| Route History | ✅ Done | Playback with timeline |
| Geofencing | ✅ Done | Create/edit/delete |
| Alarms | ✅ Done | SOS, geofence, overspeed |
| Reports | ✅ Done | PDF/Excel export |
| Multi-tenant | ✅ Done | Organization isolation |
| Bengali UI | ✅ Done | Full i18n support |

### 2.2 What We're Missing ❌ (Gap Analysis)

| Feature | Priority | ADL Has | EyeOn Has |
|---------|----------|---------|--------------|
| **Device Groups** | P0 | ✅ | ❌ |
| **Driver Management** | P0 | ✅ | ❌ |
| **Share Location Link** | P0 | ✅ | ❌ |
| **Data Export (Excel)** | P0 | ✅ | Partial |
| Sub-customer hierarchy | P1 | ✅ | ❌ |
| Statistics Dashboard | P1 | ✅ | Partial KPIs |
| Points of Interest (POI) | P2 | ✅ | ❌ |
| Fuel Monitoring | P2 | ✅ | Planned |
| Video Streaming | P3 | ✅ | Not planned |
| OBD Integration | P3 | ✅ | Not planned |

---

## 3. Implementation Plan - P0 Features

### 3.1 Device Groups

**ADL Implementation:**
- Collapsible accordion groups in sidebar
- Drag & drop devices between groups
- Group-level actions (edit name, delete)
- Vehicle count per group

**EyeOn Implementation:**

```sql
-- Migration: V8__add_device_groups.sql
CREATE TABLE device_groups (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    color       VARCHAR(20) DEFAULT '#0284C7',
    icon        VARCHAR(50) DEFAULT 'folder',
    sort_order  INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(org_id, name)
);

ALTER TABLE devices ADD COLUMN group_id UUID REFERENCES device_groups(id);
CREATE INDEX idx_devices_group ON devices(group_id);
```

**API Endpoints:**
```
GET    /api/v1/groups              → DeviceGroup[]
POST   /api/v1/groups              → DeviceGroup
PATCH  /api/v1/groups/:id          → DeviceGroup
DELETE /api/v1/groups/:id          → 204
POST   /api/v1/groups/:id/devices  → { imeis: string[] }
```

**Frontend Components:**
```
components/device/
├── DeviceGroupList.tsx      # Collapsible groups accordion
├── DeviceGroupItem.tsx      # Single group header
├── DeviceGroupModal.tsx     # Create/edit group modal
└── DeviceList.tsx           # Updated to support groups
```

### 3.2 Driver Management

**ADL Implementation:**
- Driver list with photo
- Assign driver to vehicle
- RFID card binding
- Driver behavior linked to vehicle

**EyeOn Implementation:**

```sql
-- Migration: V9__add_drivers.sql
CREATE TABLE drivers (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name         VARCHAR(255) NOT NULL,
    phone        VARCHAR(50),
    license_no   VARCHAR(100),
    license_expiry DATE,
    photo_url    VARCHAR(500),
    rfid_card    VARCHAR(100),
    status       VARCHAR(20) DEFAULT 'ACTIVE',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE devices ADD COLUMN driver_id UUID REFERENCES drivers(id);
CREATE INDEX idx_drivers_org ON drivers(org_id);
```

**API Endpoints:**
```
GET    /api/v1/drivers              → Driver[]
POST   /api/v1/drivers              → Driver
PATCH  /api/v1/drivers/:id          → Driver
DELETE /api/v1/drivers/:id          → 204
POST   /api/v1/drivers/:id/assign   → { imei: string }
```

### 3.3 Share Location Link

**ADL Implementation:**
- Generate temporary share link
- Set expiration (1hr, 24hr, 7 days)
- Optional password protection
- Track link opens

**EyeOn Implementation:**

```sql
-- Migration: V10__add_shared_links.sql
CREATE TABLE shared_links (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id       UUID NOT NULL,
    device_imei  VARCHAR(20) NOT NULL,
    token        VARCHAR(64) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    expires_at   TIMESTAMPTZ NOT NULL,
    view_count   INTEGER DEFAULT 0,
    max_views    INTEGER,
    created_by   UUID REFERENCES users(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shared_links_token ON shared_links(token);
```

**API Endpoints:**
```
POST   /api/v1/share                 → { token, url, expires_at }
GET    /api/v1/share/:token          → SharedLocation (public)
DELETE /api/v1/share/:id             → 204
```

**Public Page:**
```
/share/[token]/page.tsx  # Public map view (no auth required)
```

### 3.4 Enhanced Data Export

**ADL Implementation:**
- Export device list to Excel
- Export trip history to Excel
- Export alarm history to Excel
- Custom date range selection

**EyeOn Implementation:**

```java
// ReportService.java additions
CompletableFuture<byte[]> exportDevicesToExcel(UUID orgId);
CompletableFuture<byte[]> exportTripsToExcel(UUID orgId, String imei, Instant from, Instant to);
CompletableFuture<byte[]> exportAlarmsToExcel(UUID orgId, Instant from, Instant to);
```

**API Endpoints:**
```
GET /api/v1/export/devices     ?format=xlsx → file
GET /api/v1/export/trips       ?imei=&from=&to=&format=xlsx → file
GET /api/v1/export/alarms      ?from=&to=&format=xlsx → file
```

---

## 4. UI Redesign Recommendations

### 4.1 Color Scheme Options

**Option A: Keep EyeOn Blue (Recommended)**
- Differentiates from ADL (red) and competitors
- Blue = trust, technology, reliability
- Already established brand identity

**Option B: Adopt ADL-style Dark Theme**
- Dark sidebar (#001529) + white content area
- Matches industry standard for fleet tools
- Better for prolonged use (less eye strain)

### 4.2 Layout Changes

**Current EyeOn:**
```
┌──────────────────────────────────────────────────────────────────┐
│                         TOP BAR (horizontal nav)                  │
├──────────────────────────────────────────────────────────────────┤
│    DEVICE LIST (left)    │           MAP (right)                 │
└──────────────────────────┴───────────────────────────────────────┘
```

**Proposed (ADL-style):**
```
┌────────┬─────────────────────────────────────────────────────────┐
│ SIDE   │                    TOP BAR                              │
│ BAR    ├─────────────────────────────────────────────────────────┤
│        │    DEVICE LIST       │           MAP                    │
│ (icons)│    (with groups)     │    (with enhanced popups)        │
└────────┴─────────────────────────────────────────────────────────┘
```

### 4.3 Component Updates

| Component | Current | Proposed |
|-----------|---------|----------|
| Sidebar | Horizontal topbar | Vertical icon sidebar |
| Device List | Flat list | Grouped accordion |
| Vehicle Popup | Basic info | Rich info + quick actions |
| Status Tabs | Chip filters | Tab buttons with counts |
| Search | Single field | Multi-field (IMEI, name, plate) |

---

## 5. Development Timeline

### Sprint 1 (Week 1-2): Device Groups
- [ ] Database migration for device_groups
- [ ] Backend API endpoints
- [ ] DeviceGroupList component
- [ ] DeviceGroupModal (create/edit)
- [ ] Drag-drop reordering
- [ ] Tests

### Sprint 2 (Week 3-4): Driver Management
- [ ] Database migration for drivers
- [ ] Backend API endpoints
- [ ] DriverList page
- [ ] DriverForm (create/edit with photo)
- [ ] Driver-vehicle assignment
- [ ] Tests

### Sprint 3 (Week 5-6): Share Location
- [ ] Database migration for shared_links
- [ ] Backend API endpoints
- [ ] ShareModal component
- [ ] Public share page
- [ ] Link expiration job
- [ ] Tests

### Sprint 4 (Week 7-8): Export & Polish
- [ ] Excel export for all data types
- [ ] UI polish and consistency
- [ ] Performance optimization
- [ ] Integration testing
- [ ] Documentation

---

## 6. Files to Create/Modify

### Backend (Java)

**New Files:**
```
backend/src/main/java/com/webinnovation/motolink/
├── domain/
│   ├── DeviceGroup.java
│   ├── Driver.java
│   └── SharedLink.java
├── repository/
│   ├── DeviceGroupRepository.java
│   ├── DriverRepository.java
│   └── SharedLinkRepository.java
├── service/
│   ├── DeviceGroupService.java
│   ├── DriverService.java
│   └── ShareService.java
├── api/
│   ├── DeviceGroupController.java
│   ├── DriverController.java
│   └── ShareController.java
└── dto/
    ├── group/
    ├── driver/
    └── share/
```

**Migrations:**
```
backend/src/main/resources/db/migration/
├── V8__add_device_groups.sql
├── V9__add_drivers.sql
└── V10__add_shared_links.sql
```

### Frontend (Next.js)

**New Files:**
```
frontend/src/
├── app/
│   ├── dashboard/
│   │   ├── groups/page.tsx
│   │   └── drivers/page.tsx
│   └── share/[token]/page.tsx
├── components/
│   ├── device/
│   │   ├── DeviceGroupList.tsx
│   │   ├── DeviceGroupItem.tsx
│   │   └── DeviceGroupModal.tsx
│   ├── driver/
│   │   ├── DriverList.tsx
│   │   ├── DriverCard.tsx
│   │   └── DriverForm.tsx
│   └── share/
│       ├── ShareModal.tsx
│       └── SharedMapView.tsx
└── types/
    ├── group.ts
    ├── driver.ts
    └── share.ts
```

**Modified Files:**
```
frontend/src/components/device/DeviceList.tsx  # Add group support
frontend/src/components/map/FleetMap.tsx       # Enhanced popup
frontend/src/components/shell/Sidebar.tsx      # Vertical layout
```

---

## 7. Success Criteria

- [ ] Users can create, edit, delete device groups
- [ ] Devices can be assigned to groups
- [ ] Device list shows collapsible groups
- [ ] Users can create, edit, delete drivers
- [ ] Drivers can be assigned to vehicles
- [ ] Users can generate shareable tracking links
- [ ] Public share pages work without authentication
- [ ] All data types exportable to Excel
- [ ] UI matches or exceeds ADL quality
- [ ] All features work in Bengali

---

*Document created: 2026-09-14*
*Based on ADL Moto Viewer analysis (pro.adlmotoviewer.cloud)*
