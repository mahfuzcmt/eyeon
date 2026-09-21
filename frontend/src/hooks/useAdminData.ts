"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { AdminStats, DeviceAdminView, OrgAdminView, OrgCreate } from "@/types/domain";

/** Auto-refresh interval in milliseconds (30 seconds). */
const AUTO_REFRESH_INTERVAL_MS = 30_000;

/**
 * Hook for fetching admin stats.
 */
export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const r = await api.get<AdminStats>("/admin/stats");
      if (mounted.current) {
        setStats(r.data);
        setError(null);
      }
    } catch (err) {
      if (mounted.current) {
        setError(err instanceof Error ? err.message : "Failed to load stats");
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const intervalId = setInterval(() => {
      if (mounted.current) void refresh();
    }, AUTO_REFRESH_INTERVAL_MS);
    return () => {
      mounted.current = false;
      clearInterval(intervalId);
    };
  }, [refresh]);

  return { stats, loading, error, refresh };
}

/**
 * Hook for managing organizations (Super Admin).
 */
export function useAdminOrgs() {
  const [orgs, setOrgs] = useState<OrgAdminView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const r = await api.get<OrgAdminView[]>("/admin/orgs");
      if (mounted.current) {
        setOrgs(r.data);
        setError(null);
      }
    } catch (err) {
      if (mounted.current) {
        setError(err instanceof Error ? err.message : "Failed to load organizations");
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => { mounted.current = false; };
  }, [refresh]);

  const createOrg = useCallback(async (data: OrgCreate): Promise<OrgAdminView> => {
    const r = await api.post<OrgAdminView>("/admin/orgs", data);
    await refresh();
    return r.data;
  }, [refresh]);

  const updateOrgStatus = useCallback(async (id: string, status: string): Promise<OrgAdminView> => {
    const r = await api.patch<OrgAdminView>(`/admin/orgs/${id}/status`, { status });
    await refresh();
    return r.data;
  }, [refresh]);

  return { orgs, loading, error, refresh, createOrg, updateOrgStatus };
}

/**
 * Hook for managing devices (Super Admin).
 */
export function useAdminDevices(orgFilter?: string) {
  const [devices, setDevices] = useState<DeviceAdminView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const params = orgFilter ? { orgId: orgFilter } : {};
      const r = await api.get<DeviceAdminView[]>("/admin/devices", { params });
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
  }, [orgFilter]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => { mounted.current = false; };
  }, [refresh]);

  const reassignDevice = useCallback(async (imei: string, targetOrgId: string): Promise<DeviceAdminView> => {
    const r = await api.patch<DeviceAdminView>(`/admin/devices/${imei}/org`, { targetOrgId });
    await refresh();
    return r.data;
  }, [refresh]);

  return { devices, loading, error, refresh, reassignDevice };
}
