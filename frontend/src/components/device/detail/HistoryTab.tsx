"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTrips } from "@/hooks/useTrips";
import { useDeviceHistory } from "@/hooks/useDeviceHistory";
import { useLocale } from "@/lib/i18n";
import { formatDurationS, formatNumber, formatRelative } from "@/lib/format";
import { HistoryMap } from "./HistoryMap";
import type { DetailRange } from "./types";
import type { TripView } from "@/types/domain";

const SPEEDS = [1, 2, 4] as const;

export default function HistoryTab({ imei, range }: { imei: string; range: DetailRange }) {
  const { t, locale } = useLocale();
  const { trips, loading } = useTrips({ imei, fromIso: range.from, toIso: range.to });

  const [selected, setSelected] = useState<TripView | null>(null);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);

  // Reset selection when the range changes.
  useEffect(() => {
    setSelected(null);
    setPlaying(false);
    setIdx(0);
  }, [range.from, range.to]);

  const { history } = useDeviceHistory({
    imei: selected ? imei : null,
    from: selected?.startedAt,
    to: selected?.endedAt ?? new Date().toISOString(),
    limit: 5000,
  });
  const points = useMemo(
    () => [...history].filter((p) => p.valid).sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()),
    [history],
  );

  const stride = useMemo(() => Math.max(1, Math.floor(points.length / 200)), [points.length]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    if (!playing || points.length === 0) return;
    timer.current = setInterval(() => {
      setIdx((p) => {
        const next = p + stride;
        if (next >= points.length - 1) {
          setPlaying(false);
          return points.length - 1;
        }
        return next;
      });
    }, 500 / speed);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, speed, points.length, stride]);

  const totalKm = trips.reduce((s, tr) => s + tr.distanceM, 0) / 1000;
  const maxKph = trips.reduce((m, tr) => Math.max(m, tr.maxSpeed), 0);
  const curKph = points[idx]?.speed ?? 0;

  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      {/* Map + playback */}
      <div className="relative min-h-[280px] flex-1">
        <HistoryMap points={points} movingIndex={idx} />
        {selected && points.length > 0 && (
          <>
            <div className="pointer-events-none absolute left-3 top-3 z-[1000] rounded-md border border-surface-300 bg-white/95 px-3 py-1.5 shadow-menu">
              <span className="text-xl font-bold leading-none text-ink-900">{curKph}</span>
              <span className="ml-1 text-[11px] text-ink-500">{t("fleet.kmh")}</span>
            </div>
            <div className="absolute inset-x-3 bottom-3 z-[1000] flex items-center gap-2 rounded-md border border-surface-300 bg-white/95 px-3 py-2 shadow-menu">
              <button type="button" className="btn-icon" onClick={() => setIdx(0)}>⏮</button>
              <button type="button" className="btn-primary !h-7 !px-3" onClick={() => setPlaying((p) => !p)}>
                {playing ? "❚❚" : "▶"}
              </button>
              <input
                type="range" min={0} max={Math.max(0, points.length - 1)} value={idx}
                onChange={(e) => { setPlaying(false); setIdx(Number(e.target.value)); }}
                className="flex-1 accent-brand-500"
              />
              <button type="button" className="btn-secondary !h-7 !px-2"
                onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}>
                {speed}×
              </button>
            </div>
          </>
        )}
      </div>

      {/* Segment list */}
      <div className="flex min-h-0 w-full flex-col border-t border-surface-300 md:w-80 md:border-l md:border-t-0">
        <div className="flex shrink-0 items-center gap-3 border-b border-surface-300 bg-surface-100 px-3 py-2 text-[13px]">
          <span className="font-semibold text-ink-900">{range.label}</span>
          <span className="text-ink-500">{formatNumber(totalKm, locale, { maximumFractionDigits: 1 })} {t("kpi.km")}</span>
          <span className="text-ink-500">max {maxKph} {t("fleet.kmh")}</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <p className="py-8 text-center text-[13px] text-ink-500">{t("common.loading")}</p>
          ) : trips.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-ink-500">{t("common.empty")}</p>
          ) : (
            trips.map((tr) => (
              <button
                key={tr.id}
                type="button"
                onClick={() => { setSelected(tr); setIdx(0); setPlaying(false); }}
                className={`flex w-full items-center gap-2 border-b border-surface-100 px-3 py-2 text-left transition hover:bg-surface-50 ${
                  selected?.id === tr.id ? "bg-brand-50" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-ink-900">
                    {fmtTime(tr.startedAt)} → {fmtTime(tr.endedAt)}
                  </div>
                  <div className="text-[12px] text-ink-500">
                    {formatNumber(tr.distanceM / 1000, locale, { maximumFractionDigits: 1 })} {t("kpi.km")} ·{" "}
                    {formatDurationS(tr.durationS ?? 0, locale)} · max {tr.maxSpeed}
                  </div>
                </div>
                <span className={`text-[11px] ${tr.status === "IN_PROGRESS" ? "text-status-moving" : "text-ink-400"}`}>
                  {tr.status === "IN_PROGRESS" ? t("trips.inProgress") : formatRelative(tr.startedAt, locale)}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", hour12: true });
}
