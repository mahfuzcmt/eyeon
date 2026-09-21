// Google Maps API key state, kept separate from lib/leaflet.ts on purpose:
// Leaflet touches `window` at import time, so anything rendered on the server
// (DashboardShell) must not import that module just to set the org key.

/** Platform-wide key baked into the build. Orgs can override it (see setGoogleMapsApiKey). */
export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

// Per-organization key (organizations.google_maps_api_key), set by the
// dashboard shell once the session is known. Falls back to the platform key.
// The Google JS API can only be loaded once per page, so a change after the
// first map mounted takes effect on the next full page load.
let orgGoogleMapsApiKey = "";

export function setGoogleMapsApiKey(key: string | null | undefined): void {
  orgGoogleMapsApiKey = key?.trim() ?? "";
}

/** Effective key: the org's own key when set, else the platform default. */
export function getGoogleMapsApiKey(): string {
  return orgGoogleMapsApiKey || GOOGLE_MAPS_API_KEY;
}
