import { useCallback, useEffect, useState } from "react";
import { alarmsForDevice } from "@/api/endpoints";
import { dhakaTodayStartIso } from "@/format";
import { placeVisits, type PlaceVisit } from "@/placeVisits";

const REFRESH_MS = 60_000;

/** Today's (Asia/Dhaka) visits to the caller's places and boundaries, refreshed every minute. */
export function useTodayPlaceVisits(imei: string | null) {
  const [visits, setVisits] = useState<PlaceVisit[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!imei) return;
    const from = dhakaTodayStartIso();
    try {
      const alarms = await alarmsForDevice(imei, from, new Date().toISOString());
      setVisits(placeVisits(alarms, Date.parse(from), Date.now()));
    } catch {
      // Keep what is shown; the next refresh tries again.
    } finally {
      setLoading(false);
    }
  }, [imei]);

  useEffect(() => {
    setVisits([]);
    setLoading(true);
    void load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  return { visits, loading, reload: load };
}
