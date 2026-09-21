"use client";

import { useState } from "react";
import { useLocale, type StringKey } from "@/lib/i18n";
import { useAlarmRules } from "@/hooks/useAlarmRules";
import { useDevices } from "@/hooks/useDevices";
import { formatNumber } from "@/lib/format";
import type {
  AlarmRuleRequest,
  AlarmRuleType,
  AlarmRuleView,
  AlarmSeverity,
} from "@/types/domain";

const RULE_TYPES: AlarmRuleType[] = [
  "SPEED_OVER",
  "VOLTAGE_UNDER",
  "ACC_ON_DURING_WINDOW",
  "PARKING_TIMEOUT",
  "OFFLINE_TIMEOUT",
  "IDLE_TIMEOUT",
];
const MINUTE_RULES: AlarmRuleType[] = ["PARKING_TIMEOUT", "OFFLINE_TIMEOUT", "IDLE_TIMEOUT"];
const SEVERITIES: AlarmSeverity[] = ["INFO", "WARNING", "CRITICAL"];

function describeRule(r: AlarmRuleView, locale: "en" | "bn", t: (k: StringKey) => string): string {
  switch (r.ruleType) {
    case "SPEED_OVER":
      return `${formatNumber(r.threshold ?? 0, locale)} ${t("rules.unit.kph")}`;
    case "VOLTAGE_UNDER":
      return `< ${formatNumber(r.threshold ?? 0, locale)} ${t("rules.unit.mv")}`;
    case "ACC_ON_DURING_WINDOW":
      return `${r.windowStart?.slice(0, 5) ?? "—"} → ${r.windowEnd?.slice(0, 5) ?? "—"}`;
    case "PARKING_TIMEOUT":
    case "OFFLINE_TIMEOUT":
    case "IDLE_TIMEOUT":
      return `> ${formatNumber(r.threshold ?? 0, locale)} ${t("rules.unit.minutes")}`;
  }
}

