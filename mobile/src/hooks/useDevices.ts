import { useCallback, useEffect, useRef, useState } from "react";
import { listDevices } from "@/api/endpoints";
import { extractError } from "@/api/client";
import type { DeviceView } from "@/types";

/** Auto-refresh interval in milliseconds (10 seconds). */
const AUTO_REFRESH_INTERVAL_MS = 10_000;

export function useDevices() {
  const [devices, setDevices] = useState<DeviceView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const reload = useCallback(async () => {
    try {
      const rows = await listDevices();
      if (mounted.current) {
        setDevices(rows);
        setError(null);
      }
    } catch (e) {
      if (mounted.current) setError(extractError(e).message);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void reload();

    // Auto-refresh every 10 seconds
    const intervalId = setInterval(() => {
      if (mounted.current) void reload();
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => {
      mounted.current = false;
      clearInterval(intervalId);
    };
  }, [reload]);

  return { devices, loading, error, reload };
}
