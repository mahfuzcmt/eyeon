"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import {
  DEFAULT_ZOOM,
  DHAKA_CENTER,
  createBaseLayer,
  expandBounds,
  calculateFitZoom,
  layerSupportsTraffic,
  setLayerTraffic,
  hasGoogleMapsKey,
  type BaseLayerKind,
} from "@/lib/leaflet";
import { MapLayerDropdown } from "./MapLayerDropdown";
import { MapToolbar } from "./MapToolbar";
import {
  filterSpeed,
  formatSince,
  formatCompactDuration,
  compassLabel,
  vehicleState,
  VEHICLE_STATE_COLOR,
  MARKER_BODY_COLOR,
  type VehicleState,
  formatBatteryPercent,
} from "@/lib/format";
import { buildVehicleSvg, getIconDimensions, noseOffset } from "@/lib/vehicleIcons";
import { useSpeedLimits } from "@/hooks/useSpeedLimits";
import { useLocale } from "@/lib/i18n";
import type { DeviceView, LocationView } from "@/types/domain";
import { type LiveLocationView, getInterpolatedPosition, isAnimating } from "@/hooks/useLiveLocations";

interface FleetMapProps {
  devices: DeviceView[];
  locations: Map<string, LocationView | LiveLocationView>;
  selectedImei: string | null;
  onSelect: (imei: string | null) => void;
  /** AutoNemo "Refresh" control — re-pull last-known positions. */
  onRefresh?: () => void | Promise<void>;
  /** Last refresh timestamp for countdown timer. */
  lastRefreshAt?: Date | null;
  /** Address search box (geocoding). Off by default — single-vehicle embeds don't need it. */
  showSearch?: boolean;
  /** Callback to advance waypoint animations. Called from the animation loop. */
  onAdvanceAnimations?: () => boolean;
  /** Pixels covered on the left by the floating vehicle panel (for auto-pan / fit padding). */
  leftInset?: number;
  /** Driver id → display name, so the popup can show who is assigned to the vehicle. */
  driversById?: Map<string, string>;
  /** Extra space (px) reserved above the map's top-edge controls, e.g. for a full-width KPI strip on mobile. */
  topInset?: number;
  /** Extra space (px) reserved under the map's bottom-edge controls, e.g. for the mobile vehicle sheet. */
  bottomInset?: number;
}

const OVERSPEED_COLOR = "#DC2626";
/** Below this zoom the plate labels are hidden (except the selected vehicle). */
const LABEL_MIN_ZOOM = 13;

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

const svgIcon = (d: string) =>
  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

/** Inline icons for the popup card (rendered as raw HTML inside Leaflet). */
const ICON = {
  pencil: svgIcon('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
  user: svgIcon('<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="8" r="4"/>'),
  key: svgIcon('<circle cx="8" cy="15" r="4"/><path d="m10.9 12.1 9.1-9.1M15 6l3 3M12 9l3 3"/>'),
  clock: svgIcon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  signal: svgIcon('<path d="M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 4v16"/>'),
  plug: svgIcon('<path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0Z"/><path d="M12 18v4"/>'),
  battery: svgIcon('<rect x="2" y="7" width="18" height="10" rx="2"/><path d="M22 11v2M6 11v2M10 11v2"/>'),
  road: svgIcon('<path d="M4 20 8 4M20 20 16 4M12 4v3M12 11v3M12 18v2"/>'),
  sat: svgIcon('<path d="M13 7 17 3l4 4-4 4M3 21l6-6M9 9l6 6M11 13l-4 4"/>'),
  globe: svgIcon('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
  pin: svgIcon('<path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12Z"/><circle cx="12" cy="10" r="2.5"/>'),
  history: svgIcon('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>'),
  live: svgIcon('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8" stroke-dasharray="3 3"/>'),
  navigate: svgIcon('<path d="m3 11 18-8-8 18-2-8Z"/>'),
  fence: svgIcon('<path d="M4 8 12 4l8 4v8l-8 4-8-4Z"/><circle cx="12" cy="12" r="2"/>'),
  street: svgIcon('<circle cx="12" cy="5" r="2.5"/><path d="M9 22v-7l-2-5 5 1 5-1-2 5v7"/>'),
  terminal: svgIcon('<path d="m5 8 4 4-4 4M11 16h8"/><rect x="2" y="3" width="20" height="18" rx="2"/>'),
  share: svgIcon('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>'),
  doc: svgIcon('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8M8 17h6"/>'),
};

interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
}

/** Cache key for address lookups (rounded to ~100m precision to reduce API calls) */
function addressCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

/** Global address cache (persists across re-renders) */
const addressCache = new Map<string, string>();

/** Pending address requests to avoid duplicate API calls */
const pendingRequests = new Map<string, Promise<string>>();

/** Rate limiter: minimum time between API calls (1 second for Nominatim's policy) */
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000;

/** Reverse geocode coordinates to address using Nominatim */
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const key = addressCacheKey(lat, lng);

  // Return cached result immediately
  if (addressCache.has(key)) {
    return addressCache.get(key)!;
  }

  // Return pending request if one exists for this location
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!;
  }

  // Rate limiting: wait if we made a request too recently
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }

  const requestPromise = (async () => {
    try {
      lastRequestTime = Date.now();
      // Use zoom=19 for maximum detail (building level)
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=19&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "EyeOn GPS Tracker"
        }
      });
      if (!res.ok) throw new Error("Geocoding failed");

      const data = await res.json();

      // Build detailed address from the response
      let address = "";
      if (data.address) {
        const parts: string[] = [];
        const addr = data.address;

        // Most specific first: house number + road
        if (addr.house_number) {
          parts.push(`House ${addr.house_number}`);
        }
        if (addr.road) {
          parts.push(addr.road);
        }
        // Add area/neighborhood
        if (addr.neighbourhood) {
          parts.push(addr.neighbourhood);
        } else if (addr.suburb) {
          parts.push(addr.suburb);
        } else if (addr.residential) {
          parts.push(addr.residential);
        }
        // Add city/town/village
        if (addr.city) {
          parts.push(addr.city);
        } else if (addr.town) {
          parts.push(addr.town);
        } else if (addr.village) {
          parts.push(addr.village);
        } else if (addr.county) {
          parts.push(addr.county);
        }
        // Add district if different from city
        if (addr.state_district && addr.state_district !== addr.city) {
          parts.push(addr.state_district);
        }

        // Join up to 4 parts for a detailed address
        address = parts.slice(0, 4).join(", ");

        // Fallback to display_name if no parts found
        if (!address && data.display_name) {
          address = data.display_name.split(",").slice(0, 4).join(",").trim();
        }
        if (!address) address = "Unknown location";
      } else {
        address = data.display_name?.split(",").slice(0, 4).join(",").trim() || "Unknown location";
      }

      addressCache.set(key, address);
      return address;
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } finally {
      // Clean up pending request after completion
      pendingRequests.delete(key);
    }
  })();

  // Store the pending request
  pendingRequests.set(key, requestPromise);
  return requestPromise;
}

// Default to google-street if Google API key is available, otherwise OSM
const getDefaultLayer = (): BaseLayerKind => hasGoogleMapsKey() ? "google-street" : "osm";

const STATE_TEXT: Record<VehicleState, string> = {
  moving: "Moving",
  idle: "Idle",
  stopped: "Stopped",
  offline: "Offline",
  expired: "Expired",
  nodata: "No Data",
};

