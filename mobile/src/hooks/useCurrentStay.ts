import { useEffect, useState } from "react";
import { deviceStays } from "@/api/endpoints";
import type { StayView } from "@/types";

const LOOKBACK_MS = 72 * 3600 * 1000;
const REFRESH_MS = 60_000;

/** The stay the person is in right now ("Here for 2 h 15 min"), or null; refreshed every minute. */
export function useCurrentStay(imei: string | null): StayView | null {
  const [stay, setStay] = useState<StayView | null>(null);

  useEffect(() => {
    if (!imei) return;
    let cancelled = false;
    const load = async () => {
      try {
        const r = await deviceStays(imei, { from: new Date(Date.now() - LOOKBACK_MS).toISOString(), names: false });
        const last = r.stays[r.stays.length - 1];
        if (!cancelled) setStay(last?.ongoing ? last : null);
      } catch {
        if (!cancelled) setStay(null);
      }
    };
    void load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [imei]);

  return stay;
}
