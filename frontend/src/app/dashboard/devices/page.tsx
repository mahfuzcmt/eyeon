"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useDevices } from "@/hooks/useDevices";
import { useLiveLocations } from "@/hooks/useLiveLocations";
import { useSession } from "@/lib/session-context";
import { useLocale, type StringKey } from "@/lib/i18n";
import {
  formatDate,
  formatRelative,
  formatSince,
  VEHICLE_STATE_COLOR,
  vehicleState,
  type VehicleState,
} from "@/lib/format";
import { useSpeedLimits, type SpeedLimits } from "@/hooks/useSpeedLimits";
import type { DeviceView, LocationView } from "@/types/domain";

const OVERSPEED_COLOR = "#DC2626";

type ChipId = VehicleState | "all";

const CHIPS: { id: ChipId; label: StringKey; dot: string }[] = [
  { id: "all", label: "veh.all", dot: "bg-ink-300" },
  { id: "moving", label: "veh.moving", dot: "bg-status-moving" },
  { id: "idle", label: "veh.idle", dot: "bg-status-idle" },
  { id: "stopped", label: "veh.stopped", dot: "bg-status-stopped" },
  { id: "expired", label: "veh.expired", dot: "bg-status-expired" },
  { id: "offline", label: "veh.offline", dot: "bg-status-offline" },
  { id: "nodata", label: "veh.nodata", dot: "bg-status-nodata" },
];

const STATE_PILL: Record<VehicleState, string> = {
  moving: "status-pill-moving",
  idle: "status-pill-idle",
  stopped: "status-pill-stopped",
  offline: "status-pill-offline",
  expired: "status-pill-expired",
  nodata: "status-pill-nodata",
};

const STATE_LABEL: Record<VehicleState, StringKey> = {
  moving: "veh.moving",
  idle: "veh.idle",
  stopped: "veh.stopped",
  offline: "veh.offline",
  expired: "veh.expired",
  nodata: "veh.nodata",
};

