"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n";
import { findTracker, followLive, locateNow, sendRawCommand } from "@/lib/deviceCommands";
import { extractError } from "@/lib/api";
import type { DeviceView } from "@/types/domain";

/**
 * Compact floating command panel opened from the person's popup / row menu.
 * Quick actions are the carer-facing commands of the Jimi PL601 personal tracker.
 */

interface Props {
  device: DeviceView;
  onClose: () => void;
}

// No engine cut/restore: EyeOn trackers are worn by people, not wired into a vehicle.
type Quick = "locate" | "live" | "find";

export function CommandSheet({ device, onClose }: Props) {
  const { t } = useLocale();
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState<Quick | "raw" | null>(null);
  const [reply, setReply] = useState<{ ok: boolean; text: string } | null>(null);

  async function run(kind: Quick | "raw") {
    if (busy) return;
    // The buzzer is loud and the tracker may be on a child in a classroom: ask first.
    if (kind === "find" && !window.confirm(t("cmd.confirmFind"))) return;
    if (kind === "raw" && !raw.trim()) return;
    setBusy(kind);
    setReply(null);
    try {
      const res =
        kind === "locate" ? await locateNow(device.imei)
        : kind === "live" ? await followLive(device.imei, 300)
        : kind === "find" ? await findTracker(device.imei, 20)
        : await sendRawCommand(device.imei, raw.trim());
      const done =
        kind === "locate" ? t("cmd.locateStarted")
        : kind === "live" ? t("cmd.liveStarted")
        : kind === "find" ? t("cmd.findStarted")
        : res.reply ?? t("panel.commandSent");
      setReply({ ok: res.ok, text: res.ok ? done : res.error ?? t("panel.commandFailed") });
    } catch (e) {
      setReply({ ok: false, text: extractError(e).message });
    } finally {
      setBusy(null);
    }
  }

  const quick: { id: Quick; label: string; tone: string }[] = [
    { id: "locate", label: t("cmd.locate"), tone: "border-brand-500 bg-brand-500 text-white hover:bg-brand-600" },
    { id: "live", label: t("cmd.live"), tone: "border-surface-300 bg-white text-ink-700 hover:bg-surface-100" },
    { id: "find", label: t("cmd.find"), tone: "border-surface-300 bg-white text-ink-700 hover:bg-surface-100" },
  ];

  return (
    <div className="absolute bottom-16 left-3 right-3 z-[1100] overflow-hidden rounded-xl border border-black/5 bg-white shadow-2xl sm:left-auto sm:w-[320px]">
      <div className="flex items-center justify-between border-b border-surface-200 px-3 py-2">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-ink-700">{t("cmd.title")}</div>
          <div className="truncate text-[13px] text-ink-500">
            {device.name || device.vehiclePlate || device.imei}
            {device.engineLocked ? ` · ${t("veh.locked")}` : ""}
          </div>
        </div>
        <button type="button" onClick={onClose} className="btn-icon hover:bg-surface-100" aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-3">
        <div className="mb-1.5 text-[13px] font-medium uppercase tracking-wide text-ink-500">{t("cmd.quick")}</div>
        <div className="grid grid-cols-1 gap-2">
          {quick.map((q) => (
            <button
              key={q.id}
              type="button"
              disabled={busy !== null}
              onClick={() => void run(q.id)}
              className={`h-10 rounded-md border px-3 text-left text-[14px] font-medium transition disabled:opacity-50 ${q.tone}`}
            >
              {busy === q.id ? t("cmd.sending") : q.label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-1.5">
          <input
            type="text"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void run("raw"); }}
            placeholder={t("cmd.customHint")}
            className="h-8 min-w-0 flex-1 rounded-md border border-surface-300 px-2 font-mono text-[14px] text-ink-800 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
          />
          <button
            type="button"
            disabled={busy !== null || !raw.trim()}
            onClick={() => void run("raw")}
            className="h-8 rounded-md bg-brand-500 px-3 text-[14px] font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
          >
            {t("cmd.send")}
          </button>
        </div>

        {reply && (
          <div
            className={`mt-3 rounded-md border px-2.5 py-2 text-[14px] ${
              reply.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <div className="text-[12px] font-medium uppercase tracking-wide opacity-70">{t("cmd.reply")}</div>
            <div className="break-words">{reply.text}</div>
          </div>
        )}
      </div>
    </div>
  );
}
