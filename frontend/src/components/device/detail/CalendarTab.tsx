"use client";

import { useMemo, useState } from "react";
import { useTrips } from "@/hooks/useTrips";
import { useLocale } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import {
  addDays,
  daysInMonth,
  dhakaMidnight,
  dhakaParts,
  fmtDay,
  ordinal,
  PRESETS,
  presetRange,
  rangeFromDays,
  sameDay,
  weekday,
  type DateRange,
  type DayParts,
  type PresetKey,
} from "@/lib/dateRange";
import type { DetailRange } from "./types";

const WD = ["Sa", "Su", "Mo", "Tu", "We", "Th", "Fr"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const STOP_INTERVALS = [3, 5, 10, 30] as const;

export default function CalendarTab({ imei, onApply }: { imei: string; onApply: (r: DetailRange) => void }) {
  const { locale } = useLocale();
  const today = dhakaParts();
  const [view, setView] = useState({ y: today.y, m: today.m });
  const [pending, setPending] = useState<DateRange>(() => presetRange("today"));
  const [stopMin, setStopMin] = useState<(typeof STOP_INTERVALS)[number]>(5);

  // Trips for the whole viewed month → per-day distance (km) in the cells.
  const monthRange = useMemo(() => {
    const start: DayParts = { y: view.y, m: view.m, d: 1 };
    const end: DayParts = { y: view.y, m: view.m, d: daysInMonth(view.y, view.m) };
    return rangeFromDays(start, end, "");
  }, [view]);
  const { trips } = useTrips({ imei, fromIso: monthRange.fromIso, toIso: monthRange.toIso });

  const kmByDay = useMemo(() => {
    const m = new Map<number, number>();
    for (const tr of trips) {
      const p = dhakaParts(new Date(tr.startedAt).getTime());
      if (p.y === view.y && p.m === view.m) m.set(p.d, (m.get(p.d) ?? 0) + tr.distanceM);
    }
    return m;
  }, [trips, view]);

  const cells = useMemo(() => {
    const first: DayParts = { y: view.y, m: view.m, d: 1 };
    const lead = (weekday(first) + 1) % 7;
    const count = daysInMonth(view.y, view.m);
    const out: (DayParts | null)[] = [];
    for (let i = 0; i < lead; i++) out.push(null);
    for (let d = 1; d <= count; d++) out.push({ y: view.y, m: view.m, d });
    return out;
  }, [view]);

  function shiftMonth(delta: number) {
    const t = addDays({ y: view.y, m: view.m, d: 1 }, delta > 0 ? 32 : -1);
    setView({ y: t.y, m: t.m });
  }

  const selFrom = new Date(pending.fromIso).getTime();
  const isSelected = (d: DayParts) => dhakaMidnight(d) === selFrom && !pending.label.includes("Days") && !pending.label.includes("Week");

  return (
    <div className="h-full overflow-y-auto bg-surface-50 p-3">
      <div className="mx-auto flex max-w-md flex-col gap-3">
        {/* Presets */}
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPending(presetRange(p.key as PresetKey))}
              className={pending.label === p.label ? "filter-chip-active" : "filter-chip"}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Month grid */}
        <div className="panel p-3">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" className="btn-icon" onClick={() => shiftMonth(-1)}>‹</button>
            <span className="text-[13px] font-semibold text-ink-900">{MONTHS[view.m]} {view.y}</span>
            <button type="button" className="btn-icon" onClick={() => shiftMonth(1)}>›</button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {WD.map((w) => (
              <div key={w} className="py-1 text-center text-[11px] text-ink-400">{w}</div>
            ))}
            {cells.map((c, i) => {
              if (!c) return <div key={`b${i}`} />;
              const km = kmByDay.get(c.d);
              const future = ordinal(c) > ordinal(today);
              const sel = isSelected(c);
              const isToday = sameDay(c, today);
              return (
                <button
                  key={`${c.y}-${c.m}-${c.d}`}
                  type="button"
                  disabled={future}
                  onClick={() => setPending(rangeFromDays(c, c, fmtDay(c)))}
                  className={`flex aspect-square flex-col items-center justify-center rounded-sm border text-[12px] transition ${
                    sel ? "border-brand-500 bg-brand-50" : "border-transparent hover:bg-surface-100"
                  } ${future ? "opacity-30" : ""}`}
                >
                  <span className={isToday ? "font-bold text-brand-600" : "text-ink-900"}>{c.d}</span>
                  {km != null && (
                    <span className="text-[11px] leading-none text-status-moving">
                      {formatNumber(km / 1000, locale, { maximumFractionDigits: 0 })}k
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stop interval */}
        <div className="panel p-3">
          <div className="mb-1.5 text-[11px] uppercase tracking-wide text-ink-500">Stop interval (min)</div>
          <div className="flex gap-1.5">
            {STOP_INTERVALS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setStopMin(n)}
                className={stopMin === n ? "filter-chip-active" : "filter-chip"}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="btn-primary w-full"
          onClick={() => onApply({ from: pending.fromIso, to: pending.toIso, label: pending.label, stopMinMinutes: stopMin })}
        >
          View playback history — {pending.label}
        </button>
      </div>
    </div>
  );
}
