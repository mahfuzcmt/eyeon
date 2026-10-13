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
            <Kpi fit={!wide} label={t("kpi.online")} value={formatNumber(online, locale)} accent="text-emerald-600" />
            <Kpi fit={!wide} label={t("kpi.offline")} value={formatNumber(offline, locale)} accent="text-ink-500" />
            <Kpi
              fit={!wide}
              label={t("kpi.alertsToday")}
              value={formatNumber(kpis.alarmsToday, locale)}
              accent={kpis.alarmsCriticalToday > 0 ? "text-red-600" : "text-amber-600"}
              subValue={kpis.alarmsCriticalToday > 0
                ? `${formatNumber(kpis.alarmsCriticalToday, locale)} ${t("kpi.critical")}`
                : undefined}
            />
            {/* No trip tiles: EyeOn tracks people and has no trips (trip counts/distance would always be 0). */}
            <Kpi
              fit={!wide}
              label={t("kpi.unacknowledged")}
              value={formatNumber(kpis.alarmsUnacknowledged, locale)}
              accent={kpis.alarmsUnacknowledged > 0 ? "text-amber-600" : "text-ink-800"}
            />
          </>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand KPIs" : "Collapse KPIs"}
          className="flex min-w-[36px] shrink-0 items-center justify-center px-2 text-ink-500 transition-colors hover:bg-surface-100 hover:text-ink-700"
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
  /** Narrow screens: share the strip's width equally instead of scrolling sideways. */
  fit?: boolean;
}

function Kpi({ label, value, unit, subValue, accent = "text-ink-800", fit = false }: KpiProps) {
  return (
    <div
      className={`flex flex-col gap-0.5 border-r border-surface-200 py-1.5 last:border-r-0 ${
        fit ? "min-w-0 flex-1 px-2" : "min-w-[84px] shrink-0 px-3"
      }`}
    >
      <span className={`text-[12px] font-medium uppercase leading-4 text-ink-500 ${fit ? "line-clamp-2 break-words" : "tracking-wide"}`}>
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span className={`text-[17px] font-semibold leading-none tabular-nums ${accent}`}>{value}</span>
        {unit && <span className="text-[12px] text-ink-500">{unit}</span>}
      </div>
      {/* Narrow screens keep the strip short: the critical count moves into the accessible name only. */}
      {subValue && (fit ? <span className="sr-only">{subValue}</span> : <span className="text-[12px] text-ink-500">{subValue}</span>)}
    </div>
  );
}

export type { KpiSnapshot };
