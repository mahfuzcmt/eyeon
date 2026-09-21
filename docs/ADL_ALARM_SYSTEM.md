# ADL Moto Viewer — alarm & notification system (recon 2026-09-16)

Captured from the ADL demo account with `scripts/explore_adl_alarms.js` and
`scripts/explore_adl_alarms2.js` (screenshots in `adl_screenshots/alarm*.png`,
page text in `alarm_recon.json` / `alarm2_recon.json`). ADL is a white-label of
the gpsen platform ("GPSBot" assistant, `main.html#/home/...` hash routes).

## What ADL has

| Area | ADL | EyeOn (after 2026-09-16) |
|---|---|---|
| Live alerting | Bottom-right bell, "You have N unread messages, click to view details" | Top-bar bell with unacknowledged badge + popup toasts with sound |
| Alarm settings | System Configuration → Alarm Configuration (per customer, "include sub customer"): rule toggles with parameters — ACC reminder (ignition on/off), door open/close, engine idle, running, parking timeout (min), overspeed (km/h + interval), offline timeout (min), fuel theft (%/min), refueling reminder — plus **Alarm push configuration**: "Alarm Tone" switch and a checkbox grid of ~60 alarm types | Rules page (speed, voltage, curfew, **parking / offline / idle timeout**) + Settings → Notifications (per user: popup / sound / push per type) |
| Alarm reports | Statistics → Alarm Information → **Alarm Overview** (device × type counts, date range, Excel/PDF) and **Alarm Details** (type / result filters, Process Result + Process Notes columns, Excel/PDF) | Alarms → **Alarm overview** tab (device × type, Excel) and **Alarm details** tab (filters, map, **Process** dialog with result + notes, Excel) |
| Alarm names | Manage → Alarm Name Customization (rename any of ~70 types) | Not built |
| Push to URL | Manage → Push Management → Push List / Push Log (webhook per customer with rules) | Not built (Phase 13 enterprise API) |
| Email reports | Manage → Mailbox Push (scheduled report tasks by type) | Not built (no mail sender yet) |
| Expiry | Manage → Device Expiration Reminder (expire within N days, Renew) | Admin → subscriptions (due-soon / expired) |

ADL's full alarm-type list (for future device/rule coverage): Low battery, Vibration,
Moving, Light sensor, Power cut, Overspeed, Signal jamming, Fake station, Fence out/in,
Area out/in, Risk point, Not returning home, Not working, Separation, Online, Offline
timeout, Parking timeout, VIN mismatch, Flip, Crash, Harsh acceleration/braking, Sharp
turn (left/right), Upward/Downward bump, Ignition on/off, Route deviation, Fuel theft,
Refueling reminder, Door open/close, Engine idle, Running, Low fuel warning, Waterfall
alarm, Mileage maintenance, Power on/cut, Input 2 ON, SOS, Car alarm disconnected /
reconnected, Vehicle armed/disarmed, Valet mode, Service notification, Fuel & power
failure, Restore oil & electricity, Location query, Forward collision warning, Vehicle
distance monitoring, Fatigue / distracted / phone-call / smoke driving, Abnormal driver,
Lens blocking, Lane departure, Pedestrian collision (the last group needs dashcam/DMS hardware).

## ADL menu map (for parity planning)

**Manage:** Device Management (All / Offline / Wireless battery statistics / Vehicle fuel
tank / Device expiration reminder / Share link / Mailbox push / Alarm name customization),
Fence Management (Custom fence / Vehicle aggregation), Service Management (Service list /
details / records), Push Management (Push list / log), Route Management, Command Task
(Task list / log), Event (Event list / log), Risk point management, Capital chasing car
management, Digital Key, Expired Device.

**Statistics:** Running Statistics (Running overview, Mileage report, Overspeed details,
Stay report, Daily moving details, Mileage maintenance statistics), Travel Report (Travel /
Overspeed / Offline), ACC Overview (ACC report / Idling report), Driver Behavior (Overview /
Details), Fuel Report (Consumption overview / details), Vehicle Info Report (Temperature /
Refueling & leak), Alarm Information (Overview / Details), Business Log. Every list has
Excel + PDF export.
