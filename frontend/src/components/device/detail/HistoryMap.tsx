"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DEFAULT_ZOOM, DHAKA_CENTER, createBaseLayer, expandBounds } from "@/lib/leaflet";
import type { LocationView } from "@/types/domain";

/** Route polyline + start/end dots + an animated marker at `movingIndex`. */
export function HistoryMap({ points, movingIndex }: { points: LocationView[]; movingIndex: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeRef = useRef<L.Polyline | null>(null);
  const startRef = useRef<L.Marker | null>(null);
  const endRef = useRef<L.Marker | null>(null);
  const movingRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = L.map(containerRef.current, { center: DHAKA_CENTER, zoom: DEFAULT_ZOOM, zoomControl: true });
    createBaseLayer("google-street").then((layer) => {
      if (mapRef.current === map) layer.addTo(map);
    });
    map.zoomControl.setPosition("bottomright");
    mapRef.current = map;
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerRef.current);
    setTimeout(() => map.invalidateSize(), 100);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Redraw route when points change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    routeRef.current?.remove();
    startRef.current?.remove();
    endRef.current?.remove();
    movingRef.current?.remove();
    movingRef.current = null;

    if (points.length === 0) return;
    const coords = points.map((p) => [p.latitude, p.longitude] as [number, number]);
    routeRef.current = L.polyline(coords, { color: "#2B82D4", weight: 3, opacity: 0.85 }).addTo(map);

    const dot = (color: string) =>
      L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.2)"></div>`,
        className: "",
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
    startRef.current = L.marker(coords[0], { icon: dot("#4DA74D") }).addTo(map);
    endRef.current = L.marker(coords[coords.length - 1], { icon: dot("#CB4B4B") }).addTo(map);

    const bounds = expandBounds(coords, 0.01);
    if (bounds) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
  }, [points]);

  // Move the playback marker.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || points.length === 0) return;
    const p = points[Math.max(0, Math.min(points.length - 1, movingIndex))];
    if (!p) return;
    const icon = L.divIcon({
      html: '<div style="width:18px;height:18px;border-radius:50%;background:#E8900A;border:3px solid #fff;box-shadow:0 0 8px rgba(232,144,10,.7)"></div>',
      className: "",
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    if (movingRef.current) movingRef.current.setLatLng([p.latitude, p.longitude]);
    else movingRef.current = L.marker([p.latitude, p.longitude], { icon, interactive: false }).addTo(map);
  }, [movingIndex, points]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
