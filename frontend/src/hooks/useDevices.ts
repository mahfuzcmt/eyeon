"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { DeviceView } from "@/types/domain";

/** Auto-refresh interval in milliseconds (10 seconds). */
const AUTO_REFRESH_INTERVAL_MS = 10_000;

export function useDevices() {
  const [devices, setDevices] = useState<DeviceView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const r = await api.get<DeviceView[]>("/devices");
      if (mounted.current) {
        setDevices(r.data);
        setError(null);
      }
    } catch (err) {
      if (mounted.current) {
        setError(err instanceof Error ? err.message : "Failed to load devices");
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;

    // Initial fetch
    void refresh();

    // Auto-refresh every 10 seconds
    const intervalId = setInterval(() => {
      if (mounted.current) void refresh();
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => {
      mounted.current = false;
      clearInterval(intervalId);
    };
  }, [refresh]);

  return { devices, loading, error, setDevices, refresh };
}
