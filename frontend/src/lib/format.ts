import type { Locale } from "./i18n";
import type { DeviceView, LocationView } from "@/types/domain";

const TIMEZONE = "Asia/Dhaka";

/** Speeds at or below this threshold (kph) are considered GPS noise and displayed as 0. */
const SPEED_NOISE_THRESHOLD = 5;

/**
 * Filter out unreliable speed readings:
 * 1. When GPS fix is invalid (valid=false), speed is meaningless - show 0
 * 2. Speeds at or below 5 kph are typically GPS drift when stationary - show 0
 */
export function filterSpeed(speed: number | null | undefined, valid?: boolean | null): number {
  if (speed == null) return 0;
  // When GPS fix is invalid, speed is unreliable (cell tower can't measure speed)
  if (valid === false) return 0;
  return speed <= SPEED_NOISE_THRESHOLD ? 0 : speed;
}

/**
 * AutoNemo-style single-bucket vehicle state (matches the filter chips on the
 * Vehicles screen). Mirrors the 4-state motion model in the mobile app, plus
 * the subscription "expired" and "no data" buckets AutoNemo distinguishes.
 */
export type VehicleState = "moving" | "idle" | "stopped" | "offline" | "expired" | "nodata";

/** True if the device's subscription has lapsed (suspended/cancelled or past due). */
export function isSubscriptionExpired(d: DeviceView): boolean {
  if (d.subscriptionStatus === "SUSPENDED" || d.subscriptionStatus === "CANCELLED") return true;
  if (d.subscriptionExpiresAt) {
    // Compare Dhaka calendar dates; expiry is a yyyy-MM-dd date string.
    const todayDhaka = new Date().toLocaleDateString("en-CA", { timeZone: TIMEZONE });
    return d.subscriptionExpiresAt < todayDhaka;
  }
  return false;
}

/**
 * Derive the vehicle's state. Precedence: no-data > expired > offline >
 * motion (moving / idle / stopped). Buckets are mutually exclusive so the
 * filter-chip counts sum to the fleet total.
 *
 * For stopped vehicles (speed ≤ 2):
 * - ACC ON → Idle (engine running, traffic jam, waiting at signal)
 * - ACC OFF or unknown → Stopped (parked, engine off)
 */
export function vehicleState(d: DeviceView, live?: LocationView | null): VehicleState {
  if (d.status === "NEVER_CONNECTED" || !d.lastSeenAt) return "nodata";
  if (isSubscriptionExpired(d)) return "expired";
  if (d.status !== "ONLINE") return "offline";
  const speed = filterSpeed(live?.speed ?? d.lastSpeed, live?.valid);
  if (speed > 0) return "moving";

  // Vehicle is stationary. Only show "Idle" if ACC is explicitly ON.
  // When ACC is unknown (null), default to "Stopped" (safer assumption).
  return live?.accOn === true ? "idle" : "stopped";
}

/**
 * Hex color per state for text, dots and list rows. Follows ADL's semantics:
 * green = moving, blue = static, grey = offline. Idle keeps amber so the list
 * can still distinguish "engine on but not moving".
 */
export const VEHICLE_STATE_COLOR: Record<VehicleState, string> = {
  moving: "#16a34a",   // Green - vehicle in motion
  idle: "#d97706",     // Amber - engine on but stationary
  stopped: "#1d6fd6",  // Blue - parked, engine off (ADL "static")
  offline: "#6b7280",  // Gray - no connection
  expired: "#dc2626",  // Red - subscription expired
  nodata: "#f97316",   // Orange - never connected
};

/**
 * Body tint for the top-down map markers — the exact ADL marker set: bright
 * green (moving), blue (static), light grey (offline / expired / never seen).
 */
export const MARKER_BODY_COLOR: Record<VehicleState, string> = {
  moving: "#30c85a",
  idle: "#f5b301",
  stopped: "#1e7ff5",
  offline: "#c9cdd2",
  expired: "#c9cdd2",
  nodata: "#c9cdd2",
};

/** Compact elapsed time "0h 18m" / "18m 2s" since a timestamp (AutoNemo "since"). */
export function formatSince(ts: string | null | undefined): string {
  if (!ts) return "—";
  const secs = Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 1000));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/**
 * Short elapsed duration for dense list rows: "45 s", "5 min", "1 h 12 min", "2 d 3 h".
 * Returns "" when the timestamp is missing so callers can fall back to a label.
 */
export function formatCompactDuration(ts: string | null | undefined): string {
  if (!ts) return "";
  const secs = Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 1000));
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return h > 0 ? `${d} d ${h} h` : `${d} d`;
  if (h > 0) return m > 0 ? `${h} h ${m} min` : `${h} h`;
  if (m > 0) return `${m} min`;
  return `${secs} s`;
}

const COMPASS_16 = [
  "North", "North-northeast", "Northeast", "East-northeast",
  "East", "East-southeast", "Southeast", "South-southeast",
  "South", "South-southwest", "Southwest", "West-southwest",
  "West", "West-northwest", "Northwest", "North-northwest",
];

/** Human heading for a GPS course in degrees (16-point compass). */
export function compassLabel(course: number | null | undefined): string {
  if (course == null || Number.isNaN(course)) return "—";
  const idx = Math.round((((course % 360) + 360) % 360) / 22.5) % 16;
  return COMPASS_16[idx];
}

/** Start of the current Asia/Dhaka day as a UTC ISO string (for "today" queries). */
export function dhakaTodayStartIso(): string {
  const DHAKA_OFFSET_MS = 6 * 3600 * 1000;
  const shifted = new Date(Date.now() + DHAKA_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - DHAKA_OFFSET_MS).toISOString();
}

