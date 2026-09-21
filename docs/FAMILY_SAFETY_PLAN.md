# EyeOn Family Safety — Feature Plan

> Written 2026-09-21. EyeOn's primary audience is now **parents tracking children and adult
> children tracking elderly relatives**, using a small wearable/bag tracker (see the product
> poster: `চোখে চোখে রাখুন, ও যেখানেই থাকুক।`). This document audits the eight poster features
> against the code and plans the work needed to deliver trusted-location and geofence
> notifications. Status claims below were checked against the tree on the date above; nothing
> here has been tested on a real device.

## 1. Who uses what

| Person | What they hold | What they need |
|---|---|---|
| Carer (parent, son/daughter) — the **app user** | Phone app, sometimes web | One glance answers "where is she, is she OK". Notifications that read like a message from a person, in Bengali, not like an alarm log. |
| Wearer (child, elderly parent) — **never opens the app** | The tracker only | One big SOS button. Nothing to configure. |
| Second carer (spouse, sibling) | Phone app | Same notifications, without sharing a password. |

Design consequences: large type and touch targets, high contrast, plain words ("reached
School", not `GEOFENCE_ENTER`), Bengali by default, and no fleet vocabulary (vehicle, driver,
fuel, ignition) on any screen a family user can reach.

## 2. Poster feature audit

| # | Poster feature | Status | Evidence / gap |
|---|---|---|---|
| 1 | **লাইভ লোকেশন** — live location on the map | Working | Netty → `LocationService` → Redis → STOMP → `FleetMap` / mobile `WebMap`. Gap: markers are vehicle silhouettes; needs person avatars (§6). |
| 2 | **সেফ জোন অ্যালার্ট** — notified on entering *and* leaving school | **Partial** | `GeofenceService.evaluate()` raises `GEOFENCE_ENTER` / `GEOFENCE_EXIT` on transitions and they are pushed. Gaps: no concept of a *trusted place*; push text is English, generic (`⚠️ GEOFENCE ENTER — name … Tap to view the vehicle`) and omits the place name; arrival is sent as a WARNING; no protection against GPS jitter at the boundary. This plan, §3–§5. |
| 3 | **জিওফেন্স** — draw your own boundary, alert when outside | Mostly working | Web: circle + polygon editor. Mobile: circle only. Gaps: **no edit endpoint** (`GeofenceController` has create/delete/assign only — `PATCH /geofences/:id` in CLAUDE.md §8.5 does not exist); same message problems as #2. |
| 4 | **SOS বাটন** — one press sends an urgent alert with location | **Partial — fix first** | `0x01` alarm → `AlarmType.SOS`, CRITICAL, pushed with location, web toast repeats a tone until acknowledged. Gap: the SMS leg is a stub — `AlarmService.raise()` calls `smsService.sendAlarmSms(a, null, …)` with a **null recipient**, so no SMS reaches anyone. For a child-safety product SOS must not depend on the carer having mobile data. §5.4. |
| 5 | **যাত্রাপথ হিস্ট্রি** — where they were all day | Working | `trips`, `TripReplay`, mobile History tab. Gap: trip detection leans on ACC (ignition), which a wearable does not have; the speed/stationary fallback exists but is untested for walking speeds (start threshold is 5 km/h — a walking child is ~4 km/h). §6. |
| 6 | **লম্বা ব্যাটারি** — lasts all day on a charge | Hardware + partial | `LOW_BATTERY` alarm (`0x19`) is decoded. Gaps: no battery **percentage** on the person card; no "battery low, charge tonight" push wording; long reporting intervals that save battery delay arrival notifications (§7, open question 2). |
| 7 | **ছোট ও হালকা** | Hardware | Nothing to build. |
| 8 | **সম্পূর্ণ বাংলা অ্যাপ** | **Partial** | UI strings are bilingual (`lib/i18n.ts`, `mobile/src/i18n.tsx`). Gaps: push and SMS bodies are English string concatenation; the UI still says vehicle/driver/fleet; the marketing site is entirely fleet copy ("Top GPS Tracking & Fleet Management Service", fuel savings). §6. |

## 3. Concepts

Two kinds of zone, one table. Both are rows in `geofences`; they differ in intent and wording.

