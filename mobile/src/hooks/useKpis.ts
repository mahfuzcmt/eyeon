import { useEffect, useRef, useState } from "react";
import { getKpis } from "@/api/endpoints";
import { extractError } from "@/api/client";
import type { KpiSnapshot } from "@/types";

/** Polls /dashboard/kpis every 30s (cheap aggregate, no push needed). */
export function useKpis() {
  const [kpis, setKpis] = useState<KpiSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      try {
        const k = await getKpis();
        if (!cancelled.current) {
          setKpis(k);
          setError(null);
        }
      } catch (e) {
        if (!cancelled.current) setError(extractError(e).message);
      } finally {
        if (!cancelled.current) timer = setTimeout(tick, 30_000);
      }
    }

    void tick();
    return () => {
      cancelled.current = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return { kpis, error };
}
