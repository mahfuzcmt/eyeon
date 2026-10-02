"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, extractError } from "@/lib/api";
import { useLocale, type StringKey } from "@/lib/i18n";
import { formatDateTime } from "@/lib/format";
import type {
  DeviceView,
  TrackerSettingItem,
  TrackerSettingKey,
  TrackerSettingsData,
  TrackerSettingStatus,
  TrackerSettingValue,
} from "@/types/domain";

/**
 * The tracker's own settings (Jimi PL601): SOS numbers, calls, how often it reports, night rest,
 * its alarms and power behaviour. Each card is saved on its own; the server writes the value to
 * the tracker and reads it back, so "On the tracker" means the tracker itself confirmed it. A
 * tracker that is not connected gets the change when it next connects ("Waiting for the tracker").
 */

interface Props {
  device: DeviceView;
  onClose: () => void;
}

const POLL_MS = 2500;
const MAX_POLLS = 16;

/** Shown until the tracker has been read; the factory values of the PL601. */
const DEFAULTS: Record<TrackerSettingKey, TrackerSettingValue> = {
  SOS_NUMBERS: { numbers: [] },
  SOS_ALARM: { enabled: true, method: 0 },
  CALL_PERMISSION: { who: 2 },
  ANSWER_MODE: { auto: false },
  CALL_VOLUME: { level: 5 },
  RING_VOLUME: { level: 4 },
  REPORTING: { mode: 4, steps: 100, idleWait: 300, accel: 10, riding: 300 },
  HEARTBEAT: { minutes: 7 },
  NIGHT_REST: { enabled: false, from: "00:00", to: "07:00" },
  QUIET_HOURS: { enabled: false, from: "08:00", to: "13:00" },
  LOW_BATTERY_ALARM: { enabled: true, method: 0 },
  FALL_ALARM: { enabled: false, method: 0, immobileSeconds: 30, muteMinutes: 3 },
  POWER_OFF_LOCK: { enabled: false },
  AUTO_POWER_ON: { enabled: true },
};

const REPORTING_DEFAULTS: Record<number, TrackerSettingValue> = {
  1: { mode: 1, interval: 300 },
  2: { mode: 2, moving: 10, still: 300 },
  4: { mode: 4, steps: 100, idleWait: 300, accel: 10, riding: 300 },
};

const STATUS_STYLE: Record<TrackerSettingStatus, string> = {
  UNKNOWN: "bg-surface-100 text-ink-500",
  SYNCED: "bg-emerald-50 text-emerald-800",
  PENDING: "bg-amber-50 text-amber-800",
  FAILED: "bg-red-50 text-red-700",
  UNSUPPORTED: "bg-surface-100 text-ink-500",
};

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function str(v: unknown, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}

/** Preset choices plus the tracker's current value when it is not one of them. */
function withCurrent(options: number[], current: number): number[] {
  return options.includes(current) ? options : [...options, current].sort((a, b) => a - b);
}