| | **Trusted place** (`TRUSTED_PLACE`) | **Boundary** (`BOUNDARY`) |
|---|---|---|
| Meaning | Somewhere they are *supposed* to be: Home, School, Coaching, Mosque, Hospital, Grandma's | An area they should *not leave*: the neighbourhood, the school campus, the village |
| Shape | Circle, picked by dropping a pin or searching an address | Circle or polygon, drawn on the map |
| Arrive | "রাফি স্কুলে পৌঁছেছে · সকাল ৮:০২" — calm, INFO | optional, off by default |
| Leave | "রাফি স্কুল থেকে বের হয়েছে · দুপুর ২:৩১" — calm, INFO ("coming back from a trusted location") | "⚠️ দাদু নিরাপদ এলাকার বাইরে চলে গেছেন" — WARNING, louder sound |
| Default radius | 150 m (min 80 m — below that GPS error causes false events) | user-drawn |

"Coming back from a trusted location" is delivered as the **left** event of that place. When the
person then reaches another trusted place (typically Home) the **reached** event closes the
journey, so a school run produces exactly: left Home → reached School → left School → reached Home.

## 4. Data model — `V19__trusted_places.sql`

Migrations are immutable, so this is a new version. Rollback note goes in the file header.

```sql
alter table geofences
    add column kind           varchar(20) not null default 'BOUNDARY',  -- TRUSTED_PLACE | BOUNDARY
    add column place_type     varchar(20),          -- HOME SCHOOL COACHING MOSQUE HOSPITAL RELATIVE OTHER
    add column address        text,                 -- reverse-geocoded label shown under the name
    add column created_by     uuid references users(id),
    add column exit_buffer_m  integer not null default 30,   -- hysteresis, see §5.2
    add column min_dwell_s    integer not null default 60;   -- confirmation time, see §5.2

alter table geofence_states
    add column pending_inside boolean,              -- candidate new state awaiting confirmation
    add column pending_since  timestamptz;

create index idx_geofences_org_kind on geofences(org_id, kind) where is_active = true;
```

Existing rows become `BOUNDARY`, which preserves today's behaviour. New `AlarmType` values:
`PLACE_ARRIVED`, `PLACE_LEFT` (both INFO). `GEOFENCE_EXIT` / `GEOFENCE_ENTER` keep their meaning
for boundaries. `alarms.type` is a VARCHAR, so no enum migration is needed.

## 5. Backend work

### 5.1 API (`GeofenceController`, `GeofenceDtos`)

> Built 2026-09-21: the `kind` filter, the extra `POST` fields and `PATCH`. **Not built:** `/geofences/:id/events` and `/devices/:imei/places/current` (they belong to F6).

```
GET    /geofences?kind=TRUSTED_PLACE|BOUNDARY         filter (omit = all)
POST   /geofences        + { kind, placeType, address }     defaults keep old clients working
PATCH  /geofences/:id    { name, radiusM, center, points, notifyOn, color, placeType, isActive }   NEW
GET    /geofences/:id/events?from&to                  arrivals/departures for one place (reads alarms)
GET    /devices/:imei/places/current                  which trusted place they are in now, since when
```

`PATCH` closes the documented-but-missing endpoint. Changing geometry must delete that
geofence's `geofence_states` rows so the next sample re-seeds silently instead of firing a
false transition. Every handler stays org-scoped via `TenantContext` (CLAUDE.md §11).

### 5.2 Evaluation with hysteresis (`GeofenceService.evaluate`)

Today a single sample across the line fires an event. A wearable indoors drifts 20–50 m, so a
child sitting in a classroom near the edge would produce a stream of left/reached messages.

1. **Exit buffer.** A person who is *inside* only becomes a candidate for *outside* when the
   point is more than `exit_buffer_m` beyond the edge (`ST_DWithin(geom, point, exit_buffer_m)`
   is false). Entry uses the true edge.
2. **Dwell confirmation.** A candidate change is written to `pending_inside` / `pending_since`.
   It is committed — and the event raised — only when a later sample agrees and
   `now - pending_since >= min_dwell_s`. A sample that disagrees clears the candidate.
