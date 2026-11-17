import { translate } from "./i18n";
import { colors } from "./theme";
import type { DeviceView, LocationView, MotionStatus } from "./types";

/**
 * Speeds at or below this (kph) are considered GPS noise and displayed as 0 (same as the web).
 * 2 since 2026-11-06 (was 5): the server shows 0 for a still tracker's held position and sends the
 * measured speed of a recognised walk (4-5 km/h; the trackers themselves report 0 while walking),
 * which the old threshold hid, so a walking child read as "in one place".
 */
const SPEED_NOISE_THRESHOLD = 2;

/**
 * Filter out unreliable speed readings:
 * 1. When GPS fix is invalid (valid=false), speed is meaningless - show 0
 * 2. Speeds of 2 kph or less are typically GPS drift when stationary - show 0
 */
export function filterSpeed(speed: number | null | undefined, valid?: boolean | null): number {
  if (speed == null) return 0;
  // When GPS fix is invalid, speed is unreliable (cell tower can't measure speed)
  if (valid === false) return 0;
  return speed <= SPEED_NOISE_THRESHOLD ? 0 : speed;
}

/** A packet without a fix still shows the last fix's speed when that fix is this recent. */
const FIX_FRESH_MS = 90_000;
/** A position whose newest packet is older than this says nothing about the speed now. */
// Three minutes: a watch reports about once a minute while moving, sometimes 100 s apart, and a
// tighter limit made it flip between moving and still from one report to the next.
const SPEED_STALE_MS = 180_000;

function olderThan(iso: string | null | undefined, ms: number): boolean {
  const at = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(at) && Date.now() - at > ms;
}

/**
 * The speed to show for a position. While someone travels the tracker sends Wi-Fi scans between
 * GPS fixes, stored without a fix; reading those as speed 0 made a moving person show as still,
 * most often right after the app came back from the background (its first read is the REST
 * snapshot, whose newest packet is often such a scan). A packet without a fix now keeps the speed
 * of a fix from the last 90 s (`lastValidTs`; the server sets it on REST rows, `mergeLive` on live
 * ones), and only then reads as 0.
 *
 * A tracker that went silent (tunnel, flat battery, no network) keeps its last packet, and that
 * packet's speed, until the server marks it offline minutes later: the person stayed "Moving ·
 * 40 km/h" and was auto-followed all that time. So when the newest packet, with a fix or not, is
 * older than 3 minutes the speed reads as 0. Compared with this phone's clock.
 */
export function speedOf(live: LocationView | null | undefined, fallback?: number | null): number {
  if (!live) return filterSpeed(fallback);
  if (olderThan(live.ts, SPEED_STALE_MS)) return 0;
  if (live.valid) return filterSpeed(live.speed, true);
  const fix = live.lastValidTs ? Date.parse(live.lastValidTs) : NaN;
  const recent = Number.isFinite(fix) && Date.parse(live.ts) - fix <= FIX_FRESH_MS;
  return recent ? filterSpeed(live.speed, true) : 0;
}

/**
 * Derive the UI motion state the AutoNemo-style screens show.
 *
 * For stopped vehicles (speed ≤ 5):
 * - ACC ON → IDLE (engine running, traffic jam, waiting at signal)
 * - ACC OFF or unknown → STOPPED (parked, engine off)
 */
export function motionOf(d: DeviceView, live?: LocationView | null): MotionStatus {
  if (d.status !== "ONLINE") return "OFFLINE";
  // Without a position row the device's own last speed is used; the same 90 s rule applies to it
  // (`lastSeenAt` is the newest packet of any kind).
  const speed = !live && olderThan(d.lastSeenAt, SPEED_STALE_MS) ? 0 : speedOf(live, d.lastSpeed);
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
      // Blue as on the web (status.stopped). It was the alarm red, so a child sitting in class
      // looked like an alert.
      return colors.stopped;
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

/** "2 d" / "5 h" / "18 min" in the app language, with the units the Stays screen uses. */
function withUnit(n: number, unit: "d" | "h" | "min"): string {
  return `${n} ${translate(`stays.unit.${unit}`)}`;
}

/** Elapsed "2 d 4 h" / "2 h 5 min" / "18 min" since a timestamp, in the app language. */
export function fmtSince(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h >= 24) return `${withUnit(Math.floor(h / 24), "d")} ${withUnit(h % 24, "h")}`;
  if (h > 0) return `${withUnit(h, "h")} ${withUnit(m, "min")}`;
  return withUnit(m, "min");
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

/** "3 min ago" / "3 মিনিট আগে" relative time for last-seen / alarm timestamps, in the app language. */
export function fmtAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Math.max(0, Date.now() - then) / 1000;
  if (diff < 60) return translate("time.justNow");
  const span =
    diff < 3600 ? withUnit(Math.floor(diff / 60), "min")
    : diff < 86400 ? withUnit(Math.floor(diff / 3600), "h")
    : withUnit(Math.floor(diff / 86400), "d");
  return translate("time.ago").replace("{t}", span);
}

/** The later of two ISO times (either may be missing or unreadable), or null. */
export function laterOf(a: string | null | undefined, b: string | null | undefined): string | null {
  const ta = a ? Date.parse(a) : NaN;
  const tb = b ? Date.parse(b) : NaN;
  if (!Number.isFinite(ta)) return Number.isFinite(tb) ? b ?? null : null;
  if (!Number.isFinite(tb)) return a ?? null;
  return tb > ta ? b ?? null : a ?? null;
}

/** Same thresholds as the web: red needs charging now, amber soon, green fine. */
export function batteryColor(percent: number): string {
  if (percent <= 15) return "#D92D20";
  if (percent <= 30) return "#B45309";
  return "#15803D";
}
