-- ============================================================
-- EyeOn V3 — surface fields the GT06 already sends
-- ============================================================
-- The decoder already parsed GSM signal (in alarm + heartbeat status blocks)
-- and engine-hours (V4 location packets) but we discarded them. This migration
-- adds storage so the device-details UI can show what the device already knows.

ALTER TABLE locations
    ADD COLUMN gsm_signal           SMALLINT,
    ADD COLUMN engine_hours_seconds INTEGER;

COMMENT ON COLUMN locations.gsm_signal IS 'GT06 status-block GSM strength (0-31, populated only by alarm/heartbeat-derived rows; null on plain location packets)';
COMMENT ON COLUMN locations.engine_hours_seconds IS 'Cumulative ACC-on time from V4 location packet (seconds)';

ALTER TABLE devices
    ADD COLUMN last_gsm_signal           SMALLINT,
    ADD COLUMN last_engine_hours_seconds INTEGER;

COMMENT ON COLUMN devices.last_gsm_signal IS 'Latest GSM strength from heartbeat or alarm; updated independently of last_location';
COMMENT ON COLUMN devices.last_engine_hours_seconds IS 'Latest cumulative ACC-on seconds from V4 location packet';
