import { useCallback, useEffect, useState } from "react";
import { deviceActivity } from "@/api/endpoints";
import { dhakaTodayStartIso } from "@/format";

/** One person's "today" (Asia/Dhaka day), computed by the backend from location points. */
export interface TodayStats {
  distanceM: number;
  moveS: number;
  stillS: number;
  maxSpeed: number;
}

const EMPTY: TodayStats = { distanceM: 0, moveS: 0, stillS: 0, maxSpeed: 0 };

export function useDeviceTodayStats(imei: string) {
  const [stats, setStats] = useState<TodayStats>(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const a = await deviceActivity(imei, dhakaTodayStartIso(), new Date().toISOString());
      setStats({ distanceM: a.distanceM, moveS: a.movingS, stillS: a.stillS, maxSpeed: a.maxSpeed });
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
