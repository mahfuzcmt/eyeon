import { useCallback, useEffect, useState } from "react";
import { tripsForDevice } from "@/api/endpoints";
import { dhakaTodayStartIso } from "@/format";

/**
 * Per-device "today" rollup. The backend has no per-device stats endpoint, so
 * this aggregates today's trips (Asia/Dhaka day) client-side — the same numbers
 * the AutoNemo Statistics tab shows.
 */
export interface TodayStats {
  trips: number;
  distanceM: number;
  moveS: number;
  idleS: number;
  maxSpeed: number;
  avgSpeed: number;
}

const EMPTY: TodayStats = { trips: 0, distanceM: 0, moveS: 0, idleS: 0, maxSpeed: 0, avgSpeed: 0 };

export function useDeviceTodayStats(imei: string) {
  const [stats, setStats] = useState<TodayStats>(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = dhakaTodayStartIso();
      const to = new Date().toISOString();
      const trips = await tripsForDevice(imei, from, to);
      const distanceM = trips.reduce((s, t) => s + t.distanceM, 0);
      const moveS = trips.reduce((s, t) => s + (t.durationS ?? 0), 0);
      const idleS = trips.reduce((s, t) => s + t.idleTimeS, 0);
      const maxSpeed = trips.reduce((m, t) => Math.max(m, t.maxSpeed), 0);
      const avgSpeed = moveS > 0 ? Math.round(distanceM / 1000 / (moveS / 3600)) : 0;
      setStats({ trips: trips.length, distanceM, moveS, idleS, maxSpeed, avgSpeed });
    } catch {
      setStats(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [imei]);

  useEffect(() => {
    void load();
  }, [load]);

  return { stats, loading, reload: load };
}
