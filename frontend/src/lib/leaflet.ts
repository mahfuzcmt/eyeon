// Centralized Leaflet config so the dashboard, geofence editor, and trip
// playback share tile provider + Bangladesh defaults.

import L from "leaflet";

// OpenStreetMap tiles (free, no API key needed)
export const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// Alternative: CartoDB light/dark themes (also free)
export const TILE_URL_LIGHT = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
export const TILE_URL_DARK = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
export const CARTO_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Satellite imagery (Esri World Imagery — free with attribution). Powers the
// AutoNemo-style Normal/Satellite map-view toggle.
export const TILE_URL_SATELLITE =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
export const SATELLITE_ATTRIBUTION =
  "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";

// ---------------------------------------------------------------------------
// Base layer factory — Google Maps when a key is configured, OSM/Esri fallback.
//
// OSM's Bangladesh coverage misses roads/buildings/POIs, so production uses the
// official Google Maps JS API rendered as a Leaflet layer via the GoogleMutant
// plugin (ToS-compliant: it embeds the real Google map, billed as Dynamic Map
// loads). Without NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (e.g. local dev) we fall
// back to the previous free OSM + Esri satellite tiles so maps still render.
// ---------------------------------------------------------------------------

// Key state lives in lib/googleMapsKey.ts (no Leaflet import, safe for SSR); re-exported here.
import { getGoogleMapsApiKey } from "./googleMapsKey";
export { GOOGLE_MAPS_API_KEY, getGoogleMapsApiKey, setGoogleMapsApiKey } from "./googleMapsKey";

export type BaseLayerKind =
  | "osm"              // OSM Standard (free, always available)
  | "google-street"    // Google roadmap
  | "google-satellite" // Google satellite imagery
  | "google-hybrid"    // Google satellite + labels
  | "google-terrain";  // Google terrain

// Backwards compatibility: map old "street"/"satellite" to new kinds
export function normalizeLayerKind(kind: string): BaseLayerKind {
  if (kind === "street" || kind === "normal") return "google-street";
  if (kind === "satellite") return "google-hybrid";
  return kind as BaseLayerKind;
}

declare global {
  interface Window {
    google?: { maps?: unknown };
    __mlGoogleMapsReady?: () => void;
  }
}

let googleMapsLoader: Promise<boolean> | null = null;

/** Language for Google's map labels: follows <html lang>, which the locale provider keeps in sync. */
export function googleMapsLanguage(): "bn" | "en" {
  if (typeof document === "undefined") return "en";
  return document.documentElement.lang === "bn" ? "bn" : "en";
}

/** True once the Google JS API has been loaded on this page (its language is then fixed). */
export function isGoogleMapsLoaded(): boolean {
  return typeof window !== "undefined" && !!window.google?.maps;
}

/** Load the Google Maps JS API once. Resolves false when no key / load error. */
function loadGoogleMaps(): Promise<boolean> {
  const key = getGoogleMapsApiKey();
  if (!key || typeof window === "undefined") return Promise.resolve(false);
  if (window.google?.maps) return Promise.resolve(true);
  if (!googleMapsLoader) {
    googleMapsLoader = new Promise<boolean>((resolve) => {
      window.__mlGoogleMapsReady = () => resolve(true);
      const script = document.createElement("script");
      script.src =
        "https://maps.googleapis.com/maps/api/js" +
        `?key=${encodeURIComponent(key)}` +
        // Bengali place names when the UI is in Bengali; region=BD biases labels/geocoding to Bangladesh.
        `&language=${googleMapsLanguage()}&region=BD` +
        "&loading=async&callback=__mlGoogleMapsReady";
      script.async = true;
      script.onerror = () => {
        googleMapsLoader = null; // allow retry on next map mount
        resolve(false);
      };
      document.head.appendChild(script);
    });
  }
  return googleMapsLoader;
}

/**
 * Create the base map layer. Async because the Google JS API loads lazily;
 * callers should guard against the map being torn down before it resolves.
 */
type GoogleMutantCtor = new (opts: { type: string; maxZoom: number }) => L.GridLayer;

// GoogleMutant instance surface we use beyond L.GridLayer.
interface GoogleMutantLayer extends L.GridLayer {
  addGoogleLayer(name: string): void;
  removeGoogleLayer(name: string): void;
}

function isGoogleMutant(layer: L.GridLayer | null | undefined): layer is GoogleMutantLayer {
  return typeof (layer as GoogleMutantLayer | null | undefined)?.addGoogleLayer === "function";
}

/** Whether the base layer can render Google's live traffic overlay. */
export function layerSupportsTraffic(layer: L.GridLayer | null | undefined): boolean {
  return isGoogleMutant(layer);
}

/** Toggle Google's TrafficLayer on a mutant base layer. No-op on tile fallbacks. */
export function setLayerTraffic(layer: L.GridLayer | null | undefined, enabled: boolean): void {
  if (!isGoogleMutant(layer)) return;
  if (enabled) layer.addGoogleLayer("TrafficLayer");
  else layer.removeGoogleLayer("TrafficLayer");
}

