"use client";

import { useState } from "react";
import { useDrivers } from "@/hooks/useDrivers";
import { DriverCard } from "@/components/driver/DriverCard";
import { DriverModal } from "@/components/driver/DriverModal";
import type { DriverView, DriverCreate, DriverUpdate, DriverStatus } from "@/types/domain";

const STATUS_TABS: { value: DriverStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "SUSPENDED", label: "Suspended" },
];

export default function DriversPage() {
  const [statusFilter, setStatusFilter] = useState<DriverStatus | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DriverView | null>(null);

  const { drivers, loading, error, createDriver, updateDriver, deleteDriver, refresh } = useDrivers(
    statusFilter === "ALL" ? undefined : statusFilter
  );

  // Filter drivers by search query
  const filteredDrivers = drivers.filter((driver) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      driver.name.toLowerCase().includes(query) ||
      driver.phone?.toLowerCase().includes(query) ||
      driver.licenseNo?.toLowerCase().includes(query) ||
      driver.rfidCard?.toLowerCase().includes(query)
    );
  });

  const handleSave = async (data: DriverCreate | DriverUpdate) => {
    if (editingDriver) {
      await updateDriver(editingDriver.id, data as DriverUpdate);
      setEditingDriver(null);
    } else {
      await createDriver(data as DriverCreate);
    }
    setShowModal(false);
  };

  const handleDelete = async (driver: DriverView) => {
    if (!confirm(`Are you sure you want to delete ${driver.name}?`)) return;
    await deleteDriver(driver.id);
  };

  const handleEdit = (driver: DriverView) => {
    setEditingDriver(driver);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDriver(null);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-ink-100 bg-white px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ink-900 sm:text-2xl">Drivers</h1>
            <p className="text-[14px] text-ink-500">
              Manage your fleet drivers and assignments
            </p>
          </div>
          <button
            onClick={() => {
              setEditingDriver(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-white hover:bg-brand-700"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Driver
          </button>
        </div>

        {/* Search and filters */}
        <div className="mt-4 flex gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, phone, license..."
              className="w-full rounded-lg border border-ink-200 py-2 pl-10 pr-4 text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {/* Status tabs */}
          <div className="flex gap-1 rounded-lg border border-ink-200 p-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`rounded-md px-3 py-1.5 text-[14px] font-medium transition-colors ${
                  statusFilter === tab.value
                    ? "bg-brand-600 text-white"
                    : "text-ink-600 hover:bg-ink-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          </div>
        ) : error ? (
          <div className="rounded-lg bg-red-50 p-4 text-red-700">
            {error}
            <button onClick={refresh} className="ml-2 underline">
              Retry
            </button>
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-ink-500">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="mb-4 text-ink-300"
            >
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
            <p className="text-lg font-medium">No drivers found</p>
            <p className="text-[14px]">
              {searchQuery
                ? "Try a different search term"
                : "Add your first driver to get started"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredDrivers.map((driver) => (
              <DriverCard
                key={driver.id}
                driver={driver}
                onEdit={() => handleEdit(driver)}
                onDelete={() => handleDelete(driver)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <DriverModal
          driver={editingDriver ?? undefined}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