3. **Invalid fixes are already skipped** (`!loc.isValid()`), which keeps LBS/cell-tower
   positions from causing events. Keep that.
4. Event time is `pending_since` (when they actually crossed), not the confirmation time.

This stays on the ingestion executor, never the Netty thread, and adds no queries: the
candidate columns come back in the existing `findActiveForDeviceWithState` row.

Cost: notifications arrive `min_dwell_s` (default 60 s) plus one reporting interval late.

### 5.3 Human, bilingual messages (`NotificationComposer`, new)

Replace the string concatenation in `PushService.sendAlarmPush` and `AlarmService` with one
composer that takes `(alarm, device, locale)` and returns `{title, body, sound, channel}`.

| Event | bn | en |
|---|---|---|
| `PLACE_ARRIVED` | `📍 {name} এখন {place}-এ` · `পৌঁছানোর সময়: সকাল ৮:০২` | `{name} reached {place}` · `Arrived at 8:02 AM` |
| `PLACE_LEFT` | `🚶 {name} আর {place}-এ নেই` · `বের হওয়ার সময়: দুপুর ২:৩১` | `{name} left {place}` |
| `GEOFENCE_EXIT` | `⚠️ {name} নিরাপদ এলাকার বাইরে` · `{zone} · এখনই ম্যাপে দেখুন` | `⚠️ {name} is outside the safe area` |
| `SOS` | `🚨 {name} SOS চেপেছে!` · `ঠিকানা: {address}` | `🚨 {name} pressed SOS!` |
| `LOW_BATTERY` | `{name}-এর ডিভাইসে চার্জ কম ({pct}%)` | `{name}'s tracker battery is low ({pct}%)` |

- As built: there is no `users.locale` column, so the language lives on the push token
  (`push_tokens.locale`, sent by the app and re-sent when the user switches language),
  falling back to `organizations.locale`. Tokens are grouped by language before chunking to Expo.
- As built the Bengali lines avoid verbs ("এখন …-এ", "আর …-এ নেই") because পৌঁছেছে/পৌঁছেছেন
  depends on whether the wearer is a child or an elder, which the backend does not know.
- Bengali grammar varies with the place noun; templates take the whole place phrase rather
  than appending a suffix in code. Have a native speaker review every string — several of
  the above are first drafts.
- Times formatted in `Asia/Dhaka` with Bengali numerals for `bn`.
- Android channels: `arrivals` (default sound, normal importance), `alarms` (existing, high),
  `sos` (max importance, bypasses Do Not Disturb where the OS allows). Create in `mobile/src/push.ts`.

### 5.4 Delivery rules (`AlarmService.raise`)

| Event | Push | SMS | Web toast |
|---|---|---|---|
| `PLACE_ARRIVED` / `PLACE_LEFT` | yes (needs an exception to the current "INFO is never pushed" rule) | no — cost, and not urgent | quiet |
| `GEOFENCE_EXIT` (boundary) | yes | yes, if the user opted in | sound |
| `SOS` | yes | **always**, to every carer with a phone number | repeating tone |
| `LOW_BATTERY` | yes, at most once per 6 h | no | quiet |

- **Fix the SOS SMS stub.** Resolve recipients as: users assigned to the device
  (`user_device_assignments`, V8) with a phone → else the org's ORG_ADMINs with a phone.
  Subject to the existing SMS rate limit; SOS is exempt from the 10/hour provisioning cap.
- Add `PLACE_ARRIVED`, `PLACE_LEFT` to `NotificationDefaults` push types so new users get
  them without visiting Settings; existing users get them added by the V19 migration.
- Per-place mute: `notify_on` already supports `ENTER` / `EXIT` / `BOTH`; add `NONE` for a
  place kept only for history.
- Quiet hours are **not** planned: a child leaving home at 2 a.m. is exactly the alert a
  parent wants.

### 5.5 Tests (written alongside, CLAUDE.md §17)

`GeofenceServiceTest`: first sample seeds silently · arrive fires once after dwell ·
jitter across the edge inside `exit_buffer_m` fires nothing · leave fires once · a disagreeing
sample cancels a pending change · `notify_on` filters · geometry edit resets state ·
boundary vs trusted place produce different alarm types. `NotificationComposerTest`: every
event × both locales, missing name falls back to IMEI, Bengali numerals.

