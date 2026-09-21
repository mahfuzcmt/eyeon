"use client";

import { useEffect, useState, useMemo } from "react";
import { Speedometer } from "./Speedometer";
import { useLocale } from "@/lib/i18n";
import { useTrips } from "@/hooks/useTrips";
import { dhakaTodayStartIso, filterSpeed, formatDurationS, formatNumber } from "@/lib/format";
import { useSpeedLimits } from "@/hooks/useSpeedLimits";
import type { DeviceView, LocationView } from "@/types/domain";

interface Props {
  device: DeviceView;
  location: LocationView | undefined;
  onClose: () => void;
}

export function LiveTrackingPanel({ device, location, onClose }: Props) {
  const { t, locale } = useLocale();
  const [address, setAddress] = useState<string>("Loading address...");
  const [addressLoading, setAddressLoading] = useState(false);
  const speedLimits = useSpeedLimits();

  // Get today's trips for this device
  const range = useMemo(() => ({ from: dhakaTodayStartIso(), to: new Date().toISOString() }), []);
  const { trips } = useTrips({ imei: device.imei, fromIso: range.from, toIso: range.to });

  // Calculate today's stats
  const todayStats = useMemo(() => {
    const distanceM = trips.reduce((s, tr) => s + tr.distanceM, 0);
    const durationS = trips.reduce((s, tr) => s + (tr.durationS ?? 0), 0);
    const maxSpeed = trips.reduce((m, tr) => Math.max(m, tr.maxSpeed), 0);

    // Calculate overspeed distance (simplified - in reality would need location history)
    // For now, estimate based on max speed exceeding limit
    const speedLimit = speedLimits.limitFor(device.imei) ?? 80; // default 80 kph if no rule
    const overspeedTrips = trips.filter(tr => tr.maxSpeed > speedLimit);
    const overspeedDistanceM = overspeedTrips.reduce((s, tr) => s + tr.distanceM * 0.2, 0); // estimate 20% of trip

    return {
      totalHoursS: durationS,
      totalDistanceM: distanceM,
      overspeedDistanceM,
      maxSpeed,
    };
  }, [trips, device.imei, speedLimits]);

  // Reverse geocode to get address
  useEffect(() => {
    if (!location) {
      setAddress("No location data");
      return;
    }

    const fetchAddress = async () => {
      setAddressLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.latitude}&lon=${location.longitude}&zoom=18&addressdetails=1`,
          { headers: { Accept: "application/json" } }
        );
        const data = await res.json();
        if (data.display_name) {
          setAddress(data.display_name);
        } else {
          setAddress(`${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`);
        }
      } catch {
        setAddress(`${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`);
      } finally {
        setAddressLoading(false);
      }
    };

    fetchAddress();
  }, [location?.latitude, location?.longitude]);

  const currentSpeed = filterSpeed(location?.speed, location?.valid);
  const isMoving = currentSpeed > 0;

  return (
    <div className="absolute inset-0 z-[1100] flex flex-col bg-white/95 backdrop-blur-sm">
      {/* Header with address */}
      <header className="flex items-center gap-3 border-b border-surface-300 bg-white px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-100 text-ink-600 transition hover:bg-surface-200 hover:text-ink-900"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[14px] font-semibold text-ink-900">
            {device.name || device.vehiclePlate || device.imei}
          </h2>
          <p className={`truncate text-[13px] ${addressLoading ? "text-ink-9000" : "text-ink-600"}`}>
            📍 {address}
          </p>
        </div>
        <div className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${
          isMoving ? "bg-status-moving/20 text-status-moving" : "bg-status-stopped/20 text-status-stopped"
        }`}>
          {isMoving ? "Moving" : "Stopped"}
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-auto p-4 md:flex-row md:gap-12">
        {/* Speedometer */}
        <div className="flex flex-col items-center">
          <Speedometer speed={currentSpeed} size={200} />
          <div className="mt-2 text-center">
            <span className="text-[13px] text-ink-400">Live Speed</span>
          </div>
        </div>

        {/* Today's Summary Stats */}
        <div className="w-full max-w-xs rounded-xl border border-surface-300 bg-surface-50 p-4">
          <h3 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-ink-900">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {t("panel.todaySummary")}
          </h3>

          <div className="space-y-3">
            {/* Total Hours */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <span className="text-[13px] text-ink-600">{t("panel.totalHours")}</span>
              </div>
              <span className="font-mono text-[14px] font-semibold text-ink-900">
                {formatDurationS(todayStats.totalHoursS, locale)}
              </span>
            </div>

            {/* Total KM */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/20">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
                    <path d="M12 2L12 22" />
                    <path d="M17 7L12 2L7 7" />
                    <path d="M7 17L12 22L17 17" />
                  </svg>
                </div>
                <span className="text-[13px] text-ink-600">{t("panel.totalKm")}</span>
              </div>
              <span className="font-mono text-[14px] font-semibold text-ink-900">
                {formatNumber(todayStats.totalDistanceM / 1000, locale, { maximumFractionDigits: 1 })} km
              </span>
            </div>

            {/* Overspeed KM */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/20">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <span className="text-[13px] text-ink-600">{t("panel.overspeedKm")}</span>
              </div>
              <span className="font-mono text-[14px] font-semibold text-alarm-red">
                {formatNumber(todayStats.overspeedDistanceM / 1000, locale, { maximumFractionDigits: 1 })} km
              </span>
            </div>

            {/* Max Speed */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                </div>
                <span className="text-[13px] text-ink-600">{t("panel.maxSpeedToday")}</span>
              </div>
              <span className="font-mono text-[14px] font-semibold text-ink-900">
                {todayStats.maxSpeed} {t("fleet.kmh")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-friendly bottom info */}
      <footer className="border-t border-surface-300 bg-white px-4 py-3 md:hidden">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div>
            <div className="text-lg font-bold text-ink-900">{formatDurationS(todayStats.totalHoursS, locale)}</div>
            <div className="text-[11px] text-ink-400">{t("panel.totalHours")}</div>
          </div>
          <div>
            <div className="text-lg font-bold text-ink-900">
              {formatNumber(todayStats.totalDistanceM / 1000, locale, { maximumFractionDigits: 1 })} km
            </div>
            <div className="text-[11px] text-ink-400">{t("panel.totalKm")}</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
