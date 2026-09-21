"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { ALARM_TYPES, alarmTypeLabel } from "@/lib/alarmTypes";
import { playAlarmSound, unlockAlarmAudio } from "@/lib/alarmSound";
import { extractError } from "@/lib/api";
import { ALARM_PREVIEW_EVENT } from "@/components/alarm/AlarmToast";
import type { AlarmView } from "@/types/domain";

type Channel = "popup" | "sound" | "push";

/**
 * Per-user alarm notification matrix (alarm type × popup / sound / push),
 * the equivalent of ADL's "alarm settings". Sound only makes sense together
 * with a popup, so ticking sound implies popup and unticking popup clears sound.
 */
export function NotificationsTab() {
  const { t } = useLocale();
  const { settings, loading, error, save } = useNotificationSettings();
  const [popup, setPopup] = useState<Set<string>>(new Set());
  const [sound, setSound] = useState<Set<string>>(new Set());
  const [push, setPush] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [soundBlocked, setSoundBlocked] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setPopup(new Set(settings.popupTypes));
    setSound(new Set(settings.soundTypes));
    setPush(new Set(settings.pushTypes));
  }, [settings]);

  if (loading) return <div className="text-[14px] text-ink-400">{t("common.loading")}</div>;
  if (error) return <div className="text-[14px] text-alarm-red">{error}</div>;
  if (!settings) return null;

  const types = settings.availableTypes.length ? settings.availableTypes : ALARM_TYPES;
  const has = (ch: Channel, ty: string) => (ch === "popup" ? popup : ch === "sound" ? sound : push).has(ty);

  const toggle = (ch: Channel, ty: string, on: boolean) => {
    const upd = (s: Set<string>) => {
      const next = new Set(s);
      if (on) next.add(ty);
      else next.delete(ty);
      return next;
    };
    if (ch === "popup") {
      setPopup(upd);
      if (!on) setSound((s) => { const n = new Set(s); n.delete(ty); return n; });
    } else if (ch === "sound") {
      setSound(upd);
      if (on) setPopup((s) => new Set(s).add(ty));
    } else {
      setPush(upd);
    }
  };

  const allOn = (ch: Channel) => types.every((ty) => has(ch, ty));
  const toggleAll = (ch: Channel, on: boolean) => {
    const all = new Set(on ? types : []);
    if (ch === "popup") {
      setPopup(all);
      if (!on) setSound(new Set());
    } else if (ch === "sound") {
      setSound(all);
      if (on) setPopup(new Set(types));
    } else {
      setPush(all);
    }
  };

  const onSave = async () => {
    setBusy(true);
    setSaveError(null);
    setSaved(false);
    try {
      await save({ popupTypes: [...popup], soundTypes: [...sound], pushTypes: [...push] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(extractError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const onTestSound = () => {
    unlockAlarmAudio();
    setSoundBlocked(!playAlarmSound("CRITICAL"));
  };

  /** Shows what a popup looks like using the first type that has popup enabled (falls back to SOS). */
  const onPreview = () => {
    const type = types.find((ty) => popup.has(ty)) ?? "SOS";
    const sample: AlarmView = {
      id: `preview-${Date.now()}`,
      deviceImei: "",
      type: type as AlarmView["type"],
      severity: sound.has(type) ? "CRITICAL" : "WARNING",
      ts: new Date().toISOString(),
      latitude: null,
      longitude: null,
      acknowledged: false,
      acknowledgedBy: null,
      acknowledgedAt: null,
      processResult: null,
      processNotes: null,
      metadata: { preview: true },
    };
    unlockAlarmAudio();
    window.dispatchEvent(new CustomEvent(ALARM_PREVIEW_EVENT, { detail: sample }));
  };

  const columns: { ch: Channel; label: string; help: string }[] = [
    { ch: "popup", label: t("notif.popup"), help: t("notif.popupHelp") },
    { ch: "sound", label: t("notif.sound"), help: t("notif.soundHelp") },
    { ch: "push", label: t("notif.push"), help: t("notif.pushHelp") },
  ];

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h2 className="t-heading">{t("notif.title")}</h2>
        <p className="t-caption mt-1">{t("notif.intro")}</p>
        {!settings.customized && <p className="t-caption mt-1 text-brand-500">{t("notif.defaultsNote")}</p>}
      </div>

      <div className="overflow-x-auto rounded-lg border border-surface-300">
        <table className="data-table min-w-[520px]">
          <thead>
            <tr>
              <th>{t("alarms.type")}</th>
              {columns.map((c) => (
                <th key={c.ch} className="text-center">
                  <label className="inline-flex cursor-pointer flex-col items-center gap-1">
                    <span>{c.label}</span>
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-brand-500"
                      checked={allOn(c.ch)}
                      onChange={(e) => toggleAll(c.ch, e.target.checked)}
                      aria-label={`${c.label} — ${t("notif.all")}`}
                    />
                  </label>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {types.map((ty) => (
              <tr key={ty}>
                <td className="font-medium text-ink-900">{alarmTypeLabel(ty, t)}</td>
                {columns.map((c) => (
                  <td key={c.ch} className="text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer accent-brand-500"
                      checked={has(c.ch, ty)}
                      onChange={(e) => toggle(c.ch, ty, e.target.checked)}
                      aria-label={`${alarmTypeLabel(ty, t)} ${c.label}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="t-caption list-disc space-y-0.5 pl-5">
        {columns.map((c) => (
          <li key={c.ch}>
            <span className="font-medium text-ink-700">{c.label}:</span> {c.help}
          </li>
        ))}
      </ul>

      {saveError && <div className="text-[13px] text-alarm-red">{saveError}</div>}
      {soundBlocked && <div className="text-[13px] text-amber-700">{t("notif.soundBlocked")}</div>}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary" disabled={busy} onClick={() => void onSave()}>
          {busy ? t("common.loading") : t("common.save")}
        </button>
        <button type="button" className="btn-secondary" onClick={onTestSound}>
          {t("notif.testSound")}
        </button>
        <button type="button" className="btn-secondary" onClick={onPreview}>
          {t("notif.previewPopup")}
        </button>
        {saved && <span className="text-[13px] text-brand-500">{t("settings.org.saved")}</span>}
      </div>
    </div>
  );
}