## 6. App work

**Trusted places (mobile first — this is where carers live).**
A *Places* screen: big cards with an icon per `place_type`, name, address, who is there now.
"Add place" is three steps on one screen: pick a type (icon grid) → drop the pin / search /
"use where {name} is right now" → choose radius with a slider showing the circle live.
Arrive/leave toggles default on. Existing `geofence-new.tsx` becomes the boundary flow.

**Web.** `/dashboard/geofences` gains a Places / Boundaries tab; the editor gains the type
picker and an edit mode (needs the new `PATCH`).

**Timeline.** On the person screen, today's story in plain words:
`৭:৪০ বাসা থেকে বের হয়েছে → ৮:০২ স্কুলে পৌঁছেছে → ২:৩১ স্কুল থেকে বের হয়েছে`. Built from
`GET /alarms?imei&type=PLACE_*` — no new storage.

**Vocabulary and markers (not done in the restyle commit).**
- `devices.vehicle_type` gains `CHILD`, `ELDER`, `PERSON` (VARCHAR, no migration); person
  avatars replace vehicle silhouettes in `FleetMap` and `WebMap`; optional photo later.
- i18n sweep: vehicle → person/family member, fleet → family, driver section hidden,
  ignition/fuel/engine-cut controls hidden when `vehicle_type` is a person type. Fuel cut
  (`DYD`) must never be offered for a wearable.
- Trip start threshold lowered for person types so walking registers (open question 3).
- **Marketing site rewrite**: every page under `(marketing)` is fleet copy and contradicts
  the poster. Separate task; needs the owner's messaging and pricing.

## 7. Order of work

| Step | Scope | Depends on |
|---|---|---|
| **F0** | Visual restyle: teal/yellow palette, rounded type, larger controls, EyeOn logo | — (done 2026-09-21) |
| **F1** | SOS SMS recipients (§5.4). Smallest change, highest safety value | — |
| **F2** | V19 + `kind`/`placeType` + `PATCH /geofences/:id` + hysteresis + tests | — (built 2026-09-21; SQL not yet run against Postgres) |
| **F3** | `NotificationComposer`, bilingual push/SMS, Android channels, delivery rules | F2 (push built 2026-09-21; SMS wording, the `sos` channel and LOW_BATTERY throttling not built) |
| **F4** | Mobile Places screen + add-place flow; web Places tab and edit mode | F2 (built 2026-09-21; address search not built - pin drop and "use where they are now" only) |
| **F5** | Person avatars, vocabulary sweep, hide vehicle-only controls, battery % | — |
| **F6** | Day timeline; "who is where now" on the home screen | F2, F3 |
| **F7** | Marketing site rewrite | owner input |
| Later | Expected-arrival alerts ("not at school by 8:30"); invite a second carer by phone number; place photos | F3 |

## 8. Open questions for the owner

1. **Which tracker is on the poster, and what protocol does it speak?** Everything above
   assumes it logs in over GT06 like the vehicle units. Many small personal trackers use
   GT06 variants, but SOS code, battery reporting and sleep behaviour differ per model.
   A packet capture from one real unit is needed before F1.
2. **Reporting interval vs battery.** Arrival alerts can be no faster than the device
   reports. At a 5-minute interval a parent hears "reached School" up to ~6 minutes late.
   What interval does the hardware sustain for a full day?
3. **Walking detection.** Trips start above 5 km/h today. Is a child's walk to school a
   "trip" you want in history? If yes the threshold drops to ~2 km/h for person types, at the
   cost of noisier history from GPS drift.
4. **Accounts.** Is a family an `organization` with one ORG_ADMIN and invited ORG_USERs
   (works today), or do you want phone-number sign-up with no email? The latter is new auth work.
5. **SMS cost.** SOS by SMS to every carer is assumed always-on and included in the
   subscription. Boundary-exit SMS is opt-in. Confirm.
6. **Consent.** Tracking an adult (an elderly parent) should be with their knowledge. Worth a
   line in onboarding and the terms; not a code task, but it should be decided before launch.
