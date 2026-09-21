"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { GeofenceCreate, GeofenceView } from "@/types/domain";

export function useGeofences() {
  const [geofences, setGeofences] = useState<GeofenceView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.get<GeofenceView[]>("/geofences");
      setGeofences(r.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load geofences");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(async (req: GeofenceCreate) => {
    const r = await api.post<GeofenceView>("/geofences", req);
    setGeofences((prev) => [r.data, ...prev]);
    return r.data;
  }, []);

  const remove = useCallback(async (id: string) => {
    await api.delete(`/geofences/${id}`);
    setGeofences((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const getAssignedDevices = useCallback(async (geofenceId: string): Promise<string[]> => {
    const r = await api.get<string[]>(`/geofences/${geofenceId}/devices`);
    return r.data;
  }, []);

  const assignDevices = useCallback(async (geofenceId: string, imeis: string[]) => {
    await api.post(`/geofences/${geofenceId}/devices`, { imeis });
  }, []);

  const unassignDevice = useCallback(async (geofenceId: string, imei: string) => {
    await api.delete(`/geofences/${geofenceId}/devices/${imei}`);
  }, []);

  return { geofences, loading, error, refresh, create, remove, getAssignedDevices, assignDevices, unassignDevice };
}
