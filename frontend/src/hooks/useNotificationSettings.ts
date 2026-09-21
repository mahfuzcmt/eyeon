"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { NotificationSettings, NotificationSettingsUpdate } from "@/types/domain";

const CHANGED_EVENT = "notificationSettingsChanged";

/**
 * The signed-in user's alarm notification preferences. Several components
 * read them (toast, settings tab); a save broadcasts a window event so every
 * instance updates without a refetch.
 */
export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<NotificationSettings>("/users/me/notification-settings")
      .then((r) => {
        if (!cancelled) setSettings(r.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load settings");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    const onChanged = (e: Event) => setSettings((e as CustomEvent<NotificationSettings>).detail);
    window.addEventListener(CHANGED_EVENT, onChanged);
    return () => {
      cancelled = true;
      window.removeEventListener(CHANGED_EVENT, onChanged);
    };
  }, []);

  const save = useCallback(async (patch: NotificationSettingsUpdate) => {
    const r = await api.put<NotificationSettings>("/users/me/notification-settings", patch);
    setSettings(r.data);
    window.dispatchEvent(new CustomEvent(CHANGED_EVENT, { detail: r.data }));
    return r.data;
  }, []);

  return { settings, loading, error, save };
}
