"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { subscribeAlarms } from "@/lib/ws";
import type { AlarmAcknowledgeRequest, AlarmView } from "@/types/domain";

export interface AlarmQuery {
  unackedOnly?: boolean;
  limit?: number;
  /** AlarmType name. */
  type?: string;
  severity?: string;
  imei?: string;
  /** ISO instants; `to` is exclusive. */
  from?: string;
  to?: string;
}

interface Options extends AlarmQuery {
  /**
   * IMEIs the current user may see. The REST list is already filtered server-side,
   * but the org-wide WebSocket topic is not, so live alarms are checked here.
   * `null`/`undefined` = no restriction (admins, or the device list not loaded yet).
   */
  allowedImeis?: Set<string> | null;
  /** Fires once per alarm that arrives over the WebSocket and was not already loaded. */
  onNew?: (alarm: AlarmView) => void;
}

/** The STOMP payload (ws.AlarmFanout) uses `imei` and omits the ack fields; shape it like the REST view. */
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

function matches(a: AlarmView, q: AlarmQuery & { allowedImeis?: Set<string> | null }): boolean {
  if (q.allowedImeis && !q.allowedImeis.has(a.deviceImei)) return false;
  if (q.type && a.type !== q.type) return false;
  if (q.severity && a.severity !== q.severity) return false;
  if (q.imei && a.deviceImei !== q.imei) return false;
  if (q.from && a.ts < q.from) return false;
  if (q.to && a.ts >= q.to) return false;
  return true;
}

/**
 * Loads alarms via REST (with optional filters) then merges live STOMP pushes
 * that match the same filters. Newest first; live pushes prepend, acknowledge
 * upserts in place.
 */
export function useAlarms(orgId: string, opts: Options = {}) {
  const { unackedOnly = false, limit = 100, type, severity, imei, from, to, onNew, allowedImeis } = opts;
  const [alarms, setAlarms] = useState<AlarmView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const onNewRef = useRef(onNew);
  const queryRef = useRef<AlarmQuery & { allowedImeis?: Set<string> | null }>({ type, severity, imei, from, to, allowedImeis });
  onNewRef.current = onNew;
  queryRef.current = { type, severity, imei, from, to, allowedImeis };

  const upsert = useCallback((a: AlarmView) => {
    setAlarms((prev) => {
      const i = prev.findIndex((x) => x.id === a.id);
      if (i >= 0) {
        const next = prev.slice();
        next[i] = a;
        return next;
      }
      return [a, ...prev];
    });
  }, []);

  const acknowledge = useCallback(async (id: string, body?: AlarmAcknowledgeRequest) => {
    const r = await api.post<AlarmView>(`/alarms/${id}/acknowledge`, body ?? {});
    upsert(r.data);
    return r.data;
  }, [upsert]);

  useEffect(() => {
    mounted.current = true;
    let unsub: (() => void) | null = null;
    const known = new Set<string>();

    (async () => {
      try {
        const params: Record<string, string | number> = { limit };
        if (unackedOnly) params.unacked = "true";
        if (type) params.type = type;
        if (severity) params.severity = severity;
        if (imei) params.imei = imei;
        if (from) params.from = from;
        if (to) params.to = to;
        const r = await api.get<AlarmView[]>("/alarms", { params });
        if (mounted.current) {
          for (const a of r.data) known.add(a.id);
          setAlarms(r.data);
        }
      } catch (err) {
        if (mounted.current) setError(err instanceof Error ? err.message : "Failed to load alarms");
      } finally {
        if (mounted.current) setLoading(false);
      }

      try {
        unsub = await subscribeAlarms(orgId, (raw) => {
          if (!mounted.current) return;
          const a = normalizeLive(raw);
          if (!matches(a, queryRef.current)) return;
          const isNew = !known.has(a.id);
          known.add(a.id);
          upsert(a);
          if (isNew) onNewRef.current?.(a);
        });
      } catch (err) {
        if (mounted.current) setError(err instanceof Error ? err.message : "WS subscribe failed");
      }
    })();

    return () => {
      mounted.current = false;
      unsub?.();
    };
  }, [orgId, unackedOnly, limit, type, severity, imei, from, to, upsert]);

  return { alarms, loading, error, acknowledge };
}
