import type { NightRestView } from "@/types";

/** One hit of an address search. */
export interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
}

export const SEARCH_DEBOUNCE_MS = 500;
export const SEARCH_MIN_CHARS = 3;
const cache = new Map<string, GeocodeResult[]>();

/**
 * Address search through OpenStreetMap's Nominatim (free, no key), limited to Bangladesh and
 * biased to the area around `near`. Same rules as the web app's lib/geocode.ts.
 */
export async function searchAddress(query: string, near?: { lat: number; lng: number } | null, lang = "en", signal?: AbortSignal): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < SEARCH_MIN_CHARS) return [];
  const key = `${lang}|${q.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let url = `https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=bd&accept-language=${encodeURIComponent(lang)}&q=${encodeURIComponent(q)}`;
  if (near) url += `&viewbox=${near.lng - 0.15},${near.lat + 0.15},${near.lng + 0.15},${near.lat - 0.15}`;
  const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "EyeOn mobile (https://eyeon.motolinkgps.com)" }, signal });
  if (!res.ok) throw new Error(`Address search failed (${res.status})`);
  const data = (await res.json()) as { display_name: string; lat: string; lon: string }[];
  const results = data
    .map((r) => ({ label: r.display_name, lat: parseFloat(r.lat), lng: parseFloat(r.lon) }))
    .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng));
  cache.set(key, results);
  return results;
}

const DHAKA_OFFSET_MIN = 6 * 60;
function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** The time the tracker wakes ("07:00") when `at` falls inside its night rest, otherwise null. */
export function restingUntil(rest: Pick<NightRestView, "from" | "to"> | undefined, at: number = Date.now()): string | null {
  if (!rest) return null;
  const from = minutes(rest.from);
  const to = minutes(rest.to);
  if (Number.isNaN(from) || Number.isNaN(to) || from === to) return null;
  const d = new Date(at);
  const now = (d.getUTCHours() * 60 + d.getUTCMinutes() + DHAKA_OFFSET_MIN) % 1440;
  const inside = from < to ? now >= from && now < to : now >= from || now < to;
  return inside ? rest.to : null;
}