export default function RulesPage() {
  const { t, locale } = useLocale();
  const { rules, loading, error, create, remove, update } = useAlarmRules();
  const [editing, setEditing] = useState<AlarmRuleView | "new" | null>(null);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-surface-300 px-4 py-3">
        <h1 className="font-display text-lg font-semibold">{t("rules.title")}</h1>
        <button type="button" className="btn-primary ml-auto px-3 py-1.5 text-[13px]"
                onClick={() => setEditing("new")}>
          {t("rules.new")}
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {loading && <div className="px-4 py-6 text-[14px] text-ink-400">{t("common.loading")}</div>}
        {error && <div className="px-4 py-6 text-[14px] text-alarm-red">{error}</div>}
        {!loading && rules.length === 0 && (
          <div className="px-4 py-12 text-center text-[14px] text-ink-400">{t("rules.empty")}</div>
        )}

        {rules.length > 0 && (
          <table className="w-full min-w-[760px] text-[14px]">
            <thead className="sticky top-0 z-10 bg-white text-left text-[13px] uppercase text-ink-9000">
              <tr>
                <th className="px-4 py-2">{t("rules.name")}</th>
                <th className="px-4 py-2">{t("rules.type")}</th>
                <th className="px-4 py-2">{t("rules.threshold")}</th>
                <th className="px-4 py-2">{t("rules.appliesTo")}</th>
                <th className="px-4 py-2">{t("rules.severity")}</th>
                <th className="px-4 py-2">{t("rules.cooldown")}</th>
                <th className="px-4 py-2">{t("rules.active")}</th>
                <th className="px-4 py-2 text-right" />
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-b border-surface-300 hover:bg-surface-50">
                  <td className="px-4 py-2 font-medium">{r.name}</td>
                  <td className="px-4 py-2">{t(`rules.type.${r.ruleType}` as StringKey)}</td>
                  <td className="px-4 py-2 font-mono text-[13px]">{describeRule(r, locale, t)}</td>
                  <td className="px-4 py-2 text-[13px]">
                    {r.appliesToAll
                      ? t("rules.allDevices")
                      : `${r.assignedImeis.length} ${t("rules.specificDevices").toLowerCase()}`}
                  </td>
                  <td className="px-4 py-2 text-[13px]">{r.severity}</td>
                  <td className="px-4 py-2 text-[13px]">
                    {formatNumber(r.cooldownSeconds, locale)} {t("rules.unit.seconds")}
                  </td>
                  <td className="px-4 py-2">
                    <button type="button"
                            onClick={() => update(r.id, { active: !r.active })}
                            className={r.active
                              ? "status-pill status-pill-moving"
                              : "status-pill status-pill-offline"}>
                      {r.active ? "ON" : "OFF"}
                    </button>
                  </td>
                  <td className="space-x-1 px-4 py-2 text-right">
                    <button type="button" className="btn-ghost px-2 py-1 text-[13px]"
                            onClick={() => setEditing(r)}>
                      {t("users.edit")}
                    </button>
                    <button type="button" className="btn-ghost px-2 py-1 text-[13px] text-alarm-red"
                            onClick={() => remove(r.id)}>
                      {t("common.delete")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <RuleForm
          existing={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSubmit={async (req) => {
            if (editing === "new") {
              await create(req);
            } else {
              await update(editing.id, req);
            }
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

interface FormProps {
  existing: AlarmRuleView | null;
  onClose: () => void;
  onSubmit: (req: AlarmRuleRequest) => Promise<void>;
}

function RuleForm({ existing, onClose, onSubmit }: FormProps) {
  const { t } = useLocale();
  const { devices } = useDevices();
  const [name, setName] = useState(existing?.name ?? "");
  const [ruleType, setRuleType] = useState<AlarmRuleType>(existing?.ruleType ?? "SPEED_OVER");
  const [threshold, setThreshold] = useState<string>(existing?.threshold?.toString() ?? "60");
  const isMinuteRule = MINUTE_RULES.includes(ruleType);
  const [windowStart, setWindowStart] = useState(existing?.windowStart?.slice(0, 5) ?? "22:00");
  const [windowEnd, setWindowEnd] = useState(existing?.windowEnd?.slice(0, 5) ?? "06:00");
  const [cooldown, setCooldown] = useState<string>(existing?.cooldownSeconds?.toString() ?? "300");
  const [severity, setSeverity] = useState<AlarmSeverity>(existing?.severity ?? "WARNING");
  const [appliesToAll, setAppliesToAll] = useState(existing?.appliesToAll ?? true);
  const [assignedImeis, setAssignedImeis] = useState<string[]>(existing?.assignedImeis ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function toggleImei(imei: string) {
    setAssignedImeis((prev) =>
      prev.includes(imei) ? prev.filter((i) => i !== imei) : [...prev, imei]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    try {
      const req: AlarmRuleRequest = {
        name,
        ruleType,
        threshold: ruleType === "ACC_ON_DURING_WINDOW" ? null : Number(threshold),
        windowStart: ruleType === "ACC_ON_DURING_WINDOW" ? `${windowStart}:00` : null,
        windowEnd: ruleType === "ACC_ON_DURING_WINDOW" ? `${windowEnd}:00` : null,
        cooldownSeconds: Number(cooldown),
        severity,
        active: existing?.active ?? true,
        appliesToAll,
        assignedImeis: appliesToAll ? [] : assignedImeis,
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
          <h2 className="font-display text-base font-semibold">
            {existing ? t("users.edit") : t("rules.new")}
          </h2>
          <button type="button" onClick={onClose} className="btn-icon" aria-label={t("common.close")}>×</button>
        </div>

        <label className="block">
          <span className="mb-0.5 block text-[13px] text-ink-9000">{t("rules.name")}</span>
          <input className="input w-full py-1.5" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>

        <label className="block">
          <span className="mb-0.5 block text-[13px] text-ink-9000">{t("rules.type")}</span>
          <select className="input w-full py-1.5" value={ruleType}
                  onChange={(e) => {
                    const next = e.target.value as AlarmRuleType;
                    setRuleType(next);
                    if (!existing) {
                      setThreshold(next === "SPEED_OVER" ? "60" : next === "VOLTAGE_UNDER" ? "11500" : MINUTE_RULES.includes(next) ? "30" : threshold);
                      setCooldown(MINUTE_RULES.includes(next) ? "3600" : "300");
                    }
                  }}>
            {RULE_TYPES.map((rt) => (
              <option key={rt} value={rt}>{t(`rules.type.${rt}` as StringKey)}</option>
            ))}
          </select>
        </label>

        {ruleType === "ACC_ON_DURING_WINDOW" ? (
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-0.5 block text-[13px] text-ink-9000">{t("common.from")}</span>
              <input type="time" className="input w-full py-1.5" value={windowStart}
                     onChange={(e) => setWindowStart(e.target.value)} required />
            </label>
            <label className="block">
              <span className="mb-0.5 block text-[13px] text-ink-9000">{t("common.to")}</span>
              <input type="time" className="input w-full py-1.5" value={windowEnd}
                     onChange={(e) => setWindowEnd(e.target.value)} required />
            </label>
          </div>
        ) : (
          <label className="block">
            <span className="mb-0.5 block text-[13px] text-ink-9000">
              {t("rules.threshold")} ({ruleType === "SPEED_OVER" ? t("rules.unit.kph") : isMinuteRule ? t("rules.unit.minutes") : t("rules.unit.mv")})
            </span>
            <input type="number" className="input w-full py-1.5" value={threshold}
                   onChange={(e) => setThreshold(e.target.value)} required min={1} />
          </label>
        )}

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-0.5 block text-[13px] text-ink-9000">{t("rules.severity")}</span>
            <select className="input w-full py-1.5" value={severity}
                    onChange={(e) => setSeverity(e.target.value as AlarmSeverity)}>
              {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-0.5 block text-[13px] text-ink-9000">
              {t("rules.cooldown")} ({t("rules.unit.seconds")})
            </span>
            <input type="number" className="input w-full py-1.5" value={cooldown}
                   onChange={(e) => setCooldown(e.target.value)} required min={10} />
          </label>
        </div>

        <div>
          <span className="mb-1 block text-[13px] text-ink-9000">{t("rules.appliesTo")}</span>
          <div className="flex gap-2 text-[13px]">
            <button type="button"
                    className={appliesToAll ? "btn-primary px-3 py-1" : "btn-ghost px-3 py-1"}
                    onClick={() => setAppliesToAll(true)}>
              {t("rules.allDevices")}
            </button>
            <button type="button"
                    className={!appliesToAll ? "btn-primary px-3 py-1" : "btn-ghost px-3 py-1"}
                    onClick={() => setAppliesToAll(false)}>
              {t("rules.specificDevices")}
            </button>
          </div>
          {!appliesToAll && (
            <div className="mt-2 max-h-40 overflow-y-auto rounded border border-surface-300 p-2">
              {devices.map((d) => (
                <label key={d.imei} className="flex items-center gap-2 py-0.5 text-[13px]">
                  <input type="checkbox"
                         checked={assignedImeis.includes(d.imei)}
                         onChange={() => toggleImei(d.imei)} />
                  <span>{d.name || d.vehiclePlate || d.imei}</span>
                </label>
              ))}
            </div>
          )}
        </div>

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
