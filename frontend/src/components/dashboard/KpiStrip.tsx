"use client";

import { useState } from "react";
import { useDashboardKpis } from "@/hooks/useDashboardKpis";
import { useIsWide } from "@/hooks/useMediaQuery";
import { useLocale } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import type { KpiSnapshot } from "@/types/domain";

/**
 * Floating KPI strip over the live map. Polls every 30s and live-overrides the
 * online/offline counters from the WS-driven device list so the counts move the
 * moment a device goes online. Sits above Leaflet's panes (z ≥ 1000) and is
 * centred in the map area that remains to the right of the vehicle panel.
 * Below `lg` that area is too narrow, so the strip spans it edge to edge and
 * scrolls sideways; the page pushes the map controls down to make room.
 */
interface Props {
  liveOnlineCount?: number;
  liveOfflineCount?: number;
  /** Width (px) covered by the floating vehicle panel on the left. */
  leftInset?: number;
}

export function KpiStrip({ liveOnlineCount, liveOfflineCount, leftInset = 0 }: Props) {
  const { kpis, error } = useDashboardKpis();
  const { t, locale } = useLocale();
  const wide = useIsWide();
  const [collapsed, setCollapsed] = useState(false);

  if (error || !kpis) return null;

  const online = liveOnlineCount ?? kpis.devicesOnline;
  const offline = liveOfflineCount ?? kpis.devicesOffline;
  const distanceKm = kpis.distanceTodayMeters / 1000;

  return (
    <div
      className={`pointer-events-none absolute top-3 z-[1000] transition-[left] duration-300 ${wide ? "-translate-x-1/2" : ""}`}
      style={wide
        ? { left: `calc(${leftInset}px + (100% - ${leftInset}px) / 2)` }
        : { left: leftInset + 12, right: 12 }}
    >
      {/* Narrow screens: the strip spans the map width and scrolls sideways instead of overflowing. */}
      <div className="pointer-events-auto flex max-w-full items-stretch overflow-x-auto rounded-xl border border-black/5 bg-white/95 shadow-lg backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {!collapsed && (
          <>
            <Kpi label={t("kpi.online")} value={formatNumber(online, locale)} accent="text-emerald-600" />
            <Kpi label={t("kpi.offline")} value={formatNumber(offline, locale)} accent="text-ink-500" />
            <Kpi
              label={t("kpi.alertsToday")}
              value={formatNumber(kpis.alarmsToday, locale)}
              accent={kpis.alarmsCriticalToday > 0 ? "text-red-600" : "text-amber-600"}
              subValue={kpis.alarmsCriticalToday > 0
                ? `${formatNumber(kpis.alarmsCriticalToday, locale)} ${t("kpi.critical")}`
                : undefined}
            />
            <Kpi
              label={t("kpi.tripsActive")}
              value={formatNumber(kpis.tripsActive, locale)}
              accent="text-ink-800"
              subValue={`${formatNumber(kpis.tripsCompletedToday, locale)} ${t("kpi.done")}`}
            />
            <Kpi
              label={t("kpi.distanceToday")}
              value={formatNumber(distanceKm, locale, { maximumFractionDigits: distanceKm >= 100 ? 0 : 1 })}
              unit={t("kpi.km")}
              accent="text-ink-800"
            />
          </>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand KPIs" : "Collapse KPIs"}
          className="flex shrink-0 items-center px-2 text-ink-400 transition-colors hover:bg-surface-100 hover:text-ink-700"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {collapsed ? <path d="M9 5l7 7-7 7" /> : <path d="M15 19l-7-7 7-7" />}
          </svg>
        </button>
      </div>
    </div>
  );
}

interface KpiProps {
  label: string;
  value: string;
  unit?: string;
  subValue?: string;
  accent?: string;
}

function Kpi({ label, value, unit, subValue, accent = "text-ink-800" }: KpiProps) {
  return (
    <div className="flex min-w-[72px] shrink-0 flex-col gap-0.5 border-r border-surface-200 px-2.5 py-1.5 last:border-r-0 sm:min-w-[84px] sm:px-3">
      <span className="text-[11px] font-medium uppercase tracking-wide text-ink-500">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className={`text-[16px] font-semibold leading-none tabular-nums ${accent}`}>{value}</span>
        {unit && <span className="text-[11px] text-ink-500">{unit}</span>}
      </div>
      {subValue && <span className="text-[11px] text-ink-500">{subValue}</span>}
    </div>
  );
}

export type { KpiSnapshot };
