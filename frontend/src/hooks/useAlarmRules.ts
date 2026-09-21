"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AlarmRuleRequest, AlarmRuleView } from "@/types/domain";

export function useAlarmRules() {
  const [rules, setRules] = useState<AlarmRuleView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get<AlarmRuleView[]>("/alarm-rules");
      setRules(r.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const create = useCallback(async (req: AlarmRuleRequest) => {
    await api.post("/alarm-rules", req);
    await reload();
  }, [reload]);

  const update = useCallback(async (id: string, req: AlarmRuleRequest) => {
    await api.patch(`/alarm-rules/${id}`, req);
    await reload();
  }, [reload]);

  const remove = useCallback(async (id: string) => {
    await api.delete(`/alarm-rules/${id}`);
    await reload();
  }, [reload]);

  return { rules, loading, error, create, update, remove, reload };
}
