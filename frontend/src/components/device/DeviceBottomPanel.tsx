"use client";

import { useMemo, useState } from "react";
import { useLocale } from "@/lib/i18n";
import { useTrips } from "@/hooks/useTrips";
import { useLocationHistory } from "@/hooks/useLocationHistory";
import { cutFuel, restoreFuel, queryAddress, rebootDevice, sendRawCommand } from "@/lib/deviceCommands";
import { extractError } from "@/lib/api";
import { dhakaTodayStartIso, filterSpeed, formatDurationS, formatNumber, formatSince, formatBatteryPercent } from "@/lib/format";
import { TimeSeriesChart, chartColors } from "@/components/charts/TimeSeriesChart";
import type { DeviceView, LocationView } from "@/types/domain";

interface Props {
  device: DeviceView;
  location: LocationView | undefined;
  onClose: () => void;
  onViewHistory: () => void;
  onViewLiveTracking?: () => void;
}

type TabId = "data" | "graph";
type CommandTemplate = "custom" | "cut" | "restore" | "address" | "reboot";

function formatDateTime(ts: string | null | undefined): string {
  if (!ts) return "—";
  const date = new Date(ts);
  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).replace(",", "");
}

function formatOdometer(meters: number | undefined | null): string {
  if (meters == null) return "—";
  return `${(meters / 1000).toFixed(0)} km`;
}

