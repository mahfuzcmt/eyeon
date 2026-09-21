"use client";

import { useMemo, useState } from "react";
import { useLocale } from "@/lib/i18n";
import { useTrips } from "@/hooks/useTrips";
import { TripReplay } from "@/components/trip/TripReplay";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { TripView } from "@/types/domain";

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h > 0) return `${h}h ${remM}m`;
  return `${m}m`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function weekAgoIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

export default function Page() {
  const { t, locale } = useLocale();
  const [from, setFrom] = useState(weekAgoIso());
  const [to, setTo] = useState(todayIso());
  const [active, setActive] = useState<TripView | null>(null);

  const fromIso = useMemo(() => `${from}T00:00:00Z`, [from]);
  const toIso = useMemo(() => `${to}T23:59:59Z`, [to]);

  const { trips, loading, error } = useTrips({ fromIso, toIso });

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-surface-300 px-4 py-3">
        <h1 className="font-display text-lg font-semibold">{t("trips.title")}</h1>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-[13px]">
          <label className="flex items-center gap-1">
            <span className="text-ink-400">{t("common.from")}</span>
            <input
              type="date"
              className="input w-auto py-1"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              max={to}
            />
          </label>
          <label className="flex items-center gap-1">
            <span className="text-ink-400">{t("common.to")}</span>
            <input
              type="date"
              className="input w-auto py-1"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              min={from}
            />
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading && <div className="px-4 py-6 text-[14px] text-ink-400">{t("common.loading")}</div>}
        {error && <div className="px-4 py-6 text-[14px] text-alarm-red">{error}</div>}
        {!loading && trips.length === 0 && (
          <div className="px-4 py-12 text-center text-[14px] text-ink-400">{t("common.empty")}</div>
        )}

        {trips.length > 0 && (
          <table className="w-full min-w-[760px] text-[14px]">
            <thead className="sticky top-0 z-10 bg-white text-left text-[13px] uppercase text-ink-400">
              <tr>
                <th className="px-4 py-2">IMEI</th>
                <th className="px-4 py-2">{t("trips.startedAt")}</th>
                <th className="px-4 py-2">{t("trips.endedAt")}</th>
                <th className="px-4 py-2">{t("trips.distance")}</th>
                <th className="px-4 py-2">{t("trips.duration")}</th>
                <th className="px-4 py-2">{t("trips.maxSpeed")}</th>
                <th className="px-4 py-2">{t("trips.avgSpeed")}</th>
                <th className="px-4 py-2 text-right" />
              </tr>
            </thead>
            <tbody>
              {trips.map((tr) => (
                <tr key={tr.id} className="border-b border-surface-200 hover:bg-surface-50">
                  <td className="px-4 py-2 font-mono text-[13px]">{tr.deviceImei}</td>
                  <td className="px-4 py-2 text-ink-800">{formatDateTime(tr.startedAt, locale)}</td>
                  <td className="px-4 py-2 text-ink-800">
                    {tr.endedAt ? (
                      formatDateTime(tr.endedAt, locale)
                    ) : (
                      <span className="text-brand-500">{t("trips.inProgress")}</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {formatNumber(tr.distanceM / 1000, locale, { maximumFractionDigits: 2 })} km
                  </td>
                  <td className="px-4 py-2">{formatDuration(tr.durationS)}</td>
                  <td className="px-4 py-2">{tr.maxSpeed} {t("fleet.kmh")}</td>
                  <td className="px-4 py-2">
                    {formatNumber(tr.avgSpeed, locale, { maximumFractionDigits: 1 })} {t("fleet.kmh")}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      className="btn-ghost px-3 py-1 text-[13px]"
                      onClick={() => setActive(tr)}
                    >
                      {t("trips.replay")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {active && <TripReplay trip={active} onClose={() => setActive(null)} />}
    </div>
  );
}
