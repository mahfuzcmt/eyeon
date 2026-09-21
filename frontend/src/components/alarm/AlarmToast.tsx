"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import { useLocale } from "@/lib/i18n";
import { useSession } from "@/lib/session-context";
import { useAlarms } from "@/hooks/useAlarms";
import { useDevices } from "@/hooks/useDevices";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { alarmTypeLabel, severityLabel } from "@/lib/alarmTypes";
import { playAlarmSound, unlockAlarmAudio } from "@/lib/alarmSound";
import { formatDateTime } from "@/lib/format";
import type { AlarmSeverity, AlarmView } from "@/types/domain";

const SEV_ACCENT: Record<AlarmSeverity, string> = {
  CRITICAL: "border-l-alarm-red",
  WARNING: "border-l-alarm-amber",
  INFO: "border-l-brand-500",
};
const SEV_LABEL: Record<AlarmSeverity, string> = {
  CRITICAL: "text-alarm-red",
  WARNING: "text-alarm-amber",
  INFO: "text-brand-500",
};
/** How long a toast stays before auto-dismiss (ms). CRITICAL sticks until handled. */
const AUTO_DISMISS: Record<AlarmSeverity, number | null> = { CRITICAL: null, WARNING: 20_000, INFO: 8_000 };
/** CRITICAL alarms re-sound this often while a toast is still up. */
const CRITICAL_REPEAT_MS = 15_000;
const MAX_VISIBLE = 3;
/** Settings → Notifications "Preview popup" dispatches this with a sample AlarmView. */
export const ALARM_PREVIEW_EVENT = "motolink:alarmPreview";

interface Toast {
  alarm: AlarmView;
  shownAt: number;
}

/**
 * ADL-style alarm popups: every alarm that arrives live and is enabled under
 * Settings → Notifications pops up top-right (top on phones), optionally with
 * a sound. Mounted once in the dashboard shell so it works on every page.
 */