export default function VehiclesPage() {
  const { orgId } = useSession();
  const { t, locale } = useLocale();
  const { devices, loading } = useDevices();
  const { locations } = useLiveLocations(orgId);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ChipId>("all");
  const speedLimits = useSpeedLimits();

  // Deep-link from the Home fleet-status cards: /dashboard/devices?state=moving
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("state");
    if (s && CHIPS.some((c) => c.id === s)) setFilter(s as ChipId);
  }, []);

  // State per device, computed once, reused for counts + filtering + cards.
  const withState = useMemo(
    () => devices.map((d) => ({ d, live: locations.get(d.imei), state: vehicleState(d, locations.get(d.imei)) })),
    [devices, locations],
  );

  const counts = useMemo(() => {
    const c: Record<ChipId, number> = {
      all: withState.length, moving: 0, idle: 0, stopped: 0, expired: 0, offline: 0, nodata: 0,
    };
    for (const { state } of withState) c[state]++;
    return c;
  }, [withState]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return withState
      .filter(({ d, state }) => {
        if (filter !== "all" && state !== filter) return false;
        if (!q) return true;
        return (
          d.imei.toLowerCase().includes(q) ||
          (d.name?.toLowerCase().includes(q) ?? false) ||
          (d.vehiclePlate?.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => {
        // Overspeeding vehicles surface at the top of the grid.
        const ao = speedLimits.isOverspeed(a.d.imei, a.live?.speed ?? a.d.lastSpeed);
        const bo = speedLimits.isOverspeed(b.d.imei, b.live?.speed ?? b.d.lastSpeed);
        if (ao !== bo) return ao ? -1 : 1;
        const at = a.live?.ts ?? a.d.lastSeenAt ?? "";
        const bt = b.live?.ts ?? b.d.lastSeenAt ?? "";
        return bt < at ? -1 : bt > at ? 1 : 0;
      });
  }, [withState, filter, query, speedLimits]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface-50">
      {/* Header: title + search */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-surface-300 bg-white px-4 py-2">
        <h1 className="text-[14px] font-semibold text-ink-900">{t("veh.title")}</h1>
        <span className="text-[13px] text-ink-500">
          {counts.all} {t("veh.count")}
        </span>
        <div className="ml-auto w-full max-w-xs">
          <input
            type="search"
            className="input-search"
            placeholder={t("fleet.search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Filter chips with live counts */}
      <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-surface-300 bg-white px-3 py-1.5">
        {CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setFilter(chip.id)}
            className={filter === chip.id ? "filter-chip-active" : "filter-chip"}
          >
            <span className={`status-dot ${chip.dot}`} />
            <span>{t(chip.label)}</span>
            <span className="text-ink-400">{counts[chip.id]}</span>
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {loading && devices.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-ink-500">{t("common.loading")}</p>
        ) : visible.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-ink-500">{t("veh.none")}</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map(({ d, live, state }) => (
              <VehicleCard
                key={d.imei}
                device={d}
                live={live}
                state={state}
                t={t}
                locale={locale}
                speedLimits={speedLimits}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function VehicleCard({
  device: d,
  live,
  state,
  t,
  locale,
  speedLimits,
}: {
  device: DeviceView;
  live: LocationView | undefined;
  state: VehicleState;
  t: (k: StringKey) => string;
  locale: "en" | "bn";
  speedLimits: SpeedLimits;
}) {
  const ts = live?.ts ?? d.lastSeenAt;
  const speed = live?.speed ?? d.lastSpeed ?? 0;
  const accOn = live?.accOn ?? null;
  const overspeed = speedLimits.isOverspeed(d.imei, speed);
  const color = overspeed ? OVERSPEED_COLOR : VEHICLE_STATE_COLOR[state];
  // Different "since" times per state:
  // - moving/idle: last update time
  // - stopped: parking duration (trip end time)
  // - offline/expired/nodata: last seen time (how long disconnected)
  const sinceTs = state === "stopped" ? (d.parkedSince ?? ts) : ts;

  return (
    <Link
      href={`/dashboard/devices/${encodeURIComponent(d.imei)}`}
      className={`panel block p-3 transition hover:border-brand-400 hover:shadow-panel ${
        overspeed ? "border-status-stopped" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <span className={overspeed ? "animate-pulse" : undefined}>
          <VehicleIcon color={color} />
        </span>
        <div className="min-w-0 flex-1">
          <div
            className={`truncate text-[13px] font-semibold ${overspeed ? "animate-pulse" : "text-ink-900"}`}
            style={{ color: overspeed ? OVERSPEED_COLOR : undefined }}
          >
            {d.name || d.vehiclePlate || d.imei.slice(-8)}
          </div>
          {d.vehiclePlate && d.name && (
            <div
              className={`truncate font-mono text-[11px] ${overspeed ? "" : "text-ink-500"}`}
              style={{ color: overspeed ? OVERSPEED_COLOR : undefined }}
            >
              {d.vehiclePlate}
            </div>
          )}
        </div>
        <span className={`status-pill ${overspeed ? "status-pill-stopped" : STATE_PILL[state]}`}>
          {overspeed ? "Overspeed" : t(STATE_LABEL[state])}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-[12px] text-ink-600">
          {t(STATE_LABEL[state])} {t("veh.since")} {formatSince(sinceTs)}
        </span>
        <span
          className={`text-[13px] font-semibold ${overspeed ? "animate-pulse" : "text-ink-900"}`}
          style={{ color: overspeed ? OVERSPEED_COLOR : undefined }}
        >
          {speed} <span className="text-[11px] font-normal text-ink-500">{t("fleet.kmh")}</span>
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {accOn != null && (
          <span
            className={`inline-flex h-[18px] items-center rounded-sm px-1.5 text-[11px] font-semibold ${
              accOn ? "bg-status-moving/15 text-status-moving" : "bg-surface-200 text-ink-600"
            }`}
          >
            {t("fleet.acc")} {accOn ? t("fleet.accOn") : t("fleet.accOff")}
          </span>
        )}
        {d.engineLocked && (
          <span className="inline-flex h-[18px] items-center gap-1 rounded-sm bg-status-stopped/15 px-1.5 text-[11px] font-semibold text-status-stopped">
            <LockIcon />
            {t("veh.locked")}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-surface-100 pt-1.5 text-[11px] text-ink-500">
        <span>
          {t("veh.updated")} {formatRelative(ts, locale)}
        </span>
        {d.subscriptionExpiresAt && (
          <span className={state === "expired" ? "font-semibold text-status-stopped" : ""}>
            {t("veh.expiresOn")} {formatDate(d.subscriptionExpiresAt, locale)}
          </span>
        )}
      </div>
    </Link>
  );
}

function VehicleIcon({ color }: { color: string }) {
  return (
    <svg width="28" height="18" viewBox="0 0 24 16" fill="none" className="shrink-0">
      <rect x="1" y="4" width="16" height="8" rx="1" fill={color} />
      <rect x="17" y="6" width="6" height="6" rx="1" fill={color} />
      <circle cx="5" cy="13" r="2" fill="#333" />
      <circle cx="14" cy="13" r="2" fill="#333" />
      <circle cx="20" cy="13" r="1.5" fill="#333" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
