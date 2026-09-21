"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { SharedHistoryPoint } from "@/types/domain";

import { createBaseLayer } from "@/lib/leaflet";

interface SharedMapProps {
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  isOnline: boolean;
  history: SharedHistoryPoint[];
  showHistory: boolean;
}

// Vehicle marker SVG
function createVehicleIcon(course: number, isOnline: boolean): L.DivIcon {
  const color = isOnline ? "#22C55E" : "#6B7280";
  const svg = `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <g transform="rotate(${course}, 16, 16)">
        <path d="M16 4 L24 28 L16 22 L8 28 Z" fill="${color}" stroke="#fff" stroke-width="2"/>
      </g>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: "vehicle-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

export default function SharedMap({
  latitude,
  longitude,
  speed,
  course,
  isOnline,
  history,
  showHistory,
}: SharedMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Re-measure when the container resizes (address bar collapse, rotation).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => mapRef.current?.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [latitude, longitude],
      zoom: 15,
      zoomControl: true,
    });

    // Same base-layer factory as the dashboard: Google when a key is configured
    // (loads the JS API itself), free OSM tiles otherwise. The layer resolves
    // async, so guard against the map having been torn down meanwhile.
    let disposed = false;
    createBaseLayer("google-street").then((layer) => {
      if (!disposed) layer.addTo(map);
    });

    // Add vehicle marker
    const marker = L.marker([latitude, longitude], {
      icon: createVehicleIcon(course, isOnline),
    }).addTo(map);

    markerRef.current = marker;
    mapRef.current = map;

    return () => {
      disposed = true;
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once; later props are applied by the effects below
  }, []);

  // Update marker position and icon
  useEffect(() => {
    if (!markerRef.current || !mapRef.current) return;

    const newLatLng = L.latLng(latitude, longitude);
    markerRef.current.setLatLng(newLatLng);
    markerRef.current.setIcon(createVehicleIcon(course, isOnline));
    mapRef.current.panTo(newLatLng);
  }, [latitude, longitude, course, isOnline]);

  // Update history polyline
  useEffect(() => {
    if (!mapRef.current || !showHistory) return;

    // Remove existing polyline
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (history.length > 0) {
      const points: L.LatLngExpression[] = history.map(p => [p.latitude, p.longitude]);
      const polyline = L.polyline(points, {
        color: "#E8900A",
        weight: 3,
        opacity: 0.7,
      }).addTo(mapRef.current);

      polylineRef.current = polyline;
    }
  }, [history, showHistory]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
    />
  );
}