export function AlarmToast() {
  const { t, locale } = useLocale();
  const { orgId } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { settings } = useNotificationSettings();
  const { devices, loading: devicesLoading } = useDevices();
  // Restrict live alarms to the devices this user may see; unrestricted until the list loads.
  const allowedImeis = useMemo(
    () => (devicesLoading ? null : new Set(devices.map((d) => d.imei))),
    [devices, devicesLoading],
  );
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const deviceName = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of devices) m.set(d.imei, d.name || d.vehiclePlate || d.imei);
    return m;
  }, [devices]);

  // Browsers block audio until the user interacts with the page once.
  useEffect(() => {
    const unlock = () => unlockAlarmAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const onNew = useCallback((a: AlarmView) => {
    const s = settingsRef.current;
    // Settings not loaded yet → fall back to "pop up everything but ignition".
    const popup = s ? s.popupTypes.includes(a.type) : a.type !== "ACC_ON" && a.type !== "ACC_OFF";
    if (!popup) return;
    setToasts((prev) => [{ alarm: a, shownAt: Date.now() }, ...prev.filter((x) => x.alarm.id !== a.id)].slice(0, MAX_VISIBLE));
    if (s?.soundTypes.includes(a.type)) playAlarmSound(a.severity);
  }, []);

  const { alarms, acknowledge } = useAlarms(orgId, { unackedOnly: true, limit: 100, onNew, allowedImeis });
  const unread = alarms.filter((a) => !a.acknowledged).length;
  const isDesktop = useIsDesktop();

  // ADL-style strip beside the bell: hidden by the user until the count changes again.
  const [stripHiddenAt, setStripHiddenAt] = useState<number | null>(null);
  useEffect(() => {
    setStripHiddenAt(null);
  }, [unread]);
  const showStrip = unread > 0 && stripHiddenAt == null && pathname !== "/dashboard/alarms";

  // Preview from the settings page: same path as a live alarm, but never persisted.
  useEffect(() => {
    const onPreview = (e: Event) => onNew((e as CustomEvent<AlarmView>).detail);
    window.addEventListener(ALARM_PREVIEW_EVENT, onPreview);
    return () => window.removeEventListener(ALARM_PREVIEW_EVENT, onPreview);
  }, [onNew]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.alarm.id !== id));
  }, []);

  // Auto-dismiss timers.
  useEffect(() => {
    if (toasts.length === 0) return;
    const handle = setInterval(() => {
      const now = Date.now();
      setToasts((prev) =>
        prev.filter((x) => {
          const ttl = AUTO_DISMISS[x.alarm.severity];
          return ttl == null || now - x.shownAt < ttl;
        }),
      );
    }, 1000);
    return () => clearInterval(handle);
  }, [toasts.length]);

  // Keep sounding CRITICAL alarms until someone deals with them.
  const hasCritical = toasts.some(
    (x) => x.alarm.severity === "CRITICAL" && settings?.soundTypes.includes(x.alarm.type),
  );
  useEffect(() => {
    if (!hasCritical) return;
    const handle = setInterval(() => playAlarmSound("CRITICAL"), CRITICAL_REPEAT_MS);
    return () => clearInterval(handle);
  }, [hasCritical]);

  const onAck = async (id: string) => {
    if (id.startsWith("preview-")) {
      dismiss(id);
      return;
    }
    setBusy((b) => new Set(b).add(id));
    try {
      await acknowledge(id);
      dismiss(id);
    } catch {
      // keep the toast so the user can retry
    } finally {
      setBusy((b) => {
        const next = new Set(b);
        next.delete(id);
        return next;
      });
    }
  };

  const onViewOnMap = (a: AlarmView) => {
    dismiss(a.id);
    if (pathname === "/dashboard") {
      window.dispatchEvent(new CustomEvent("focusVehicle", { detail: a.deviceImei }));
    } else {
      router.push(`/dashboard?focus=${encodeURIComponent(a.deviceImei)}`);
    }
  };

  // Monitor's bottom-right holds the refresh button (desktop) or the vehicle sheet bar (phones).
  // Phones also have the freshness row and the loading/error pill stacked above the sheet bar.
  const bellBottom = isDesktop ? 76 : 172;

  return (
    <>
      {/* ADL-style unread bell, bottom-right on every dashboard page */}
      <div className="fixed right-3 z-[2250] flex items-center gap-2" style={{ bottom: bellBottom }}>
        {showStrip && (
          <div className="flex max-w-[calc(100vw-88px)] items-center overflow-hidden rounded-md bg-brand-500 text-white shadow-lg">
            <Link
              href="/dashboard/alarms?unacked=1"
              className="flex min-w-0 items-center gap-1 px-3 py-2 text-[13px] leading-tight hover:bg-brand-600"
            >
              <span className="truncate">
                {t("notif.unreadPrefix")} <span className="mx-0.5 text-[16px] font-bold">{unread}</span> {t("notif.unreadSuffix")}
              </span>
              <span className="ml-1 hidden shrink-0 sm:inline">{t("notif.clickDetails")}</span>
            </Link>
            <button
              type="button"
              className="flex h-full shrink-0 items-center px-2 text-white/70 hover:bg-brand-600 hover:text-white"
              aria-label={t("common.close")}
              onClick={() => setStripHiddenAt(Date.now())}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        )}
        <Link
          href="/dashboard/alarms?unacked=1"
          className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F5A623] text-white shadow-lg transition hover:bg-[#e0951b] ${
            unread > 0 ? "animate-[pp-bell-ring_1.4s_ease-in-out_2]" : ""
          }`}
          title={t("alarms.notifications")}
          aria-label={`${t("alarms.notifications")}: ${unread}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 22a2.2 2.2 0 0 0 2.2-2.2H9.8A2.2 2.2 0 0 0 12 22Zm6.5-6.5V11a6.5 6.5 0 0 0-5-6.32V4a1.5 1.5 0 0 0-3 0v.68A6.5 6.5 0 0 0 5.5 11v4.5L3.6 17.4c-.6.6-.2 1.6.7 1.6h15.4c.9 0 1.3-1 .7-1.6l-1.9-1.9Z" />
          </svg>
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-white bg-alarm-red px-1 text-[11px] font-bold">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Link>
      </div>

      {toasts.length > 0 && (
    <div
      className="pointer-events-none fixed inset-x-3 top-16 z-[2300] flex flex-col gap-2 sm:left-auto sm:right-3 sm:w-[360px]"
      role="status"
      aria-live="polite"
    >
      {toasts.map(({ alarm: a }) => (
        <div
          key={a.id}
          className={`pointer-events-auto rounded-lg border border-surface-300 border-l-4 bg-white p-3 shadow-xl ${SEV_ACCENT[a.severity]} ${
            a.severity === "CRITICAL" ? "animate-[pp-blink_1.2s_step-start_2]" : ""
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{t("alarms.popupTitle")}</div>
              <div className="mt-0.5 truncate text-[15px] font-semibold text-ink-900">
                <span className={SEV_LABEL[a.severity]}>{severityLabel(a.severity, t)}</span>
                <span className="mx-1.5 text-ink-300">·</span>
                {alarmTypeLabel(a.type, t)}
              </div>
              <div className="mt-0.5 truncate text-[13px] text-ink-700">
                <span className="font-medium">{deviceName.get(a.deviceImei) ?? (a.deviceImei || t("notif.previewPopup"))}</span>
                <span className="mx-1 text-ink-400">·</span>
                <span>{formatDateTime(a.ts, locale)}</span>
              </div>
            </div>
            <button type="button" aria-label={t("common.close")} className="btn-icon shrink-0" onClick={() => dismiss(a.id)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button type="button" className="btn-primary" disabled={busy.has(a.id)} onClick={() => onAck(a.id)}>
              {busy.has(a.id) ? t("common.loading") : t("common.acknowledge")}
            </button>
            {a.latitude != null && (
              <button type="button" className="btn-secondary" onClick={() => onViewOnMap(a)}>
                {t("alarms.viewOnMap")}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
      )}
    </>
  );
}
