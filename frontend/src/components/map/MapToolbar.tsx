"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import L from "leaflet";

interface MapToolbarProps {
  map: L.Map | null;
  onFitAll: () => void;
  onLocate: () => void;
  locating: boolean;
  disabled?: boolean;
  /** Positioning classes (e.g. 'right-3 top-14'); defaults to the top-left corner. */
  className?: string;
  style?: React.CSSProperties;
}

export function MapToolbar({ map, onFitAll, onLocate, locating, disabled, className, style }: MapToolbarProps) {
  const [measuring, setMeasuring] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<L.LatLng[]>([]);
  const [totalDistance, setTotalDistance] = useState(0);

  const measureLineRef = useRef<L.Polyline | null>(null);
  const measureMarkersRef = useRef<L.CircleMarker[]>([]);

  // Clean up measure elements
  const clearMeasure = useCallback(() => {
    if (measureLineRef.current) {
      measureLineRef.current.remove();
      measureLineRef.current = null;
    }
    for (const marker of measureMarkersRef.current) {
      marker.remove();
    }
    measureMarkersRef.current = [];
    setMeasurePoints([]);
    setTotalDistance(0);
  }, []);

  // Handle map clicks during measure mode
  useEffect(() => {
    if (!map || !measuring) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      const newPoint = e.latlng;
      setMeasurePoints((prev) => {
        const updated = [...prev, newPoint];

        // Add a marker at the clicked point
        const marker = L.circleMarker(newPoint, {
          radius: 5,
          fillColor: "#2B82D4",
          fillOpacity: 1,
          color: "#fff",
          weight: 2,
        }).addTo(map);
        measureMarkersRef.current.push(marker);

        // Update or create the polyline
        if (measureLineRef.current) {
          measureLineRef.current.setLatLngs(updated);
        } else if (updated.length >= 2) {
          measureLineRef.current = L.polyline(updated, {
            color: "#2B82D4",
            weight: 2,
            dashArray: "6, 4",
            className: "pp-measure-line",
          }).addTo(map);
        }

        // Calculate total distance
        let dist = 0;
        for (let i = 1; i < updated.length; i++) {
          dist += updated[i - 1].distanceTo(updated[i]);
        }
        setTotalDistance(dist);

        return updated;
      });
    };

    map.on("click", handleClick);
    map.getContainer().style.cursor = "crosshair";

    return () => {
      map.off("click", handleClick);
      map.getContainer().style.cursor = "";
    };
  }, [map, measuring]);

  // Handle escape key to exit measure mode
  useEffect(() => {
    if (!measuring) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        clearMeasure();
        setMeasuring(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [measuring, clearMeasure]);

  const handleToggleMeasure = () => {
    if (measuring) {
      clearMeasure();
      setMeasuring(false);
    } else {
      setMeasuring(true);
    }
  };

  const handleZoomIn = () => {
    map?.zoomIn();
  };

  const handleZoomOut = () => {
    map?.zoomOut();
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(2)} km`;
  };

  const buttonClass =
    "flex h-9 w-9 items-center justify-center rounded-mkt border border-white/30 bg-white/80 text-ink-700 shadow-glass backdrop-blur-md transition hover:bg-white/90 hover:border-white/50 disabled:opacity-60 disabled:cursor-not-allowed";
  const activeButtonClass =
    "flex h-9 w-9 items-center justify-center rounded-mkt border border-brand-400/50 bg-brand-50/90 text-brand-600 shadow-glass backdrop-blur-md transition";

  return (
    <div className={`absolute z-[1000] flex flex-col gap-1.5 ${className ?? "left-3 top-3"}`} style={style}>
      {/* Zoom In */}
      <button
        type="button"
        onClick={handleZoomIn}
        disabled={disabled || !map}
        title="Zoom in"
        className={buttonClass}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Zoom Out */}
      <button
        type="button"
        onClick={handleZoomOut}
        disabled={disabled || !map}
        title="Zoom out"
        className={buttonClass}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Divider */}
      <div className="my-0.5 h-px bg-surface-200" />

      {/* Ruler / Measure */}
      <button
        type="button"
        onClick={handleToggleMeasure}
        disabled={disabled || !map}
        title={measuring ? "Exit measure mode (Esc)" : "Measure distance"}
        className={measuring ? activeButtonClass : buttonClass}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" />
          <path d="m14.5 12.5 2-2" />
          <path d="m11.5 9.5 2-2" />
          <path d="m8.5 6.5 2-2" />
          <path d="m17.5 15.5 2-2" />
        </svg>
      </button>

      {/* Divider */}
      <div className="my-0.5 h-px bg-surface-200" />

      {/* Fit All */}
      <button
        type="button"
        onClick={onFitAll}
        disabled={disabled}
        title="Fit all vehicles"
        className={buttonClass}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
        </svg>
      </button>

      {/* Locate Me */}
      <button
        type="button"
        onClick={onLocate}
        disabled={disabled || locating}
        title="Locate me"
        className={buttonClass}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={locating ? "animate-pulse" : ""}
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
      </button>

      {/* Measure Distance Panel */}
      {measuring && (
        <div className="mt-2 rounded-mkt border border-white/30 bg-white/85 p-2.5 shadow-glass backdrop-blur-lg">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
              Distance
            </span>
            <button
              type="button"
              onClick={() => {
                clearMeasure();
                setMeasuring(false);
              }}
              className="text-ink-400 transition hover:text-ink-700"
              title="Clear"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="mt-1 font-mono text-[14px] font-bold text-ink-900">
            {measurePoints.length > 1 ? formatDistance(totalDistance) : "Click to start"}
          </div>
          {measurePoints.length > 0 && (
            <div className="mt-0.5 text-[11px] text-ink-400">
              {measurePoints.length} point{measurePoints.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
