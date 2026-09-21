"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useLocale } from "@/lib/i18n";
import { useDeviceHistory, getDateRange } from "@/hooks/useDeviceHistory";
import { formatDateTime, formatNumber } from "@/lib/format";
import { DEFAULT_ZOOM, DHAKA_CENTER, createBaseLayer, expandBounds } from "@/lib/leaflet";
import type { DeviceView, LocationView } from "@/types/domain";

interface Props {
  device: DeviceView;
  onClose: () => void;
}

type Period = "1h" | "6h" | "24h" | "7d";

// Color based on speed (green = slow, yellow = medium, red = fast)
function speedColor(speed: number): string {
  if (speed < 20) return "#16A34A"; // green
  if (speed < 40) return "#E8900A"; // orange
  if (speed < 60) return "#F59E0B"; // amber
  return "#DC2626"; // red
}

export function RouteHistoryPanel({ device, onClose }: Props) {
  const { t, locale } = useLocale();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const pointsLayerRef = useRef<L.LayerGroup | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const endMarkerRef = useRef<L.Marker | null>(null);

  const [period, setPeriod] = useState<Period>("24h");
  const [selectedPoint, setSelectedPoint] = useState<LocationView | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  // Memoize date range to prevent infinite re-fetching
  const dateRange = useMemo(() => getDateRange(period), [period]);

  const { history, loading, error } = useDeviceHistory({
    imei: device.imei,
    from: dateRange.from,
    to: dateRange.to,
    limit: 2000,
  });

  // Initialize map
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: DHAKA_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
    });

    createBaseLayer("google-street").then((layer) => {
      if (mapRef.current === map) layer.addTo(map);
    });

    map.zoomControl.setPosition('bottomright');
    mapRef.current = map;

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      markerRef.current?.remove();
      startMarkerRef.current?.remove();
      endMarkerRef.current?.remove();
      routeLayerRef.current?.remove();
      pointsLayerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Draw route when history loads
  useEffect(() => {
    const map = mapRef.current;
    if (!map || history.length === 0) return;

    // Sort by timestamp
    const sorted = [...history].sort(
      (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
    );

    const coords = sorted.map((p) => [p.latitude, p.longitude] as [number, number]);

    // Remove old layers
    routeLayerRef.current?.remove();
    pointsLayerRef.current?.remove();
    startMarkerRef.current?.remove();
    endMarkerRef.current?.remove();

    // Route line
    const routeLine = L.polyline(coords, {
      color: "#E8900A",
      weight: 3,
      opacity: 0.8,
    }).addTo(map);
    routeLayerRef.current = routeLine;

    // Points layer
    const pointsGroup = L.layerGroup().addTo(map);
    sorted.forEach((p, i) => {
      const color = speedColor(p.speed);
      const circle = L.circleMarker([p.latitude, p.longitude], {
        radius: 5,
        fillColor: color,
        color: "#0A1928",
        weight: 1,
        fillOpacity: 1,
      });
      circle.on("click", () => setSelectedPoint(p));
      circle.addTo(pointsGroup);
    });
    pointsLayerRef.current = pointsGroup;

    // Start marker (green)
    if (coords.length > 0) {
      const startIcon = L.divIcon({
        html: '<div style="width:16px;height:16px;border-radius:50%;background:#16A34A;border:2px solid #0A1928;"></div>',
        className: '',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      startMarkerRef.current = L.marker(coords[0], { icon: startIcon }).addTo(map);

      // End marker (red)
      const endIcon = L.divIcon({
        html: '<div style="width:16px;height:16px;border-radius:50%;background:#DC2626;border:2px solid #0A1928;"></div>',
        className: '',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      endMarkerRef.current = L.marker(coords[coords.length - 1], { icon: endIcon }).addTo(map);

      // Animated marker for playback
      if (!markerRef.current) {
        const playIcon = L.divIcon({
          html: '<div style="width:20px;height:20px;border-radius:50%;background:#E8900A;border:3px solid #0A1928;box-shadow:0 0 10px rgba(232,144,10,0.8);"></div>',
          className: '',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
        markerRef.current = L.marker(coords[0], { icon: playIcon }).addTo(map);
      } else {
        markerRef.current.setLatLng(coords[0]);
      }
    }

    // Fit bounds
    const bounds = expandBounds(coords, 0.01);
    if (bounds) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    }
  }, [history]);

  // Playback animation
  useEffect(() => {
    if (!playing || history.length === 0) return;

    const sorted = [...history].sort(
      (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
    );

    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setProgress((p) => {
        const next = p + dt / 30; // 30 seconds for full playback
        if (next >= 1) {
          setPlaying(false);
          return 1;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, history]);

  // Update marker position based on progress
  useEffect(() => {
    if (!markerRef.current || history.length === 0) return;

    const sorted = [...history].sort(
      (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
    );

    const idx = Math.min(sorted.length - 1, Math.floor(progress * sorted.length));
    const point = sorted[idx];
    if (point) {
      markerRef.current.setLatLng([point.latitude, point.longitude]);
      setSelectedPoint(point);
    }
  }, [progress, history]);

  // Calculate stats
  const stats = history.length > 0 ? {
    totalPoints: history.length,
    maxSpeed: Math.max(...history.map(h => h.speed)),
    avgSpeed: Math.round(history.reduce((sum, h) => sum + h.speed, 0) / history.length),
    startTime: history.reduce((min, h) => h.ts < min ? h.ts : min, history[0].ts),
    endTime: history.reduce((max, h) => h.ts > max ? h.ts : max, history[0].ts),
  } : null;

  return (
    <div className="fixed inset-0 z-[2500] flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-surface-300 px-4 py-3 bg-white">
        <div className="min-w-0">
          <div className="truncate font-semibold text-base text-ink-900">
            {t("fleet.routeHistory")} - {device.name || device.imei}
          </div>
          <div className="font-mono text-[13px] text-ink-400">{device.imei}</div>
        </div>
        <button
          type="button"
          className="shrink-0 px-4 py-2 text-[14px] font-semibold rounded border border-surface-300 bg-white hover:bg-surface-100 text-ink-700 transition-colors"
          onClick={onClose}
        >
          {t("common.close")}
        </button>
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-2 border-b border-surface-300 px-4 py-2">
        <span className="text-[14px] text-ink-400">{t("fleet.period")}:</span>
        {(["1h", "6h", "24h", "7d"] as Period[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 text-[14px] rounded ${
              period === p
                ? "bg-brand-500 text-white"
                : "bg-white text-ink-800 hover:bg-surface-200"
            }`}
          >
            {p === "1h" ? "1 Hour" : p === "6h" ? "6 Hours" : p === "24h" ? "24 Hours" : "7 Days"}
          </button>
        ))}
        {loading && <span className="text-[13px] text-ink-400 ml-2">Loading...</span>}
      </div>

      {/* Map */}
      <div className="relative flex-1">
        <div ref={containerRef} className="absolute inset-0" />

        {error && (
          <div className="absolute left-3 top-3 rounded bg-alarm-red/20 px-3 py-1 text-[13px] text-alarm-red">
            {error}
          </div>
        )}

        {history.length === 0 && !loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-ink-400">
            No location history for this period
          </div>
        )}

        {/* Stats panel */}
        {stats && (
          <div className="absolute left-3 top-3 rounded-lg bg-white/95 backdrop-blur p-3 text-[14px]">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              <div className="text-ink-400">Points:</div>
              <div className="text-ink-900 font-mono">{stats.totalPoints}</div>
              <div className="text-ink-400">Max Speed:</div>
              <div className="text-ink-900 font-mono">{stats.maxSpeed} km/h</div>
              <div className="text-ink-400">Avg Speed:</div>
              <div className="text-ink-900 font-mono">{stats.avgSpeed} km/h</div>
            </div>
          </div>
        )}

        {/* Selected point info */}
        {selectedPoint && (
          <div className="absolute left-3 right-3 top-auto bottom-16 rounded-lg bg-white/95 backdrop-blur p-3 text-[14px] sm:bottom-auto sm:left-auto sm:right-3 sm:top-3 sm:min-w-[200px]">
            <div className="font-semibold mb-2">{t("fleet.pointDetails")}</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[13px]">
              <div className="text-ink-400">Time:</div>
              <div className="text-ink-900 font-mono">{formatDateTime(selectedPoint.ts, locale)}</div>
              <div className="text-ink-400">Speed:</div>
              <div className="text-ink-900 font-mono">{selectedPoint.speed} km/h</div>
              <div className="text-ink-400">Position:</div>
              <div className="text-ink-900 font-mono text-[11px]">
                {selectedPoint.latitude.toFixed(5)}, {selectedPoint.longitude.toFixed(5)}
              </div>
              {selectedPoint.voltageMv && (
                <>
                  <div className="text-ink-400">Voltage:</div>
                  <div className="text-ink-900 font-mono">{(selectedPoint.voltageMv / 1000).toFixed(1)}V</div>
                </>
              )}
              <div className="text-ink-400">ACC:</div>
              <div className={selectedPoint.accOn ? "text-alarm-green" : "text-ink-400"}>
                {selectedPoint.accOn ? "ON" : "OFF"}
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className={`absolute left-3 rounded-lg bg-white/95 backdrop-blur p-2 text-[13px] ${selectedPoint ? "bottom-3 sm:bottom-16" : "bottom-16"}`}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-[#16A34A]"></div>
              <span>Start / Slow</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-[#E8900A]"></div>
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-[#DC2626]"></div>
              <span>End / Fast</span>
            </div>
          </div>
        </div>
      </div>

      {/* Playback controls */}
      <div className="flex items-center gap-3 border-t border-surface-300 px-4 py-3">
        <button
          type="button"
          className="btn-primary px-3 py-1 text-[14px]"
          onClick={() => {
            if (progress >= 1) setProgress(0);
            setPlaying((p) => !p);
          }}
          disabled={history.length === 0}
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <button
          type="button"
          className="btn-ghost px-2 py-1 text-[14px]"
          onClick={() => setProgress(0)}
          disabled={history.length === 0}
        >
          ⏮
        </button>
        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round(progress * 1000)}
          onChange={(e) => {
            setPlaying(false);
            setProgress(Number(e.target.value) / 1000);
          }}
          className="flex-1 accent-brand-500"
          disabled={history.length === 0}
        />
        <span className="w-14 text-right font-mono text-[13px] text-ink-800">
          {Math.round(progress * 100)}%
        </span>
      </div>
    </div>
  );
}
