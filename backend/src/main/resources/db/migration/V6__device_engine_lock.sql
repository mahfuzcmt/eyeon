-- ============================================================
-- V6__device_engine_lock.sql
-- Tracks the last-known engine cut/restore state per device so the
-- app can show "Engine locked: Yes/No". Set when a DYD/HFYD command
-- succeeds (DeviceCommandController). Forward-only; safe on the live DB.
-- Rollback note: ALTER TABLE devices DROP COLUMN engine_locked;
-- ============================================================
ALTER TABLE devices
    ADD COLUMN engine_locked BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN devices.engine_locked IS
    'Last-known engine state: true after a successful fuel-cut (DYD), false after restore (HFYD)';
