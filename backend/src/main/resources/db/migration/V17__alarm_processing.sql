-- ============================================================
-- V17__alarm_processing.sql
-- ADL-style alarm handling: when an operator acknowledges an alarm they can
-- record what was done (HANDLED / FALSE_ALARM / NO_ACTION) and a note.
-- Rollback: ALTER TABLE alarms DROP COLUMN process_result, DROP COLUMN process_notes;
-- ============================================================

ALTER TABLE alarms ADD COLUMN IF NOT EXISTS process_result VARCHAR(20);
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS process_notes  TEXT;
