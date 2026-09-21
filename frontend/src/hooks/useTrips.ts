"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { TripView } from "@/types/domain";

interface Options {
  fromIso?: string;
  toIso?: string;
  imei?: string;
}

export function useTrips(opts: Options = {}) {
  const [trips, setTrips] = useState<TripView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const params: Record<string, string> = {};
        if (opts.fromIso) params.from = opts.fromIso;
        if (opts.toIso) params.to = opts.toIso;
        const path = opts.imei ? `/trips/device/${opts.imei}` : "/trips";
        const r = await api.get<TripView[]>(path, { params });
        if (!cancelled) setTrips(r.data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load trips");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [opts.fromIso, opts.toIso, opts.imei]);

  return { trips, loading, error };
}
