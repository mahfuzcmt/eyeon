-- ============================================================
-- V24__device_battery_percent.sql
-- Battery level of a battery-powered personal tracker, as the tracker reports it itself
-- (Jimi 0x36 heartbeat, module 0x006A). NULL for trackers that do not report one, e.g.
-- vehicle trackers wired to a 12 V supply. Shown on the marker, in the list and in the popup.
--
-- Rollback:
--   ALTER TABLE devices DROP COLUMN battery_percent;
-- ============================================================

ALTER TABLE devices ADD COLUMN battery_percent SMALLINT;