export function TrackerSettingsPanel({ device, onClose }: Props) {
  const { t, locale } = useLocale();
  const [data, setData] = useState<TrackerSettingsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Partial<Record<TrackerSettingKey, TrackerSettingValue>>>({});
  const [saving, setSaving] = useState<TrackerSettingKey | null>(null);
  const [cardError, setCardError] = useState<Partial<Record<TrackerSettingKey, string>>>({});
  const polls = useRef(0);

  const load = useCallback(async () => {
    try {
      const r = await api.get<TrackerSettingsData>(`/devices/${device.imei}/settings`);
      setData(r.data);
      setError(null);
      return r.data;
    } catch (err) {
      setError(extractError(err).message);
      return null;
    }
  }, [device.imei]);

  // First open: show what is stored, and ask a connected tracker we know nothing about.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const first = await load();
      if (cancelled || !first) return;
      const neverRead = first.settings.every((s) => s.status === "UNKNOWN");
      if (first.online && neverRead && !first.reading) {
        try {
          await api.post(`/devices/${device.imei}/settings/read`);
        } catch {
          // The tracker went away in between; the panel still shows the defaults.
        }
        if (!cancelled) void load();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load, device.imei]);

  // While the tracker is being read, or a change is on its way to a connected tracker, keep looking.
  const busy = data != null && (data.reading || (data.online && data.settings.some((s) => s.status === "PENDING")));
  useEffect(() => {
    if (!busy) {
      polls.current = 0;
      return;
    }
    if (polls.current >= MAX_POLLS) return;
    const id = window.setTimeout(() => {
      polls.current += 1;
      void load();
    }, POLL_MS);
    return () => window.clearTimeout(id);
  }, [busy, data, load]);

  const items = useMemo(() => {
    const m = new Map<TrackerSettingKey, TrackerSettingItem>();
    for (const s of data?.settings ?? []) m.set(s.key, s);
    return m;
  }, [data]);

  /** What the card shows: the unsaved edit, else what was asked for, else what the tracker has. */
  const value = (key: TrackerSettingKey): TrackerSettingValue => {
    const item = items.get(key);
    const stored = item && (item.status === "PENDING" || item.status === "FAILED") ? item.wanted : null;
    return drafts[key] ?? stored ?? item?.applied ?? DEFAULTS[key];
  };

  const edit = (key: TrackerSettingKey, patch: TrackerSettingValue) =>
    setDrafts((prev) => ({ ...prev, [key]: { ...value(key), ...patch } }));

  const replace = (key: TrackerSettingKey, next: TrackerSettingValue) => setDrafts((prev) => ({ ...prev, [key]: next }));

  const save = async (key: TrackerSettingKey) => {
    const draft = drafts[key];
    if (!draft) return;
    setSaving(key);
    setCardError((prev) => ({ ...prev, [key]: undefined }));
    try {
      const r = await api.put<TrackerSettingItem>(`/devices/${device.imei}/settings/${key}`, draft, { timeout: 30_000 });
      setData((prev) => (prev ? { ...prev, settings: prev.settings.map((s) => (s.key === key ? r.data : s)) } : prev));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      polls.current = 0;
    } catch (err) {
      setCardError((prev) => ({ ...prev, [key]: extractError(err).message }));
    } finally {
      setSaving(null);
    }
  };

  const readNow = async () => {
    try {
      await api.post(`/devices/${device.imei}/settings/read`);
      polls.current = 0;
      await load();
    } catch (err) {
      setError(extractError(err).message);
    }
  };

  const seconds = (s: number): string => {
    if (s < 60) return `${s} ${t("ts.unit.s")}`;
    if (s < 3600) return `${Math.round(s / 60)} ${t("ts.unit.min")}`;
    return `${Math.round(s / 360) / 10} ${t("ts.unit.h")}`;
  };

  const methodSelect = (key: TrackerSettingKey, disabled: boolean) => (
    <Field label={t("ts.method")}>
      <select
        className="input w-full text-[15px]"
        disabled={disabled}
        value={num(value(key).method, 0)}
        onChange={(e) => edit(key, { method: Number(e.target.value) })}
      >
        {[0, 1, 2, 3].map((m) => (
          <option key={m} value={m}>
            {t(`ts.method.${m}` as StringKey)}
          </option>
        ))}
      </select>
    </Field>
  );

  const needsNumbers = (key: TrackerSettingKey): boolean => {
    const numbers = value("SOS_NUMBERS").numbers;
    const filled = Array.isArray(numbers) ? numbers.filter((n) => String(n).trim() !== "").length : 0;
    return value(key).enabled === true && num(value(key).method, 0) > 0 && filled === 0;
  };

  const card = (key: TrackerSettingKey, title: string, children: ReactNode, hint?: string) => {
    const item = items.get(key);
    const status: TrackerSettingStatus = item?.status ?? "UNKNOWN";
    return (
      <div key={key} className="rounded-xl bg-white p-4 ring-1 ring-surface-300" data-setting={key}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="text-[15px] font-semibold text-ink-900">{title}</div>
          <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${STATUS_STYLE[status]}`} data-status={status}>
            {t(`ts.status.${status}` as StringKey)}
          </span>
        </div>
        {hint && <p className="mt-0.5 text-[14px] text-ink-500">{hint}</p>}
        <fieldset className="mt-3 space-y-3" disabled={status === "UNSUPPORTED"}>
          {children}
        </fieldset>
        {status === "FAILED" && item?.trackerReply && (
          <p className="mt-2 break-words font-mono text-[12px] text-red-700">{item.trackerReply}</p>
        )}
        {cardError[key] && <p className="mt-2 text-[14px] text-alarm-red">{cardError[key]}</p>}
        {drafts[key] && (
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              className="btn-ghost px-3"
              onClick={() =>
                setDrafts((prev) => {
                  const next = { ...prev };
                  delete next[key];
                  return next;
                })
              }
            >
              {t("common.cancel")}
            </button>
            <button type="button" className="btn-primary px-4" disabled={saving !== null} onClick={() => void save(key)}>
              {saving === key ? t("ts.saving") : t("ts.save")}
            </button>
          </div>
        )}
      </div>
    );
  };

  const toggle = (key: TrackerSettingKey, field: string, label: string) => (
    <label className="flex cursor-pointer items-center gap-3">
      <input
        type="checkbox"
        className="h-5 w-5 rounded border-surface-300 text-brand-500 focus:ring-brand-500"
        checked={value(key)[field] === true}
        onChange={(e) => edit(key, { [field]: e.target.checked })}
      />
      <span className="text-[15px] text-ink-800">{label}</span>
    </label>
  );

  const timeRange = (key: TrackerSettingKey, fallbackFrom: string, fallbackTo: string) => (
    <div className="flex flex-wrap items-end gap-3">
      <Field label={t("ts.from")}>
        <input
          type="time"
          className="input w-auto text-[15px]"
          value={str(value(key).from, fallbackFrom)}
          onChange={(e) => e.target.value && edit(key, { from: e.target.value })}
        />
      </Field>
      <Field label={t("ts.to")}>
        <input
          type="time"
          className="input w-auto text-[15px]"
          value={str(value(key).to, fallbackTo)}
          onChange={(e) => e.target.value && edit(key, { to: e.target.value })}
        />
      </Field>
    </div>
  );

  const levelSelect = (key: TrackerSettingKey, fallback: number) => (
    <select
      className="input w-24 text-[15px]"
      value={num(value(key).level, fallback)}
      onChange={(e) => edit(key, { level: Number(e.target.value) })}
    >
      {[1, 2, 3, 4, 5, 6, 7].map((l) => (
        <option key={l} value={l}>
          {l}
        </option>
      ))}
    </select>
  );

  const secondsSelect = (key: TrackerSettingKey, field: string, options: number[], fallback: number, zeroLabel?: string) => {
    const current = num(value(key)[field], fallback);
    return (
      <select className="input w-auto text-[15px]" value={current} onChange={(e) => edit(key, { [field]: Number(e.target.value) })}>
        {withCurrent(options, current).map((s) => (
          <option key={s} value={s}>
            {s === 0 && zeroLabel ? zeroLabel : seconds(s)}
          </option>
        ))}
      </select>
    );
  };

  const sosNumbers = (() => {
    const raw = value("SOS_NUMBERS").numbers;
    const list = Array.isArray(raw) ? raw.map((n) => String(n)) : [];
    return [0, 1, 2, 3].map((i) => list[i] ?? "");
  })();

  const reporting = value("REPORTING");
  const mode = num(reporting.mode, 4);
  const lastRead = data?.settings.reduce<string | null>((latest, s) => (s.syncedAt && (!latest || s.syncedAt > latest) ? s.syncedAt : latest), null);

  return (
    <div className="fixed inset-0 z-[1200] flex items-stretch justify-center bg-ink-950/40 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden bg-surface-100 shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-surface-300 bg-white px-4 py-3">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold text-ink-900">{t("ts.title")}</h2>
            <div className="truncate text-[14px] text-ink-500">{device.name || device.vehiclePlate || device.imei}</div>
          </div>
          <button type="button" onClick={onClose} className="btn-icon hover:bg-surface-100" aria-label={t("common.close")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-200 bg-white px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2 text-[14px] text-ink-700">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${data?.online ? "bg-alarm-green" : "bg-ink-400"}`} />
            <span>{data ? (data.online ? t("ts.online") : t("ts.offline")) : t("common.loading")}</span>
          </div>
          <div className="flex items-center gap-3">
            {lastRead && <span className="text-[13px] text-ink-500">{formatDateTime(lastRead, locale)}</span>}
            <button type="button" className="btn-ghost px-3" disabled={!data?.online || data.reading} onClick={() => void readNow()}>
              {data?.reading ? t("ts.reading") : t("ts.read")}
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-[14px] text-red-700">{error}</div>}

          <Section title={t("ts.sec.emergency")}>
            {card(
              "SOS_NUMBERS",
              t("ts.SOS_NUMBERS"),
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {sosNumbers.map((n, i) => (
                  <input
                    key={i}
                    type="tel"
                    inputMode="tel"
                    className="input w-full font-mono text-[15px]"
                    placeholder={`${t("ts.SOS_NUMBERS.placeholder")} ${i + 1}`}
                    value={n}
                    onChange={(e) => {
                      const next = [...sosNumbers];
                      next[i] = e.target.value;
                      // Empty slots are dropped by the server.
                      replace("SOS_NUMBERS", { numbers: next });
                    }}
                  />
                ))}
              </div>,
              t("ts.SOS_NUMBERS.hint"),
            )}
            {card(
              "SOS_ALARM",
              t("ts.SOS_ALARM"),
              <>
                {toggle("SOS_ALARM", "enabled", t("ts.on"))}
                {methodSelect("SOS_ALARM", value("SOS_ALARM").enabled !== true)}
                {needsNumbers("SOS_ALARM") && <Warning>{t("ts.methodNeedsNumbers")}</Warning>}
              </>,
              t("ts.SOS_ALARM.hint"),
            )}
          </Section>

          <Section title={t("ts.sec.calls")}>
            {card(
              "CALL_PERMISSION",
              t("ts.CALL_PERMISSION"),
              <select
                className="input w-full text-[15px]"
                value={num(value("CALL_PERMISSION").who, 2)}
                onChange={(e) => edit("CALL_PERMISSION", { who: Number(e.target.value) })}
              >
                {[0, 2, 3].map((w) => (
                  <option key={w} value={w}>
                    {t(`ts.who.${w}` as StringKey)}
                  </option>
                ))}
              </select>,
            )}
            {card("ANSWER_MODE", t("ts.ANSWER_MODE"), toggle("ANSWER_MODE", "auto", t("ts.on")), t("ts.ANSWER_MODE.hint"))}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {card("CALL_VOLUME", t("ts.CALL_VOLUME"), levelSelect("CALL_VOLUME", 5))}
              {card("RING_VOLUME", t("ts.RING_VOLUME"), levelSelect("RING_VOLUME", 4))}
            </div>
          </Section>

          <Section title={t("ts.sec.location")}>
            {card(
              "REPORTING",
              t("ts.REPORTING"),
              <>
                <select
                  className="input w-full text-[15px]"
                  value={mode}
                  onChange={(e) => replace("REPORTING", REPORTING_DEFAULTS[Number(e.target.value)])}
                >
                  {[2, 4, 1].map((m) => (
                    <option key={m} value={m}>
                      {t(`ts.mode.${m}` as StringKey)}
                    </option>
                  ))}
                </select>
                {mode === 2 && (
                  <div className="flex flex-wrap gap-3">
                    <Field label={t("ts.moving")}>{secondsSelect("REPORTING", "moving", [10, 30, 60, 120, 300], 10)}</Field>
                    <Field label={t("ts.still")}>
                      {secondsSelect("REPORTING", "still", [0, 300, 600, 1800, 3600], 300, t("ts.stillNever"))}
                    </Field>
                  </div>
                )}
                {mode === 4 && (
                  <div className="flex flex-wrap gap-3">
                    <Field label={t("ts.steps")}>
                      <select
                        className="input w-auto text-[15px]"
                        value={num(reporting.steps, 100)}
                        onChange={(e) => edit("REPORTING", { steps: Number(e.target.value) })}
                      >
                        {withCurrent([50, 100, 200, 500], num(reporting.steps, 100)).map((s) => (
                          <option key={s} value={s}>
                            {s} {t("ts.stepsUnit")}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label={t("ts.riding")}>{secondsSelect("REPORTING", "riding", [60, 120, 300, 600], 300)}</Field>
                  </div>
                )}
                {mode === 1 && (
                  <Field label={t("ts.interval")}>{secondsSelect("REPORTING", "interval", [60, 300, 600, 1800, 3600], 300)}</Field>
                )}
              </>,
              t("ts.REPORTING.hint"),
            )}
            {card(
              "HEARTBEAT",
              t("ts.HEARTBEAT"),
              <select
                className="input w-auto text-[15px]"
                value={num(value("HEARTBEAT").minutes, 7)}
                onChange={(e) => edit("HEARTBEAT", { minutes: Number(e.target.value) })}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((m) => (
                  <option key={m} value={m}>
                    {m} {t("ts.unit.min")}
                  </option>
                ))}
              </select>,
              t("ts.HEARTBEAT.hint"),
            )}
          </Section>

          <Section title={t("ts.sec.rest")}>
            {card(
              "NIGHT_REST",
              t("ts.NIGHT_REST"),
              <>
                {toggle("NIGHT_REST", "enabled", t("ts.on"))}
                {timeRange("NIGHT_REST", "00:00", "07:00")}
                {value("NIGHT_REST").enabled === true && <Warning>{t("ts.NIGHT_REST.warning")}</Warning>}
              </>,
              t("ts.NIGHT_REST.hint"),
            )}
            {card(
              "QUIET_HOURS",
              t("ts.QUIET_HOURS"),
              <>
                {toggle("QUIET_HOURS", "enabled", t("ts.on"))}
                {timeRange("QUIET_HOURS", "08:00", "13:00")}
              </>,
              t("ts.QUIET_HOURS.hint"),
            )}
          </Section>

          <Section title={t("ts.sec.alarms")}>
            {card(
              "LOW_BATTERY_ALARM",
              t("ts.LOW_BATTERY_ALARM"),
              <>
                {toggle("LOW_BATTERY_ALARM", "enabled", t("ts.on"))}
                {methodSelect("LOW_BATTERY_ALARM", value("LOW_BATTERY_ALARM").enabled !== true)}
                {needsNumbers("LOW_BATTERY_ALARM") && <Warning>{t("ts.methodNeedsNumbers")}</Warning>}
              </>,
            )}
            {card(
              "FALL_ALARM",
              t("ts.FALL_ALARM"),
              <>
                {toggle("FALL_ALARM", "enabled", t("ts.on"))}
                {methodSelect("FALL_ALARM", value("FALL_ALARM").enabled !== true)}
                <Field label={t("ts.immobile")}>{secondsSelect("FALL_ALARM", "immobileSeconds", [30, 60, 120, 300], 30)}</Field>
                {needsNumbers("FALL_ALARM") && <Warning>{t("ts.methodNeedsNumbers")}</Warning>}
              </>,
              t("ts.FALL_ALARM.hint"),
            )}
          </Section>

          <Section title={t("ts.sec.power")}>
            {card("POWER_OFF_LOCK", t("ts.POWER_OFF_LOCK"), toggle("POWER_OFF_LOCK", "enabled", t("ts.on")), t("ts.POWER_OFF_LOCK.hint"))}
            {card("AUTO_POWER_ON", t("ts.AUTO_POWER_ON"), toggle("AUTO_POWER_ON", "enabled", t("ts.on")))}
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-ink-500">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[14px] text-ink-500">{label}</span>
      {children}
    </label>
  );
}

function Warning({ children }: { children: ReactNode }) {
  return <p className="rounded-lg bg-amber-50 px-3 py-2 text-[14px] font-medium text-amber-900">{children}</p>;
}
