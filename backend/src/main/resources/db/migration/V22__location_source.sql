-- ============================================================
-- V22__location_source.sql
-- Where a position came from, for trackers that report Wi-Fi / cell-tower scans
-- instead of GPS when indoors (Jimi 0xA1 / 0xA2 packets).
--
--   source      NULL = GPS (every existing row), 'WIFI' = resolved from Wi-Fi access
--               points (plus cells), 'LBS' = resolved from cell towers only
--   accuracy_m  radius reported by the geolocation service; NULL for GPS
--
-- A WIFI row with a good accuracy is stored with valid = true so that it moves the
-- marker and is evaluated against places like a GPS fix; LBS rows stay valid = false.
--
-- Both columns are nullable without a default, so this is a metadata-only change.
--
-- Rollback:
--   ALTER TABLE locations DROP COLUMN accuracy_m;
--   ALTER TABLE locations DROP COLUMN source;
-- ============================================================

ALTER TABLE locations ADD COLUMN source VARCHAR(8);
ALTER TABLE locations ADD COLUMN accuracy_m INTEGER;
