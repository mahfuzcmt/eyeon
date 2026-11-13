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

const reverseCache = new Map<string, string | null>();
const reverseInflight = new Map<string, Promise<string | null>>();

/** The parts of a Nominatim reverse answer the address line is built from. */
interface ReverseAnswer {
  display_name?: string;
  address?: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    residential?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state_district?: string;
  };
}

/**
 * Road, area, city, district - the same line the web popup shows (FleetMap's reverse lookup).
 * Not the head of `display_name`: that starts with the nearest named thing on the map, so a
 * person standing in the street was shown as being at the shop next door ("First Choice
 * Travel & Tours, Outer Circular Road, Noya Paltan" for a point the web calls "Outer Circular
 * Road, Fakirapool, Dhaka").
 */
export function addressLine(data: ReverseAnswer): string | null {
  const a = data.address;
  if (a) {
    const parts: string[] = [];
    if (a.house_number) parts.push(`House ${a.house_number}`);
    if (a.road) parts.push(a.road);
    const area = a.neighbourhood ?? a.suburb ?? a.residential;
    if (area) parts.push(area);
    const city = a.city ?? a.town ?? a.village ?? a.county;
    if (city) parts.push(city);
    if (a.state_district && a.state_district !== a.city) parts.push(a.state_district);
    if (parts.length > 0) return parts.slice(0, 4).join(", ");
  }
  return data.display_name?.split(",").slice(0, 4).join(",").trim() || null;
}

/**
 * Street / area name of a point, through Nominatim's reverse lookup (same source and wording
 * as the web popup's address). Cached per ~110 m cell and language, so a person standing still
 * is looked up once; null when nothing is known or the lookup fails.
 */
export function reverseAddress(lat: number, lng: number, lang = "en"): Promise<string | null> {
  const key = `${lang}|${lat.toFixed(3)},${lng.toFixed(3)}`;
  if (reverseCache.has(key)) return Promise.resolve(reverseCache.get(key) ?? null);
  const running = reverseInflight.get(key);
  if (running) return running;
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&zoom=18&addressdetails=1&accept-language=${encodeURIComponent(lang)}&lat=${lat}&lon=${lng}`;
  const p = fetch(url, { headers: { Accept: "application/json", "User-Agent": "EyeOn mobile (https://eyeon.motolinkgps.com)" } })
    .then(async (res) => {
      if (!res.ok) return null;
      const name = addressLine((await res.json()) as ReverseAnswer);
      reverseCache.set(key, name);
      return name;
    })
    .catch(() => null)
    .finally(() => reverseInflight.delete(key));
  reverseInflight.set(key, p);
  return p;
}
