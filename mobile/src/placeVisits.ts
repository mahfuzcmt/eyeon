import type { AlarmType, AlarmView } from "@/types";

/** One stay inside a trusted place or a boundary, from its arrival / leaving alarms. */
export interface PlaceVisit {
  geofenceId: string;
  name: string;
  /** TRUSTED_PLACE or BOUNDARY (from the alarm metadata). */
  kind: string | null;
  placeType: string | null;
  /** Arrival time, or null when they were already inside when the period began. */
  from: string | null;
  /** Leaving time, or null while they are still inside. */
  to: string | null;
  /** Seconds inside: from the arrival (or the period start) to leaving (or now). */
  seconds: number;
}

const ENTER: ReadonlySet<AlarmType> = new Set<AlarmType>(["PLACE_ARRIVED", "GEOFENCE_ENTER"]);
const EXIT: ReadonlySet<AlarmType> = new Set<AlarmType>(["PLACE_LEFT", "GEOFENCE_EXIT"]);

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

/**
 * Pairs each zone's arrival with the next leaving. A leaving with no arrival before it means
 * they were inside when the period began; an arrival with no leaving means they are still
 * there. A repeated arrival (or leaving) without its counterpart is ignored, the first one
 * counts. Visits come back in time order.
 */
export function placeVisits(alarms: AlarmView[], periodStartMs: number, nowMs: number): PlaceVisit[] {
  const events = alarms
    .filter((a) => (ENTER.has(a.type) || EXIT.has(a.type)) && str(a.metadata?.geofenceId))
    .sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
  const open = new Map<string, PlaceVisit>();
  const seen = new Set<string>();
  const out: PlaceVisit[] = [];
  for (const a of events) {
    const id = str(a.metadata.geofenceId)!;
    const base = {
      geofenceId: id,
      name: str(a.metadata.geofenceName) ?? "—",
      kind: str(a.metadata.geofenceKind),
      placeType: str(a.metadata.placeType),
    };
    const t = Date.parse(a.ts);
    if (ENTER.has(a.type)) {
      if (!open.has(id)) open.set(id, { ...base, from: a.ts, to: null, seconds: 0 });
    } else {
      const v = open.get(id);
      if (v) {
        open.delete(id);
        out.push({ ...v, to: a.ts, seconds: Math.max(0, (t - Date.parse(v.from!)) / 1000) });
      } else if (!seen.has(id)) {
        out.push({ ...base, from: null, to: a.ts, seconds: Math.max(0, (t - periodStartMs) / 1000) });
      }
    }
    seen.add(id);
  }
  for (const v of open.values()) out.push({ ...v, seconds: Math.max(0, (nowMs - Date.parse(v.from!)) / 1000) });
  const startOf = (v: PlaceVisit) => (v.from ? Date.parse(v.from) : periodStartMs);
  return out.sort((a, b) => startOf(a) - startOf(b));
}
