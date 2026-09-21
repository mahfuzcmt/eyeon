"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useDevices } from "@/hooks/useDevices";
import { useSession } from "@/lib/session-context";
import { useLocale, type StringKey } from "@/lib/i18n";
import { dhakaTodayStartIso, vehicleState, VEHICLE_STATE_COLOR } from "@/lib/format";
import { DeviceEditModal } from "@/components/device/DeviceEditModal";
import TrackTab from "@/components/device/detail/TrackTab";
import CalendarTab from "@/components/device/detail/CalendarTab";
import HistoryTab from "@/components/device/detail/HistoryTab";
import StatisticsTab from "@/components/device/detail/StatisticsTab";
import GraphTab from "@/components/device/detail/GraphTab";
import type { DetailRange } from "@/components/device/detail/types";

type Tab = "track" | "calendar" | "history" | "graph" | "stats";
const TABS: { id: Tab; label: StringKey }[] = [
  { id: "track", label: "det.track" },
  { id: "calendar", label: "det.calendar" },
  { id: "history", label: "det.history" },
  { id: "graph", label: "panel.graph" },
  { id: "stats", label: "det.stats" },
];

export default function DeviceDetailPage() {
  const params = useParams<{ imei: string }>();
  const imei = params.imei;
  const { orgId } = useSession();
  const { t } = useLocale();
  const { devices, loading, setDevices } = useDevices();

  const device = useMemo(() => devices.find((d) => d.imei === imei) ?? null, [devices, imei]);

  const [tab, setTab] = useState<Tab>("track");
  const [editing, setEditing] = useState(false);
  const [range, setRange] = useState<DetailRange>(() => ({
    from: dhakaTodayStartIso(),
    to: new Date().toISOString(),
    label: "Today",
    stopMinMinutes: 5,
  }));

  if (!device) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-ink-500">
        {loading ? t("common.loading") : t("veh.none")}
      </div>
    );
  }

  const state = vehicleState(device);

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface-50">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-surface-300 bg-white px-3 py-2">
        <Link href="/dashboard/devices" className="btn-icon" title={t("veh.title")}>‹</Link>
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: VEHICLE_STATE_COLOR[state] }} />
        <div className="min-w-0">
          <div className="truncate text-[14px] font-semibold text-ink-900">
            {device.name || device.vehiclePlate || device.imei.slice(-8)}
          </div>
          <div className="font-mono text-[11px] text-ink-500">{device.imei}</div>
        </div>
        <button
          type="button"
          className="btn-ghost ml-auto"
          onClick={() => setEditing(true)}
          title={t("veh.edit")}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          </svg>
          {t("veh.edit")}
        </button>
      </div>

      {editing && (
        <DeviceEditModal
          device={device}
          onClose={() => setEditing(false)}
          onSaved={(updated) =>
            setDevices((prev) => prev.map((d) => (d.imei === updated.imei ? updated : d)))
          }
        />
      )}

      {/* Tabs */}
      <div className="tab-bar shrink-0">
        {TABS.map((tb) => (
          <button
            key={tb.id}
            type="button"
            onClick={() => setTab(tb.id)}
            className={tab === tb.id ? "tab-item-active" : "tab-item"}
          >
            {t(tb.label)}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1">
        {tab === "track" && <TrackTab device={device} orgId={orgId} />}
        {tab === "calendar" && (
          <CalendarTab
            imei={imei}
            onApply={(r) => {
              setRange(r);
              setTab("history");
            }}
          />
        )}
        {tab === "history" && <HistoryTab imei={imei} range={range} />}
        {tab === "graph" && <GraphTab imei={imei} />}
        {tab === "stats" && <StatisticsTab device={device} orgId={orgId} />}
      </div>
    </div>
  );
}
