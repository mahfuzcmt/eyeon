"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { KpiSnapshot } from "@/types/domain";

const REFRESH_MS = 30_000;

/**
 * Polls /dashboard/kpis every 30s. Cheap aggregate query — fine without
 * push semantics. Pauses when the tab is hidden to save battery.
 */
export function useDashboardKpis() {
  const [kpis, setKpis] = useState<KpiSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      try {
        const r = await api.get<KpiSnapshot>("/dashboard/kpis");
        if (!cancelled.current) {
          setKpis(r.data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled.current) {
          setError(err instanceof Error ? err.message : "Failed to load KPIs");
        }
      } finally {
        if (!cancelled.current && document.visibilityState === "visible") {
          timer = setTimeout(tick, REFRESH_MS);
        }
      }
    }

    function onVisibility() {
      if (document.visibilityState === "visible" && !timer) {
        tick();
      }
    }

    tick();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled.current = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return { kpis, error };
}
