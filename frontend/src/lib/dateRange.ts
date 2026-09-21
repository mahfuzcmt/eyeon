/**
 * Asia/Dhaka-aware date math for the vehicle-detail Calendar tab.
 * Ported from the mobile app (mobile/src/dateRange.ts) — Dhaka is a fixed
 * UTC+6 with no DST, so a constant offset is exact and needs no tz library.
 */

const DHAKA_OFFSET_MS = 6 * 3600 * 1000;
const DAY_MS = 86_400_000;

/** A civil calendar date in Asia/Dhaka. `m` is 0-based (Jan = 0). */
export interface DayParts {
  y: number;
  m: number;
  d: number;
}

export interface DateRange {
  fromIso: string;
  toIso: string;
  label: string;
}

export type PresetKey = "today" | "yesterday" | "thisWeek" | "lastWeek" | "last7" | "last30";

export const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "thisWeek", label: "This Week" },
  { key: "lastWeek", label: "Last Week" },
  { key: "last7", label: "Last 7 Days" },
  { key: "last30", label: "Last 30 Days" },
];

export function dhakaParts(at: number = Date.now()): DayParts {
  const s = new Date(at + DHAKA_OFFSET_MS);
  return { y: s.getUTCFullYear(), m: s.getUTCMonth(), d: s.getUTCDate() };
}

/** UTC instant (ms) of Asia/Dhaka midnight that begins a civil date. */
export function dhakaMidnight(p: DayParts): number {
  return Date.UTC(p.y, p.m, p.d, 0, 0, 0) - DHAKA_OFFSET_MS;
}

/** 0 = Sun … 6 = Sat for the civil date. */
export function weekday(p: DayParts): number {
  return new Date(Date.UTC(p.y, p.m, p.d)).getUTCDay();
}

export function addDays(p: DayParts, n: number): DayParts {
  const t = new Date(Date.UTC(p.y, p.m, p.d) + n * DAY_MS);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate() };
}

export function ordinal(p: DayParts): number {
  return Math.round(Date.UTC(p.y, p.m, p.d) / DAY_MS);
}

export function sameDay(a: DayParts, b: DayParts): boolean {
  return a.y === b.y && a.m === b.m && a.d === b.d;
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

/** Build a UTC range spanning start-day 00:00 → end-day 24:00 (Dhaka). */
export function rangeFromDays(start: DayParts, end: DayParts, label: string): DateRange {
  const [lo, hi] = ordinal(start) <= ordinal(end) ? [start, end] : [end, start];
  const from = dhakaMidnight(lo);
  const to = dhakaMidnight(hi) + DAY_MS;
  return { fromIso: new Date(from).toISOString(), toIso: new Date(to).toISOString(), label };
}

export function presetRange(key: PresetKey): DateRange {
  const today = dhakaParts();
  const sinceSat = (weekday(today) + 1) % 7; // Bangladesh week starts Saturday
  switch (key) {
    case "today":
      return rangeFromDays(today, today, "Today");
    case "yesterday": {
      const y = addDays(today, -1);
      return rangeFromDays(y, y, "Yesterday");
    }
    case "thisWeek":
      return rangeFromDays(addDays(today, -sinceSat), today, "This Week");
    case "lastWeek": {
      const thisStart = addDays(today, -sinceSat);
      return rangeFromDays(addDays(thisStart, -7), addDays(thisStart, -1), "Last Week");
    }
    case "last7":
      return rangeFromDays(addDays(today, -6), today, "Last 7 Days");
    case "last30":
      return rangeFromDays(addDays(today, -29), today, "Last 30 Days");
  }
}

/** Short "07 Jul" label for a civil date. */
export function fmtDay(p: DayParts): string {
  return new Date(Date.UTC(p.y, p.m, p.d)).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
  });
}