function formatDateTime(ts: string | null | undefined): string {
  if (!ts) return "—";
  const date = new Date(ts);
  return date
    .toLocaleString("en-GB", {
      timeZone: "Asia/Dhaka",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    .replace(",", "");
}

// Marker color follows the shared 6-state model, so the map matches the
// Vehicles screen and the live list.
function markerColor(device: DeviceView | undefined, location: LocationView | undefined): string {
  if (!device) return VEHICLE_STATE_COLOR.offline;
  return VEHICLE_STATE_COLOR[vehicleState(device, location)];
}

/**
 * True when the device is still transmitting but its newest packet carried no GPS
 * fix — the coordinates on screen are the last confirmed position, not a live one.
 */
function hasNoFix(location: LocationView | undefined): boolean {
  return location != null && !location.valid;
}

/** Stale threshold in milliseconds (10 minutes for GPS data) */
const STALE_THRESHOLD_MS = 10 * 60 * 1000;

/** Freshness thresholds in milliseconds for UI feedback */
const FRESHNESS_LIVE_MS = 30 * 1000;    // 🟢 Live: < 30 seconds
const FRESHNESS_STALE_MS = 60 * 1000;   // 🟡 Stale: 30-60 seconds
// > 60 seconds = 🔴 No Signal

/**
 * True when the last location update is older than STALE_THRESHOLD_MS.
 * Stale data means the GPS position shown may not reflect current location.
 */
function isStaleData(location: LocationView | undefined, device: DeviceView | undefined): boolean {
  const ts = location?.ts || device?.lastSeenAt;
  if (!ts) return true;
  const age = Date.now() - new Date(ts).getTime();
  return age > STALE_THRESHOLD_MS;
}

/**
 * Returns freshness status based on the actual GPS timestamp.
 * This shows how old the data really is (🟢/🟡/🔴 indicator).
 */
type FreshnessStatus = "live" | "stale" | "no-signal";

function getFreshnessStatus(location: LocationView | LiveLocationView | undefined): FreshnessStatus {
  if (!location) return "no-signal";

  // Use the actual GPS timestamp to calculate real data age
  const gpsTime = new Date(location.ts).getTime();
  const age = Date.now() - gpsTime;

  if (age < FRESHNESS_LIVE_MS) return "live";
  if (age < FRESHNESS_STALE_MS) return "stale";
  return "no-signal";
}

/**
 * Checks if location was just updated (for pulse animation).
 */
function isJustUpdated(location: LocationView | LiveLocationView | undefined): boolean {
  if (!location) return false;
  return (location as LiveLocationView).justUpdated === true;
}

const FRESHNESS_CONFIG = {
  live: { label: "Live", color: "#16A34A", icon: "🟢", bgColor: "rgba(22, 163, 74, 0.15)" },
  stale: { label: "Stale", color: "#F59E0B", icon: "🟡", bgColor: "rgba(245, 158, 11, 0.15)" },
  "no-signal": { label: "No Signal", color: "#DC2626", icon: "🔴", bgColor: "rgba(220, 38, 38, 0.15)" },
} as const;

/**
 * Returns human-readable GPS quality status with icon.
 * Uses user-friendly messages similar to other GPS tracking software.
 */
function gpsQualityInfo(location: LocationView | undefined, device: DeviceView | undefined): { status: string; color: string; icon: string } {
  const stale = isStaleData(location, device);
  const noFix = hasNoFix(location);
  const ts = location?.ts || device?.lastSeenAt;

  if (!location && !device?.lastSeenAt) {
    return { status: "Never Connected", color: "#6B7280", icon: "○" };
  }
  if (noFix && stale) {
    // Device hasn't reported valid GPS in a while - show "Parked" or time since last seen
    const since = ts ? formatSince(ts) : "";
    return { status: since ? `Parked · ${since} ago` : "Parked", color: "#6B7280", icon: "P" };
  }
  if (noFix) {
    // Device is communicating but no GPS fix - likely indoors or weak signal
    return { status: "Weak Signal", color: "#F59E0B", icon: "◐" };
  }
  if (stale) {
    // Has GPS but data is old
    const since = ts ? formatSince(ts) : "";
    return { status: since ? `Last seen ${since} ago` : "Last seen", color: "#F59E0B", icon: "⏱" };
  }
  return { status: "Live", color: "#16A34A", icon: "●" };
}

// Vehicle marker: ADL-style top-down vehicle rotated to heading, centred on position.
function createVehicleIcon(
  vehicleType: string | null | undefined,
  bodyColor: string,
  rotation: number,
  isSelected: boolean,
  isOverspeed = false,
  noFix = false,
  isMoving = false,
  isStale = false,
  justUpdated = false,
  speed = 0,
): L.DivIcon {
  // ADL renders its 40×60 marker at roughly 24×36; selected gets a little larger.
  const baseSize = isSelected ? 28 : 24;
  const { width, height } = getIconDimensions(baseSize);
  const classes = [
    'pp-vehicle-icon',
    isSelected && 'pp-selected',
    isOverspeed && 'pp-overspeed',
    noFix && 'pp-nofix',
    isStale && 'pp-stale',
    isMoving && !isOverspeed && 'pp-moving',
    justUpdated && 'pp-just-updated',
    // Speed-based intensity classes
    speed > 80 && !isOverspeed && 'pp-very-high-speed',
    speed > 50 && speed <= 80 && !isOverspeed && 'pp-high-speed',
  ].filter(Boolean).join(' ');

  // Add GPS warning badge for nofix or stale (scaled for taller icons)
  const warningBadge = (noFix || isStale) ? `
    <div class="pp-gps-badge" style="
      position: absolute;
      top: -2px;
      right: -2px;
      width: 10px;
      height: 10px;
      background: ${noFix ? '#DC2626' : '#F59E0B'};
      border: 1px solid #0A1928;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 7px;
      font-weight: bold;
      color: white;
      z-index: 10;
    ">${noFix ? '?' : '!'}</div>
  ` : '';

  return L.divIcon({
    html: `<div style="position: relative;">${buildVehicleSvg(vehicleType, isOverspeed ? OVERSPEED_COLOR : bodyColor, rotation, baseSize)}${warningBadge}</div>`,
    className: classes,
    iconSize: [width, height],
    iconAnchor: [width / 2, height / 2], // Center anchor for top-down view
    tooltipAnchor: [0, -noseOffset(baseSize)], // Plate label sits just above the nose
  });
}

// Compact plate label: name, speed chip when moving, GPS warning when not live.
function plateLabelHtml(device: DeviceView | undefined, location: LocationView | LiveLocationView | undefined, stateColor: string): string {
  const text = esc(device?.vehiclePlate || device?.name || device?.imei.slice(-8) || "—");
  const speed = filterSpeed(location?.speed, location?.valid);
  const gpsInfo = gpsQualityInfo(location, device);
  const warning = gpsInfo.status !== "Live"
    ? `<span class="pp-label-gps" style="color:${gpsInfo.color}" title="${esc(gpsInfo.status)}">${gpsInfo.icon}</span>`
    : "";
  const speedChip = speed > 0 ? `<span class="pp-label-speed">${speed}</span>` : "";
  return `<div class="pp-label" style="--state-color:${stateColor}"><span class="pp-label-name">${text}</span>${speedChip}${warning}</div>`;
}

/**
 * Global data freshness indicator showing overall system status.
 * Shows how fresh the most recent GPS data is across user's visible devices only.
 */
function GlobalFreshnessIndicator({
  locations,
  deviceByImei,
  lastRefreshAt,
}: {
  locations: Map<string, LocationView | LiveLocationView>;
  deviceByImei: Map<string, DeviceView>;
  lastRefreshAt?: Date | null;
}) {
  // Find the most recent GPS timestamp across user's visible locations only
  let mostRecentGpsTime = 0;
  let liveCount = 0;
  let staleCount = 0;
  let noSignalCount = 0;

  for (const [imei, loc] of locations.entries()) {
    // Only count locations for devices the user can see
    if (!deviceByImei.has(imei)) continue;

    const gpsTime = new Date(loc.ts).getTime();
    if (gpsTime > mostRecentGpsTime) {
      mostRecentGpsTime = gpsTime;
    }

    const freshness = getFreshnessStatus(loc);
    if (freshness === "live") liveCount++;
    else if (freshness === "stale") staleCount++;
    else noSignalCount++;
  }

  const totalDevices = deviceByImei.size;
  const now = Date.now();
  const secondsAgo = mostRecentGpsTime ? Math.floor((now - mostRecentGpsTime) / 1000) : 999;
  const overallFreshness = getFreshnessStatusFromAge(secondsAgo);
  const config = FRESHNESS_CONFIG[overallFreshness];

  // Determine if we should show "pulsing live" status
  const isLive = secondsAgo < 30;

  if (totalDevices === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {/* Overall system status */}
      <div
        className={`glass-btn flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold ${
          isLive ? "pp-global-live" : ""
        }`}
        style={{ borderColor: `${config.color}40` }}
      >
        <span className="pp-status-dot" style={{ background: config.color }} />
        <span style={{ color: config.color }}>
          {isLive ? "LIVE" : secondsAgo < 60 ? `${secondsAgo}s` : secondsAgo < 3600 ? `${Math.floor(secondsAgo / 60)}m` : "—"}
        </span>
        <span className="text-ink-400">|</span>
        <span className="text-ink-100">
          <span style={{ color: FRESHNESS_CONFIG.live.color }}>{liveCount}</span>
          {" / "}
          <span style={{ color: FRESHNESS_CONFIG.stale.color }}>{staleCount}</span>
          {" / "}
          <span style={{ color: FRESHNESS_CONFIG["no-signal"].color }}>{noSignalCount}</span>
        </span>
      </div>
    </div>
  );
}

/** Helper to get freshness status from seconds age */
function getFreshnessStatusFromAge(secondsAgo: number): FreshnessStatus {
  if (secondsAgo < 30) return "live";
  if (secondsAgo < 60) return "stale";
  return "no-signal";
}

/** Countdown timer for next batch update */
function BatchCountdown({ lastRefreshAt }: { lastRefreshAt: Date | null }) {
  const [secondsLeft, setSecondsLeft] = useState(10);

  useEffect(() => {
    if (!lastRefreshAt) {
      setSecondsLeft(10);
      return;
    }

    const updateCountdown = () => {
      const elapsed = (Date.now() - lastRefreshAt.getTime()) / 1000;
      const remaining = Math.max(0, Math.ceil(10 - elapsed));
      setSecondsLeft(remaining);
    };

    // Update immediately
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [lastRefreshAt]);

  return (
    <div className="glass-btn flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-ink-600">
      <div
        className={`h-1.5 w-1.5 rounded-full ${secondsLeft <= 2 ? "animate-pulse bg-brand-500" : "bg-emerald-500"}`}
      />
      <span>Next update in {secondsLeft}s</span>
    </div>
  );
}

export function FleetMap({ devices, locations, selectedImei, onSelect, onRefresh, lastRefreshAt, showSearch = false, onAdvanceAnimations, leftInset = 0, topInset = 0, bottomInset = 0, driversById }: FleetMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  // Track previous icon state to avoid unnecessary setIcon calls that break CSS transitions
  const iconStateRef = useRef<Map<string, string>>(new Map());
  const initialFitDoneRef = useRef(false);
  const tileLayerRef = useRef<L.GridLayer | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const searchMarkerRef = useRef<L.Marker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const locationsRef = useRef<Map<string, LocationView | LiveLocationView>>(locations);
  const trailsRef = useRef<Map<string, L.Polyline>>(new Map());
  const trailPointsRef = useRef<Map<string, Array<[number, number]>>>(new Map());
  const predictiveMarkersRef = useRef<Map<string, L.CircleMarker>>(new Map());

  const [baseLayer, setBaseLayer] = useState<BaseLayerKind>(getDefaultLayer);
  const [googleAvailable, setGoogleAvailable] = useState(hasGoogleMapsKey);
  const [refreshing, setRefreshing] = useState(false);
  const [locating, setLocating] = useState(false);
  const [showTraffic, setShowTraffic] = useState(false);
  const [trafficAvailable, setTrafficAvailable] = useState(false);
  const showTrafficRef = useRef(showTraffic);
  const [searchQ, setSearchQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [autoFollow, setAutoFollow] = useState(true); // Auto-follow selected vehicle
  const [showTrails, setShowTrails] = useState(false); // Motion trails (off by default, like GoMax)
  const showTrailsRef = useRef(showTrails);
  const [, setTick] = useState(0); // Force re-render every second for freshness timer

  const speedLimits = useSpeedLimits();
  const { t } = useLocale();

  // The floating vehicle panel covers the left edge; popups and fit-to-bounds
  // must pad past it. Kept in a ref so marker callbacks see the latest value.
  const leftInsetRef = useRef(leftInset);
  useEffect(() => {
    leftInsetRef.current = leftInset;
    for (const marker of markersRef.current.values()) {
      const popup = marker.getPopup();
      if (popup) popup.options.autoPanPaddingTopLeft = L.point(leftInset + 20, 70);
    }
  }, [leftInset]);

  const selectedImeiRef = useRef(selectedImei);
  useEffect(() => {
    selectedImeiRef.current = selectedImei;
  }, [selectedImei]);

  /** Plate labels clutter a fleet-wide view: show them zoomed in, or for the selected vehicle. */
  const applyLabelVisibility = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const show = map.getZoom() >= LABEL_MIN_ZOOM;
    for (const [imei, marker] of markersRef.current) {
      const el = marker.getTooltip()?.getElement();
      if (el) el.style.display = show || imei === selectedImeiRef.current ? "" : "none";
    }
  }, []);

  /** After Leaflet (re)renders popup HTML: fill in the address and wire the action bar. */
  const refreshPopupDom = useCallback((marker: L.Marker, imei: string) => {
    const container = marker.getPopup()?.getElement();
    if (!container) return;

    const addressEl = container.querySelector<HTMLElement>(".pp-card-address-text");
    if (addressEl) {
      const latStr = addressEl.dataset.lat ?? "";
      const lat = parseFloat(latStr);
      const lng = parseFloat(addressEl.dataset.lng ?? "");
      if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
        const cached = addressCache.get(addressCacheKey(lat, lng));
        if (cached) {
          addressEl.textContent = cached;
        } else {
          void reverseGeocode(lat, lng).then((address) => {
            const el = container.querySelector<HTMLElement>(".pp-card-address-text");
            if (el && el.dataset.lat === latStr) el.textContent = address;
          });
        }
      }
    }

    container.querySelectorAll<HTMLElement>("[data-action]").forEach((btn) => {
      btn.onclick = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        window.dispatchEvent(new CustomEvent("vehicleAction", { detail: { action: btn.dataset.action, imei } }));
      };
    });
  }, []);

  // Tick every second to update the "X sec ago" freshness display
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((n) => n + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const deviceByImei = useMemo(() => {
    const m = new Map<string, DeviceView>();
    for (const d of devices) m.set(d.imei, d);
    return m;
  }, [devices]);

  // Popup card (ADL-style): header + status line, 2-column data grid,
  // coordinates + address rows, and an action bar. Rendered as raw HTML for
  // Leaflet; refreshPopupDom() wires the buttons after each render.
  const createPopupContent = useCallback((device: DeviceView | undefined, location: LocationView | LiveLocationView | undefined): string => {
    const name = esc(device?.name || device?.vehiclePlate || device?.imei.slice(-8) || "Unknown");
    const imei = device?.imei ?? "";
    const speed = filterSpeed(location?.speed, location?.valid);
    const state: VehicleState = device ? vehicleState(device, location) : "offline";
    const overspeed = device != null && speedLimits.isOverspeed(device.imei, location?.speed);
    const stateColor = overspeed ? OVERSPEED_COLOR : VEHICLE_STATE_COLOR[state];
    const stateLabel = overspeed ? t("popup.overspeed") : STATE_TEXT[state];

    let statusLine: string;
    if (speed > 0) statusLine = `${speed} km/h (${compassLabel(location?.course)}, ${stateLabel})`;
    else if ((state === "stopped" || state === "idle") && device?.parkedSince) statusLine = `${stateLabel} · ${formatCompactDuration(device.parkedSince)}`;
    else if (state === "offline" && device?.lastSeenAt) statusLine = `${stateLabel} · ${formatCompactDuration(device.lastSeenAt)}`;
    else statusLine = stateLabel;

    const acc = location?.accOn == null ? "—" : location.accOn ? "ON" : "OFF";
    const accColor = location?.accOn ? "#16a34a" : "#6b7280";
    const fix = !location ? "—" : location.valid ? "GPS" : t("fleet.cellFallback");
    const voltage = location?.voltageMv ?? device?.lastVoltageMv;
    const power = voltage != null ? `${(voltage / 1000).toFixed(1)} V` : "—";
    const battery = formatBatteryPercent(voltage);
    const mileage = location?.mileageMeters != null ? `${Math.round(location.mileageMeters / 1000).toLocaleString("en-US")} km` : "—";
    const sats = location?.satellites != null ? String(location.satellites) : "—";
    const lat = location?.latitude;
    const lng = location?.longitude;
    const hasPos = lat != null && lng != null;
    const coords = hasPos ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : "—";
    const address = hasPos ? addressCache.get(addressCacheKey(lat, lng)) ?? t("popup.loadingAddress") : "—";

    const cell = (icon: string, label: string, value: string, color?: string) =>
      `<div class="pp-card-cell">${icon}<div class="pp-card-cell-body"><div class="pp-card-cell-label">${label}</div><div class="pp-card-cell-value"${color ? ` style="color:${color}"` : ""}>${value}</div></div></div>`;
    const action = (id: string, icon: string, label: string) =>
      `<button type="button" class="pp-card-action" data-action="${id}" title="${label}">${icon}<span>${label}</span></button>`;

    return `
      <div class="pp-card">
        <div class="pp-card-head">
          <span class="pp-card-name" title="${name}">${name}</span>
          <button type="button" class="pp-card-edit" data-action="edit" title="${t("act.edit")}">${ICON.pencil}</button>
        </div>
        <div class="pp-card-status">
          <span class="pp-card-imei">${imei}</span>
          <span class="pp-card-state" style="color:${stateColor}">${esc(statusLine)}</span>
          <span class="pp-card-dot" style="background:${stateColor}"></span>
        </div>
        <div class="pp-card-grid">
          ${cell(ICON.user, t("popup.driver"), esc((device?.driverId && driversById?.get(device.driverId)) || "—"))}
          ${cell(ICON.key, t("popup.acc"), acc, accColor)}
          ${cell(ICON.clock, t("popup.gpsTime"), formatDateTime(location?.ts))}
          ${cell(ICON.signal, t("popup.fix"), fix)}
          ${cell(ICON.plug, t("popup.power"), power)}
          ${cell(ICON.battery, t("popup.battery"), battery)}
          ${cell(ICON.road, t("popup.mileage"), mileage)}
          ${cell(ICON.sat, t("popup.satellites"), sats)}
        </div>
        <div class="pp-card-row">${ICON.globe}<span class="pp-card-coords">${coords}</span></div>
        <div class="pp-card-row pp-card-addr">${ICON.pin}<span class="pp-card-address-text" data-lat="${hasPos ? lat : ""}" data-lng="${hasPos ? lng : ""}">${esc(address)}</span></div>
        <div class="pp-card-actions">
          ${action("playback", ICON.history, t("act.playback"))}
          ${action("live", ICON.live, t("act.live"))}
          ${action("navigate", ICON.navigate, t("act.navigate"))}
          ${action("geofence", ICON.fence, t("act.geofence"))}
          ${action("streetview", ICON.street, t("act.streetView"))}
          ${action("command", ICON.terminal, t("act.command"))}
          ${action("share", ICON.share, t("act.share"))}
          ${action("details", ICON.doc, t("act.details"))}
        </div>
      </div>`;
  }, [speedLimits, t, driversById]);

  // Init map once
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const container = containerRef.current;

    const map = L.map(container, {
      center: DHAKA_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false, // We use our own MapToolbar instead
      minZoom: 3,         // Prevent zooming out too far
      maxZoom: 18,        // GoMax-style: limit max zoom to prevent excessive detail
    });

    mapRef.current = map;
    // markercluster (re)attaches markers on moveend, after zoomend — run the
    // label pass on both so freshly attached tooltips honour the zoom rule.
    map.on("zoomend moveend", applyLabelVisibility);

    // Initialize marker cluster group (ADL-style grouping)
    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 50, // Cluster markers within 50px
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      disableClusteringAtZoom: 16, // Show individual markers at zoom 16+
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let size = 'small';
        let dimension = 36;
        if (count >= 100) {
          size = 'large';
          dimension = 50;
        } else if (count >= 10) {
          size = 'medium';
          dimension = 42;
        }
        return L.divIcon({
          html: `<div class="pp-cluster pp-cluster-${size}"><span>${count}</span></div>`,
          className: 'pp-cluster-icon',
          iconSize: L.point(dimension, dimension),
        });
      },
    });
    clusterGroup.addTo(map);
    clusterGroup.on("animationend", applyLabelVisibility);
    clusterGroupRef.current = clusterGroup;

    // Force map to recalculate size after a brief delay (container may not have final dimensions yet)
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    // Also use ResizeObserver to handle container size changes
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(container);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      clusterGroup.clearLayers();
      clusterGroupRef.current = null;
      for (const marker of markersRef.current.values()) marker.remove();
      markersRef.current.clear();
      iconStateRef.current.clear();
      // A new map instance (StrictMode double-mount, remount) must fit the fleet again.
      initialFitDoneRef.current = false;
      map.remove();
      mapRef.current = null;
    };
  }, [applyLabelVisibility]);

  // Base layer (all 5 types). Owns the tile layer so the dropdown can swap it;
  // runs on mount to create the initial layer too.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;
    createBaseLayer(baseLayer).then((layer) => {
      // Guard: toggle changed again or map unmounted while Google API loaded.
      if (cancelled || mapRef.current !== map) return;
      tileLayerRef.current?.remove();
      layer.addTo(map);
      layer.bringToBack();
      tileLayerRef.current = layer;
      // Traffic only exists on the Google base layer, not the OSM fallback.
      const supportsTraffic = layerSupportsTraffic(layer);
      setTrafficAvailable(supportsTraffic);
      setGoogleAvailable(supportsTraffic || hasGoogleMapsKey());
      setLayerTraffic(layer, showTrafficRef.current);
    });
    return () => {
      cancelled = true;
    };
  }, [baseLayer]);

  // Toggle Google's live traffic overlay on the current base layer.
  useEffect(() => {
    showTrafficRef.current = showTraffic;
    setLayerTraffic(tileLayerRef.current, showTraffic);
  }, [showTraffic]);

  // Sync showTrailsRef with showTrails state for animation loop access
  useEffect(() => {
    showTrailsRef.current = showTrails;
  }, [showTrails]);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const handleLocate = useCallback(() => {
    const map = mapRef.current;
    if (!map || typeof navigator === "undefined" || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        map.setView([latitude, longitude], Math.max(map.getZoom(), 15), { animate: true });
        const icon = L.divIcon({
          html: '<div style="width:14px;height:14px;border-radius:50%;background:#2B82D4;border:3px solid #fff;box-shadow:0 0 0 2px rgba(43,130,212,.4)"></div>',
          className: "pp-user-loc",
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        if (userMarkerRef.current) userMarkerRef.current.setLatLng([latitude, longitude]);
        else userMarkerRef.current = L.marker([latitude, longitude], { icon, interactive: false }).addTo(map);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  // Fit map to show all vehicles
  const handleFitAll = useCallback(() => {
    const map = mapRef.current;
    if (!map || locations.size === 0) return;

    const pts: Array<[number, number]> = [];
    for (const l of locations.values()) pts.push([l.latitude, l.longitude]);

    const optimalZoom = calculateFitZoom(pts);

    if (pts.length === 1) {
      map.setView(pts[0], optimalZoom, { animate: true });
    } else {
      const bounds = expandBounds(pts, 0.005);
      if (bounds) {
        map.fitBounds(bounds, {
          paddingTopLeft: [leftInsetRef.current + 40, 70],
          paddingBottomRight: [40, 60],
          maxZoom: optimalZoom,
          animate: true,
        });
      }
    }
  }, [locations]);

  // Sync markers with locations
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const seen = new Set<string>();

    for (const [imei, loc] of locations.entries()) {
      const device = deviceByImei.get(imei);
      // Skip locations for devices the user doesn't have access to
      if (!device) {
        // Remove any existing marker for this device
        const existingMarker = markersRef.current.get(imei);
        if (existingMarker) {
          if (clusterGroupRef.current) {
            clusterGroupRef.current.removeLayer(existingMarker);
          } else {
            existingMarker.remove();
          }
          markersRef.current.delete(imei);
        }
        continue;
      }
      seen.add(imei);
      const isOverspeed = speedLimits.isOverspeed(imei, loc.speed);
      const color = isOverspeed ? OVERSPEED_COLOR : markerColor(device, loc);
      const isSelected = imei === selectedImei;
      let marker = markersRef.current.get(imei);

      const course = loc.course ?? 0;
      // ADL-style: the marker body is tinted by state (green / blue / grey),
      // not by a per-device colour, so the map reads at a glance.
      const bodyColor = MARKER_BODY_COLOR[vehicleState(device, loc)];
      const noFix = hasNoFix(loc);
      const isStale = isStaleData(loc, device);
      const isMoving = filterSpeed(loc.speed, loc.valid) > 0; // Moving if speed above noise threshold
      const justUpdated = isJustUpdated(loc);

      // Create a key for icon state to detect changes (skip justUpdated as it's transient)
      const iconStateKey = `${device?.vehicleType || ''}|${bodyColor}|${Math.round(course / 10)}|${isSelected}|${isOverspeed}|${noFix}|${isMoving}|${isStale}`;

      if (!marker) {
        // Create new marker
        const icon = createVehicleIcon(device?.vehicleType, bodyColor, course, isSelected, isOverspeed, noFix, isMoving, isStale, justUpdated, filterSpeed(loc.speed, loc.valid));
        marker = L.marker([loc.latitude, loc.longitude], { icon })
          .bindPopup(createPopupContent(device, loc), {
            maxWidth: 380,
            className: 'pp-popup-container',
            autoPanPaddingTopLeft: L.point(leftInsetRef.current + 20, 70),
            autoPanPaddingBottomRight: L.point(20, 40),
          })
          .bindTooltip(plateLabelHtml(device, loc, color), {
            permanent: true,
            direction: 'top',
            offset: [0, -4],
            className: 'pp-plate-tooltip',
          });

        // Add to cluster group instead of directly to map (ADL-style grouping)
        if (clusterGroupRef.current) {
          clusterGroupRef.current.addLayer(marker);
        } else {
          marker.addTo(map);
        }

        marker.on('click', () => {
          onSelect(imei);
        });

        const currentMarker = marker; // Capture for closure
        currentMarker.on('popupopen', () => {
          const popup = currentMarker.getPopup();
          if (popup) {
            // Pan into view once on open; content refreshes every few seconds
            // must not yank the map around while the user reads the card.
            window.setTimeout(() => { popup.options.autoPan = false; }, 400);
          }
          refreshPopupDom(currentMarker, imei);
        });
        currentMarker.on('popupclose', () => {
          const popup = currentMarker.getPopup();
          if (popup) popup.options.autoPan = true;
        });

        markersRef.current.set(imei, marker);
        iconStateRef.current.set(imei, iconStateKey);
      } else {
        // Update existing marker - GoMax style: update position directly, CSS transition handles smooth animation
        // ONLY update icon if state actually changed (prevents DOM replacement that breaks CSS transitions)
        const prevIconState = iconStateRef.current.get(imei);
        if (prevIconState !== iconStateKey) {
          marker.setIcon(createVehicleIcon(device?.vehicleType, bodyColor, course, isSelected, isOverspeed, noFix, isMoving, isStale, justUpdated, filterSpeed(loc.speed, loc.valid)));
          iconStateRef.current.set(imei, iconStateKey);
        }
        marker.setPopupContent(createPopupContent(device, loc));
        marker.setTooltipContent(plateLabelHtml(device, loc, color));
        if (marker.isPopupOpen()) refreshPopupDom(marker, imei);

        // Update position - CSS transition will animate smoothly
        const currentLatLng = marker.getLatLng();
        if (currentLatLng.lat !== loc.latitude || currentLatLng.lng !== loc.longitude) {
          marker.setLatLng([loc.latitude, loc.longitude]);
        }

        // Auto-follow: pan map to keep selected vehicle in view when position changes
        if (autoFollow && isSelected && map) {
          const bounds = map.getBounds();
          const point = L.latLng(loc.latitude, loc.longitude);
          // Only pan if vehicle moved outside visible area (with some padding)
          const paddedBounds = bounds.pad(-0.2); // 20% padding from edges
          if (!paddedBounds.contains(point)) {
            map.panTo(point, { animate: true, duration: 0.5 });
          }
        }
      }
    }

    // Remove markers whose device disappeared from snapshot
    for (const [imei, marker] of markersRef.current.entries()) {
      if (!seen.has(imei)) {
        if (clusterGroupRef.current) {
          clusterGroupRef.current.removeLayer(marker);
        } else {
          marker.remove();
        }
        markersRef.current.delete(imei);
        iconStateRef.current.delete(imei);
        // Also clean up trails and predictive markers
        const trail = trailsRef.current.get(imei);
        if (trail) {
          trail.remove();
          trailsRef.current.delete(imei);
        }
        trailPointsRef.current.delete(imei);
        const predictive = predictiveMarkersRef.current.get(imei);
        if (predictive) {
          predictive.remove();
          predictiveMarkersRef.current.delete(imei);
        }
      }
    }

    applyLabelVisibility();

    // First-load fit-to-bounds — dynamically zoom based on vehicle spread
    if (!initialFitDoneRef.current && locations.size > 0) {
      const pts: Array<[number, number]> = [];
      for (const l of locations.values()) pts.push([l.latitude, l.longitude]);

      // Calculate optimal zoom: close for 1 vehicle, wider for spread-out fleet
      const optimalZoom = calculateFitZoom(pts);

      if (pts.length === 1) {
        // Single vehicle: center directly with close zoom
        map.setView(pts[0], optimalZoom, { animate: false });
      } else {
        // Multiple vehicles: fit bounds with dynamic maxZoom
        const bounds = expandBounds(pts, 0.005); // smaller padding for tighter fit
        if (bounds) {
          map.fitBounds(bounds, {
            paddingTopLeft: [leftInsetRef.current + 40, 70],
            paddingBottomRight: [40, 60],
            maxZoom: optimalZoom,
          });
        }
      }
      initialFitDoneRef.current = true;
    }
  }, [locations, deviceByImei, selectedImei, onSelect, createPopupContent, speedLimits, autoFollow, applyLabelVisibility, refreshPopupDom]);

  // Keep locationsRef in sync with state (doesn't trigger animation restart)
  useEffect(() => {
    locationsRef.current = locations;
  }, [locations]);

  // 60fps animation loop for smooth marker interpolation between batch updates
  // Uses ref to avoid restarting on every state change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let running = true;
    let frameCount = 0;

    // Maximum trail points to keep (fades out older points)
    const MAX_TRAIL_POINTS = 15;
    // Minimum distance (meters) between trail points to avoid clustering
    const MIN_TRAIL_DISTANCE = 5;

    // Calculate distance between two points in meters (Haversine approximation)
    const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
      const R = 6371000; // Earth's radius in meters
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    // Create or update trail polyline with gradient effect
    const updateTrail = (imei: string, points: Array<[number, number]>, speed: number) => {
      const existingTrail = trailsRef.current.get(imei);

      if (points.length < 2) {
        // Remove trail if less than 2 points
        if (existingTrail) {
          existingTrail.remove();
          trailsRef.current.delete(imei);
        }
        return;
      }

      // Speed-based trail color: green for slow, orange for medium, red for fast
      const trailColor = speed > 60 ? '#DC2626' : speed > 30 ? '#E8900A' : '#16A34A';
      const trailOpacity = Math.min(0.8, 0.3 + (speed / 100));

      if (existingTrail) {
        existingTrail.setLatLngs(points);
        existingTrail.setStyle({ color: trailColor, opacity: trailOpacity });
      } else {
        const trail = L.polyline(points, {
          color: trailColor,
          weight: 3,
          opacity: trailOpacity,
          lineCap: 'round',
          lineJoin: 'round',
          className: 'pp-motion-trail',
        }).addTo(map);
        trail.bringToBack();
        trailsRef.current.set(imei, trail);
      }
    };

    // Create predictive position marker (ghost showing where vehicle is heading)
    const updatePredictiveMarker = (imei: string, lat: number, lng: number, course: number, speed: number) => {
      if (speed < 5) {
        // Remove predictive marker if vehicle is slow/stopped
        const existing = predictiveMarkersRef.current.get(imei);
        if (existing) {
          existing.remove();
          predictiveMarkersRef.current.delete(imei);
        }
        return;
      }

      // Calculate predicted position (3 seconds ahead based on speed and course)
      const predictSeconds = 3;
      const distanceM = (speed * 1000 / 3600) * predictSeconds; // meters in predictSeconds
      const R = 6371000; // Earth's radius in meters
      const courseRad = course * Math.PI / 180;

      const lat1 = lat * Math.PI / 180;
      const lng1 = lng * Math.PI / 180;

      const lat2 = Math.asin(
        Math.sin(lat1) * Math.cos(distanceM / R) +
        Math.cos(lat1) * Math.sin(distanceM / R) * Math.cos(courseRad)
      );
      const lng2 = lng1 + Math.atan2(
        Math.sin(courseRad) * Math.sin(distanceM / R) * Math.cos(lat1),
        Math.cos(distanceM / R) - Math.sin(lat1) * Math.sin(lat2)
      );

      const predictedLat = lat2 * 180 / Math.PI;
      const predictedLng = lng2 * 180 / Math.PI;

      const existing = predictiveMarkersRef.current.get(imei);
      if (existing) {
        existing.setLatLng([predictedLat, predictedLng]);
      } else {
        const predictiveMarker = L.circleMarker([predictedLat, predictedLng], {
          radius: 4,
          color: '#E8900A',
          fillColor: '#E8900A',
          fillOpacity: 0.4,
          weight: 2,
          opacity: 0.6,
          className: 'pp-predictive-marker',
        }).addTo(map);
        predictiveMarker.bringToBack();
        predictiveMarkersRef.current.set(imei, predictiveMarker);
      }
    };

    const animate = () => {
      if (!running) return;

      const currentLocations = locationsRef.current;
      if (currentLocations.size === 0) {
        // No locations yet, keep polling
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      frameCount++;

      // GoMax-style: NO JavaScript position interpolation
      // Marker positions are updated in the marker sync useEffect when data changes
      // CSS transitions handle the smooth animation automatically

      // Only handle trail updates if enabled (every 30 frames = ~2/sec to reduce load)
      if (showTrailsRef.current && frameCount % 30 === 0) {
        for (const [imei, loc] of currentLocations.entries()) {
          const marker = markersRef.current.get(imei);
          if (!marker) continue;

          const currentLatLng = marker.getLatLng();
          const currentLat = currentLatLng.lat;
          const currentLng = currentLatLng.lng;
          const speed = filterSpeed(loc.speed, loc.valid);

          if (speed > 3) {
            const trailPoints = trailPointsRef.current.get(imei) || [];
            const lastPoint = trailPoints[trailPoints.length - 1];

            // Only add point if moved minimum distance (avoid clustering)
            if (!lastPoint || getDistance(lastPoint[0], lastPoint[1], currentLat, currentLng) > MIN_TRAIL_DISTANCE) {
              trailPoints.push([currentLat, currentLng]);

              // Keep only recent points (creates fading trail effect)
              while (trailPoints.length > MAX_TRAIL_POINTS) {
                trailPoints.shift();
              }

              trailPointsRef.current.set(imei, trailPoints);
              updateTrail(imei, trailPoints, speed);
            }

            // Update predictive marker
            updatePredictiveMarker(imei, currentLat, currentLng, loc.course ?? 0, speed);
          } else {
            // Clear trail when vehicle stops
            const trail = trailsRef.current.get(imei);
            if (trail) {
              trail.remove();
              trailsRef.current.delete(imei);
            }
            trailPointsRef.current.delete(imei);

            // Clear predictive marker
            const predictive = predictiveMarkersRef.current.get(imei);
            if (predictive) {
              predictive.remove();
              predictiveMarkersRef.current.delete(imei);
            }
          }
        }
      } else if (!showTrailsRef.current && frameCount % 60 === 0) {
        // Clean up trails if disabled (once per second)
        for (const [imei] of currentLocations.entries()) {
          const trail = trailsRef.current.get(imei);
          if (trail) {
            trail.remove();
            trailsRef.current.delete(imei);
          }
          trailPointsRef.current.delete(imei);
          const predictive = predictiveMarkersRef.current.get(imei);
          if (predictive) {
            predictive.remove();
            predictiveMarkersRef.current.delete(imei);
          }
        }
      }

      // Always continue the animation loop (don't stop between batches)
      // This prevents markers from vanishing when animation finishes
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Start animation loop once and keep it running
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      running = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      // Cleanup trails and predictive markers
      for (const trail of trailsRef.current.values()) {
        trail.remove();
      }
      trailsRef.current.clear();
      for (const pred of predictiveMarkersRef.current.values()) {
        pred.remove();
      }
      predictiveMarkersRef.current.clear();
    };
  }, [onAdvanceAnimations]); // Only restart if onAdvanceAnimations changes (it shouldn't)

  // Address search (Nominatim; biased to the current viewport). Free, no key —
  // matches the OSM fallback strategy of lib/leaflet.ts.
  const runSearch = useCallback(async () => {
    const q = searchQ.trim();
    if (!q) return;
    setSearching(true);
    try {
      let url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`;
      const map = mapRef.current;
      if (map) {
        const b = map.getBounds();
        url += `&viewbox=${b.getWest()},${b.getNorth()},${b.getEast()},${b.getSouth()}`;
      }
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const data = (await res.json()) as Array<{ display_name: string; lat: string; lon: string }>;
      setSearchResults(
        data.map((r) => ({ label: r.display_name, lat: parseFloat(r.lat), lng: parseFloat(r.lon) })),
      );
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchQ]);

  const gotoSearchResult = useCallback((r: GeocodeResult) => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([r.lat, r.lng], Math.max(map.getZoom(), 16), { animate: true });
    const icon = L.divIcon({
      html: '<div class="pp-search-pin"></div>',
      className: "",
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
    if (searchMarkerRef.current) searchMarkerRef.current.setLatLng([r.lat, r.lng]);
    else searchMarkerRef.current = L.marker([r.lat, r.lng], { icon, interactive: false }).addTo(map);
    setSearchResults([]);
  }, []);

  // Track previous selection to avoid re-opening popup on refresh
  const prevSelectedImeiRef = useRef<string | null>(null);

  // Selection (list row, top-bar search, deep link): bring the vehicle into
  // view and highlight it. The info card is NOT opened here — it only opens
  // when the marker itself is clicked (Leaflet's default), so picking a row
  // in the list stays a quiet "show me where it is". Only runs when the
  // selection changes, never on the periodic position refresh.
  useEffect(() => {
    if (!selectedImei) {
      prevSelectedImeiRef.current = null;
      applyLabelVisibility();
      return;
    }
    const map = mapRef.current;
    const loc = locations.get(selectedImei);
    const marker = markersRef.current.get(selectedImei);
    if (map && loc && prevSelectedImeiRef.current !== selectedImei) {
      prevSelectedImeiRef.current = selectedImei;
      const point = L.latLng(loc.latitude, loc.longitude);
      if (map.getZoom() < LABEL_MIN_ZOOM) {
        map.setView(point, 15, { animate: true });
      } else if (!map.getBounds().pad(-0.15).contains(point)) {
        map.panTo(point, { animate: true });
      }
      // If the vehicle is hidden inside a cluster, expand it so the marker is visible.
      if (marker && clusterGroupRef.current) {
        clusterGroupRef.current.zoomToShowLayer(marker, () => applyLabelVisibility());
      }
    }
    applyLabelVisibility();
  }, [selectedImei, locations, applyLabelVisibility]);

  return (
    <div className="relative h-full w-full" style={{ minHeight: "400px" }}>
      <div ref={containerRef} className="absolute inset-0" style={{ width: "100%", height: "100%" }} />

      {/* Map toolbar (right edge, below the layer controls) — zoom, measure, fit all, locate */}
      <MapToolbar
        map={mapRef.current}
        onFitAll={handleFitAll}
        onLocate={handleLocate}
        locating={locating}
        disabled={locations.size === 0}
        className="right-3"
        style={{ top: 56 + topInset }}
      />

      {/* Address search (top-left, beside toolbar when enabled) - Glassy */}
      {showSearch && (
        <div className={`absolute left-14 z-[1000] w-64 ${lastRefreshAt ? "top-10" : "top-3"}`}>
          <div className="glass-btn flex overflow-hidden rounded-xl">
            <input
              type="search"
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[13px] text-ink-900 outline-none placeholder:text-ink-400"
              placeholder="Search address…"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void runSearch();
                if (e.key === "Escape") setSearchResults([]);
              }}
            />
            <button
              type="button"
              onClick={() => void runSearch()}
              disabled={searching || !searchQ.trim()}
              className="px-3 text-ink-500 transition hover:text-ink-900 disabled:opacity-50"
              title="Search"
            >
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round"
                className={searching ? "animate-pulse" : ""}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          </div>
          {searchResults.length > 0 && (
            <ul className="glass-panel mt-2 max-h-56 overflow-y-auto rounded-xl">
              {searchResults.map((r, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => gotoSearchResult(r)}
                    className="block w-full border-b border-surface-200/50 px-3 py-2 text-left text-[12px] text-ink-700 transition last:border-b-0 hover:bg-white/60"
                  >
                    {r.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Map controls (top-right) — Auto-follow + Traffic + Layer dropdown */}
      <div className="absolute right-3 z-[1000] flex items-center gap-2" style={{ top: 12 + topInset }}>
        {/* Auto-follow toggle - only show when a vehicle is selected */}
        {selectedImei && (
          <label
            className={`glass-btn flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold transition ${
              autoFollow
                ? "!bg-brand-500/90 !border-brand-400/50 text-white"
                : "text-ink-900"
            }`}
            title={autoFollow ? "Map follows selected vehicle" : "Click to follow selected vehicle"}
          >
            <input
              type="checkbox"
              checked={autoFollow}
              onChange={(e) => setAutoFollow(e.target.checked)}
              className="sr-only"
            />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Follow
          </label>
        )}
        {trafficAvailable && (
          <label className="glass-btn flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold text-ink-900">
            <input
              type="checkbox"
              checked={showTraffic}
              onChange={(e) => setShowTraffic(e.target.checked)}
              className="h-3.5 w-3.5 accent-brand-500"
            />
            Traffic
          </label>
        )}
        <MapLayerDropdown
          currentLayer={baseLayer}
          onChange={setBaseLayer}
          googleAvailable={googleAvailable}
        />
      </div>

      {/* Bottom-right status row: refresh countdown + global data freshness */}
      <div className="absolute right-16 z-[1000] flex items-center gap-2" style={{ bottom: 24 + bottomInset }}>
        {/* The freshness pill already carries the countdown; on phones the text version doesn't fit. */}
        {lastRefreshAt && (
          <div className="hidden sm:block">
            <BatchCountdown lastRefreshAt={lastRefreshAt} />
          </div>
        )}
        <GlobalFreshnessIndicator locations={locations} deviceByImei={deviceByImei} lastRefreshAt={lastRefreshAt} />
      </div>

      {/* Refresh button (bottom-right) - Glassy */}
      <div className="absolute right-3 z-[1000]" style={{ bottom: 24 + bottomInset }}>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={!onRefresh || refreshing}
          title="Refresh positions"
          className="glass-btn flex h-10 w-10 items-center justify-center rounded-xl text-ink-700 disabled:opacity-60"
        >
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={refreshing ? "animate-spin" : ""}
          >
            <path d="M23 4v6h-6M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </div>

      <style jsx global>{`
        .pp-vehicle-icon {
          transition: transform 300ms ease-out;
        }
        /* GoMax-style smooth position transitions - CSS handles the animation */
        .leaflet-marker-icon {
          transition: transform 1s ease-out !important;
        }
        .leaflet-marker-pane .leaflet-marker-icon {
          will-change: transform;
        }
        .pp-vehicle-icon.pp-selected {
          filter: drop-shadow(0 0 6px #0421bc);
          z-index: 1000 !important;
        }
        /* Overspeed: red marker that blinks until speed drops below the rule threshold */
        .pp-vehicle-icon.pp-overspeed {
          animation: pp-blink 1s step-start infinite;
          filter: drop-shadow(0 0 6px #dc2626);
        }
        @keyframes pp-blink {
          50% {
            opacity: 0.25;
          }
        }
        /* Moving vehicles carry no glow (ADL look): the green body says it all. */

        /* Motion trail effect - fading polyline behind moving vehicles */
        .pp-motion-trail {
          pointer-events: none;
          filter: blur(0.5px);
        }

        /* Predictive marker - ghost showing where vehicle is heading */
        .pp-predictive-marker {
          pointer-events: none;
          animation: pp-predictive-pulse 1.5s ease-in-out infinite;
        }
        @keyframes pp-predictive-pulse {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.3);
          }
        }

        /* Speed no longer changes the marker treatment; overspeed (rule-based) still blinks red. */
        /* No GPS fix: the marker sits on the last confirmed position, so mute it
           and ring it to distinguish "stale coordinates" from a live vehicle. */
        .pp-vehicle-icon.pp-nofix {
          opacity: 0.55;
        }
        .pp-vehicle-icon.pp-nofix::after {
          content: '';
          position: absolute;
          inset: -4px;
          border: 2px dashed #DC2626;
          border-radius: 50%;
          pointer-events: none;
          animation: pp-nofix-pulse 1.5s ease-in-out infinite;
        }
        @keyframes pp-nofix-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        /* Stale data: position may be outdated */
        .pp-vehicle-icon.pp-stale {
          opacity: 0.65;
        }
        .pp-vehicle-icon.pp-stale::after {
          content: '';
          position: absolute;
          inset: -4px;
          border: 2px dashed #F59E0B;
          border-radius: 50%;
          pointer-events: none;
        }
        /* GPS warning badge on vehicle icon */
        .pp-gps-badge {
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .pp-search-pin {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #e8900a;
          border: 3px solid #fff;
          box-shadow: 0 0 0 2px rgba(232, 144, 10, 0.45);
        }
        /* Compact plate label: light pill with a state-colored edge */
        .pp-plate-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .pp-plate-tooltip::before {
          display: none !important;
        }
        .pp-label {
          display: inline-flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid rgba(15, 23, 42, 0.12);
          border-left: 3px solid var(--state-color);
          border-radius: 5px;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
          overflow: hidden;
          white-space: nowrap;
        }
        .pp-label-name {
          color: #1f2937;
          font-family: var(--font-inter), 'Inter', -apple-system, sans-serif;
          font-size: 12px;
          font-weight: 600;
          line-height: 1;
          padding: 4px 6px;
        }
        .pp-label-speed {
          color: #fff;
          background: var(--state-color);
          font-family: var(--font-jetbrains), 'JetBrains Mono', monospace;
          font-variant-numeric: tabular-nums;
          font-size: 11px;
          font-weight: 600;
          line-height: 1;
          padding: 4px 5px;
        }
        .pp-label-speed::after {
          content: ' km/h';
          font-weight: 500;
          opacity: 0.85;
        }
        .pp-label-gps {
          display: inline-flex;
          align-items: center;
          padding: 0 5px;
          font-size: 11px;
        }
        /* Just updated vehicle marker - bright glow pulse */
        .pp-vehicle-icon.pp-just-updated {
          animation: pp-data-arrived 0.8s ease-out;
        }
        @keyframes pp-data-arrived {
          0% {
            filter: drop-shadow(0 0 12px rgba(22, 163, 74, 1)) brightness(1.3);
            transform: scale(1.15);
          }
          100% {
            filter: drop-shadow(0 0 4px rgba(22, 163, 74, 0.6));
            transform: scale(1);
          }
        }
        /* Global freshness indicator */
        .pp-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          box-shadow: 0 0 4px currentColor;
        }
        .pp-global-live .pp-status-dot {
          animation: pp-status-pulse 1.5s ease-in-out infinite;
        }
        @keyframes pp-status-pulse {
          0%, 100% {
            box-shadow: 0 0 4px #16A34A;
            opacity: 1;
          }
          50% {
            box-shadow: 0 0 12px #16A34A, 0 0 20px rgba(22, 163, 74, 0.5);
            opacity: 0.8;
          }
        }

        /* Popup card (ADL-style) */
        .pp-popup-container .leaflet-popup-content-wrapper {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 0;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.08);
          overflow: hidden;
        }
        .pp-popup-container .leaflet-popup-content {
          margin: 0;
          width: auto !important;
        }
        .pp-popup-container .leaflet-popup-close-button {
          color: #6b7280 !important;
          font-size: 18px;
          width: 26px;
          height: 26px;
          right: 6px;
          top: 6px;
          border-radius: 6px;
          transition: all 0.2s ease;
        }
        .pp-popup-container .leaflet-popup-close-button:hover {
          color: #1f2937 !important;
          background: #f3f4f6;
        }
        .pp-popup-container .leaflet-popup-tip {
          background: #ffffff;
          box-shadow: none;
        }
        .pp-card {
          width: 352px;
          font-family: var(--font-inter), 'Inter', -apple-system, sans-serif;
          font-variant-numeric: tabular-nums;
          color: #1f2937;
        }
        .pp-card-head {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 36px 0 14px;
        }
        .pp-card-name {
          font-size: 15px;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pp-card-edit {
          display: inline-flex;
          border: 0;
          background: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 2px;
          border-radius: 4px;
        }
        .pp-card-edit:hover {
          color: #0421bc;
          background: #e8ebff;
        }
        .pp-card-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 14px 8px;
          border-bottom: 1px solid #f1f5f9;
        }
        .pp-card-imei {
          font-family: var(--font-jetbrains), 'JetBrains Mono', monospace;
          font-size: 12px;
          font-weight: 600;
          color: #374151;
        }
        .pp-card-state {
          margin-left: auto;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pp-card-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          flex-shrink: 0;
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9);
        }
        .pp-card-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px 10px;
          padding: 10px 14px 6px;
        }
        .pp-card-cell {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .pp-card-cell > svg {
          flex-shrink: 0;
          color: #94a3b8;
        }
        .pp-card-cell-body {
          min-width: 0;
        }
        .pp-card-cell-label {
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #7e8792;
          line-height: 1.2;
        }
        .pp-card-cell-value {
          font-size: 13px;
          font-weight: 600;
          color: #1f2937;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.3;
        }
        .pp-card-row {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 4px 14px;
          font-size: 12px;
          color: #4b5563;
        }
        .pp-card-row > svg {
          flex-shrink: 0;
          color: #94a3b8;
          margin-top: 1px;
        }
        .pp-card-coords {
          font-family: var(--font-jetbrains), 'JetBrains Mono', monospace;
          font-size: 12px;
        }
        .pp-card-addr {
          padding-bottom: 8px;
          line-height: 1.35;
        }
        .pp-card-actions {
          display: flex;
          border-top: 1px solid #e5e7eb;
          background: #f8fafc;
        }
        .pp-card-action {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          padding: 8px 0 7px;
          border: 0;
          background: none;
          color: #475569;
          cursor: pointer;
          font-family: var(--font-inter), 'Inter', -apple-system, sans-serif;
          font-size: 11px;
          font-weight: 500;
          transition: background 0.15s, color 0.15s;
        }
        .pp-card-action > svg {
          width: 16px;
          height: 16px;
        }
        .pp-card-action:hover {
          background: #e8ebff;
          color: #0421bc;
        }
        .pp-card-action + .pp-card-action {
          border-left: 1px solid #eef2f7;
        }

        /* Mobile responsive */
        @media (max-width: 640px) {
          .pp-card {
            width: min(352px, 86vw);
          }
          .pp-card-action > span {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
