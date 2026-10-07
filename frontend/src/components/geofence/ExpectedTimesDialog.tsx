"use client";

import { useCallback, useEffect, useState } from "react";
import { api, extractError } from "@/lib/api";
import { useLocale, type StringKey } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import type { GeofenceView, PlaceSchedule, PlaceScheduleKind } from "@/types/domain";

/** Shown Sunday first: the school week in Bangladesh runs Sunday to Thursday. ISO numbers, 7 = Sunday. */
const WEEK: number[] = [7, 1, 2, 3, 4, 5, 6];
const SCHOOL_DAYS: number[] = [7, 1, 2, 3, 4];
const GRACE_CHOICES: number[] = [0, 5, 10, 15, 20, 30, 45, 60];

interface Props {
  place: GeofenceView;
  onClose: () => void;
}

/**
 * "Reaches School at 08:00, leaves at 12:00, 10 minutes grace, Sunday to Thursday": the expected
 * times of one trusted place. Once the grace is over the server tells the place's owner either
 * way - on time, or not there yet - and again if the person arrives late. Applies to everyone
 * the place is assigned to. An arrival and a leaving time are stored as two schedules.
 */
export function ExpectedTimesDialog({ place, onClose }: Props) {
  const { t, locale } = useLocale();
  const [schedules, setSchedules] = useState<PlaceSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [arriveOn, setArriveOn] = useState(true);
  const [arrive, setArrive] = useState("08:00");
  const [leaveOn, setLeaveOn] = useState(true);
  const [leave, setLeave] = useState("12:00");
  const [grace, setGrace] = useState(10);
  const [days, setDays] = useState<number[]>(SCHOOL_DAYS);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get<PlaceSchedule[]>(`/geofences/${place.id}/schedules`);
      setSchedules(r.data);
      setError(null);
    } catch (err) {
      setError(extractError(err).message);
    } finally {
      setLoading(false);
    }
  }, [place.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleDay = (d: number) => setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const add = async () => {
    setSaving(true);
    setError(null);
    try {
      const wanted: [PlaceScheduleKind, string][] = [];
      if (arriveOn && arrive) wanted.push(["ARRIVE_BY", arrive]);
      if (leaveOn && leave) wanted.push(["LEAVE_BY", leave]);
      const added: PlaceSchedule[] = [];
      for (const [kind, time] of wanted) {
        const r = await api.post<PlaceSchedule>(`/geofences/${place.id}/schedules`, {
          kind,
          time,
          weekdays: days,
          graceMinutes: grace,
        });
        added.push(r.data);
      }
      setSchedules((prev) => [...prev, ...added].sort((a, b) => a.time.localeCompare(b.time)));
    } catch (err) {
      setError(extractError(err).message);
      void refresh();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setError(null);
    try {
      await api.delete(`/geofences/${place.id}/schedules/${id}`);
      setSchedules((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(extractError(err).message);
    }
  };

  const dayNames = (list: number[]) =>
    WEEK.filter((d) => list.includes(d))
      .map((d) => t(`day.${d}` as StringKey))
      .join(" · ");

  const graceLabel = (n: number) => t("place.timesGraceShort").replace("{n}", formatNumber(n, locale));
  const nothingPicked = !(arriveOn && arrive) && !(leaveOn && leave);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 p-4" role="dialog" aria-modal="true">
      <div className="max-h-full w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="font-display text-lg font-semibold text-ink-900">{t("place.times")}</h2>
        <p className="mb-1 text-[15px] font-semibold text-brand-500">{place.name}</p>
        <p className="mb-4 text-[14px] text-ink-500">{t("place.timesHint")}</p>

        {loading ? (
          <div className="py-4 text-[15px] text-ink-500">{t("common.loading")}</div>
        ) : schedules.length === 0 ? (
          <div className="mb-4 rounded-lg bg-surface-100 px-3 py-3 text-[15px] text-ink-500">{t("place.timesNone")}</div>
        ) : (
          <ul className="mb-4 divide-y divide-surface-200 rounded-lg ring-1 ring-surface-300">
            {schedules.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold text-ink-900">
                    {t(`place.times.${s.kind}` as StringKey)} <span className="font-mono">{s.time}</span>
                    {s.graceMinutes > 0 && (
                      <span className="ml-1.5 text-[14px] font-normal text-ink-500">{graceLabel(s.graceMinutes)}</span>
                    )}
                  </div>
                  <div className="text-[14px] text-ink-500">{dayNames(s.weekdays)}</div>
                </div>
                <button type="button" className="btn-ghost text-alarm-red" onClick={() => remove(s.id)}>
                  {t("common.delete")}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="rounded-lg bg-surface-50 p-3 ring-1 ring-surface-300">
          {(
            [
              ["arrive", t("place.timesArrive"), arriveOn, setArriveOn, arrive, setArrive],
              ["leave", t("place.timesLeave"), leaveOn, setLeaveOn, leave, setLeave],
            ] as const
          ).map(([id, label, on, setOn, value, setValue]) => (
            <label key={id} className="mb-2 flex items-center gap-3">
              <input
                type="checkbox"
                className="h-5 w-5 accent-brand-500"
                checked={on}
                onChange={(e) => setOn(e.target.checked)}
              />
              <span className="flex-1 text-[15px] font-semibold text-ink-900">{label}</span>
              <input
                type="time"
                className="input w-32 text-[15px]"
                value={value}
                disabled={!on}
                aria-label={label}
                onChange={(e) => setValue(e.target.value)}
              />
            </label>
          ))}
          <label className="flex items-center gap-3">
            <span className="flex-1 text-[15px] font-semibold text-ink-900">{t("place.timesGrace")}</span>
            <select
              className="input w-32 text-[15px]"
              value={grace}
              aria-label={t("place.timesGrace")}
              onChange={(e) => setGrace(Number(e.target.value))}
            >
              {GRACE_CHOICES.map((n) => (
                <option key={n} value={n}>
                  {formatNumber(n, locale)} {t("place.timesGraceUnit")}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-3 text-[14px] text-ink-500">{t("place.timesDays")}</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {WEEK.map((d) => {
              const on = days.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleDay(d)}
                  className={`min-w-[44px] rounded-full px-3 py-1.5 text-[14px] font-semibold ${on ? "bg-brand-500 text-white" : "bg-white text-ink-700 ring-1 ring-surface-300"}`}
                >
                  {t(`day.${d}` as StringKey)}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="btn-primary mt-3 w-full"
            disabled={saving || nothingPicked || days.length === 0}
            onClick={add}
          >
            {saving ? t("common.loading") : t("place.timesAdd")}
          </button>
        </div>

        {error && <div className="mt-3 text-[14px] text-alarm-red">{error}</div>}

        <div className="mt-4 flex justify-end">
          <button type="button" className="btn-ghost px-4" onClick={onClose}>
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
