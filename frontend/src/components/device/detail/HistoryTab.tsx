"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useActivity } from "@/hooks/useActivity";
import { useDeviceHistory } from "@/hooks/useDeviceHistory";
import { useLocale, type StringKey } from "@/lib/i18n";
import { formatDurationS, formatNumber } from "@/lib/format";
import { HistoryMap } from "./HistoryMap";
import type { DetailRange } from "./types";
import type { AlarmView } from "@/types/domain";

const SPEEDS = [1, 2, 4] as const;
/** The events that tell the story of a day: where they arrived, where they left, and anything urgent. */
const TIMELINE_TYPES = new Set(["PLACE_ARRIVED", "PLACE_LEFT", "GEOFENCE_EXIT", "GEOFENCE_ENTER", "SOS"]);

/**
 * "Where were they all day": the whole range as one route with playback, and beside it a
 * plain-language timeline (reached School, left School ...). EyeOn has no trips.
 */
export default function HistoryTab({ imei, range }: { imei: string; range: DetailRange }) {
  const { t, locale } = useLocale();
  const { activity } = useActivity({ imei, fromIso: range.from, toIso: range.to });

  const [events, setEvents] = useState<AlarmView[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);

  // Reset playback when the range changes.
  useEffect(() => {
    setSelectedId(null);
    setPlaying(false);
    setIdx(0);
  }, [range.from, range.to]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const r = await api.get<AlarmView[]>("/alarms", {
          params: { imei, from: range.from, to: range.to, limit: 500 },
        });
        if (cancelled) return;
        setEvents(
          r.data
            .filter((a) => TIMELINE_TYPES.has(a.type))
            .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()),
        );
      } catch {
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [imei, range.from, range.to]);

  const { history } = useDeviceHistory({ imei, from: range.from, to: range.to, limit: 5000 });
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

  const totalKm = activity.distanceM / 1000;
  const curTs = points[idx]?.ts;

  /** Move the playback marker to the point closest in time to a timeline event. */
  const jumpTo = (ev: AlarmView) => {
    setSelectedId(ev.id);
    setPlaying(false);
    if (points.length === 0) return;
    const target = new Date(ev.ts).getTime();
    let best = 0;
    let bestGap = Infinity;
    points.forEach((p, i) => {
      const gap = Math.abs(new Date(p.ts).getTime() - target);
      if (gap < bestGap) {
        bestGap = gap;
        best = i;
      }
    });
    setIdx(best);
  };

  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      {/* Map + playback */}
      <div className="relative min-h-[280px] flex-1">
        <HistoryMap points={points} movingIndex={idx} />
        {points.length > 0 && (
          <>
            <div className="pointer-events-none absolute left-3 top-3 z-[1000] rounded-md border border-surface-300 bg-white/95 px-3 py-1.5 shadow-menu">
              <span className="text-xl font-bold leading-none text-ink-900">{fmtTime(curTs)}</span>
            </div>
            <div className="absolute inset-x-3 bottom-3 z-[1000] flex items-center gap-2 rounded-md border border-surface-300 bg-white/95 px-3 py-2 shadow-menu">
              <button type="button" className="btn-icon" aria-label={t("hist.restart")} onClick={() => setIdx(0)}>⏮</button>
              <button type="button" className="btn-primary" aria-label={t(playing ? "hist.pause" : "hist.play")} onClick={() => setPlaying((p) => !p)}>
                {playing ? "❚❚" : "▶"}
              </button>
              <input
                type="range" min={0} max={Math.max(0, points.length - 1)} value={idx}
                onChange={(e) => { setPlaying(false); setIdx(Number(e.target.value)); }}
                className="flex-1 accent-brand-500"
              />
              <button type="button" className="btn-secondary"
                onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}>
                {speed}×
              </button>
            </div>
          </>
        )}
      </div>

      {/* Day timeline */}
      <div className="flex min-h-0 w-full flex-col border-t border-surface-300 md:w-80 md:border-l md:border-t-0">
        <div className="shrink-0 border-b border-surface-300 bg-surface-100 px-3 py-2 text-[14px]">
          <div className="font-semibold text-ink-900">{range.label}</div>
          <div className="text-ink-500">
            {formatNumber(totalKm, locale, { maximumFractionDigits: 1 })} {t("kpi.km")} · {t("hist.moving")}{" "}
            {formatDurationS(activity.movingS, locale)}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <p className="py-8 text-center text-[14px] text-ink-500">{t("common.loading")}</p>
          ) : events.length === 0 ? (
            <p className="px-4 py-8 text-center text-[14px] text-ink-500">
              {points.length === 0 ? t("hist.noData") : t("hist.noEvents")}
            </p>
          ) : (
            events.map((ev) => {
              const place = typeof ev.metadata?.geofenceName === "string" ? ev.metadata.geofenceName : null;
              const urgent = ev.type === "SOS" || ev.type === "GEOFENCE_EXIT";
              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => jumpTo(ev)}
                  className={`flex min-h-[52px] w-full items-center gap-3 border-b border-surface-100 px-3 py-2 text-left transition hover:bg-surface-50 ${
                    selectedId === ev.id ? "bg-brand-50" : ""
                  }`}
                >
                  <span className="w-[68px] shrink-0 text-[14px] font-semibold tabular-nums text-ink-900">
                    {fmtTime(ev.ts)}
                  </span>
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${urgent ? "bg-alarm-red" : "bg-brand-500"}`} />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[14px] font-semibold ${urgent ? "text-alarm-red" : "text-ink-900"}`}>
                      {t(`hist.event.${ev.type}` as StringKey)}
                    </span>
                    {place && <span className="block truncate text-[13px] text-ink-500">{place}</span>}
                  </span>
                </button>
              );
            })
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
