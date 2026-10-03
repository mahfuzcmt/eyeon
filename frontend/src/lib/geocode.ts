import type L from "leaflet";

/** One hit of an address search. */
export interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
}

/** Results are limited to Bangladesh (owner's decision, 2026-10-03). */
const COUNTRY = "bd";
/** Nominatim allows about one request per second: wait for the typing to pause. */
export const SEARCH_DEBOUNCE_MS = 500;
export const SEARCH_MIN_CHARS = 3;

const cache = new Map<string, GeocodeResult[]>();

/**
 * Address search through OpenStreetMap's Nominatim: free, no key, same source as the map's
 * reverse geocoding. Results are biased to the current map view (`bounds`) so "Panthapath"
 * finds the one on screen first. Pass `signal` to drop an answer the user has typed past.
 */
export async function searchAddress(
  query: string,
  bounds?: L.LatLngBounds | null,
  lang = "en",
  signal?: AbortSignal,
): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < SEARCH_MIN_CHARS) return [];
  const key = `${lang}|${q.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let url = `https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=${COUNTRY}&accept-language=${encodeURIComponent(lang)}&q=${encodeURIComponent(q)}`;
  if (bounds) {
    url += `&viewbox=${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()},${bounds.getSouth()}`;
  }
  const res = await fetch(url, { headers: { Accept: "application/json" }, signal });
  if (!res.ok) throw new Error(`Address search failed (${res.status})`);
  const data = (await res.json()) as Array<{ display_name: string; lat: string; lon: string }>;
  const results = data
    .map((r) => ({ label: r.display_name, lat: parseFloat(r.lat), lng: parseFloat(r.lon) }))
    .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng));
  cache.set(key, results);
  return results;
}
