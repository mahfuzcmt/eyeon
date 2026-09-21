"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { DriverView, DriverCreate, DriverUpdate, DriverStatus } from "@/types/domain";

export function useDrivers(statusFilter?: DriverStatus) {
  const [drivers, setDrivers] = useState<DriverView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDrivers = useCallback(async () => {
    try {
      setLoading(true);
      const params = statusFilter ? { status: statusFilter } : {};
      const res = await api.get<DriverView[]>("/drivers", { params });
      setDrivers(res.data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch drivers:", err);
      setError("Failed to load drivers");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const createDriver = useCallback(async (data: DriverCreate): Promise<DriverView> => {
    const res = await api.post<DriverView>("/drivers", data);
    setDrivers((prev) => [...prev, res.data]);
    return res.data;
  }, []);

  const updateDriver = useCallback(async (id: string, data: DriverUpdate): Promise<DriverView> => {
    const res = await api.patch<DriverView>(`/drivers/${id}`, data);
    setDrivers((prev) => prev.map((d) => (d.id === id ? res.data : d)));
    return res.data;
  }, []);

  const deleteDriver = useCallback(async (id: string): Promise<void> => {
    await api.delete(`/drivers/${id}`);
    setDrivers((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const assignToDevice = useCallback(async (driverId: string, imei: string): Promise<void> => {
    await api.post(`/drivers/${driverId}/assign`, { imei });
    await fetchDrivers(); // Refresh counts
  }, [fetchDrivers]);

  const unassignFromDevice = useCallback(async (driverId: string, imei: string): Promise<void> => {
    await api.delete(`/drivers/${driverId}/assign`, { data: { imei } });
    await fetchDrivers(); // Refresh counts
  }, [fetchDrivers]);

  return {
    drivers,
    loading,
    error,
    refresh: fetchDrivers,
    createDriver,
    updateDriver,
    deleteDriver,
    assignToDevice,
    unassignFromDevice,
  };
}

export function useExpiringLicenses(daysAhead: number = 30) {
  const [drivers, setDrivers] = useState<DriverView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const res = await api.get<DriverView[]>("/drivers/expiring-licenses", {
          params: { daysAhead },
        });
        setDrivers(res.data);
      } catch (err) {
        console.error("Failed to fetch expiring licenses:", err);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [daysAhead]);

  return { drivers, loading };
}
