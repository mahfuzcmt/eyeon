import { useCallback, useEffect, useRef, useState } from "react";
import { lastKnownAll } from "@/api/endpoints";
import { subscribeLocations } from "@/ws/stomp";
import type { LocationView } from "@/types";

/** Auto-refresh interval in milliseconds (10 seconds). */
const AUTO_REFRESH_INTERVAL_MS = 10_000;

/**
 * Bootstrap last-known positions via REST, then keep them live over STOMP.
 * Auto-refreshes every 10 seconds for reliable position updates.
 * Returns a Map keyed by IMEI plus a refresh() for the map's Refresh button.
 */
export function useLiveLocations(orgId: string | null) {
  const [locations, setLocations] = useState<Map<string, LocationView>>(new Map());
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const upsert = useCallback((loc: LocationView) => {
    setLocations((prev) => {
      const existing = prev.get(loc.imei);
      if (existing && new Date(existing.ts).getTime() >= new Date(loc.ts).getTime()) {
        return prev; // drop out-of-order
      }
      const next = new Map(prev);
      next.set(loc.imei, loc);
      return next;
    });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const rows = await lastKnownAll();
      if (!mounted.current) return;
      const m = new Map<string, LocationView>();
      for (const l of rows) m.set(l.imei, l);
      setLocations(m);
      setError(null);
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : "refresh failed");
    } finally {
      if (mounted.current) setLoaded(true);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    if (!orgId) return;
    let unsub: (() => void) | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    (async () => {
      await refresh();
      try {
        unsub = await subscribeLocations(orgId, (loc) => {
          if (mounted.current) upsert(loc);
        });
      } catch (e) {
        if (mounted.current) setError(e instanceof Error ? e.message : "WS failed");
      }

      // Auto-refresh every 10 seconds for reliable updates
      intervalId = setInterval(() => {
        if (mounted.current) void refresh();
      }, AUTO_REFRESH_INTERVAL_MS);
    })();

    return () => {
      mounted.current = false;
      unsub?.();
      if (intervalId) clearInterval(intervalId);
    };
  }, [orgId, refresh, upsert]);

  return { locations, loaded, error, refresh };
}
