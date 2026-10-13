import { addDays, dhakaParts, presetRange, rangeFromDays, type PresetKey } from "@/dateRange";
import { colors } from "@/theme";
import type { StringKey } from "@/i18n";
import type { AlarmProcessResult, AlarmRuleType, AlarmSeverity, AlarmView } from "@/types";

/**
 * Alarm center helpers: the mobile counterpart of frontend/src/lib/alarmTypes.ts.
 * Labels use person vocabulary; inherited vehicle-only types get neutral wording.
 */

/** Every alarm type the backend can raise, mapped to its label key. */
const TYPE_LABEL: Record<string, StringKey> = {
  SOS: "alc.type.SOS",
  PLACE_ARRIVED: "alc.type.PLACE_ARRIVED",
  PLACE_LEFT: "alc.type.PLACE_LEFT",
  GEOFENCE_EXIT: "alc.type.GEOFENCE_EXIT",
  GEOFENCE_ENTER: "alc.type.GEOFENCE_ENTER",
  NOT_ARRIVED: "alc.type.NOT_ARRIVED",
  NOT_LEFT: "alc.type.NOT_LEFT",
  ARRIVED_ON_TIME: "alc.type.ARRIVED_ON_TIME",
  LEFT_ON_TIME: "alc.type.LEFT_ON_TIME",
  ARRIVED_LATE: "alc.type.ARRIVED_LATE",
  LEFT_LATE: "alc.type.LEFT_LATE",
  LOW_BATTERY: "alc.type.LOW_BATTERY",
  CHARGE_REMINDER: "alc.type.CHARGE_REMINDER",
  REMOVE: "alc.type.REMOVE",
  OVERSPEED: "alc.type.OVERSPEED",
  PARKING_TIMEOUT: "alc.type.PARKING_TIMEOUT",
  OFFLINE_TIMEOUT: "alc.type.OFFLINE_TIMEOUT",
  POWER_CUT: "alc.type.POWER_CUT",
  SHOCK: "alc.type.SHOCK",
  COLLISION: "alc.type.COLLISION",
  CURFEW_VIOLATION: "alc.type.CURFEW_VIOLATION",
  EXTERNAL_LOW_VOLTAGE: "alc.type.EXTERNAL_LOW_VOLTAGE",
  DOOR: "alc.type.DOOR",
  URGENT_ACCELERATION: "alc.type.URGENT_ACCELERATION",
  URGENT_DECELERATION: "alc.type.URGENT_DECELERATION",
  ACC_ON: "alc.type.ACC_ON",
  ACC_OFF: "alc.type.ACC_OFF",
  ENGINE_IDLE: "alc.type.ENGINE_IDLE",
};

/** Types offered in the filter, most relevant to a carer first. */
export const FILTER_TYPES: string[] = [
  "SOS",
  "PLACE_ARRIVED",
  "PLACE_LEFT",
  "GEOFENCE_EXIT",
  "GEOFENCE_ENTER",
  "NOT_ARRIVED",
  "NOT_LEFT",
  "ARRIVED_ON_TIME",
  "LEFT_ON_TIME",
  "ARRIVED_LATE",
  "LEFT_LATE",
  "LOW_BATTERY",
  "CHARGE_REMINDER",
  "REMOVE",
  "OVERSPEED",
  "PARKING_TIMEOUT",
  "OFFLINE_TIMEOUT",
  "POWER_CUT",
  "SHOCK",
  "COLLISION",
];

export const SEVERITIES: AlarmSeverity[] = ["CRITICAL", "WARNING", "INFO"];
export const PROCESS_RESULTS: AlarmProcessResult[] = ["HANDLED", "FALSE_ALARM", "NO_ACTION"];

export function alarmTypeLabel(type: string, t: (k: StringKey) => string): string {
  const key = TYPE_LABEL[type];
  if (key) return t(key);
  return type
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

/** "Arrived at a trusted place · School" when the alarm names a place. */
export function alarmTitle(a: AlarmView, t: (k: StringKey) => string): string {
  const label = alarmTypeLabel(a.type, t);
  const place = a.metadata?.geofenceName;
  return typeof place === "string" && place ? `${label} · ${place}` : label;
}

export function severityLabel(sev: string, t: (k: StringKey) => string): string {
  if (sev === "CRITICAL" || sev === "WARNING" || sev === "INFO") return t(`alc.sev.${sev}` as StringKey);
  return sev;
}

export function resultLabel(r: string | null | undefined, t: (k: StringKey) => string): string {
  if (r === "HANDLED" || r === "FALSE_ALARM" || r === "NO_ACTION") return t(`alc.res.${r}` as StringKey);
  return r ?? "";
}

/** Arrivals and on-time messages are good news: brand teal rather than the INFO grey. */
export function alarmColor(a: Pick<AlarmView, "type" | "severity">): string {
  if (a.severity === "CRITICAL") return colors.danger;
  if (a.severity === "WARNING") return colors.warn;
  if (a.type.startsWith("PLACE_") || a.type.endsWith("_ON_TIME") || a.type === "GEOFENCE_ENTER") return colors.brand;
  return colors.textFaint;
}

// ── Date ranges (Asia/Dhaka civil days) ─────────────────────────────

export interface AlarmRange {
  fromIso: string;
  toIso: string;
  /** Preset the range came from; null = a custom range with `label`. */
  preset: PresetKey | null;
  label: string;
}

export const RANGE_PRESETS: PresetKey[] = ["today", "yesterday", "last7", "last30"];

export const PRESET_LABEL: Record<PresetKey, StringKey> = {
  today: "preset.today",
  yesterday: "preset.yesterday",
  thisWeek: "preset.thisWeek",
  lastWeek: "preset.lastWeek",
  last7: "preset.last7",
  last30: "preset.last30",
};

export function rangeFor(preset: PresetKey): AlarmRange {
  const r = presetRange(preset);
  return { fromIso: r.fromIso, toIso: r.toIso, preset, label: r.label };
}

/** Same default as the web alarm center: the last 7 days including today. */
export function defaultRange(): AlarmRange {
  const today = dhakaParts();
  const r = rangeFromDays(addDays(today, -6), today, "last7");
  return { fromIso: r.fromIso, toIso: r.toIso, preset: "last7", label: r.label };
}

export function rangeLabel(r: AlarmRange, t: (k: StringKey) => string): string {
  return r.preset ? t(PRESET_LABEL[r.preset]) : r.label;
}

// ── Alarm rules ─────────────────────────────────────────────────────

/** Rule types a carer can create on mobile. The other inherited types stay editable when they exist. */
export const OFFERED_RULE_TYPES: AlarmRuleType[] = ["SPEED_OVER", "PARKING_TIMEOUT", "OFFLINE_TIMEOUT"];
export const MINUTE_RULES: AlarmRuleType[] = ["PARKING_TIMEOUT", "OFFLINE_TIMEOUT", "IDLE_TIMEOUT"];

export function ruleTypeLabel(rt: AlarmRuleType, t: (k: StringKey) => string): string {
  return t(`arule.type.${rt}` as StringKey);
}

export function ruleUnit(rt: AlarmRuleType, t: (k: StringKey) => string): string {
  if (rt === "SPEED_OVER") return t("arule.unit.kph");
  if (rt === "VOLTAGE_UNDER") return t("arule.unit.mv");
  return t("arule.unit.minutes");
}
