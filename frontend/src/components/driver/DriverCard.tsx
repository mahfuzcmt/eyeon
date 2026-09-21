"use client";

import type { DriverView } from "@/types/domain";

interface DriverCardProps {
  driver: DriverView;
  onEdit: () => void;
  onDelete: () => void;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  ACTIVE: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  INACTIVE: { bg: "bg-gray-50", text: "text-ink-600", dot: "bg-gray-400" },
  SUSPENDED: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
};

export function DriverCard({ driver, onEdit, onDelete }: DriverCardProps) {
  const statusStyle = STATUS_COLORS[driver.status] ?? STATUS_COLORS.INACTIVE;

  return (
    <div className="group relative rounded-lg border border-ink-200 bg-white p-4 transition-shadow hover:shadow-md">
      {/* Header: Avatar + Name + Status */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative h-12 w-12 flex-shrink-0">
          {driver.photoUrl ? (
            <img
              src={driver.photoUrl}
              alt={driver.name}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-600">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          )}
          {/* Online indicator for assigned drivers */}
          {driver.assignedDeviceCount > 0 && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500" />
          )}
        </div>

        {/* Name + Status */}
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-ink-900">{driver.name}</h3>
          <div className="mt-0.5 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[13px] font-medium ${statusStyle.bg} ${statusStyle.text}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
              {driver.status}
            </span>
          </div>
        </div>

        {/* Actions dropdown */}
        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={onEdit}
            className="rounded p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-600"
            title="Edit"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="rounded p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600"
            title="Delete"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Info rows */}
      <div className="mt-4 space-y-2 text-[14px]">
        {/* Phone */}
        {driver.phone && (
          <div className="flex items-center gap-2 text-ink-600">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
            </svg>
            <span className="font-mono">{driver.phone}</span>
          </div>
        )}

        {/* License */}
        {driver.licenseNo && (
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-400">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M2 10h20" />
            </svg>
            <span className="text-ink-600">{driver.licenseNo}</span>
            {driver.licenseType && (
              <span className="rounded bg-ink-100 px-1.5 py-0.5 text-[13px] text-ink-500">
                {driver.licenseType}
              </span>
            )}
          </div>
        )}

        {/* License expiry warning */}
        {driver.licenseExpired && (
          <div className="flex items-center gap-2 text-red-600">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <span className="text-[13px] font-medium">License Expired</span>
          </div>
        )}
        {!driver.licenseExpired && driver.licenseExpiringSoon && (
          <div className="flex items-center gap-2 text-amber-600">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />
            </svg>
            <span className="text-[13px] font-medium">License Expiring Soon</span>
          </div>
        )}

        {/* RFID Card */}
        {driver.rfidCard && (
          <div className="flex items-center gap-2 text-ink-600">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <path d="M6 12h.01M10 12h.01M14 12h.01" />
            </svg>
            <span className="font-mono text-[13px]">{driver.rfidCard}</span>
          </div>
        )}
      </div>

      {/* Footer: Assigned vehicles */}
      <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3">
        <div className="flex items-center gap-1.5 text-[14px] text-ink-500">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="1" y="3" width="15" height="13" rx="2" />
            <path d="M16 8h2a2 2 0 012 2v3M16 8V5a2 2 0 012-2h2M4 16v2M8 16v2M20 14v2" />
          </svg>
          <span>
            {driver.assignedDeviceCount === 0
              ? "No vehicles assigned"
              : `${driver.assignedDeviceCount} vehicle${driver.assignedDeviceCount > 1 ? "s" : ""}`}
          </span>
        </div>
        {driver.hireDate && (
          <span className="text-[13px] text-ink-400">
            Since {new Date(driver.hireDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
          </span>
        )}
      </div>
    </div>
  );
}