/** Seconds → "2h 5m" / "45m" in the active locale's numerals. */
export function formatDurationS(seconds: number | null | undefined, locale: Locale): string {
  if (seconds == null || seconds < 0) return "—";
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${formatNumber(h, locale)}h ${formatNumber(m, locale)}m`;
  return `${formatNumber(m, locale)}m`;
}

/** Date-only in Asia/Dhaka — for subscription "Expires on". Accepts yyyy-MM-dd or ISO. */
export function formatDate(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "—";
  const tag = locale === "bn" ? "bn-BD" : "en-US";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00+06:00` : iso);
  return new Intl.DateTimeFormat(tag, {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d);
}

export function formatNumber(n: number, locale: Locale, opts?: Intl.NumberFormatOptions): string {
  const tag = locale === "bn" ? "bn-BD" : "en-US";
  return new Intl.NumberFormat(tag, opts).format(n);
}

export function formatDateTime(iso: string | Date, locale: Locale): string {
  const tag = locale === "bn" ? "bn-BD" : "en-US";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat(tag, {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatRelative(iso: string | null, locale: Locale): string {
  if (!iso) return locale === "bn" ? "—" : "—";
  const tag = locale === "bn" ? "bn-BD" : "en-US";
  const rtf = new Intl.RelativeTimeFormat(tag, { numeric: "auto" });
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return rtf.format(seconds, "second");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  return rtf.format(Math.round(seconds / 86400), "day");
}

export function formatBdt(amount: number, locale: Locale): string {
  if (locale === "bn") return `৳ ${formatNumber(amount, "bn")}`;
  return `BDT ${formatNumber(amount, "en", { minimumFractionDigits: 0 })}`;
}

export function formatVoltage(mv: number | null | undefined, locale: Locale): string {
  if (mv == null) return "—";
  return `${formatNumber(mv / 1000, locale, { maximumFractionDigits: 2 })} V`;
}

/**
 * GT06 reports GSM strength as 0-31 (or 0-4 on older firmware). We render as
 * percentage for compactness; callers rendering bars use {@link gsmBars} below.
 */
export function formatGsmSignal(value: number | null | undefined, locale: Locale): string {
  if (value == null) return "—";
  const pct = Math.round(Math.min(100, (value / 31) * 100));
  return `${formatNumber(pct, locale)}%`;
}

/** Map raw GSM strength (0-31) to a 0-4 bar count for icon-style indicators. */
export function gsmBars(value: number | null | undefined): number {
  if (value == null) return 0;
  if (value <= 0) return 0;
  if (value <= 7) return 1;
  if (value <= 15) return 2;
  if (value <= 23) return 3;
  return 4;
}

export function formatEngineHours(seconds: number | null | undefined, locale: Locale): string {
  if (seconds == null) return "—";
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 1000) return `${formatNumber(Math.floor(hours / 100) / 10, locale, { maximumFractionDigits: 1 })}k h`;
  if (hours > 0) return `${formatNumber(hours, locale)}h ${formatNumber(minutes, locale)}m`;
  return `${formatNumber(minutes, locale)}m`;
}

/**
 * GoMax-style precise stop duration: "Stopped 2h 15min 30sec"
 * Used in sidebar vehicle list for stopped/idle vehicles.
 */
export function formatStopDuration(ts: string | null | undefined): string {
  if (!ts) return "";
  const secs = Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 1000));
  const mins = Math.floor(secs / 60);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  // For very long durations (> 24h), show days + hours
  if (days > 0) {
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }

  // For durations between 1h and 24h, show hours + minutes
  if (hours > 0) {
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}min`;
  }

  // For durations under 1h, show minutes + seconds
  if (mins > 0) {
    const remainingSecs = secs % 60;
    return `${mins}min ${remainingSecs}sec`;
  }

  return `${secs}sec`;
}

/**
 * Convert vehicle battery voltage (mV) to percentage.
 * Based on typical 12V vehicle battery:
 * - 12.7V+ (12700mV) = 100% (fully charged)
 * - 12.4V (12400mV) = 75%
 * - 12.2V (12200mV) = 50%
 * - 12.0V (12000mV) = 25%
 * - 11.8V (11800mV) = 0% (discharged)
 *
 * For vehicles with external power (charging), voltage can go up to 14.4V.
 */
export function voltageToBatteryPercent(mv: number | null | undefined): number | null {
  if (mv == null) return null;

  // Voltage thresholds in millivolts
  const MIN_VOLTAGE = 11800;  // 0% - discharged
  const MAX_VOLTAGE = 12700;  // 100% - fully charged

  // Clamp to 0-100%
  if (mv <= MIN_VOLTAGE) return 0;
  if (mv >= MAX_VOLTAGE) return 100;

  // Linear interpolation between min and max
  return Math.round(((mv - MIN_VOLTAGE) / (MAX_VOLTAGE - MIN_VOLTAGE)) * 100);
}

/**
 * Format battery percentage with icon indicator.
 */
export function formatBatteryPercent(mv: number | null | undefined): string {
  const pct = voltageToBatteryPercent(mv);
  if (pct == null) return "—";
  return `${pct}%`;
}

/**
 * Get battery color based on percentage (for UI indicators).
 */
export function getBatteryColor(mv: number | null | undefined): string {
  const pct = voltageToBatteryPercent(mv);
  if (pct == null) return "#9CA3AF"; // gray
  if (pct <= 20) return "#DC2626";   // red - critical
  if (pct <= 40) return "#F59E0B";   // orange - low
  return "#16A34A";                   // green - good
}

/**
 * GSM signal strength as percentage (0-100%).
 * GT06 reports 0-31 scale.
 */
export function gsmToPercent(value: number | null | undefined): number | null {
  if (value == null) return null;
  return Math.round(Math.min(100, (value / 31) * 100));
}
