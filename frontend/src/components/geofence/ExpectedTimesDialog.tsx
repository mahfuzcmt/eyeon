"use client";

import { useCallback, useEffect, useState } from "react";
import { api, extractError } from "@/lib/api";
import { useLocale, type StringKey } from "@/lib/i18n";
import type { GeofenceView, PlaceSchedule, PlaceScheduleKind } from "@/types/domain";

/** Shown Sunday first: the school week in Bangladesh runs Sunday to Thursday. ISO numbers, 7 = Sunday. */
const WEEK: number[] = [7, 1, 2, 3, 4, 5, 6];
const SCHOOL_DAYS: number[] = [7, 1, 2, 3, 4];

interface Props {
  place: GeofenceView;
  onClose: () => void;
}

/**
 * "Should be at School by 08:15, Sunday to Thursday": the expected times of one trusted place.
 * The server alerts the place's owner when the time passes and the person is not there (or has
 * not left). Applies to everyone the place is assigned to.
 */
export function ExpectedTimesDialog({ place, onClose }: Props) {
  const { t } = useLocale();
  const [schedules, setSchedules] = useState<PlaceSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [kind, setKind] = useState<PlaceScheduleKind>("ARRIVE_BY");
  const [time, setTime] = useState("08:15");
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
      const r = await api.post<PlaceSchedule>(`/geofences/${place.id}/schedules`, { kind, time, weekdays: days });
      setSchedules((prev) => [...prev, r.data].sort((a, b) => a.time.localeCompare(b.time)));
    } catch (err) {
      setError(extractError(err).message);
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
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="input w-auto flex-1 text-[15px]"
              value={kind}
              aria-label={t("place.times")}
              onChange={(e) => setKind(e.target.value as PlaceScheduleKind)}
            >
              <option value="ARRIVE_BY">{t("place.times.ARRIVE_BY")}</option>
              <option value="LEAVE_BY">{t("place.times.LEAVE_BY")}</option>
            </select>
            <input
              type="time"
              className="input w-auto text-[15px]"
              value={time}
              aria-label={t("place.times")}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
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
            disabled={saving || !time || days.length === 0}
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
