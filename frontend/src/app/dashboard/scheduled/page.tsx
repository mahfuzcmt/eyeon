"use client";

import { useMemo, useState } from "react";
import { useLocale, type StringKey } from "@/lib/i18n";
import { useScheduledCommands } from "@/hooks/useScheduledCommands";
import { useDevices } from "@/hooks/useDevices";
import { formatDateTime } from "@/lib/format";
import type {
  ScheduleKind,
  ScheduleRequest,
  ScheduledCommandStatus,
  ScheduledCommandType,
  ScheduledCommandView,
} from "@/types/domain";

const COMMAND_TYPES: ScheduledCommandType[] = ["CUT_FUEL", "RESTORE_FUEL", "QUERY_ADDRESS", "RAW"];
const SCHEDULE_KINDS: ScheduleKind[] = ["ONE_TIME", "DAILY"];

function statusClass(s: ScheduledCommandStatus): string {
  switch (s) {
    case "PENDING": return "status-pill status-pill-moving";
    case "SUCCEEDED": return "status-pill bg-alarm-green/20 text-alarm-green";
    case "FAILED": return "status-pill status-pill-offline";
    case "CANCELLED": return "status-pill bg-ink-300 text-ink-700";
  }
}

function summarizeSchedule(item: ScheduledCommandView, locale: "en" | "bn", t: (k: StringKey) => string): string {
  if (item.scheduleKind === "ONE_TIME") {
    return `${t("sched.kind.ONE_TIME")} · ${item.runAt ? formatDateTime(item.runAt, locale) : "—"}`;
  }
  const time = item.timeOfDay?.slice(0, 5) ?? "—";
  if (item.daysOfWeek == null) {
    return `${t("sched.kind.DAILY")} · ${time} · ${t("sched.everyDay")}`;
  }
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    if ((item.daysOfWeek & (1 << i)) !== 0) {
      days.push(t(`sched.day.${i}` as StringKey));
    }
  }
  return `${t("sched.kind.DAILY")} · ${time} · ${days.join(", ")}`;
}

