"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ActivityDay, ActivitySummary } from "@/types/domain";

const EMPTY: ActivitySummary = {
  distanceM: 0,
  movingS: 0,
  stillS: 0,
  maxSpeed: 0,
  points: 0,
  firstTs: null,
  lastTs: null,
};

interface Options {
  imei?: string | null;
  fromIso?: string;
  toIso?: string;
}

/** What one person did over a range, derived from location points (EyeOn has no trips). */
export function useActivity({ imei, fromIso, toIso }: Options) {
  const [activity, setActivity] = useState<ActivitySummary>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!imei) {
      setActivity(EMPTY);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const params: Record<string, string> = {};
        if (fromIso) params.from = fromIso;
        if (toIso) params.to = toIso;
        const r = await api.get<ActivitySummary>(`/devices/${encodeURIComponent(imei)}/activity`, { params });
        if (!cancelled) setActivity(r.data);
      } catch (err) {
        if (!cancelled) {
          setActivity(EMPTY);
          setError(err instanceof Error ? err.message : "Failed to load activity");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [imei, fromIso, toIso]);

  return { activity, loading, error };
}

/** Per-day totals (Asia/Dhaka days) for the month calendar. */
export function useDailyActivity({ imei, fromIso, toIso }: Options) {
  const [days, setDays] = useState<ActivityDay[]>([]);

  useEffect(() => {
    if (!imei) {
      setDays([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const params: Record<string, string> = {};
        if (fromIso) params.from = fromIso;
        if (toIso) params.to = toIso;
        const r = await api.get<ActivityDay[]>(`/devices/${encodeURIComponent(imei)}/activity/daily`, { params });
        if (!cancelled) setDays(r.data);
      } catch {
        if (!cancelled) setDays([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [imei, fromIso, toIso]);

  return { days };
}
