"use client";

import { useState, useMemo } from "react";
import { useExport, ExportType } from "@/hooks/useExport";
import { useLocale } from "@/lib/i18n";
import type { DeviceView } from "@/types/domain";

interface ExportModalProps {
  onClose: () => void;
  devices?: DeviceView[];
  defaultType?: ExportType;
  defaultDevice?: string;
}

const EXPORT_TYPES: { value: ExportType; label: { en: string; bn: string }; description: { en: string; bn: string } }[] = [
  {
    value: "devices",
    label: { en: "Device List", bn: "ডিভাইস তালিকা" },
    description: { en: "Export all devices with current status", bn: "সব ডিভাইসের বর্তমান অবস্থা" },
  },
  {
    value: "trips",
    label: { en: "Trips Report", bn: "ট্রিপ রিপোর্ট" },
    description: { en: "Export completed trips within date range", bn: "নির্দিষ্ট তারিখের ট্রিপ" },
  },
  {
    value: "alarms",
    label: { en: "Alarms Report", bn: "অ্যালার্ম রিপোর্ট" },
    description: { en: "Export all alarms within date range", bn: "নির্দিষ্ট তারিখের অ্যালার্ম" },
  },
  {
    value: "monthly-summary",
    label: { en: "Monthly Summary", bn: "মাসিক সারাংশ" },
    description: { en: "Daily driving summary for a month", bn: "মাসের দৈনিক ড্রাইভিং সারাংশ" },
  },
  {
    value: "locations",
    label: { en: "Location History", bn: "লোকেশন ইতিহাস" },
    description: { en: "Export GPS points (max 7 days)", bn: "জিপিএস পয়েন্ট (সর্বোচ্চ ৭ দিন)" },
  },
];

export function ExportModal({ onClose, devices = [], defaultType, defaultDevice }: ExportModalProps) {
  const { locale: lang } = useLocale();
  const { loading, error, exportData } = useExport();

  const [exportType, setExportType] = useState<ExportType>(defaultType || "devices");
  const [selectedDevice, setSelectedDevice] = useState(defaultDevice || "");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const needsDevice = exportType === "monthly-summary" || exportType === "locations";
  const needsDateRange = exportType === "trips" || exportType === "alarms" || exportType === "locations";
  const needsMonth = exportType === "monthly-summary";

  const canExport = useMemo(() => {
    if (needsDevice && !selectedDevice) return false;
    if (needsDateRange && (!fromDate || !toDate)) return false;
    if (needsMonth && !month) return false;
    return true;
  }, [needsDevice, selectedDevice, needsDateRange, fromDate, toDate, needsMonth, month]);

  const handleExport = async () => {
    try {
      await exportData({
        type: exportType,
        from: needsDateRange ? fromDate : undefined,
        to: needsDateRange ? toDate : undefined,
        device: needsDevice ? selectedDevice : undefined,
        month: needsMonth ? month : undefined,
      });
      onClose();
    } catch {
      // Error is handled by the hook
    }
  };

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-ink-950/40 p-4">
      <div className="bg-white rounded-lg w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-surface-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink-900">
                {lang === "bn" ? "এক্সেল এক্সপোর্ট" : "Export to Excel"}
              </h2>
              <p className="text-[13px] text-ink-400">
                {lang === "bn" ? "ডেটা ডাউনলোড করুন" : "Download your data"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-900 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Export type selection */}
          <div>
            <label className="block text-[14px] text-ink-600 mb-2">
              {lang === "bn" ? "রিপোর্টের ধরন" : "Report Type"}
            </label>
            <div className="space-y-2">
              {EXPORT_TYPES.map((type) => (
                <label
                  key={type.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    exportType === type.value
                      ? "border-brand-500 bg-brand-500/10"
                      : "border-surface-300 hover:border-surface-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="exportType"
                    value={type.value}
                    checked={exportType === type.value}
                    onChange={(e) => setExportType(e.target.value as ExportType)}
                    className="mt-1"
                  />
                  <div>
                    <p className="text-[14px] font-medium text-ink-900">
                      {lang === "bn" ? type.label.bn : type.label.en}
                    </p>
                    <p className="text-[13px] text-ink-400">
                      {lang === "bn" ? type.description.bn : type.description.en}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Device selection (if needed) */}
          {needsDevice && (
            <div>
              <label className="block text-[14px] text-ink-600 mb-1">
                {lang === "bn" ? "ডিভাইস নির্বাচন করুন" : "Select Device"}
              </label>
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="w-full bg-surface-100 text-ink-900 text-[14px] px-3 py-2 rounded border border-surface-300 focus:border-brand-500 focus:outline-none"
              >
                <option value="">{lang === "bn" ? "ডিভাইস নির্বাচন করুন" : "Select a device"}</option>
                {devices.map((device) => (
                  <option key={device.imei} value={device.imei}>
                    {device.name || device.vehiclePlate || device.imei}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date range (if needed) */}
          {needsDateRange && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[14px] text-ink-600 mb-1">
                  {lang === "bn" ? "থেকে" : "From"}
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full bg-surface-100 text-ink-900 text-[14px] px-3 py-2 rounded border border-surface-300 focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[14px] text-ink-600 mb-1">
                  {lang === "bn" ? "পর্যন্ত" : "To"}
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full bg-surface-100 text-ink-900 text-[14px] px-3 py-2 rounded border border-surface-300 focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Month selection (if needed) */}
          {needsMonth && (
            <div>
              <label className="block text-[14px] text-ink-600 mb-1">
                {lang === "bn" ? "মাস নির্বাচন করুন" : "Select Month"}
              </label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full bg-surface-100 text-ink-900 text-[14px] px-3 py-2 rounded border border-surface-300 focus:border-brand-500 focus:outline-none"
              />
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-[14px] text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-surface-300 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-[14px] border border-surface-300 bg-white text-ink-700 rounded hover:bg-surface-100 transition-colors"
          >
            {lang === "bn" ? "বাতিল" : "Cancel"}
          </button>
          <button
            onClick={handleExport}
            disabled={!canExport || loading}
            className="flex-1 px-4 py-2 text-[14px] bg-brand-500 text-white rounded hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {lang === "bn" ? "এক্সপোর্ট হচ্ছে..." : "Exporting..."}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {lang === "bn" ? "এক্সপোর্ট করুন" : "Export"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
