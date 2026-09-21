"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useDevices } from "@/hooks/useDevices";
import { useLiveLocations } from "@/hooks/useLiveLocations";
import { useActivity } from "@/hooks/useActivity";
import { useSession } from "@/lib/session-context";
import { useLocale, type StringKey } from "@/lib/i18n";
import {
  dhakaTodayStartIso,
  formatDurationS,
  formatNumber,
  vehicleState,
  VEHICLE_STATE_COLOR,
  type VehicleState,
} from "@/lib/format";

const STATES: { id: VehicleState; label: StringKey }[] = [
  { id: "moving", label: "veh.moving" },
  { id: "idle", label: "veh.idle" },
  { id: "stopped", label: "veh.stopped" },
  { id: "offline", label: "veh.offline" },
  { id: "expired", label: "veh.expired" },
  { id: "nodata", label: "veh.nodata" },
];

export default function HomePage() {
  const { orgId } = useSession();
  const { t, locale } = useLocale();
  const { devices } = useDevices();
  const { locations } = useLiveLocations(orgId);

  const counts = useMemo(() => {
    const c: Record<VehicleState, number> = {
      moving: 0, idle: 0, stopped: 0, offline: 0, expired: 0, nodata: 0,
    };
    for (const d of devices) c[vehicleState(d, locations.get(d.imei))]++;
    return c;
  }, [devices, locations]);

  const [selImei, setSelImei] = useState("");
  useEffect(() => {
    if (!selImei && devices.length) setSelImei(devices[0].imei);
  }, [devices, selImei]);

  // Fixed "today" window for the session; a page reload re-anchors it.
  const range = useMemo(() => ({ from: dhakaTodayStartIso(), to: new Date().toISOString() }), []);
  const { activity, loading } = useActivity({ imei: selImei || null, fromIso: range.from, toIso: range.to });

  return (
    <div className="h-full overflow-y-auto bg-surface-50 p-4">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        {/* ── Fleet Status ─────────────────────────────────────────── */}
        <section>
          <div className="mb-2 flex items-baseline gap-2">
            <h1 className="text-[15px] font-semibold text-ink-900">{t("home.fleetStatus")}</h1>
            <span className="text-[14px] text-ink-500">
              {t("home.total")} {devices.length}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {STATES.map((s) => (
              <Link
                key={s.id}
                href={`/dashboard/devices?state=${s.id}`}
                className="panel flex flex-col gap-1 p-3 transition hover:border-brand-400 hover:shadow-panel"
              >
                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-600">
                  <span className="status-dot" style={{ backgroundColor: VEHICLE_STATE_COLOR[s.id] }} />
                  {t(s.label)}
                </span>
                <span className="text-2xl font-bold leading-none text-ink-900">{counts[s.id]}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Single Vehicle Stats ─────────────────────────────────── */}
        <section className="panel">
          <div className="panel-header">
            <span className="text-[14px] font-semibold text-ink-900">{t("home.vehicleStats")}</span>
            <span className="text-[12px] text-ink-500">{t("home.today")}</span>
          </div>
          <div className="panel-body flex flex-col gap-3">
            {devices.length === 0 ? (
              <p className="py-6 text-center text-[14px] text-ink-500">{t("home.noVehicles")}</p>
            ) : (
              <>
                <select
                  className="select max-w-xs"
                  value={selImei}
                  onChange={(e) => setSelImei(e.target.value)}
                >
                  {devices.map((d) => (
                    <option key={d.imei} value={d.imei}>
                      {d.name || d.vehiclePlate || d.imei.slice(-8)}
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <Tile
                    label={t("home.routeLength")}
                    value={`${formatNumber(activity.distanceM / 1000, locale, { maximumFractionDigits: 1 })} ${t("kpi.km")}`}
                    loading={loading}
                  />
                  <Tile label={t("home.moveDuration")} value={formatDurationS(activity.movingS, locale)} loading={loading} />
                  <Tile label={t("home.stopDuration")} value={formatDurationS(activity.stillS, locale)} loading={loading} />
                </div>

              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Tile({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <div className="rounded-sm border border-surface-200 bg-surface-50 px-3 py-2">
      <div className="text-[12px] uppercase tracking-wide text-ink-500">{label}</div>
      <div className="mt-0.5 text-[15px] font-semibold text-ink-900">{loading ? "…" : value}</div>
    </div>
  );
}
