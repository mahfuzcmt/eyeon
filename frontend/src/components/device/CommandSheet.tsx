"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n";
import { cutFuel, restoreFuel, queryAddress, rebootDevice, sendRawCommand } from "@/lib/deviceCommands";
import { extractError } from "@/lib/api";
import type { DeviceView } from "@/types/domain";

/**
 * Compact floating command panel opened from the vehicle popup / row menu.
 * Quick actions map to the GT06 commands the backend already exposes.
 */

interface Props {
  device: DeviceView;
  onClose: () => void;
}

type Quick = "cut" | "restore" | "address" | "reboot";

export function CommandSheet({ device, onClose }: Props) {
  const { t } = useLocale();
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState<Quick | "raw" | null>(null);
  const [reply, setReply] = useState<{ ok: boolean; text: string } | null>(null);

  async function run(kind: Quick | "raw") {
    if (busy) return;
    if (kind === "cut" && !window.confirm(t("panel.confirmCut"))) return;
    if (kind === "reboot" && !window.confirm(t("panel.confirmReboot"))) return;
    if (kind === "raw" && !raw.trim()) return;
    setBusy(kind);
    setReply(null);
    try {
      const res =
        kind === "cut" ? await cutFuel(device.imei)
        : kind === "restore" ? await restoreFuel(device.imei)
        : kind === "address" ? await queryAddress(device.imei)
        : kind === "reboot" ? await rebootDevice(device.imei)
        : await sendRawCommand(device.imei, raw.trim());
      setReply({
        ok: res.ok,
        text: res.ok ? res.reply ?? t("panel.commandSent") : res.error ?? t("panel.commandFailed"),
      });
    } catch (e) {
      setReply({ ok: false, text: extractError(e).message });
    } finally {
      setBusy(null);
    }
  }

  const quick: { id: Quick; label: string; tone: string }[] = [
    { id: "cut", label: t("panel.cutEngine"), tone: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100" },
    { id: "restore", label: t("panel.restoreEngine"), tone: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" },
    { id: "address", label: t("panel.queryAddress"), tone: "border-surface-300 bg-white text-ink-700 hover:bg-surface-100" },
    { id: "reboot", label: t("panel.rebootDevice"), tone: "border-surface-300 bg-white text-ink-700 hover:bg-surface-100" },
  ];

  return (
    <div className="absolute bottom-16 left-3 right-3 z-[1100] overflow-hidden rounded-xl border border-black/5 bg-white shadow-2xl sm:left-auto sm:w-[320px]">
      <div className="flex items-center justify-between border-b border-surface-200 px-3 py-2">
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-ink-700">{t("cmd.title")}</div>
          <div className="truncate text-[12px] text-ink-500">
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
        <div className="mb-1.5 text-[12px] font-medium uppercase tracking-wide text-ink-500">{t("cmd.quick")}</div>
        <div className="grid grid-cols-2 gap-2">
          {quick.map((q) => (
            <button
              key={q.id}
              type="button"
              disabled={busy !== null}
              onClick={() => void run(q.id)}
              className={`h-8 rounded-md border text-[13px] font-medium transition disabled:opacity-50 ${q.tone}`}
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
            className="h-8 min-w-0 flex-1 rounded-md border border-surface-300 px-2 font-mono text-[13px] text-ink-800 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
          />
          <button
            type="button"
            disabled={busy !== null || !raw.trim()}
            onClick={() => void run("raw")}
            className="h-8 rounded-md bg-brand-500 px-3 text-[13px] font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
          >
            {t("cmd.send")}
          </button>
        </div>

        {reply && (
          <div
            className={`mt-3 rounded-md border px-2.5 py-2 text-[13px] ${
              reply.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <div className="text-[11px] font-medium uppercase tracking-wide opacity-70">{t("cmd.reply")}</div>
            <div className="break-words font-mono">{reply.text}</div>
          </div>
        )}
      </div>
    </div>
  );
}
