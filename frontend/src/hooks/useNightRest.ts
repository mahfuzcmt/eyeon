"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { NightRestView } from "@/types/domain";

const REFRESH_MS = 5 * 60_000;

/** imei -> night rest window, for trackers that have one switched on. Lists use it to say "Resting until 07:00". */
export function useNightRest(): Map<string, NightRestView> {
  const [rest, setRest] = useState<Map<string, NightRestView>>(new Map());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await api.get<NightRestView[]>("/devices/rest");
        if (!cancelled) setRest(new Map(r.data.map((v) => [v.imei, v])));
      } catch {
        // Without it rows simply say "Offline", as before.
      }
    };
    void load();
    const id = window.setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return rest;
}
