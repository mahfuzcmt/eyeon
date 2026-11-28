import type { StringKey } from "@/lib/i18n";
import type { AlarmProcessResult, AlarmSeverity, AlarmType, AlarmView } from "@/types/domain";

/** Same order as backend AlarmType so the settings matrix reads like the enum. */
export const ALARM_TYPES: AlarmType[] = [
  "SOS",
  "POWER_CUT",
  "SHOCK",
  "OVERSPEED",
  "GEOFENCE_ENTER",
  "GEOFENCE_EXIT",
  "PLACE_ARRIVED",
  "PLACE_LEFT",
  "NOT_ARRIVED",
  "NOT_LEFT",
  "ARRIVED_ON_TIME",
  "LEFT_ON_TIME",
  "ARRIVED_LATE",
  "LEFT_LATE",
  "ROUTE_DEVIATION",
  "BACK_ON_ROUTE",
  "ROUTE_NOT_TAKEN",
  "CHARGE_REMINDER",
  "COLLISION",
  "ACC_ON",
  "ACC_OFF",
  "LOW_BATTERY",
  "EXTERNAL_LOW_VOLTAGE",
  "REMOVE",
  "DOOR",
  "URGENT_ACCELERATION",
  "URGENT_DECELERATION",
  "CURFEW_VIOLATION",
  "PARKING_TIMEOUT",
  "OFFLINE_TIMEOUT",
  "ENGINE_IDLE",
];

export const PROCESS_RESULTS: AlarmProcessResult[] = ["HANDLED", "FALSE_ALARM", "NO_ACTION"];

export function processResultLabel(r: string | null | undefined, t: (k: StringKey) => string): string {
  if (r === "HANDLED" || r === "FALSE_ALARM" || r === "NO_ACTION") return t(`alarmResult.${r}` as StringKey);
  return r ?? "";
}

export const ALARM_SEVERITIES: AlarmSeverity[] = ["CRITICAL", "WARNING", "INFO"];

/** Human label for an alarm type; unknown/new backend types fall back to Title Case. */
export function alarmTypeLabel(type: string, t: (k: StringKey) => string): string {
  if ((ALARM_TYPES as string[]).includes(type)) return t(`alarmType.${type}` as StringKey);
  return type
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * The alarm's type plus the place it is about, when the alarm carries one ("Arrived · School").
 * Place, geofence, expected-time and route alarms have `metadata.geofenceName`.
 */
export function alarmTitle(alarm: Pick<AlarmView, "type" | "metadata">, t: (k: StringKey) => string): string {
  const label = alarmTypeLabel(alarm.type, t);
  const place = alarm.metadata?.geofenceName;
  return typeof place === "string" && place.trim() ? `${label} · ${place.trim()}` : label;
}

export function severityLabel(sev: string, t: (k: StringKey) => string): string {
  if (sev === "CRITICAL" || sev === "WARNING" || sev === "INFO") return t(`severity.${sev}` as StringKey);
  return sev;
}
