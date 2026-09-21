"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ScheduleRequest, ScheduledCommandView } from "@/types/domain";

export function useScheduledCommands() {
  const [items, setItems] = useState<ScheduledCommandView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get<ScheduledCommandView[]>("/scheduled-commands");
      setItems(r.data);
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

  const create = useCallback(async (req: ScheduleRequest) => {
    await api.post<{ id: string }>("/scheduled-commands", req);
    await reload();
  }, [reload]);

  const cancel = useCallback(async (id: string) => {
    await api.delete(`/scheduled-commands/${id}`);
    await reload();
  }, [reload]);

  return { items, loading, error, create, cancel, reload };
}
