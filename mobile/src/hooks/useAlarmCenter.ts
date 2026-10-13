import { useCallback, useEffect, useRef, useState } from "react";
import { acknowledgeAlarm, searchAlarms } from "@/api/endpoints";
import { extractError } from "@/api/client";
import { subscribeAlarms } from "@/ws/stomp";
import type { AlarmAcknowledgeRequest, AlarmQuery, AlarmView } from "@/types";

const PAGE = 50;

/** The STOMP payload uses `imei` and omits the acknowledge fields; shape it like the REST view. */
function normalizeLive(raw: AlarmView & { imei?: string }): AlarmView {
  return {
    ...raw,
    deviceImei: raw.deviceImei ?? raw.imei ?? "",
    acknowledged: raw.acknowledged ?? false,
    acknowledgedBy: raw.acknowledgedBy ?? null,
    acknowledgedAt: raw.acknowledgedAt ?? null,
    processResult: raw.processResult ?? null,
    processNotes: raw.processNotes ?? null,
    metadata: raw.metadata ?? {},
  };
}

function matches(a: AlarmView, q: AlarmQuery): boolean {
  if (q.type && a.type !== q.type) return false;
  if (q.severity && a.severity !== q.severity) return false;
  if (q.imei && a.deviceImei !== q.imei) return false;
  if (q.unacked && a.acknowledged) return false;
  if (q.from && a.ts < q.from) return false;
  if (q.to && a.ts >= q.to) return false;
  return true;
}

/**
 * Alarm center list: filtered REST pages (50 at a time) plus live alarms over STOMP
 * that match the same filters. Acknowledge records a process result and replaces the row.
 */
export function useAlarmCenter(orgId: string | null, query: AlarmQuery) {
  const [alarms, setAlarms] = useState<AlarmView[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const queryRef = useRef(query);
  queryRef.current = query;
  // Bumped on every new query so a slow, stale page cannot overwrite a newer one.
  const generation = useRef(0);
  const { type, severity, imei, from, to, unacked } = query;

  const load = useCallback(async (mode: "initial" | "refresh") => {
    const gen = ++generation.current;
    if (mode === "refresh") setRefreshing(true);
    else setLoading(true);
    try {
      const rows = await searchAlarms({ type, severity, imei, from, to, unacked }, PAGE, 0);
      if (!mounted.current || gen !== generation.current) return;
      setAlarms(rows);
      setHasMore(rows.length === PAGE);
      setError(null);
    } catch (e) {
      if (mounted.current && gen === generation.current) setError(extractError(e).message);
    } finally {
      if (mounted.current && gen === generation.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [type, severity, imei, from, to, unacked]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || loading) return;
    const gen = generation.current;
    setLoadingMore(true);
    try {
      const rows = await searchAlarms(queryRef.current, PAGE, alarms.length);
      if (!mounted.current || gen !== generation.current) return;
      setAlarms((prev) => {
        const seen = new Set(prev.map((a) => a.id));
        return [...prev, ...rows.filter((a) => !seen.has(a.id))];
      });
      setHasMore(rows.length === PAGE);
    } catch (e) {
      if (mounted.current) setError(extractError(e).message);
    } finally {
      if (mounted.current) setLoadingMore(false);
    }
  }, [alarms.length, hasMore, loading, loadingMore]);

  const acknowledge = useCallback(async (id: string, body: AlarmAcknowledgeRequest) => {
    const updated = await acknowledgeAlarm(id, body);
    if (!mounted.current) return updated;
    setAlarms((prev) =>
      queryRef.current.unacked ? prev.filter((a) => a.id !== id) : prev.map((a) => (a.id === id ? updated : a)),
    );
    return updated;
  }, []);

  useEffect(() => {
    mounted.current = true;
    void load("initial");
    return () => {
      mounted.current = false;
    };
  }, [load]);

  useEffect(() => {
    if (!orgId) return;
    let unsub: (() => void) | null = null;
    let cancelled = false;
    void (async () => {
      try {
        const u = await subscribeAlarms(orgId, (raw) => {
          const a = normalizeLive(raw as AlarmView & { imei?: string });
          if (!matches(a, queryRef.current)) return;
          setAlarms((prev) => {
            const i = prev.findIndex((x) => x.id === a.id);
            if (i < 0) return [a, ...prev];
            const next = prev.slice();
            next[i] = a;
            return next;
          });
        });
        if (cancelled) u();
        else unsub = u;
      } catch {
        /* the REST list still works; pull to refresh */
      }
    })();
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [orgId]);

  const refresh = useCallback(() => load("refresh"), [load]);

  return { alarms, loading, refreshing, loadingMore, hasMore, error, refresh, loadMore, acknowledge };
}
