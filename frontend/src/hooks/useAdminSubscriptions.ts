"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { BillingStats, CreateSubscriptionRequest, DevicesWithoutSubResponse, ExtendRequest, SubscriptionView } from "@/types/domain";

/** Auto-refresh interval in milliseconds (30 seconds). */
const AUTO_REFRESH_INTERVAL_MS = 30_000;

export interface SubscriptionSearchParams {
  orgId?: string;
  imei?: string;
  status?: string;
  dueBefore?: string;
  expired?: boolean;
  limit?: number;
}

/**
 * Hook for fetching admin billing stats.
 */
export function useAdminBillingStats() {
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const r = await api.get<BillingStats>("/admin/subscriptions/stats");
      if (mounted.current) {
        setStats(r.data);
        setError(null);
      }
    } catch (err) {
      if (mounted.current) {
        setError(err instanceof Error ? err.message : "Failed to load billing stats");
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
 * Hook for searching and managing subscriptions (Super Admin).
 */
export function useAdminSubscriptions(initialParams?: SubscriptionSearchParams) {
  const [subscriptions, setSubscriptions] = useState<SubscriptionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<SubscriptionSearchParams>(initialParams || {});
  const mounted = useRef(true);

  const search = useCallback(async (searchParams?: SubscriptionSearchParams) => {
    const effectiveParams = searchParams || params;
    try {
      setLoading(true);
      const r = await api.get<SubscriptionView[]>("/admin/subscriptions", { params: effectiveParams });
      if (mounted.current) {
        setSubscriptions(r.data);
        setError(null);
        if (searchParams) setParams(searchParams);
      }
    } catch (err) {
      if (mounted.current) {
        setError(err instanceof Error ? err.message : "Failed to search subscriptions");
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    mounted.current = true;
    void search();
    return () => { mounted.current = false; };
  }, [search]);

  const extendSubscription = useCallback(async (id: string, request: ExtendRequest): Promise<SubscriptionView> => {
    const r = await api.patch<SubscriptionView>(`/admin/subscriptions/${id}/extend`, request);
    await search();
    return r.data;
  }, [search]);

  const updateStatus = useCallback(async (id: string, status: string): Promise<SubscriptionView> => {
    const r = await api.patch<SubscriptionView>(`/admin/subscriptions/${id}/status`, null, {
      params: { status }
    });
    await search();
    return r.data;
  }, [search]);

  const findExpired = useCallback(async () => {
    try {
      setLoading(true);
      const r = await api.get<SubscriptionView[]>("/admin/subscriptions/expired");
      if (mounted.current) {
        setSubscriptions(r.data);
        setError(null);
      }
    } catch (err) {
      if (mounted.current) {
        setError(err instanceof Error ? err.message : "Failed to load expired subscriptions");
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  const findDueSoon = useCallback(async (days: number = 7) => {
    try {
      setLoading(true);
      const r = await api.get<SubscriptionView[]>("/admin/subscriptions/due-soon", {
        params: { days }
      });
      if (mounted.current) {
        setSubscriptions(r.data);
        setError(null);
      }
    } catch (err) {
      if (mounted.current) {
        setError(err instanceof Error ? err.message : "Failed to load due-soon subscriptions");
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  const findDevicesWithoutSubscription = useCallback(async (limit: number = 100): Promise<DevicesWithoutSubResponse> => {
    const r = await api.get<DevicesWithoutSubResponse>("/admin/subscriptions/devices-without-subscription", {
      params: { limit }
    });
    return r.data;
  }, []);

  const createSubscription = useCallback(async (request: CreateSubscriptionRequest): Promise<SubscriptionView> => {
    const r = await api.post<SubscriptionView>("/admin/subscriptions/create", request);
    await search();
    return r.data;
  }, [search]);

  return {
    subscriptions,
    loading,
    error,
    search,
    setParams,
    extendSubscription,
    updateStatus,
    findExpired,
    findDueSoon,
    findDevicesWithoutSubscription,
    createSubscription
  };
}
