"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useLocale, type Locale, type StringKey } from "@/lib/i18n";
import { useDevices } from "@/hooks/useDevices";
import { addDays, dhakaMidnight, dhakaParts, type DayParts } from "@/lib/dateRange";
import { formatNumber, vehicleState, VEHICLE_STATE_COLOR } from "@/lib/format";
import { buildPersonAvatar, personPhotoUrl } from "@/lib/personIcons";
import type { DeviceView, StayView, StaysResult } from "@/types/domain";

const TIMEZONE = "Asia/Dhaka";
/** "All people" asks the server once per person, so it is only offered for a family-sized list. */
const MAX_ALL = 12;
const NAME_RETRY_MS = 4000;
const NAME_RETRIES = 6;

type Preset = "today" | "yesterday" | "last7" | "day";
type ViewMode = "timeline" | "places";

interface Range {
  from: string;
  /** Omitted when the period runs up to now. */
  to?: string;
}

function rangeFor(preset: Preset, day: string): Range {
  const today = dhakaParts();
  const iso = (p: DayParts) => new Date(dhakaMidnight(p)).toISOString();
  if (preset === "today") return { from: iso(today) };
  if (preset === "yesterday") return { from: iso(addDays(today, -1)), to: iso(today) };
  if (preset === "last7") return { from: iso(addDays(today, -6)) };
  const [y, m, d] = day.split("-").map(Number);
  const picked: DayParts = { y, m: m - 1, d };
  return { from: iso(picked), to: iso(addDays(picked, 1)) };
}

function todayInput(): string {
  const p = dhakaParts();
  return `${p.y}-${String(p.m + 1).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

function tag(locale: Locale): string {
  return locale === "bn" ? "bn-BD" : "en-US";
}

function formatTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(tag(locale), { timeZone: TIMEZONE, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

function dayKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date(iso));
}

function formatDay(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(tag(locale), { timeZone: TIMEZONE, weekday: "long", day: "numeric", month: "short" }).format(new Date(iso));
}

function formatShortDay(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(tag(locale), { timeZone: TIMEZONE, weekday: "short", day: "numeric", month: "short" }).format(new Date(iso));
}

/** "5 min", "1 h 12 min", "2 d 3 h" - whole minutes; a stay is never shorter than five. */
function formatLength(seconds: number, locale: Locale, t: (k: StringKey) => string): string {
  const mins = Math.max(1, Math.round(seconds / 60));
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  const n = (v: number) => formatNumber(v, locale);
  const parts: string[] = [];
  if (d > 0) parts.push(`${n(d)} ${t("stays.unit.d")}`);
  if (h > 0) parts.push(`${n(h)} ${t("stays.unit.h")}`);
  if (m > 0 && d === 0) parts.push(`${n(m)} ${t("stays.unit.min")}`);
  return parts.join(" ");
}

function placeLabel(s: StayView): string {
  return s.name ?? `${s.latitude.toFixed(4)}, ${s.longitude.toFixed(4)}`;
}

/** Stays at the same trusted place, or with the same area name, are one place in the "By place" view. */
function placeKey(s: StayView): string {
  return s.placeId ?? s.name ?? `${s.latitude.toFixed(3)},${s.longitude.toFixed(3)}`;
}

function mapUrl(s: StayView): string {
  return `https://www.openstreetmap.org/?mlat=${s.latitude}&mlon=${s.longitude}#map=17/${s.latitude}/${s.longitude}`;
}

function PlaceDot({ trusted }: { trusted: boolean }) {
  return (
    <span
      aria-hidden
      className={`mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${trusted ? "bg-brand-50 text-brand-500" : "bg-surface-100 text-ink-500"}`}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {trusted ? (
          <path d="M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10" />
        ) : (
          <>
            <path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10Z" />
            <circle cx="12" cy="11" r="2" />
          </>
        )}
      </svg>
    </span>
  );
}

