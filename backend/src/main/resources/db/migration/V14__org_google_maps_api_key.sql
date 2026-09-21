-- V14: per-organization Google Maps API key.
-- Each customer (organization) can bring its own browser key so Google Maps
-- usage is billed to them, like ADL/gpsen "map key" per account. NULL means
-- "use the platform default key" baked into the frontend build
-- (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY / EXPO_PUBLIC_GOOGLE_MAPS_API_KEY).
-- Rollback: ALTER TABLE organizations DROP COLUMN google_maps_api_key;

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS google_maps_api_key VARCHAR(64);

COMMENT ON COLUMN organizations.google_maps_api_key IS
    'Browser (referrer-restricted) Google Maps JS API key owned by the org; NULL = platform default';
