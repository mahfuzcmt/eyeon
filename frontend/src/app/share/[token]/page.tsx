"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import type { SharedLocationView, SharedHistoryPoint } from "@/types/domain";

// Import map dynamically to avoid SSR issues
const SharedMap = dynamic(() => import("./SharedMap"), { ssr: false });

// Public API helper (no auth required). Same-origin: /api/public/* is a
// server-side pass-through to the backend's /api/v1/public/* endpoints, so
// this works wherever the site is hosted without exposing the backend host.
async function fetchPublicApi<T>(path: string): Promise<T> {
  const res = await fetch(`/api/public${path}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status}`);
  }
  return res.json();
}

export default function SharedLocationPage() {
  const params = useParams();
  const token = params.token as string;

  const [location, setLocation] = useState<SharedLocationView | null>(null);
  const [history, setHistory] = useState<SharedHistoryPoint[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch initial location data
  const fetchLocation = useCallback(async () => {
    try {
      const data = await fetchPublicApi<SharedLocationView>(`/share/${encodeURIComponent(token)}`);
      setLocation(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch location:", err);
      setError("This share link is invalid or has expired.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch history if enabled
  const fetchHistory = useCallback(async () => {
    try {
      const data = await fetchPublicApi<SharedHistoryPoint[]>(`/share/${encodeURIComponent(token)}/history`);
      setHistory(data);
      setHistoryLoaded(true);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  }, [token]);

  // Initial load
  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  // Fetch history when location is loaded and history is enabled
  useEffect(() => {
    if (location?.showHistory) {
      fetchHistory();
    }
  }, [location?.showHistory, fetchHistory]);

  // WebSocket for realtime updates
  useEffect(() => {
    if (!location?.allowRealtime) return;

    // Public viewers have no STOMP credentials, so poll every 10 s instead.
    const interval = setInterval(fetchLocation, 10000);

    return () => {
      clearInterval(interval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [location?.allowRealtime, fetchLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500 mx-auto mb-4"></div>
          <p className="text-ink-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">Link Invalid</h1>
          <p className="text-ink-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!location) {
    return null;
  }

  return (
    <div className="flex h-dvh flex-col bg-ink-950">
      {/* Header */}
      <header className="bg-ink-900 border-b border-ink-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-500 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">
                {location.vehicleName || location.vehiclePlate || "Vehicle Location"}
              </h1>
              {location.vehiclePlate && location.vehicleName && (
                <p className="text-[14px] text-ink-400">{location.vehiclePlate}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-1 text-[13px] rounded-full ${
                location.isOnline
                  ? "bg-green-600/20 text-green-400"
                  : "bg-ink-700 text-ink-400"
              }`}
            >
              {location.isOnline ? "Online" : "Offline"}
            </span>
          </div>
        </div>
      </header>

      {/* Map */}
      <div className="relative min-h-[240px] flex-1">
        {location.showHistory && historyLoaded && history.length === 0 && (
          <div className="pointer-events-none absolute left-1/2 top-3 z-[1000] -translate-x-1/2 whitespace-nowrap rounded-full bg-ink-900/80 px-3 py-1 text-[13px] text-white">
            No route in the last 24 hours
          </div>
        )}
        <SharedMap
          latitude={location.latitude}
          longitude={location.longitude}
          speed={location.speed}
          course={location.course}
          isOnline={location.isOnline}
          history={history}
          showHistory={location.showHistory}
        />
      </div>

      {/* Info footer */}
      <footer className="bg-ink-900 border-t border-ink-800 px-4 py-3">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-[13px] text-ink-400 mb-1">Speed</p>
              <p className="text-lg font-semibold text-white">{location.speed} km/h</p>
            </div>
            <div>
              <p className="text-[13px] text-ink-400 mb-1">Heading</p>
              <p className="text-lg font-semibold text-white">{location.course}°</p>
            </div>
            <div>
              <p className="text-[13px] text-ink-400 mb-1">Last Update</p>
              <p className="text-[14px] font-medium text-white">
                {location.lastUpdate
                  ? new Date(location.lastUpdate).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-[13px] text-ink-400 mb-1">Vehicle Type</p>
              <p className="text-[14px] font-medium text-white capitalize">
                {location.vehicleType?.toLowerCase() || "Unknown"}
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Branding */}
      <div className="bg-ink-950 px-4 py-2 text-center">
        <p className="text-[13px] text-ink-500">
          Powered by <span className="text-brand-500 font-medium">EyeOn</span>
        </p>
      </div>
    </div>
  );
}
