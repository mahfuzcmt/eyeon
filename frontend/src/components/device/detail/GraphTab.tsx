"use client";

import { useMemo, useState } from "react";
import { useLocale } from "@/lib/i18n";
import { useLocationHistory } from "@/hooks/useLocationHistory";
import { TimeSeriesChart, chartColors } from "@/components/charts/TimeSeriesChart";

const DHAKA_OFFSET = "+06:00";

function dhakaTodayIso(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
}

/** Speed + voltage over one Dhaka-local day (AutoNemo "graph view" parity). */
export default function GraphTab({ imei }: { imei: string }) {
  const { t } = useLocale();
  const [day, setDay] = useState(dhakaTodayIso());

  const range = useMemo(() => {
    const from = new Date(`${day}T00:00:00${DHAKA_OFFSET}`);
    const to = new Date(from.getTime() + 24 * 3600 * 1000);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [day]);

  const { locations, loading } = useLocationHistory(imei, range.from, range.to);

  const speedPoints = useMemo(
    () => locations.map((l) => ({ t: Date.parse(l.ts), v: l.speed })),
    [locations],
  );
  const voltagePoints = useMemo(
    () =>
      locations
        .filter((l) => l.voltageMv != null)
        .map((l) => ({ t: Date.parse(l.ts), v: (l.voltageMv as number) / 1000 })),
    [locations],
  );

  return (
    <div className="h-full overflow-y-auto bg-surface-50 p-3">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <div className="panel flex items-center gap-3 p-3">
          <label className="text-[13px] text-ink-500">{t("reports.date")}</label>
          <input
            type="date"
            className="input"
            value={day}
            max={dhakaTodayIso()}
            onChange={(e) => setDay(e.target.value)}
          />
          {loading && <span className="text-[11px] text-ink-400">{t("common.loading")}</span>}
        </div>

        <div className="panel p-3">
          <TimeSeriesChart
            points={speedPoints}
            color={chartColors.speed}
            title={t("fleet.speed")}
            unit={t("fleet.kmh")}
            height={200}
            yFromZero
            emptyText={t("graph.noData")}
            formatValue={(v) => String(Math.round(v))}
          />
        </div>

        <div className="panel p-3">
          <TimeSeriesChart
            points={voltagePoints}
            color={chartColors.voltage}
            title={t("fleet.voltage")}
            unit="V"
            height={200}
            emptyText={t("graph.noData")}
            formatValue={(v) => v.toFixed(1)}
          />
        </div>
      </div>
    </div>
  );
}
