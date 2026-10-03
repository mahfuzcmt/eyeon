import { useEffect, useState } from "react";
import { listNightRest } from "@/api/endpoints";
import type { NightRestView } from "@/types";

const REFRESH_MS = 5 * 60_000;

/** imei -> night rest window of the trackers that have one switched on ("Resting until 07:00"). */
export function useNightRest(): Map<string, NightRestView> {
  const [rest, setRest] = useState<Map<string, NightRestView>>(new Map());
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const list = await listNightRest();
        if (!cancelled) setRest(new Map(list.map((v) => [v.imei, v])));
      } catch {
        // Without it rows simply say "offline", as before.
      }
    };
    void load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);
  return rest;
}
