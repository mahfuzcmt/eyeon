"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { SubscriptionView } from "@/types/domain";

/**
 * Hook for fetching user's org subscriptions (billing view).
 */
export function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const r = await api.get<SubscriptionView[]>("/billing/subscriptions");
      if (mounted.current) {
        setSubscriptions(r.data);
        setError(null);
      }
    } catch (err) {
      if (mounted.current) {
        setError(err instanceof Error ? err.message : "Failed to load subscriptions");
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

  return { subscriptions, loading, error, refresh };
}

/**
 * Hook for fetching a single subscription.
 */
export function useSubscription(id: string | null) {
  const [subscription, setSubscription] = useState<SubscriptionView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    if (!id) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      const r = await api.get<SubscriptionView>(`/billing/subscriptions/${id}`);
      if (mounted.current) {
        setSubscription(r.data);
        setError(null);
      }
    } catch (err) {
      if (mounted.current) {
        setError(err instanceof Error ? err.message : "Failed to load subscription");
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => { mounted.current = false; };
  }, [refresh]);

  return { subscription, loading, error, refresh };
}
