"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AuditLogEntry } from "@/types/domain";

export interface AuditFilters {
  fromIso?: string;
  toIso?: string;
  action?: string;
  resourceType?: string;
  limit?: number;
  offset?: number;
}

export function useAuditLog(filters: AuditFilters) {
  const { fromIso, toIso, action, resourceType, limit = 100, offset = 0 } = filters;
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (fromIso) params.set("from", fromIso);
      if (toIso) params.set("to", toIso);
      if (action) params.set("action", action);
      if (resourceType) params.set("resourceType", resourceType);
      params.set("limit", String(limit));
      params.set("offset", String(offset));
      const r = await api.get<AuditLogEntry[]>(`/audit-log?${params.toString()}`);
      setEntries(r.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }, [fromIso, toIso, action, resourceType, limit, offset]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entries, loading, error, refresh };
}
