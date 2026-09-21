"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import type { LocationView } from "@/types/domain";

interface UseDeviceHistoryOptions {
  imei: string | null;
  from?: string;
  to?: string;
  limit?: number;
}

export function useDeviceHistory({ imei, from, to, limit = 1000 }: UseDeviceHistoryOptions) {
  const [history, setHistory] = useState<LocationView[]>([]);
  const [loading, setLoading] = useState(true); // Start as true for initial load
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Abort previous request
    abortRef.current?.abort();

    if (!imei) {
      setHistory([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);

      try {
        const params: Record<string, string | number> = { limit };
        if (from) params.from = from;
        if (to) params.to = to;

        console.log("[useDeviceHistory] Fetching:", `/devices/${encodeURIComponent(imei)}/locations`, params);
        const r = await api.get<LocationView[]>(
          `/devices/${encodeURIComponent(imei)}/locations`,
          { params, signal: controller.signal }
        );

        if (controller.signal.aborted) return;

        console.log("[useDeviceHistory] Response:", r.data?.length ?? 0, "locations");
        // Handle both array and wrapped response formats
        const data = Array.isArray(r.data) ? r.data : (r.data as unknown as { data: LocationView[] })?.data ?? [];
        setHistory(data);
        setError(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("[useDeviceHistory] Error:", err);
        setError(err instanceof Error ? err.message : "Failed to load history");
        setHistory([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchHistory();

    return () => {
      controller.abort();
    };
  }, [imei, from, to, limit]);

  const refetch = () => {
    // Trigger a refetch by slightly modifying state
    setLoading(true);
  };

  return { history, loading, error, refetch };
}

// Helper to get date ranges
export function getDateRange(period: "1h" | "6h" | "24h" | "7d" | "30d"): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString();

  const ms = {
    "1h": 60 * 60 * 1000,
    "6h": 6 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };

  const from = new Date(now.getTime() - ms[period]).toISOString();
  return { from, to };
}
