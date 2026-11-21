"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { api, extractError } from "@/lib/api";
import { useLocale, type StringKey } from "@/lib/i18n";
import { formatClockTime, formatNumber } from "@/lib/format";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { ClockIcon, ClockTimePicker } from "@/components/time/ClockTimePicker";
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
  // State updates are not immediate: a second press of Add in the same moment must not post again.
  const adding = useRef(false);
  useEscapeKey(onClose, !saving);

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

  /** Same kind, time and days as a schedule already listed: it would only alert twice. */
  const isListed = (kind: PlaceScheduleKind, time: string) =>
    schedules.some(
      (s) =>
        s.kind === kind &&
        s.time.slice(0, 5) === time.slice(0, 5) &&
        s.weekdays.length === days.length &&
        days.every((d) => s.weekdays.includes(d)),
    );

  const add = async () => {
    if (adding.current) return;
    const picked: [PlaceScheduleKind, string][] = [];
    if (arriveOn && arrive) picked.push(["ARRIVE_BY", arrive]);
    if (leaveOn && leave) picked.push(["LEAVE_BY", leave]);
    const wanted = picked.filter(([kind, time]) => !isListed(kind, time));
    if (wanted.length === 0) {
      setError(t("place.timesDuplicate"));
      return;
    }
    adding.current = true;
    setSaving(true);
    setError(null);
    try {
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
      const duplicate =
        (axios.isAxiosError(err) && err.response?.status === 409) || extractError(err).code === "DUPLICATE_SCHEDULE";
      // Reload first (it clears the message), then say what happened.
      await refresh();
      setError(duplicate ? t("place.timesDuplicate") : extractError(err).message);
    } finally {
      adding.current = false;
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm(t("place.timesDeleteConfirm"))) return;
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
    <div className="fixed inset-0 z-[2400] flex items-end justify-center bg-ink-950/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-h-full sm:rounded-2xl sm:p-6">
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
                    <span className="mr-1.5 inline-block align-middle">
                      <ClockIcon h={Number(s.time.slice(0, 2))} m={Number(s.time.slice(3, 5))} size={22} />
                    </span>
                    {t(`place.times.${s.kind}` as StringKey)} <span>{formatClockTime(s.time, locale)}</span>
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
            <div key={id} className="mb-2 flex items-center gap-3">
              <label className="flex flex-1 items-center gap-3">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-brand-500"
                  checked={on}
                  onChange={(e) => setOn(e.target.checked)}
                />
                <span className="flex-1 text-[15px] font-semibold text-ink-900">{label}</span>
              </label>
              <ClockTimePicker value={value} onChange={setValue} locale={locale === "bn" ? "bn" : "en"} label={label} disabled={!on} />
            </div>
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
