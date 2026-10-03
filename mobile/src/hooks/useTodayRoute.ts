import { useEffect, useMemo, useState } from "react";
import { locationHistory } from "@/api/endpoints";
import { dhakaTodayStartIso } from "@/format";
import type { LocationView } from "@/types";

const REFRESH_MS = 60_000;
/** Points this close to the previous one are indoor jitter, not travel (same rule as the web map). */
const MIN_STEP_M = 15;

function metersBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/**
 * Today's route of one person as [lng, lat] pairs for the map's polyline: the stored positions
 * since midnight (Asia/Dhaka), refreshed every minute, plus the live position at the end.
 */
export function useTodayRoute(imei: string, live: LocationView | null | undefined): [number, number][] {
  const [stored, setStored] = useState<LocationView[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const points = await locationHistory(imei, dhakaTodayStartIso(), new Date().toISOString(), 5000);
        if (!cancelled) setStored(points.filter((p) => p.valid));
      } catch {
        // No line is better than a stale one from another day.
      }
    };
    void load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [imei]);

  return useMemo(() => {
    const all = live && live.valid ? [...stored, live] : stored;
    const out: [number, number][] = [];
    let last: LocationView | null = null;
    for (const p of all) {
      if (last && metersBetween(last.latitude, last.longitude, p.latitude, p.longitude) < MIN_STEP_M) continue;
      out.push([p.longitude, p.latitude]);
      last = p;
    }
    return out;
  }, [stored, live]);
}
