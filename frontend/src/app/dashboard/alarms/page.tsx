"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/lib/session-context";
import { useAlarms } from "@/hooks/useAlarms";
import { useDevices } from "@/hooks/useDevices";
import { useExport } from "@/hooks/useExport";
import { AlarmList, type AlarmCenterFilter } from "@/components/alarm/AlarmList";
import { AlarmOverview } from "@/components/alarm/AlarmOverview";
import { useLocale } from "@/lib/i18n";

type Tab = "overview" | "details";

const DHAKA_OFFSET = "+06:00";

function dhakaToday(): string {
  return new Date(Date.now() + 6 * 3600_000).toISOString().slice(0, 10);
}
function daysAgo(n: number): string {
  return new Date(Date.now() + 6 * 3600_000 - n * 86_400_000).toISOString().slice(0, 10);
}
/** Dhaka calendar day → [start, end) instants. */
function dayStart(d: string): string {
  return new Date(`${d}T00:00:00${DHAKA_OFFSET}`).toISOString();
}
function dayEndExclusive(d: string): string {
  return new Date(new Date(`${d}T00:00:00${DHAKA_OFFSET}`).getTime() + 86_400_000).toISOString();
}

/** Alarm center: filterable history with map jump and Excel export. Deep link: ?imei=…&unacked=1 */
export default function Page() {
  const { orgId } = useSession();
  const { t } = useLocale();
  const [tab, setTab] = useState<Tab>("details");
  const { devices, loading: devicesLoading } = useDevices();
  // Restrict live alarms to the devices this user may see; unrestricted until the list loads.
  const allowedImeis = useMemo(
    () => (devicesLoading ? null : new Set(devices.map((d) => d.imei))),
    [devices, devicesLoading],
  );
  const { exportData, loading: exporting } = useExport();
  const [filter, setFilter] = useState<AlarmCenterFilter>({
    type: "",
    severity: "",
    imei: "",
    from: daysAgo(7),
    to: dhakaToday(),
    unackedOnly: false,
  });

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const imei = q.get("imei");
    const unacked = q.get("unacked");
    if (imei || unacked) setFilter((f) => ({ ...f, imei: imei ?? f.imei, unackedOnly: unacked === "1" || unacked === "true" }));
    if (q.get("tab") === "overview") setTab("overview");
  }, []);

  const query = useMemo(
    () => ({
      limit: 500,
      unackedOnly: filter.unackedOnly,
      type: filter.type || undefined,
      severity: filter.severity || undefined,
      imei: filter.imei || undefined,
      from: filter.from ? dayStart(filter.from) : undefined,
      to: filter.to ? dayEndExclusive(filter.to) : undefined,
    }),
    [filter],
  );
  const { alarms, loading, acknowledge } = useAlarms(orgId, { ...query, allowedImeis });

  return (
    <div className="flex h-full flex-col bg-white">
      {/* ADL: Alarm Overview | Alarm Details */}
      <div className="flex items-center gap-3 border-b border-surface-300 px-4 pt-2">
        <h1 className="t-title mb-2">{t("alarms.title")}</h1>
        <div className="tab-bar ml-2 !border-b-0 !bg-transparent">
          <button type="button" className={tab === "overview" ? "tab-item-active" : "tab-item"} onClick={() => setTab("overview")}>
            {t("alarms.tabOverview")}
          </button>
          <button type="button" className={tab === "details" ? "tab-item-active" : "tab-item"} onClick={() => setTab("details")}>
            {t("alarms.tabDetails")}
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        {tab === "overview" ? (
          <div className="flex h-full flex-col">
            <div className="flex flex-wrap items-end gap-2 border-b border-surface-300 px-4 py-2 text-[13px]">
              <label className="flex flex-col gap-0.5">
                <span className="t-label">{t("common.from")}</span>
                <input type="date" className="input w-auto" value={filter.from} max={filter.to} onChange={(e) => setFilter({ ...filter, from: e.target.value })} />
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="t-label">{t("common.to")}</span>
                <input type="date" className="input w-auto" value={filter.to} min={filter.from} onChange={(e) => setFilter({ ...filter, to: e.target.value })} />
              </label>
            </div>
            <div className="min-h-0 flex-1">
              <AlarmOverview
                from={dayStart(filter.from)}
                to={dayEndExclusive(filter.to)}
                exporting={exporting}
                onExport={() => exportData({ type: "alarm-overview", from: filter.from, to: filter.to })}
              />
            </div>
          </div>
        ) : (
          <AlarmList
            alarms={alarms}
            loading={loading}
            devices={devices}
            filter={filter}
            onFilterChange={setFilter}
            onAcknowledge={acknowledge}
            exporting={exporting}
            onExport={() => exportData({ type: "alarms", from: filter.from, to: filter.to })}
          />
        )}
      </div>
    </div>
  );
}
