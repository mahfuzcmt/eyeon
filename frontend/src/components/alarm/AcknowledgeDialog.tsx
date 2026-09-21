"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n";
import { alarmTypeLabel, PROCESS_RESULTS, processResultLabel } from "@/lib/alarmTypes";
import { extractError } from "@/lib/api";
import type { AlarmAcknowledgeRequest, AlarmProcessResult, AlarmView } from "@/types/domain";

interface Props {
  alarm: AlarmView;
  deviceName: string;
  onConfirm: (body: AlarmAcknowledgeRequest) => Promise<unknown>;
  onClose: () => void;
}

/** ADL "process" step: acknowledge with a result and an optional note. */
export function AcknowledgeDialog({ alarm, deviceName, onConfirm, onClose }: Props) {
  const { t } = useLocale();
  const [result, setResult] = useState<AlarmProcessResult>("HANDLED");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onConfirm({ result, notes: notes.trim() || undefined });
      onClose();
    } catch (err) {
      setError(extractError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal max-w-md" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="min-w-0">
            <div className="t-heading truncate">{t("alarms.process")}</div>
            <div className="t-caption truncate">{alarmTypeLabel(alarm.type, t)} · {deviceName}</div>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label={t("common.close")}>×</button>
        </div>
        <div className="flex flex-col gap-3 p-4">
          <label className="text-[13px]">
            <span className="mb-1 block text-ink-500">{t("alarms.processResult")}</span>
            <select className="select" value={result} onChange={(e) => setResult(e.target.value as AlarmProcessResult)}>
              {PROCESS_RESULTS.map((r) => (
                <option key={r} value={r}>{processResultLabel(r, t)}</option>
              ))}
            </select>
          </label>
          <label className="text-[13px]">
            <span className="mb-1 block text-ink-500">{t("alarms.processNotes")}</span>
            <textarea className="input min-h-[80px]" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("alarms.processNotesPlaceholder")} />
          </label>
          {error && <div className="text-[13px] text-alarm-red">{error}</div>}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>{t("common.cancel")}</button>
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? t("common.loading") : t("common.acknowledge")}</button>
        </div>
      </form>
    </div>
  );
}
