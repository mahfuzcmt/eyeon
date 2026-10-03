import type L from "leaflet";

/** One hit of an address search. */
export interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
}

/**
 * Address search through OpenStreetMap's Nominatim: free, no key, same source as the map's
 * reverse geocoding. Results are biased to the current map view (`bounds`) so "Panthapath"
 * finds the Dhaka one first. Nominatim allows about one request per second; callers search on
 * Enter / button, never per keystroke.
 */
export async function searchAddress(query: string, bounds?: L.LatLngBounds | null, lang = "en"): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (!q) return [];
  let url = `https://nominatim.openstreetmap.org/search?format=json&limit=6&accept-language=${encodeURIComponent(lang)}&q=${encodeURIComponent(q)}`;
  if (bounds) {
    url += `&viewbox=${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()},${bounds.getSouth()}`;
  }
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Address search failed (${res.status})`);
  const data = (await res.json()) as Array<{ display_name: string; lat: string; lon: string }>;
  return data
    .map((r) => ({ label: r.display_name, lat: parseFloat(r.lat), lng: parseFloat(r.lon) }))
    .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng));
}
