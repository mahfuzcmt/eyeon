"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { alarmTypeLabel } from "@/lib/alarmTypes";
import { formatNumber } from "@/lib/format";
import type { AlarmOverview as AlarmOverviewData } from "@/types/domain";

interface Props {
  /** ISO instants; `to` exclusive. */
  from: string;
  to: string;
  onExport: () => Promise<void>;
  exporting: boolean;
}

/** ADL "Alarm Overview": one row per vehicle, one column per alarm type, plus total. */
export function AlarmOverview({ from, to, onExport, exporting }: Props) {
  const { t, locale } = useLocale();
  const [data, setData] = useState<AlarmOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<AlarmOverviewData>("/alarms/overview", { params: { from, to } })
      .then((r) => {
        if (!cancelled) {
          setData(r.data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  const grand = data?.rows.reduce((s, r) => s + r.total, 0) ?? 0;
  const vehiclesWithAlarms = data?.rows.filter((r) => r.total > 0).length ?? 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-surface-300 bg-surface-50 px-4 py-2">
        <span className="t-caption">
          {formatNumber(grand, locale)} {t("alarms.overviewTotal")} · {formatNumber(vehiclesWithAlarms, locale)} {t("alarms.overviewVehicles")}
        </span>
        <button type="button" className="btn-secondary ml-auto" onClick={() => void onExport()} disabled={exporting}>
          {exporting ? t("common.loading") : t("alarms.exportExcel")}
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        {loading && <div className="px-3 py-4 text-[13px] text-ink-500">{t("common.loading")}</div>}
        {error && <div className="px-3 py-4 text-[13px] text-alarm-red">{error}</div>}
        {!loading && data && data.rows.length === 0 && (
          <div className="px-3 py-12 text-center text-[13px] text-ink-500">{t("common.empty")}</div>
        )}
        {!loading && data && data.rows.length > 0 && (
          <table className="data-table min-w-[640px]">
            <thead>
              <tr>
                <th>{t("alarms.vehicle")}</th>
                <th>IMEI</th>
                {data.types.map((ty) => (
                  <th key={ty} className="text-right">{alarmTypeLabel(ty, t)}</th>
                ))}
                <th className="text-right">{t("alarms.total")}</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.imei} className={r.total === 0 ? "text-ink-400" : ""}>
                  <td className="text-ink-900">{r.name || r.vehiclePlate || r.imei}</td>
                  <td className="font-mono text-[12px] text-ink-500">{r.imei}</td>
                  {data.types.map((ty) => {
                    const n = r.counts[ty] ?? 0;
                    return (
                      <td key={ty} className={`text-right tabular-nums ${n > 0 ? "font-semibold text-ink-900" : "text-ink-300"}`}>
                        {formatNumber(n, locale)}
                      </td>
                    );
                  })}
                  <td className="text-right font-semibold tabular-nums text-ink-900">{formatNumber(r.total, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
