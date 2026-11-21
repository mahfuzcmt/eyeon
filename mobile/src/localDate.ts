import type { Locale } from "@/i18n";
import { fmtTime } from "@/format";

/** Dates shown in the app language, always in Asia/Dhaka. */

/** "12 Oct 2026" in the app language; "—" when missing. */
export function fmtDay(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00+06:00` : iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale === "bn" ? "bn-BD" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Dhaka",
  });
}

/** "12 Oct 2026, 2:05 PM" (or "... দুপুর ২:০৫") in the app language, always 12-hour. */
export function fmtStamp(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${fmtDay(iso, locale)}, ${fmtTime(iso, locale === "bn")}`;
}

/** yyyy-MM-dd of an instant in Asia/Dhaka. */
export function dhakaDate(at: Date): string {
  return at.toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
}

export function isIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return !Number.isNaN(new Date(`${s}T00:00:00Z`).getTime());
}
