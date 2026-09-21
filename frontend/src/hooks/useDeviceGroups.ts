"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { DeviceGroupView, DeviceGroupCreate, DeviceGroupUpdate } from "@/types/domain";

export function useDeviceGroups() {
  const [groups, setGroups] = useState<DeviceGroupView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<DeviceGroupView[]>("/groups");
      setGroups(res.data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch device groups:", err);
      setError("Failed to load device groups");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const createGroup = useCallback(async (data: DeviceGroupCreate): Promise<DeviceGroupView> => {
    const res = await api.post<DeviceGroupView>("/groups", data);
    setGroups((prev) => [...prev, res.data]);
    return res.data;
  }, []);

  const updateGroup = useCallback(async (id: string, data: DeviceGroupUpdate): Promise<DeviceGroupView> => {
    const res = await api.patch<DeviceGroupView>(`/groups/${id}`, data);
    setGroups((prev) => prev.map((g) => (g.id === id ? res.data : g)));
    return res.data;
  }, []);

  const deleteGroup = useCallback(async (id: string): Promise<void> => {
    await api.delete(`/groups/${id}`);
    setGroups((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const assignDevices = useCallback(async (groupId: string, imeis: string[]): Promise<void> => {
    await api.post(`/groups/${groupId}/devices`, { imeis });
    await fetchGroups(); // Refresh counts
  }, [fetchGroups]);

  const unassignDevices = useCallback(async (groupId: string, imeis: string[]): Promise<void> => {
    await api.delete(`/groups/${groupId}/devices`, { data: { imeis } });
    await fetchGroups(); // Refresh counts
  }, [fetchGroups]);

  const reorderGroups = useCallback(async (groupIds: string[]): Promise<void> => {
    await api.post("/groups/reorder", { groupIds });
    await fetchGroups();
  }, [fetchGroups]);

  return {
    groups,
    loading,
    error,
    refresh: fetchGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    assignDevices,
    unassignDevices,
    reorderGroups,
  };
}