export function DeviceBottomPanel({ device, location, onClose, onViewHistory, onViewLiveTracking }: Props) {
  const { t, locale } = useLocale();
  const [activeTab, setActiveTab] = useState<TabId>("data");

  const isMoving = location && location.speed > 2;
  const isOnline = device.status === "ONLINE";
  const status = !isOnline ? "Offline" : isMoving ? "Moving" : location?.accOn ? "Idle" : "Stopped";

  // Today (Asia/Dhaka) — shared by the stats block and the graphs.
  const range = useMemo(() => ({ from: dhakaTodayStartIso(), to: new Date().toISOString() }), []);
  const { trips } = useTrips({ imei: device.imei, fromIso: range.from, toIso: range.to });

  const stats = useMemo(() => {
    const distanceM = trips.reduce((s, tr) => s + tr.distanceM, 0);
    const durationS = trips.reduce((s, tr) => s + (tr.durationS ?? 0), 0);
    const idleS = trips.reduce((s, tr) => s + tr.idleTimeS, 0);
    const maxSpeed = trips.reduce((m, tr) => Math.max(m, tr.maxSpeed), 0);
    const avgSpeed = durationS > 0 ? Math.round(distanceM / 1000 / (durationS / 3600)) : 0;
    const elapsedS = Math.max(0, (Date.now() - new Date(range.from).getTime()) / 1000);
    return {
      distanceM,
      moveS: Math.max(0, durationS - idleS),
      stopS: Math.max(0, elapsedS - durationS),
      maxSpeed,
      avgSpeed,
    };
  }, [trips, range.from]);

  // Graph data — only fetched while the Graph tab is open.
  const { locations: graphLocs, loading: graphLoading } = useLocationHistory(
    activeTab === "graph" ? device.imei : null,
    range.from,
    range.to,
  );
  const speedPoints = useMemo(
    () => graphLocs.map((l) => ({ t: Date.parse(l.ts), v: l.speed })),
    [graphLocs],
  );
  const voltagePoints = useMemo(
    () =>
      graphLocs
        .filter((l) => l.voltageMv != null)
        .map((l) => ({ t: Date.parse(l.ts), v: (l.voltageMv as number) / 1000 })),
    [graphLocs],
  );

  // Object control.
  const [template, setTemplate] = useState<CommandTemplate>("custom");
  const [rawText, setRawText] = useState("");
  const [busy, setBusy] = useState(false);
  const [cmdMsg, setCmdMsg] = useState<string | null>(null);

  async function sendCommand() {
    if (busy) return;
    if (template === "custom" && !rawText.trim()) return;
    if (template === "cut" && !window.confirm(t("panel.confirmCut"))) return;
    if (template === "reboot" && !window.confirm(t("panel.confirmReboot"))) return;
    setBusy(true);
    setCmdMsg(null);
    try {
      const res =
        template === "cut" ? await cutFuel(device.imei)
        : template === "restore" ? await restoreFuel(device.imei)
        : template === "address" ? await queryAddress(device.imei)
        : template === "reboot" ? await rebootDevice(device.imei)
        : await sendRawCommand(device.imei, rawText.trim());
      setCmdMsg(res.ok ? res.reply ?? t("panel.commandSent") : res.error ?? t("panel.commandFailed"));
    } catch (e) {
      setCmdMsg(extractError(e).message);
    } finally {
      setBusy(false);
    }
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "data", label: t("panel.data") },
    { id: "graph", label: t("panel.graph") },
  ];

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[1000] border-t border-surface-300 bg-white shadow-lg">
      {/* Tab bar */}
      <div className="flex items-center justify-between border-b border-surface-300 bg-surface-100">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-[13px] font-medium transition ${
                activeTab === tab.id
                  ? "border-b-2 border-brand-500 bg-white text-ink-900"
                  : "text-ink-500 hover:bg-white hover:text-ink-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 px-2">
          {onViewLiveTracking && (
            <button
              type="button"
              onClick={onViewLiveTracking}
              className="btn-primary flex items-center gap-1.5 text-[13px]"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polygon points="10 8 16 12 10 16 10 8"/>
              </svg>
              {t("panel.liveTracking")}
            </button>
          )}
          <button
            type="button"
            onClick={onViewHistory}
            className="btn-secondary text-[13px]"
          >
            {t("fleet.viewHistory")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn-icon text-ink-500 hover:text-ink-900"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "data" && (
        <div className="flex max-h-[50vh] flex-col divide-y divide-surface-200 overflow-y-auto md:max-h-none md:flex-row md:divide-x md:divide-y-0 md:overflow-visible">
          {/* Left data columns */}
          <div className="flex-1 grid grid-cols-1 gap-x-8 p-3 sm:grid-cols-2">
            <DataRow icon="001" label="Odometer" value={formatOdometer(location?.mileageMeters)} />
            <DataRow icon="📱" label="SIM card num..." value={device.simMsisdn || "—"} mono />
            <DataRow icon="📶" label="Status" value={status} valueColor={isMoving ? "text-status-moving" : !isOnline ? "text-ink-400" : "text-status-stopped"} />
            <DataRow icon="⛰" label="Altitude" value={location?.altitude != null ? `${location.altitude} m` : "0 m"} />
            <DataRow icon="🧭" label="Angle" value={location?.course != null ? `${location.course} °` : "— °"} />
            <DataRow icon="📍" label="Position" value={location ? `${location.latitude.toFixed(6)} °, ${location.longitude.toFixed(6)} °` : "—"} link />
            <DataRow icon="🚗" label="Speed" value={`${filterSpeed(location?.speed, location?.valid)} kph`} />
            {device.parkedSince && !isMoving && (
              <DataRow icon="🅿️" label="Parked for" value={formatSince(device.parkedSince)} />
            )}
          </div>

          {/* Middle data columns */}
          <div className="flex-1 grid grid-cols-1 gap-x-8 p-3 sm:grid-cols-2">
            <DataRow icon="🕐" label="Time (position)" value={formatDateTime(location?.ts)} />
            <DataRow icon="🕐" label="Time (server)" value={formatDateTime(location?.ts)} />
            <DataRow icon="🔋" label="Battery Level" value={formatBatteryPercent(location?.voltageMv)} />
            <DataRow icon="🔑" label="Engine ACC" value={location?.accOn == null ? "—" : location.accOn ? "ON" : "OFF"} valueColor={location?.accOn ? "text-status-moving" : "text-ink-500"} />
            <DataRow icon="⚡" label="External Power" value={location?.voltageMv ? "ON" : "—"} valueColor={location?.voltageMv ? "text-status-moving" : "text-ink-500"} />
          </div>

          {/* Object control */}
          <div className="w-full p-3 md:w-52 md:border-r md:border-surface-200">
            <div className="text-[13px] font-semibold text-ink-700 mb-2">{t("panel.objectControl")}</div>
            <div className="space-y-2">
              <div>
                <label className="text-[11px] text-ink-500">{t("panel.template")}</label>
                <select
                  className="select w-full mt-0.5"
                  value={template}
                  onChange={(e) => {
                    setTemplate(e.target.value as CommandTemplate);
                    setCmdMsg(null);
                  }}
                >
                  <option value="custom">{t("panel.custom")}</option>
                  <option value="cut">{t("panel.cutEngine")}</option>
                  <option value="restore">{t("panel.restoreEngine")}</option>
                  <option value="address">{t("panel.queryAddress")}</option>
                  <option value="reboot">{t("panel.rebootDevice")}</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-ink-500">{t("panel.command")}</label>
                <div className="flex gap-1 mt-0.5">
                  <input
                    type="text"
                    className="input flex-1 font-mono disabled:bg-surface-100"
                    placeholder={template === "custom" ? "SPDADD,ON,10,2#" : ""}
                    value={template === "custom" ? rawText : template === "cut" ? "DYD" : template === "restore" ? "HFYD" : template === "address" ? "DWXX" : "RESET"}
                    disabled={template !== "custom"}
                    onChange={(e) => setRawText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void sendCommand(); }}
                  />
                  <button
                    type="button"
                    disabled={busy || (template === "custom" && !rawText.trim())}
                    onClick={() => void sendCommand()}
                    className="btn-icon border border-surface-300 disabled:opacity-40"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </div>
              </div>
              {cmdMsg && <div className="text-[11px] text-ink-600 break-words">{cmdMsg}</div>}
            </div>
          </div>

          {/* Daily statistics */}
          <div className="w-full p-3 md:w-56">
            <div className="text-[13px] font-semibold text-ink-700 mb-2">{t("panel.dailyStats")}</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[13px]">
              <span className="text-ink-500">{t("home.routeLength")}</span>
              <span className="text-ink-900 font-medium text-right">
                {formatNumber(stats.distanceM / 1000, locale, { maximumFractionDigits: 1 })} km
              </span>
              <span className="text-ink-500">{t("home.moveDuration")}</span>
              <span className="text-ink-900 font-medium text-right">{formatDurationS(stats.moveS, locale)}</span>
              <span className="text-ink-500">{t("home.stopDuration")}</span>
              <span className="text-ink-900 font-medium text-right">{formatDurationS(stats.stopS, locale)}</span>
              <span className="text-ink-500">{t("trips.maxSpeed")}</span>
              <span className="text-ink-900 font-medium text-right">{stats.maxSpeed} {t("fleet.kmh")}</span>
              <span className="text-ink-500">{t("trips.avgSpeed")}</span>
              <span className="text-ink-900 font-medium text-right">{stats.avgSpeed} {t("fleet.kmh")}</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === "graph" && (
        <div className="max-h-[50vh] overflow-y-auto p-3">
          {graphLoading ? (
            <div className="p-4 text-center text-[13px] text-ink-400">…</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <TimeSeriesChart
                points={speedPoints}
                color={chartColors.speed}
                title={t("fleet.speed")}
                unit={t("fleet.kmh")}
                yFromZero
                emptyText={t("graph.noData")}
                formatValue={(v) => String(Math.round(v))}
              />
              <TimeSeriesChart
                points={voltagePoints}
                color={chartColors.voltage}
                title={t("fleet.voltage")}
                unit="V"
                emptyText={t("graph.noData")}
                formatValue={(v) => v.toFixed(1)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface DataRowProps {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
  mono?: boolean;
  link?: boolean;
}

function DataRow({ icon, label, value, valueColor = "text-ink-900", mono, link }: DataRowProps) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="text-[11px] w-5 text-center">{icon}</span>
      <span className="text-[12px] text-ink-500 w-24 truncate">{label}</span>
      <span className={`text-[12px] font-medium ${valueColor} ${mono ? "font-mono" : ""} ${link ? "text-brand-500 underline cursor-pointer" : ""}`}>
        {value}
      </span>
    </div>
  );
}