export default function ScheduledPage() {
  const { t, locale } = useLocale();
  const { items, loading, error, create, cancel } = useScheduledCommands();
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-surface-300 px-4 py-3">
        <h1 className="font-display text-lg font-semibold">{t("sched.title")}</h1>
        <button type="button" className="btn-primary ml-auto px-3 py-1.5 text-[13px]"
                onClick={() => setFormOpen(true)}>
          {t("sched.new")}
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {loading && <div className="px-4 py-6 text-[14px] text-ink-400">{t("common.loading")}</div>}
        {error && <div className="px-4 py-6 text-[14px] text-alarm-red">{error}</div>}
        {!loading && items.length === 0 && (
          <div className="px-4 py-12 text-center text-[14px] text-ink-400">{t("sched.empty")}</div>
        )}

        {items.length > 0 && (
          <table className="w-full min-w-[760px] text-[14px]">
            <thead className="sticky top-0 z-10 bg-white text-left text-[13px] uppercase text-ink-9000">
              <tr>
                <th className="px-4 py-2">{t("sched.device")}</th>
                <th className="px-4 py-2">{t("sched.command")}</th>
                <th className="px-4 py-2">{t("sched.when")}</th>
                <th className="px-4 py-2">{t("sched.nextRun")}</th>
                <th className="px-4 py-2">{t("sched.status")}</th>
                <th className="px-4 py-2">{t("sched.lastAttempt")}</th>
                <th className="px-4 py-2 text-right" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-surface-300 hover:bg-surface-50">
                  <td className="px-4 py-2 font-mono text-[13px]">{item.deviceImei}</td>
                  <td className="px-4 py-2">
                    <div>{t(`sched.type.${item.commandType}` as StringKey)}</div>
                    <div className="font-mono text-[11px] text-ink-9000">{item.commandText}</div>
                  </td>
                  <td className="px-4 py-2">{summarizeSchedule(item, locale, t)}</td>
                  <td className="px-4 py-2">{formatDateTime(item.nextRunAt, locale)}</td>
                  <td className="px-4 py-2">
                    <span className={statusClass(item.status)}>{item.status}</span>
                  </td>
                  <td className="px-4 py-2 text-[13px] text-ink-9000">
                    {item.lastAttemptAt ? formatDateTime(item.lastAttemptAt, locale) : "—"}
                    {item.lastError && <div className="text-alarm-red text-[11px]">{item.lastError}</div>}
                    {item.lastReply && <div className="text-ink-400 text-[11px]">{item.lastReply}</div>}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {item.status === "PENDING" && (
                      <button type="button" className="btn-ghost px-2 py-1 text-[13px]"
                              onClick={() => cancel(item.id)}>
                        {t("sched.cancel")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {formOpen && (
        <ScheduleForm
          onClose={() => setFormOpen(false)}
          onSubmit={async (req) => {
            await create(req);
            setFormOpen(false);
          }}
        />
      )}
    </div>
  );
}

interface FormProps {
  onClose: () => void;
  onSubmit: (req: ScheduleRequest) => Promise<void>;
}

function ScheduleForm({ onClose, onSubmit }: FormProps) {
  const { t } = useLocale();
  const { devices } = useDevices();
  const [imei, setImei] = useState<string>("");
  const [commandType, setCommandType] = useState<ScheduledCommandType>("QUERY_ADDRESS");
  const [scheduleKind, setScheduleKind] = useState<ScheduleKind>("ONE_TIME");
  const [devicePassword, setDevicePassword] = useState("123456");
  const [rawCommand, setRawCommand] = useState("");
  const [runAt, setRunAt] = useState(() => {
    const d = new Date(Date.now() + 5 * 60 * 1000);
    d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [timeOfDay, setTimeOfDay] = useState("08:00");
  const [days, setDays] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const daysMask = useMemo(() => {
    if (days.size === 0) return null;
    return Array.from(days).reduce((acc, d) => acc | (1 << d), 0);
  }, [days]);

  function toggleDay(d: number) {
    const next = new Set(days);
    if (next.has(d)) next.delete(d); else next.add(d);
    setDays(next);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!imei) { setErr("Pick a device"); return; }
    setSubmitting(true);
    setErr(null);
    try {
      const req: ScheduleRequest = {
        deviceImei: imei,
        commandType,
        scheduleKind,
        ...(commandType === "RAW" ? { rawCommand } : { devicePassword }),
        ...(scheduleKind === "ONE_TIME"
          ? { runAt: new Date(runAt).toISOString() }
          : { timeOfDay: `${timeOfDay}:00`, daysOfWeek: daysMask }),
      };
      await onSubmit(req);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-surface-100 p-4">
      <form onSubmit={submit} className="w-full max-w-md space-y-3 rounded-lg bg-white p-4 shadow-menu">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">{t("sched.new")}</h2>
          <button type="button" onClick={onClose} className="btn-icon" aria-label={t("common.close")}>×</button>
        </div>

        <label className="block">
          <span className="mb-0.5 block text-[13px] text-ink-9000">{t("sched.device")}</span>
          <select className="input w-full py-1.5" value={imei} onChange={(e) => setImei(e.target.value)} required>
            <option value="">—</option>
            {devices.map((d) => (
              <option key={d.imei} value={d.imei}>
                {d.name || d.vehiclePlate || d.imei}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-0.5 block text-[13px] text-ink-9000">{t("sched.command")}</span>
          <select className="input w-full py-1.5" value={commandType} onChange={(e) => setCommandType(e.target.value as ScheduledCommandType)}>
            {COMMAND_TYPES.map((c) => (
              <option key={c} value={c}>{t(`sched.type.${c}` as StringKey)}</option>
            ))}
          </select>
        </label>

        {commandType === "RAW" ? (
          <label className="block">
            <span className="mb-0.5 block text-[13px] text-ink-9000">{t("sched.rawCommand")}</span>
            <input className="input w-full py-1.5 font-mono" value={rawCommand}
                   onChange={(e) => setRawCommand(e.target.value)}
                   placeholder="e.g. WHERE,123456#" required />
          </label>
        ) : (
          <label className="block">
            <span className="mb-0.5 block text-[13px] text-ink-9000">{t("sched.devicePassword")}</span>
            <input className="input w-full py-1.5 font-mono" value={devicePassword}
                   onChange={(e) => setDevicePassword(e.target.value)} required />
          </label>
        )}

        <div className="flex gap-2 text-[13px]">
          {SCHEDULE_KINDS.map((k) => (
            <button type="button" key={k}
                    className={scheduleKind === k ? "btn-primary px-3 py-1" : "btn-ghost px-3 py-1"}
                    onClick={() => setScheduleKind(k)}>
              {t(`sched.kind.${k}` as StringKey)}
            </button>
          ))}
        </div>

        {scheduleKind === "ONE_TIME" ? (
          <label className="block">
            <span className="mb-0.5 block text-[13px] text-ink-9000">{t("sched.runAt")}</span>
            <input type="datetime-local" className="input w-full py-1.5"
                   value={runAt} onChange={(e) => setRunAt(e.target.value)} required />
          </label>
        ) : (
          <>
            <label className="block">
              <span className="mb-0.5 block text-[13px] text-ink-9000">{t("sched.timeOfDay")}</span>
              <input type="time" className="input w-full py-1.5"
                     value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)} required />
            </label>
            <div>
              <span className="mb-0.5 block text-[13px] text-ink-9000">{t("sched.daysOfWeek")}</span>
              <div className="flex flex-wrap gap-1">
                {[0, 1, 2, 3, 4, 5, 6].map((d) => {
                  const on = days.has(d);
                  return (
                    <button key={d} type="button" onClick={() => toggleDay(d)}
                            className={on ? "btn-primary px-2 py-1 text-[12px]" : "btn-ghost px-2 py-1 text-[12px]"}>
                      {t(`sched.day.${d}` as StringKey)}
                    </button>
                  );
                })}
              </div>
              <div className="mt-1 text-[11px] text-ink-9000">
                {days.size === 0 ? t("sched.everyDay") : ""}
              </div>
            </div>
          </>
        )}

        {err && <div className="text-[13px] text-alarm-red">{err}</div>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost px-3 py-1.5 text-[13px]">
            {t("common.cancel")}
          </button>
          <button type="submit" disabled={submitting} className="btn-primary px-3 py-1.5 text-[13px]">
            {submitting ? t("common.loading") : t("common.save")}
          </button>
        </div>
      </form>
    </div>
  );
}