export default function Page() {
  const { t, locale } = useLocale();
  const { devices, loading: devicesLoading } = useDevices();
  const [selected, setSelected] = useState<string | null>(null);
  const [preset, setPreset] = useState<Preset>("today");
  const [day, setDay] = useState<string>(todayInput);
  const [view, setView] = useState<ViewMode>("timeline");
  const [results, setResults] = useState<Record<string, StayView[]>>({});
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const canShowAll = devices.length > 1 && devices.length <= MAX_ALL;
  // Until the user picks: everyone for a family-sized list, otherwise the first person.
  const selection = selected ?? (canShowAll ? "all" : devices[0]?.imei ?? null);
  const shown: DeviceView[] = useMemo(
    () => (selection === "all" ? devices : devices.filter((d) => d.imei === selection)),
    [devices, selection],
  );
  const imeis = useMemo(() => shown.map((d) => d.imei).join(","), [shown]);

  const load = useCallback(
    async (quiet: boolean, attempt: number) => {
      const list = imeis ? imeis.split(",") : [];
      const request = ++requestRef.current;
      if (list.length === 0) {
        setResults({});
        return;
      }
      if (!quiet) setLoading(true);
      setError(null);
      try {
        const range = rangeFor(preset, day);
        const next: Record<string, StayView[]> = {};
        let stillPending = false;
        for (const imei of list) {
          const r = await api.get<StaysResult>(`/devices/${imei}/stays`, { params: { ...range, lang: locale } });
          next[imei] = r.data.stays;
          stillPending = stillPending || r.data.namesPending;
        }
        if (request !== requestRef.current) return;
        setResults(next);
        setPending(stillPending && attempt < NAME_RETRIES);
        if (stillPending && attempt < NAME_RETRIES) {
          // Area names are looked up in the background, about one a second.
          window.setTimeout(() => {
            if (request === requestRef.current) void load(true, attempt + 1);
          }, NAME_RETRY_MS);
        }
      } catch (err) {
        if (request !== requestRef.current) return;
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (request === requestRef.current && !quiet) setLoading(false);
      }
    },
    [imeis, preset, day, locale],
  );

  useEffect(() => {
    void load(false, 0);
    const ref = requestRef;
    return () => {
      ref.current++;
    };
  }, [load]);

  const presets: { id: Preset; label: string }[] = [
    { id: "today", label: t("stays.today") },
    { id: "yesterday", label: t("stays.yesterday") },
    { id: "last7", label: t("stays.last7") },
  ];

  const timeRange = (s: StayView, withDay: boolean) => {
    const start = s.openStart ? `${t("stays.before")} ${formatTime(s.from, locale)}` : formatTime(s.from, locale);
    const endDay = dayKey(s.to) !== dayKey(s.from) ? `${formatShortDay(s.to, locale)}, ` : "";
    const end = s.ongoing ? t("stays.now") : `${endDay}${formatTime(s.to, locale)}`;
    return `${withDay ? `${formatShortDay(s.from, locale)}, ` : ""}${start} – ${end}`;
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-surface-300 px-4 py-3">
        <h1 className="font-display text-lg font-semibold">{t("stays.title")}</h1>
        <p className="text-[14px] text-ink-500">{t("stays.hint")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-surface-200 bg-surface-50 px-4 py-2.5">
        <select
          className="input w-auto min-w-[160px] text-[15px]"
          aria-label={t("geo.people")}
          value={selection ?? ""}
          onChange={(e) => setSelected(e.target.value)}
        >
          {canShowAll && <option value="all">{t("stays.allPeople")}</option>}
          {devices.map((d) => (
            <option key={d.imei} value={d.imei}>
              {d.name || d.vehiclePlate || d.imei}
            </option>
          ))}
        </select>

        <div className="flex flex-wrap items-center gap-1.5">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={preset === p.id}
              onClick={() => setPreset(p.id)}
              className={`rounded-full px-3.5 py-1.5 text-[14px] font-semibold ${preset === p.id ? "bg-brand-500 text-white" : "bg-white text-ink-700 ring-1 ring-surface-300 hover:bg-surface-100"}`}
            >
              {p.label}
            </button>
          ))}
          <input
            type="date"
            className={`input w-auto text-[14px] ${preset === "day" ? "ring-2 ring-brand-500" : ""}`}
            aria-label={t("stays.pickDay")}
            value={day}
            max={todayInput()}
            onChange={(e) => {
              if (!e.target.value) return;
              setDay(e.target.value);
              setPreset("day");
            }}
          />
        </div>

        <div className="ml-auto inline-flex rounded-full bg-white p-0.5 ring-1 ring-surface-300" role="tablist">
          {(["timeline", "places"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`rounded-full px-3.5 py-1.5 text-[14px] font-semibold ${view === v ? "bg-brand-500 text-white" : "text-ink-700 hover:bg-surface-100"}`}
            >
              {v === "timeline" ? t("stays.viewTimeline") : t("stays.viewPlaces")}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-surface-100 p-4">
        {(loading || devicesLoading) && <div className="py-6 text-[15px] text-ink-500">{t("common.loading")}</div>}
        {error && <div className="py-6 text-[15px] text-alarm-red">{error}</div>}
        {!devicesLoading && devices.length === 0 && <div className="py-12 text-center text-[15px] text-ink-500">{t("common.empty")}</div>}
        {pending && !loading && <div className="mb-3 text-[14px] text-ink-500">{t("stays.lookingUp")}</div>}

        {!loading && !error && (
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            {shown.map((d) => {
              const stays = results[d.imei] ?? [];
              const total = stays.reduce((sum, s) => sum + s.seconds, 0);
              const places = new Set(stays.map(placeKey)).size;
              return (
                <section key={d.imei} className="overflow-hidden rounded-xl bg-white ring-1 ring-surface-300">
                  <header className="flex items-center gap-3 border-b border-surface-200 px-4 py-3">
                    <span
                      className="shrink-0"
                      dangerouslySetInnerHTML={{
                        __html: buildPersonAvatar(d.vehicleType, VEHICLE_STATE_COLOR[vehicleState(d)], 40, personPhotoUrl(d)),
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-display text-[17px] font-semibold text-ink-900">{d.name || d.vehiclePlate || d.imei}</div>
                      {stays.length > 0 && (
                        <div className="text-[14px] text-ink-500">
                          {formatNumber(places, locale)} {t(places === 1 ? "stays.place" : "stays.places")} · {formatLength(total, locale, t)} {t("stays.total")}
                        </div>
                      )}
                    </div>
                  </header>

                  {stays.length === 0 && <div className="px-4 py-6 text-[15px] text-ink-500">{t("stays.none")}</div>}

                  {stays.length > 0 && view === "timeline" && <Timeline stays={stays} locale={locale} t={t} timeRange={timeRange} />}
                  {stays.length > 0 && view === "places" && <ByPlace stays={stays} locale={locale} t={t} timeRange={timeRange} />}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

interface ListProps {
  stays: StayView[];
  locale: Locale;
  t: (k: StringKey) => string;
  timeRange: (s: StayView, withDay: boolean) => string;
}

function MapLink({ stay, t }: { stay: StayView; t: (k: StringKey) => string }) {
  return (
    <a
      href={mapUrl(stay)}
      target="_blank"
      rel="noreferrer"
      className="shrink-0 rounded-full px-2.5 py-1 text-[13px] font-semibold text-brand-500 hover:bg-brand-50"
    >
      {t("stays.map")}
    </a>
  );
}

/** Newest day first; within a day in the order it happened. */
function Timeline({ stays, locale, t, timeRange }: ListProps) {
  const days = useMemo(() => {
    const map = new Map<string, StayView[]>();
    for (const s of stays) {
      const k = dayKey(s.from);
      const list = map.get(k);
      if (list) list.push(s);
      else map.set(k, [s]);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [stays]);

  return (
    <div>
      {days.map(([k, list]) => (
        <div key={k}>
          {days.length > 1 && (
            <div className="bg-surface-50 px-4 py-1.5 text-[13px] font-semibold uppercase tracking-wide text-ink-500">
              {formatDay(list[0].from, locale)}
            </div>
          )}
          <ul className="divide-y divide-surface-200">
            {list.map((s) => (
              <li key={s.from} className="flex items-start gap-3 px-4 py-2.5">
                <PlaceDot trusted={s.placeId != null} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-semibold text-ink-900">{placeLabel(s)}</div>
                  <div className="text-[14px] text-ink-500">{timeRange(s, false)}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[15px] font-semibold text-ink-900">{formatLength(s.seconds, locale, t)}</div>
                  {s.ongoing && <div className="text-[13px] font-semibold text-alarm-green">{t("stays.stillHere")}</div>}
                </div>
                <MapLink stay={s} t={t} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** One block per place, the place with the most time first. */
function ByPlace({ stays, locale, t, timeRange }: ListProps) {
  const groups = useMemo(() => {
    const map = new Map<string, StayView[]>();
    for (const s of stays) {
      const k = placeKey(s);
      const list = map.get(k);
      if (list) list.push(s);
      else map.set(k, [s]);
    }
    return Array.from(map.values())
      .map((list) => ({ list, total: list.reduce((sum, s) => sum + s.seconds, 0) }))
      .sort((a, b) => b.total - a.total);
  }, [stays]);

  return (
    <ul className="divide-y divide-surface-200">
      {groups.map(({ list, total }) => (
        <li key={placeKey(list[0])} className="px-4 py-3">
          <div className="flex items-start gap-3">
            <PlaceDot trusted={list[0].placeId != null} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold text-ink-900">{placeLabel(list[0])}</div>
              <div className="text-[14px] text-ink-500">
                {formatNumber(list.length, locale)} {t(list.length === 1 ? "stays.visit" : "stays.visits")}
              </div>
            </div>
            <div className="shrink-0 text-[15px] font-semibold text-ink-900">{formatLength(total, locale, t)}</div>
            <MapLink stay={list[0]} t={t} />
          </div>
          <ul className="ml-10 mt-1.5 space-y-0.5">
            {list.map((s) => (
              <li key={s.from} className="flex justify-between gap-3 text-[14px] text-ink-700">
                <span>{timeRange(s, true)}</span>
                <span className="shrink-0 text-ink-500">{formatLength(s.seconds, locale, t)}</span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
