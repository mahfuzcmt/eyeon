"use client";

import { useMemo, useState } from "react";
import { useLiveLocations } from "@/hooks/useLiveLocations";
import { FleetMap } from "@/components/map/FleetMap";
import { cutFuel, restoreFuel } from "@/lib/deviceCommands";
import { extractError } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { filterSpeed, formatVoltage } from "@/lib/format";
import type { DeviceView } from "@/types/domain";

export default function TrackTab({ device, orgId }: { device: DeviceView; orgId: string }) {
  const { t } = useLocale();
  const { locations, refresh } = useLiveLocations(orgId);
  const live = locations.get(device.imei);

  const [locked, setLocked] = useState(device.engineLocked);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Only this vehicle on the map.
  const oneLoc = useMemo(() => {
    const m = new Map(); if (live) m.set(device.imei, live); return m;
  }, [live, device.imei]);

  async function run(kind: "cut" | "restore") {
    if (busy) return;
    if (!window.confirm(kind === "cut" ? "Cut the engine now?" : "Restore the engine?")) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = kind === "cut" ? await cutFuel(device.imei) : await restoreFuel(device.imei);
      setMsg(res.ok ? res.reply ?? "Command sent" : res.error ?? "Command failed");
      if (res.ok) setLocked(kind === "cut");
    } catch (e) {
      setMsg(extractError(e).message);
    } finally {
      setBusy(false);
    }
  }

  const speed = filterSpeed(live?.speed ?? device.lastSpeed, live?.valid);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative min-h-0 flex-1">
        <FleetMap devices={[device]} locations={oneLoc} selectedImei={device.imei} onSelect={() => {}} onRefresh={refresh} />
        <div className="pointer-events-none absolute left-3 top-3 z-[1000] rounded-md border border-surface-300 bg-white/95 px-3 py-1.5 shadow-menu">
          <span className="text-2xl font-bold leading-none text-ink-900">{speed}</span>
          <span className="ml-1 text-[11px] text-ink-500">{t("fleet.kmh")}</span>
        </div>
      </div>

      {/* Telemetry strip */}
      <div className="grid shrink-0 grid-cols-3 gap-px border-t border-surface-300 bg-surface-200 sm:grid-cols-6">
        <Cell label={t("fleet.acc")} value={live?.accOn == null ? "—" : live.accOn ? t("fleet.accOn") : t("fleet.accOff")} />
        <Cell label={t("fleet.gsm")} value={device.lastGsmSignal != null ? String(device.lastGsmSignal) : "—"} />
        <Cell label="GPS" value={live?.satellites != null ? String(live.satellites) : "—"} />
        <Cell label={t("fleet.voltage")} value={formatVoltage(live?.voltageMv ?? device.lastVoltageMv, "en")} />
        <Cell label={t("fleet.course")} value={live ? `${live.course}°` : "—"} />
        <Cell label="Fix" value={live ? (live.valid ? "GPS" : "LBS") : "—"} />
      </div>

      {/* Engine control */}
      <div className="flex shrink-0 items-center gap-2 border-t border-surface-300 bg-white px-3 py-2">
        <span className="text-[13px] text-ink-500">Engine:</span>
        <span className={`status-pill ${locked ? "status-pill-stopped" : "status-pill-moving"}`}>
          {locked ? "🔒 Locked" : "Unlocked"}
        </span>
        <div className="ml-auto flex gap-2">
          <button type="button" disabled={busy} onClick={() => run("cut")} className="btn-secondary !text-status-stopped">
            Cut engine
          </button>
          <button type="button" disabled={busy} onClick={() => run("restore")} className="btn-secondary !text-status-moving">
            Restore
          </button>
        </div>
      </div>
      {msg && <div className="shrink-0 bg-surface-100 px-3 py-1 text-[12px] text-ink-600">{msg}</div>}
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-2 py-1.5 text-center">
      <div className="text-[11px] uppercase tracking-wide text-ink-400">{label}</div>
      <div className="text-[13px] font-semibold text-ink-900">{value}</div>
    </div>
  );
}
