"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api, extractError } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { formatDateTime } from "@/lib/format";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import type { DeviceView } from "@/types/domain";

/**
 * Settings of a smart watch, opened instead of the tracker's command sheet and settings panel
 * (those speak the GT06 tracker protocol, so for a watch they said "not connected" and could
 * not store an SOS number). Holds the SOS numbers: up to three, called in this order when the
 * watch's SOS button is held. The watch cannot be asked which numbers it holds, so this shows
 * what was last sent and whether the watch acknowledged it; a watch that is not connected gets
 * them when it next connects. Same endpoint and rules as the mobile app's screen.
 */

interface WatchSosView {
  online: boolean;
  numbers: string[];
  status: "PENDING" | "SYNCED" | null;
  syncedAt: string | null;
}

interface Props {
  device: DeviceView;
  onClose: () => void;
}

const SLOTS = 3;
const POLL_MS = 5000;
const MAX_POLLS = 12;
const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

/** What the server accepts: separators dropped, then digits with an optional leading +. */
function clean(n: string): string {
  return n.replace(/[\s\-().]/g, "");
}

function fill(numbers: string[]): string[] {
  return Array.from({ length: SLOTS }, (_, i) => numbers[i] ?? "");
}

export function WatchSettingsPanel({ device, onClose }: Props) {
  const { t, locale } = useLocale();
  useEscapeKey(onClose);
  const [view, setView] = useState<WatchSosView | null>(null);
  const [numbers, setNumbers] = useState<string[]>(fill([]));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const polls = useRef(0);
  const path = `/devices/${device.imei}/watch-sos`;

  const load = useCallback(async () => {
    try {
      const r = await api.get<WatchSosView>(path);
      setView(r.data);
      setNumbers(fill(r.data.numbers));
      setLoadError(null);
    } catch (e) {
      setLoadError(extractError(e).message);
    }
  }, [path]);

  useEffect(() => {
    void load();
  }, [load]);

  // While a change waits for the watch, look again every few seconds for a minute.
  useEffect(() => {
    if (view?.status !== "PENDING" || polls.current >= MAX_POLLS) return;
    const id = setTimeout(async () => {
      polls.current++;
      try {
        const r = await api.get<WatchSosView>(path);
        setView(r.data);
      } catch {
        /* keep what is shown */
      }
    }, POLL_MS);
    return () => clearTimeout(id);
  }, [view, path]);

  const wanted = numbers.map(clean).filter((n) => n.length > 0);
  const invalid = wanted.some((n) => !/^\+?\d{3,15}$/.test(n));
  const twice = new Set(wanted).size !== wanted.length;
  const unchanged = view != null && wanted.join(",") === view.numbers.join(",");

  async function save() {
    if (invalid || twice) return;
    setSaving(true);
    setSaveError(null);
    polls.current = 0;
    try {
      const r = await api.put<WatchSosView>(path, { numbers: wanted }, { timeout: 30_000 });
      setView(r.data);
      setNumbers(fill(r.data.numbers));
    } catch (e) {
      setSaveError(extractError(e).message);
    } finally {
      setSaving(false);
    }
  }

  const setAt = (i: number, value: string) => setNumbers((ns) => ns.map((n, j) => (j === i ? value : n)));
  const slotLabel = (i: number) => t("ws.number").replace("{n}", locale === "bn" ? BN_DIGITS[i + 1] : String(i + 1));
  const statusText = t(view?.status === "SYNCED" ? "wt.status.SYNCED" : view?.status === "PENDING" ? "wt.status.PENDING" : "wt.status.NONE");
  const statusStyle =
    view?.status === "SYNCED" ? "bg-emerald-50 text-emerald-800" : view?.status === "PENDING" ? "bg-amber-50 text-amber-800" : "bg-surface-100 text-ink-500";

  // Rendered on <body>, like the tracker settings panel.
  return createPortal(
    <div className="fixed inset-0 z-[5000] flex items-stretch justify-center bg-ink-950/40 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-full w-full max-w-xl flex-col overflow-hidden bg-surface-100 shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-surface-300 bg-white px-4 py-3">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold text-ink-900">{t("ws.settingsTitle")}</h2>
            <div className="truncate text-[14px] text-ink-500">{device.name || device.vehiclePlate || device.imei}</div>
          </div>
          <button type="button" onClick={onClose} className="btn-icon hover:bg-surface-100" aria-label={t("common.close")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2 border-b border-surface-200 bg-white px-4 py-2.5 text-[14px] text-ink-700">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${view?.online ? "bg-alarm-green" : "bg-ink-400"}`} />
          <span>{view ? t(view.online ? "wt.online" : "wt.offline") : loadError ? "" : t("common.loading")}</span>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {loadError && !view && (
            <div className="space-y-3">
              <div className="rounded-lg bg-red-50 px-3 py-2 text-[14px] text-red-700">{loadError}</div>
              <button type="button" className="btn-ghost px-3" onClick={() => void load()}>
                {t("common.retry")}
              </button>
            </div>
          )}

          {view && (
            <div className="rounded-xl border border-surface-300 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[16px] font-semibold text-ink-900">{t("ws.title")}</h3>
                <span className={`rounded-full px-2.5 py-1 text-[13px] font-medium ${statusStyle}`}>
                  {statusText}
                  {view.status === "SYNCED" && view.syncedAt ? ` · ${formatDateTime(view.syncedAt, locale)}` : ""}
                </span>
              </div>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-500">{t("ws.hint")}</p>

              <div className="mt-4 space-y-3">
                {numbers.map((n, i) => (
                  <div key={i}>
                    <label htmlFor={`watch-sos-${i}`} className="mb-1 block text-[14px] font-medium text-ink-700">
                      {slotLabel(i)}
                      {i === 0 ? <span className="font-normal text-ink-500"> · {t("ws.first")}</span> : null}
                    </label>
                    <div className="flex gap-2">
                      <input
                        id={`watch-sos-${i}`}
                        type="tel"
                        inputMode="tel"
                        autoComplete="off"
                        className="input flex-1 font-mono"
                        placeholder="01XXXXXXXXX"
                        value={n}
                        onChange={(e) => setAt(i, e.target.value)}
                      />
                      {n ? (
                        <button type="button" className="btn-ghost px-3" onClick={() => setAt(i, "")}>
                          {t("ws.clear")}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              {wanted.length === 0 && <p className="mt-3 text-[14px] text-ink-500">{t("ws.none")}</p>}
              {invalid && <p className="mt-3 text-[14px] text-red-700" role="alert">{t("ws.bad")}</p>}
              {!invalid && twice && <p className="mt-3 text-[14px] text-red-700" role="alert">{t("ws.twice")}</p>}
              {saveError && <p className="mt-3 text-[14px] text-red-700" role="alert">{saveError}</p>}

              <button
                type="button"
                className="btn-primary mt-4 w-full sm:w-auto sm:px-6"
                disabled={saving || invalid || twice || (unchanged && view.status === "SYNCED")}
                onClick={() => void save()}
              >
                {saving ? t("ts.saving") : t("common.save")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
