"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { useDevices } from "@/hooks/useDevices";
import { formatDurationS, formatNumber } from "@/lib/format";
import { ExportModal } from "@/components/export";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function weekAgoIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

async function downloadCsv(path: string, fallbackName: string) {
  const r = await api.get<Blob>(path, { responseType: "blob" });
  const cd = r.headers["content-disposition"] as string | undefined;
  const match = cd?.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] ?? fallbackName;
  const url = URL.createObjectURL(r.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function Page() {
  const { t, locale } = useLocale();
  const { devices } = useDevices();
  const [from, setFrom] = useState(weekAgoIso());
  const [to, setTo] = useState(todayIso());
  const [busy, setBusy] = useState<"alarms" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);

  const onDownload = async (kind: "alarms") => {
    setBusy(kind);
    setError(null);
    try {
      await downloadCsv(`/reports/${kind}.csv?from=${from}&to=${to}`, `${kind}_${from}_${to}.csv`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "download failed");
    } finally {
      setBusy(null);
    }
  };

  const valid = from && to && from <= to;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-ink-400/15 px-4 py-3">
        <h1 className="font-display text-lg font-semibold">{t("reports.title")}</h1>
      </div>

      <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
        <div className="panel p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-[15px]">
              <span className="mb-1 block text-[14px] text-ink-400">{t("common.from")}</span>
              <input
                type="date"
                className="input"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                max={to}
              />
            </label>
            <label className="text-[15px]">
              <span className="mb-1 block text-[14px] text-ink-400">{t("common.to")}</span>
              <input
                type="date"
                className="input"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                min={from}
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="panel flex flex-col gap-3 p-4">
            <div className="font-display text-[15px] font-semibold">{t("reports.alarmsReport")}</div>
            <button
              type="button"
              className="btn-primary"
              disabled={!valid || busy !== null}
              onClick={() => onDownload("alarms")}
            >
              {busy === "alarms" ? t("common.loading") : t("common.download")}
            </button>
          </div>
        </div>

        {/* Excel Export Section */}
        <div className="panel p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-display text-[15px] font-semibold">{t("reports.excelExport")}</div>
              <p className="text-[14px] text-ink-400 mt-1">{t("reports.excelExportDesc")}</p>
            </div>
            <button
              type="button"
              className="btn-primary flex shrink-0 items-center gap-2 whitespace-nowrap"
              onClick={() => setShowExportModal(true)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t("reports.exportExcel")}
            </button>
          </div>
        </div>

        {error && <div className="text-[15px] text-alarm-red">{error}</div>}
      </div>

      {showExportModal && (
        <ExportModal
          onClose={() => setShowExportModal(false)}
          devices={devices}
        />
      )}
    </div>
  );
}
