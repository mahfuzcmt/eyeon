import { useCallback, useEffect, useRef, useState } from "react";
import { acknowledgeAlarm, listAlarms } from "@/api/endpoints";
import { extractError } from "@/api/client";
import { subscribeAlarms } from "@/ws/stomp";
import type { AlarmView } from "@/types";

/** Alarm list seeded from REST, kept live over STOMP, with acknowledge support. */
export function useAlarms(orgId: string | null) {
  const [alarms, setAlarms] = useState<AlarmView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const reload = useCallback(async () => {
    try {
      const rows = await listAlarms();
      if (mounted.current) {
        setAlarms(rows);
        setError(null);
      }
    } catch (e) {
      if (mounted.current) setError(extractError(e).message);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  const acknowledge = useCallback(async (id: string) => {
    try {
      const updated = await acknowledgeAlarm(id);
      setAlarms((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch {
      /* surfaced by caller if needed */
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void reload();
    let unsub: (() => void) | null = null;

    if (orgId) {
      (async () => {
        unsub = await subscribeAlarms(orgId, (a) => {
          if (!mounted.current) return;
          setAlarms((prev) => (prev.some((x) => x.id === a.id) ? prev : [a, ...prev]));
        });
      })();
    }

    return () => {
      mounted.current = false;
      unsub?.();
    };
  }, [orgId, reload]);

  return { alarms, loading, error, reload, acknowledge };
}
