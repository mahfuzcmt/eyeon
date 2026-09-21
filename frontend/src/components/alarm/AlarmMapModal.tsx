"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createBaseLayer } from "@/lib/leaflet";
import { useLocale } from "@/lib/i18n";
import { alarmTypeLabel } from "@/lib/alarmTypes";
import { formatDateTime } from "@/lib/format";
import type { AlarmView } from "@/types/domain";

const SEV_COLOR: Record<string, string> = { CRITICAL: "#DC2626", WARNING: "#F59E0B", INFO: "#0421bc" };

/** Where an alarm happened: a small map centred on the alarm with a pulsing marker. */
export function AlarmMapModal({ alarm, deviceName, onClose }: { alarm: AlarmView; deviceName: string; onClose: () => void }) {
  const { t, locale } = useLocale();
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current || alarm.latitude == null || alarm.longitude == null) return;
    const center: [number, number] = [alarm.latitude, alarm.longitude];
    const map = L.map(containerRef.current, { center, zoom: 16, zoomControl: true });
    // The base layer loads async; React StrictMode may have torn the map down by then.
    let disposed = false;
    createBaseLayer("google-street").then((layer) => {
      if (!disposed) layer.addTo(map);
    });
    const color = SEV_COLOR[alarm.severity] ?? SEV_COLOR.INFO;
    const icon = L.divIcon({
      html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 0 0 6px ${color}33"></div>`,
      className: "",
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    L.marker(center, { icon }).addTo(map);
    setTimeout(() => map.invalidateSize(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      disposed = true;
      window.removeEventListener("keydown", onKey);
      map.remove();
    };
  }, [alarm, onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="min-w-0">
            <div className="t-heading truncate">
              {alarmTypeLabel(alarm.type, t)} · {deviceName}
            </div>
            <div className="t-caption">
              {formatDateTime(alarm.ts, locale)} ·{" "}
              <span className="font-mono">
                {alarm.latitude?.toFixed(5)}, {alarm.longitude?.toFixed(5)}
              </span>
            </div>
          </div>
          <button type="button" className="btn-icon" aria-label={t("common.close")} onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div ref={containerRef} className="h-[60vh] w-full bg-surface-100" />
        <div className="modal-footer">
          <a
            className="btn-secondary"
            href={`https://www.google.com/maps?q=${alarm.latitude},${alarm.longitude}`}
            target="_blank"
            rel="noopener"
          >
            {t("act.navigate")}
          </a>
          <a className="btn-primary" href={`/dashboard?focus=${encodeURIComponent(alarm.deviceImei)}`}>
            {t("alarms.viewOnMap")}
          </a>
        </div>
      </div>
    </div>
  );
}