/** Map BaseLayerKind to Google Maps type string. Returns null for OSM. */
function googleMapType(kind: BaseLayerKind): string | null {
  switch (kind) {
    case "google-street": return "roadmap";
    case "google-satellite": return "satellite";
    case "google-hybrid": return "hybrid";
    case "google-terrain": return "terrain";
    case "osm": return null;
    default: return null;
  }
}

/** Check if Google Maps API key is configured. */
export function hasGoogleMapsKey(): boolean {
  return !!getGoogleMapsApiKey();
}

/** Preload Google Maps API (call early if you know you'll need it). */
export function preloadGoogleMaps(): void {
  if (getGoogleMapsApiKey()) loadGoogleMaps();
}

export async function createBaseLayer(kind: BaseLayerKind = "google-street"): Promise<L.GridLayer> {
  const gmapType = googleMapType(kind);

  // OSM: always use OSM tiles, no Google API needed
  if (kind === "osm" || !gmapType) {
    return L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 });
  }

  // Google layer types
  if (await loadGoogleMaps()) {
    // Import lazily so the plugin (which touches window) never runs during SSR
    // and stays out of the no-key path. Do NOT use the L.gridLayer.googleMutant
    // factory: in v0.16 it references L.GridLayer.GoogleMutant, which neither
    // the ESM build (class is a default export) nor the browser/UMD build
    // (assigns onto module exports, not the app's L) ever sets on our Leaflet
    // instance — "GoogleMutant is not a constructor" at runtime.
    const mod = (await import("leaflet.gridlayer.googlemutant")) as unknown;
    // Webpack bundles the "browser" (UMD) build, whose exports are
    // { L: { GridLayer: { GoogleMutant } } } — and under CJS interop `default`
    // is that same object. The ESM build instead default-exports the class.
    // Probe every shape and take whatever is actually a constructor.
    const fromExports = (o: unknown): GoogleMutantCtor | undefined => {
      if (typeof o === "function") return o as GoogleMutantCtor;
      const cls = (o as { L?: { GridLayer?: { GoogleMutant?: unknown } } } | null | undefined)
        ?.L?.GridLayer?.GoogleMutant;
      return typeof cls === "function" ? (cls as GoogleMutantCtor) : undefined;
    };
    const GoogleMutant =
      fromExports(mod) ?? fromExports((mod as { default?: unknown } | null)?.default);
    if (GoogleMutant) {
      return new GoogleMutant({
        type: gmapType,
        maxZoom: 21,
      });
    }
    // Unexpected plugin shape — fall through to the free tile fallback.
  }

  // Fallback: OSM for street-like types, Esri satellite for satellite types
  if (kind === "google-satellite" || kind === "google-hybrid") {
    return L.tileLayer(TILE_URL_SATELLITE, { attribution: SATELLITE_ATTRIBUTION, maxZoom: 19 });
  }
  return L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 });
}

// Dhaka centre — used as initial map view when no devices yet have a fix.
export const DHAKA_CENTER: [number, number] = [23.8103, 90.4125]; // [lat, lng] for Leaflet

export const DEFAULT_ZOOM = 14;

/** Bounds expansion helper: returns [[minLat, minLng], [maxLat, maxLng]] padded. */
export function expandBounds(
  pts: Array<[number, number]>, // [lat, lng] pairs
  paddingDeg = 0.01,
): [[number, number], [number, number]] | null {
  if (pts.length === 0) return null;
  let minLat = pts[0][0];
  let maxLat = pts[0][0];
  let minLng = pts[0][1];
  let maxLng = pts[0][1];
  for (const [lat, lng] of pts) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  return [
    [minLat - paddingDeg, minLng - paddingDeg],
    [maxLat + paddingDeg, maxLng + paddingDeg],
  ];
}

/**
 * Calculate the optimal maxZoom based on vehicle positions.
 * - Single vehicle: zoom in close (16)
 * - Multiple vehicles nearby: moderate zoom (14-15)
 * - Vehicles spread across city/region: lower zoom (10-12)
 */
export function calculateFitZoom(pts: Array<[number, number]>): number {
  if (pts.length === 0) return DEFAULT_ZOOM;
  if (pts.length === 1) return 16; // Single vehicle — zoom in close

  // Calculate the geographic spread (in degrees)
  let minLat = pts[0][0], maxLat = pts[0][0];
  let minLng = pts[0][1], maxLng = pts[0][1];
  for (const [lat, lng] of pts) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  const latSpread = maxLat - minLat;
  const lngSpread = maxLng - minLng;
  const maxSpread = Math.max(latSpread, lngSpread);

  // Dynamic zoom based on spread (rough heuristics for Bangladesh scale)
  // ~0.001° ≈ 100m, ~0.01° ≈ 1km, ~0.1° ≈ 10km, ~1° ≈ 100km
  if (maxSpread < 0.002) return 17;      // < 200m — very close
  if (maxSpread < 0.005) return 16;      // < 500m — same area
  if (maxSpread < 0.02) return 15;       // < 2km — neighborhood
  if (maxSpread < 0.05) return 14;       // < 5km — part of city
  if (maxSpread < 0.1) return 13;        // < 10km — city scale
  if (maxSpread < 0.3) return 12;        // < 30km — metro area
  if (maxSpread < 0.6) return 11;        // < 60km — regional
  if (maxSpread < 1.0) return 10;        // < 100km — large region
  return 9;                              // > 100km — country scale
}
