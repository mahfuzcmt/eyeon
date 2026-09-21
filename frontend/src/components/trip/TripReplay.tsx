"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "@/lib/api";
import { DEFAULT_ZOOM, DHAKA_CENTER, createBaseLayer, expandBounds } from "@/lib/leaflet";
import { useLocale } from "@/lib/i18n";
import type { LocationView, TripView } from "@/types/domain";

interface Props {
  trip: TripView;
  onClose: () => void;
}

/**
 * Loads the device's locations bounded by the trip's start/end timestamps
 * and animates a marker along the recorded path. The "completed" portion
 * of the polyline is drawn in brand colour; the remainder in muted ink.
 */
export function TripReplay({ trip, onClose }: Props) {
  const { t } = useLocale();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const doneLineRef = useRef<L.Polyline | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const endMarkerRef = useRef<L.Marker | null>(null);
  const rafRef = useRef<number | null>(null);

  const [path, setPath] = useState<LocationView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0); // 0..1
  const [playing, setPlaying] = useState(false);

  // Fetch path for the trip window
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params: Record<string, string | number> = {
          from: trip.startedAt,
          to: trip.endedAt ?? new Date().toISOString(),
          limit: 5000,
        };
        const r = await api.get<LocationView[]>(
          `/devices/${encodeURIComponent(trip.deviceImei)}/locations`,
          { params },
        );
        if (!cancelled) setPath(r.data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "load failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trip.deviceImei, trip.startedAt, trip.endedAt]);

  // Init map
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
      routeLineRef.current?.remove();
      doneLineRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Draw the route once both map + path are ready
  useEffect(() => {
    const map = mapRef.current;
    if (!map || path.length === 0) return;

    // Sort by timestamp
    const sorted = [...path].sort(
      (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
    );

    const coords = sorted.map((p) => [p.latitude, p.longitude] as [number, number]);

    // Remove old layers
    routeLineRef.current?.remove();
    doneLineRef.current?.remove();
    startMarkerRef.current?.remove();
    endMarkerRef.current?.remove();

    // Full route line (muted)
    const routeLine = L.polyline(coords, {
      color: "#64748B",
      weight: 3,
      opacity: 0.6,
    }).addTo(map);
    routeLineRef.current = routeLine;

    // Done portion (brand color, initially empty)
    const doneLine = L.polyline([], {
      color: "#E8900A",
      weight: 4,
      opacity: 1,
    }).addTo(map);
    doneLineRef.current = doneLine;

    // Start marker (green)
    if (coords.length > 0) {
      const startIcon = L.divIcon({
        html: '<div style="width:12px;height:12px;border-radius:50%;background:#16A34A;border:2px solid #0A1928;"></div>',
        className: '',
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });
      startMarkerRef.current = L.marker(coords[0], { icon: startIcon }).addTo(map);

      // End marker (red)
      const endIcon = L.divIcon({
        html: '<div style="width:12px;height:12px;border-radius:50%;background:#DC2626;border:2px solid #0A1928;"></div>',
        className: '',
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });
      endMarkerRef.current = L.marker(coords[coords.length - 1], { icon: endIcon }).addTo(map);

      // Animated marker
      if (!markerRef.current) {
        const playIcon = L.divIcon({
          html: '<div style="width:14px;height:14px;border-radius:50%;background:#E8900A;border:2px solid #0A1928;box-shadow:0 0 8px rgba(232,144,10,0.6);"></div>',
          className: '',
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        markerRef.current = L.marker(coords[0], { icon: playIcon }).addTo(map);
      } else {
        markerRef.current.setLatLng(coords[0]);
      }
    }

    // Fit bounds
    const bounds = expandBounds(coords, 0.005);
    if (bounds) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    }
  }, [path]);

  // Animate marker according to progress
  useEffect(() => {
    const map = mapRef.current;
    if (!map || path.length === 0) return;

    // Sort by timestamp
    const sorted = [...path].sort(
      (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
    );

    const idx = Math.min(sorted.length - 1, Math.floor(progress * (sorted.length - 1)));
    const point = sorted[idx];

    if (markerRef.current) {
      markerRef.current.setLatLng([point.latitude, point.longitude]);
    }

    if (doneLineRef.current) {
      const done = sorted.slice(0, idx + 1).map((p) => [p.latitude, p.longitude] as [number, number]);
      doneLineRef.current.setLatLngs(done);
    }
  }, [progress, path]);

  // Playback loop
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setProgress((p) => {
        const next = p + dt / 20; // 20s full pass
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
  }, [playing]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white">
      <div className="flex items-center justify-between border-b border-surface-300 px-4 py-3">
        <div>
          <div className="font-display text-[14px] font-semibold">{t("trips.replay")}</div>
          <div className="font-mono text-[13px] text-ink-400">{trip.deviceImei}</div>
        </div>
        <button type="button" className="btn-ghost px-3 py-1 text-[14px]" onClick={onClose}>
          {t("common.close")}
        </button>
      </div>

      <div className="relative flex-1">
        <div ref={containerRef} className="absolute inset-0" />
        {error && (
          <div className="absolute left-3 top-3 rounded bg-alarm-red/20 px-3 py-1 text-[13px] text-alarm-red">
            {error}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-surface-300 px-4 py-3">
        <button
          type="button"
          className="btn-primary px-3 py-1 text-[14px]"
          onClick={() => {
            if (progress >= 1) setProgress(0);
            setPlaying((p) => !p);
          }}
          disabled={path.length === 0}
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <button
          type="button"
          className="btn-ghost px-2 py-1 text-[14px]"
          onClick={() => setProgress(0)}
          disabled={path.length === 0}
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
        />
        <span className="w-12 text-right font-mono text-[13px] text-ink-800">
          {Math.round(progress * 100)}%
        </span>
      </div>
    </div>
  );
}
