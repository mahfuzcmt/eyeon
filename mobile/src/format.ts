import { colors } from "./theme";
import type { DeviceView, LocationView, MotionStatus } from "./types";

/** Speeds below this threshold (kph) are considered GPS noise and displayed as 0. */
const SPEED_NOISE_THRESHOLD = 3;

/**
 * Filter out unreliable speed readings:
 * 1. When GPS fix is invalid (valid=false), speed is meaningless - show 0
 * 2. Speeds below 3 kph are typically GPS drift when stationary - show 0
 */
export function filterSpeed(speed: number | null | undefined, valid?: boolean | null): number {
  if (speed == null) return 0;
  // When GPS fix is invalid, speed is unreliable (cell tower can't measure speed)
  if (valid === false) return 0;
  return speed < SPEED_NOISE_THRESHOLD ? 0 : speed;
}

/**
 * Derive the UI motion state the AutoNemo-style screens show.
 *
 * For stopped vehicles (speed ≤ 3):
 * - ACC ON → IDLE (engine running, traffic jam, waiting at signal)
 * - ACC OFF or unknown → STOPPED (parked, engine off)
 */
export function motionOf(d: DeviceView, live?: LocationView | null): MotionStatus {
  if (d.status !== "ONLINE") return "OFFLINE";
  const speed = filterSpeed(live?.speed ?? d.lastSpeed, live?.valid);
  if (speed > 0) return "MOVING";

  // Vehicle is stationary (speed = 0 after filtering). Only show "IDLE" if ACC is explicitly ON.
  // When ACC is unknown (null), default to "STOPPED" (safer assumption).
  return live?.accOn === true ? "IDLE" : "STOPPED";
}

export function motionColor(m: MotionStatus): string {
  switch (m) {
    case "MOVING":
      return colors.ok;
    case "IDLE":
      return colors.warn;
    case "STOPPED":
      return colors.danger;
    case "OFFLINE":
      return colors.offline;
  }
}

export function severityColor(sev: string): string {
  switch (sev) {
    case "CRITICAL":
      return colors.danger;
    case "WARNING":
      return colors.warn;
    default:
      return colors.textFaint;
  }
}

/** Seconds → "2h 57m" / "9m 36s". */
export function fmtDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || totalSeconds < 0) return "—";
  const s = Math.floor(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

/** Meters → "39.79 km" / "830 m". */
export function fmtDistance(meters: number | null | undefined): string {
  if (meters == null) return "—";
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}

/** ISO → local "07 Jul, 06:43" in Asia/Dhaka (display layer, per CLAUDE.md §12.4). */
export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      timeZone: "Asia/Dhaka",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return iso;
  }
}

export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("en-GB", {
      timeZone: "Asia/Dhaka",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return iso;
  }
}

/** Millivolts → "12.3 V". */
export function fmtVoltage(mv: number | null | undefined): string {
  if (mv == null) return "—";
  return `${(mv / 1000).toFixed(1)} V`;
}

/** Start of the current Asia/Dhaka day as a UTC ISO string (for "today" queries). */
export function dhakaTodayStartIso(): string {
  const DHAKA_OFFSET_MS = 6 * 3600 * 1000;
  const shifted = new Date(Date.now() + DHAKA_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - DHAKA_OFFSET_MS).toISOString();
}

/** Elapsed "2d 4h" / "2h 5m" / "18m" since a timestamp — parking duration. */
export function fmtSince(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** True if the device's subscription has lapsed — mirrors web isSubscriptionExpired. */
export function subscriptionExpired(d: DeviceView): boolean {
  if (d.subscriptionStatus === "SUSPENDED" || d.subscriptionStatus === "CANCELLED") return true;
  if (d.subscriptionExpiresAt) {
    const todayDhaka = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
    return d.subscriptionExpiresAt < todayDhaka;
  }
  return false;
}

/** Whole days until the subscription due date (negative = past due), or null. */
export function subscriptionDaysLeft(d: DeviceView): number | null {
  if (!d.subscriptionExpiresAt) return null;
  const due = new Date(`${d.subscriptionExpiresAt}T00:00:00+06:00`).getTime();
  const todayDhaka = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
  const today = new Date(`${todayDhaka}T00:00:00+06:00`).getTime();
  return Math.round((due - today) / 86_400_000);
}

/** "3m ago" relative time for last-seen / alarm timestamps. */
export function fmtAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Math.max(0, Date.now() - then) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
