import type { NightRestView } from "@/types/domain";

const DHAKA_OFFSET_MIN = 6 * 60;

function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * The time the tracker wakes ("07:00") when `at` falls inside its night rest, otherwise null.
 * The window is daily, in Asia/Dhaka (the tracker's own clock), and may cross midnight.
 */
export function restingUntil(rest: Pick<NightRestView, "from" | "to"> | undefined, at: number = Date.now()): string | null {
  if (!rest) return null;
  const from = minutes(rest.from);
  const to = minutes(rest.to);
  if (Number.isNaN(from) || Number.isNaN(to) || from === to) return null;
  const d = new Date(at);
  const now = (d.getUTCHours() * 60 + d.getUTCMinutes() + DHAKA_OFFSET_MIN) % 1440;
  const inside = from < to ? now >= from && now < to : now >= from || now < to;
  return inside ? rest.to : null;
}
