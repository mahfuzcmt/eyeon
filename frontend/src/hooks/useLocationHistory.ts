"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { LocationView } from "@/types/domain";

/**
 * Location history for one device (GET /devices/{imei}/locations).
 * Pass a null imei to skip fetching (e.g. while a tab is inactive).
 */
export function useLocationHistory(
  imei: string | null,
  fromIso?: string,
  toIso?: string,
  limit = 5000,
) {
  const [locations, setLocations] = useState<LocationView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!imei) {
      setLocations([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const params: Record<string, string | number> = { limit };
        if (fromIso) params.from = fromIso;
        if (toIso) params.to = toIso;
        const r = await api.get<LocationView[]>(
          `/devices/${encodeURIComponent(imei)}/locations`,
          { params },
        );
        if (!cancelled) setLocations(r.data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load locations");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [imei, fromIso, toIso, limit]);

  return { locations, loading, error };
}
