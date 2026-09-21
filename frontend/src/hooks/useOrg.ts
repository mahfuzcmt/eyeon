"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { OrgDetail, OrgUpdate } from "@/types/domain";

export function useOrg() {
  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.get<OrgDetail>("/orgs/me");
      setOrg(r.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load organization");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const update = useCallback(async (patch: OrgUpdate) => {
    const r = await api.patch<OrgDetail>("/orgs/me", patch);
    setOrg(r.data);
    return r.data;
  }, []);

  return { org, loading, error, refresh, update };
}
