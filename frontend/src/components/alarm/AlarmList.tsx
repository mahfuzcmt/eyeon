"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n";
import { formatDateTime } from "@/lib/format";
import { ALARM_SEVERITIES, ALARM_TYPES, alarmTypeLabel, processResultLabel, severityLabel } from "@/lib/alarmTypes";
import { AlarmMapModal } from "./AlarmMapModal";
import { AcknowledgeDialog } from "./AcknowledgeDialog";
import type { AlarmAcknowledgeRequest, AlarmSeverity, AlarmView, DeviceView } from "@/types/domain";

export interface AlarmCenterFilter {
  type: string;
  severity: string;
  imei: string;
  /** yyyy-MM-dd (Dhaka calendar days). */
  from: string;
  to: string;
  unackedOnly: boolean;
}

interface AlarmListProps {
  alarms: AlarmView[];
  loading: boolean;
  devices: DeviceView[];
  filter: AlarmCenterFilter;
  onFilterChange: (f: AlarmCenterFilter) => void;
  onAcknowledge: (id: string, body?: AlarmAcknowledgeRequest) => Promise<unknown>;
  onExport: () => Promise<void>;
  exporting: boolean;
}

const SEV_PILL: Record<AlarmSeverity, string> = {
  CRITICAL: "bg-alarm-red text-white",
  WARNING: "bg-alarm-amber text-ink-900",
  INFO: "bg-brand-500 text-white",
};

export function AlarmList({ alarms, loading, devices, filter, onFilterChange, onAcknowledge, onExport, exporting }: AlarmListProps) {
  const { t, locale } = useLocale();
  const [mapAlarm, setMapAlarm] = useState<AlarmView | null>(null);
  const [ackAlarm, setAckAlarm] = useState<AlarmView | null>(null);

  const deviceName = (imei: string) => {
    const d = devices.find((x) => x.imei === imei);
    return d ? d.name || d.vehiclePlate || imei : imei;
  };
  const set = <K extends keyof AlarmCenterFilter>(k: K, v: AlarmCenterFilter[K]) => onFilterChange({ ...filter, [k]: v });

  const unacked = alarms.filter((a) => !a.acknowledged).length;

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-surface-300 bg-surface-50 px-4 py-2">
        <span className="t-caption">
          {alarms.length} {t("alarms.shown")} · {unacked} {t("alarms.unacked")}
        </span>
        <button type="button" className="btn-secondary ml-auto" onClick={() => void onExport()} disabled={exporting}>
          {exporting ? t("common.loading") : t("alarms.exportExcel")}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-2 border-b border-surface-300 px-4 py-2 text-[13px]">
        <label className="flex flex-col gap-0.5">
          <span className="t-label">{t("alarms.type")}</span>
          <select className="select w-40" value={filter.type} onChange={(e) => set("type", e.target.value)}>
            <option value="">{t("alarms.allTypes")}</option>
            {ALARM_TYPES.map((ty) => (
              <option key={ty} value={ty}>{alarmTypeLabel(ty, t)}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="t-label">{t("alarms.severity")}</span>
          <select className="select w-32" value={filter.severity} onChange={(e) => set("severity", e.target.value)}>
            <option value="">{t("alarms.allSeverities")}</option>
            {ALARM_SEVERITIES.map((s) => (
              <option key={s} value={s}>{severityLabel(s, t)}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="t-label">{t("alarms.vehicle")}</span>
          <select className="select w-44" value={filter.imei} onChange={(e) => set("imei", e.target.value)}>
            <option value="">{t("alarms.allVehicles")}</option>
            {devices.map((d) => (
              <option key={d.imei} value={d.imei}>{d.name || d.vehiclePlate || d.imei}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="t-label">{t("common.from")}</span>
          <input type="date" className="input w-auto" value={filter.from} max={filter.to} onChange={(e) => set("from", e.target.value)} />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="t-label">{t("common.to")}</span>
          <input type="date" className="input w-auto" value={filter.to} min={filter.from} onChange={(e) => set("to", e.target.value)} />
        </label>
        <label className="flex h-7 items-center gap-1.5 text-ink-700">
          <input type="checkbox" checked={filter.unackedOnly} onChange={(e) => set("unackedOnly", e.target.checked)} className="h-3.5 w-3.5 accent-brand-500" />
          {t("alarms.unackedOnly")}
        </label>
      </div>

      <div className="flex-1 overflow-auto">
        {loading && <div className="px-3 py-4 text-[13px] text-ink-500">{t("common.loading")}</div>}
        {!loading && alarms.length === 0 && (
          <div className="px-3 py-12 text-center text-[13px] text-ink-500">{t("common.empty")}</div>
        )}
        {!loading && alarms.length > 0 && (
          <table className="data-table min-w-[720px]">
            <thead>
              <tr>
                <th>{t("alarms.severity")}</th>
                <th>{t("alarms.type")}</th>
                <th>{t("alarms.vehicle")}</th>
                <th>{t("alarms.time")}</th>
                <th>{t("alarms.location")}</th>
                <th>{t("alarms.processResult")}</th>
                <th className="text-right" />
              </tr>
            </thead>
            <tbody>
              {alarms.map((a) => (
                <tr key={a.id} className={a.acknowledged ? "" : a.severity === "CRITICAL" ? "bg-red-50/60" : ""}>
                  <td>
                    <span className={`status-pill ${SEV_PILL[a.severity]}`}>{severityLabel(a.severity, t)}</span>
                  </td>
                  <td className="font-semibold">{alarmTypeLabel(a.type, t)}</td>
                  <td>
                    <div className="text-ink-900">{deviceName(a.deviceImei)}</div>
                    <div className="font-mono text-[11px] text-ink-500">{a.deviceImei}</div>
                  </td>
                  <td className="text-ink-700">{formatDateTime(a.ts, locale)}</td>
                  <td>
                    {a.latitude != null && a.longitude != null ? (
                      <button type="button" className="t-link" onClick={() => setMapAlarm(a)}>
                        {t("alarms.showMap")}
                      </button>
                    ) : (
                      <span className="text-ink-400">—</span>
                    )}
                  </td>
                  <td>
                    {a.processResult ? (
                      <div>
                        <div className="text-ink-900">{processResultLabel(a.processResult, t)}</div>
                        {a.processNotes && <div className="max-w-[220px] truncate text-[12px] text-ink-500" title={a.processNotes}>{a.processNotes}</div>}
                      </div>
                    ) : (
                      <span className="text-ink-400">—</span>
                    )}
                  </td>
                  <td className="text-right">
                    {a.acknowledged ? (
                      <span className="text-[12px] text-ink-500">{t("common.acknowledged")}</span>
                    ) : (
                      <button type="button" onClick={() => setAckAlarm(a)} className="btn-secondary">
                        {t("alarms.process")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {mapAlarm && <AlarmMapModal alarm={mapAlarm} deviceName={deviceName(mapAlarm.deviceImei)} onClose={() => setMapAlarm(null)} />}
      {ackAlarm && (
        <AcknowledgeDialog
          alarm={ackAlarm}
          deviceName={deviceName(ackAlarm.deviceImei)}
          onConfirm={(body) => onAcknowledge(ackAlarm.id, body)}
          onClose={() => setAckAlarm(null)}
        />
      )}
    </div>
  );
}
