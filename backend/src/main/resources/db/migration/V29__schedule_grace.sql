-- ============================================================
-- V29__schedule_grace.sql
--
-- Grace time on an expected time: "at School by 08:00, give him 10 minutes". The alert
-- for a missed time is decided at local_time + grace_minutes; arriving (or leaving)
-- inside the grace still counts as on time. Existing schedules keep their old behaviour
-- of deciding a few minutes after the time (grace 0 = decide after the probe, see
-- ExpectedTimeCheck.MIN_PROBE).
--
-- daily_checks.status gains OK_SENT (on-time message sent), LATE (late arrival/departure
-- reported after an alert) and SKIPPED (nothing to say, e.g. never reached the place
-- that day for a leaving time). Its column is VARCHAR(16), wide enough.
--
-- Rollback:
--   ALTER TABLE place_schedules DROP COLUMN grace_minutes;
-- ============================================================

ALTER TABLE place_schedules
    ADD COLUMN grace_minutes SMALLINT NOT NULL DEFAULT 0
        CHECK (grace_minutes BETWEEN 0 AND 120);

-- New alarm types ARRIVED_ON_TIME / LEFT_ON_TIME / ARRIVED_LATE / LEFT_LATE: a user who saved
-- notification settings and kept NOT_ARRIVED on gets them too (otherwise a saved row, which
-- lists types explicitly, would silently never show them).
UPDATE user_notification_settings
   SET push_types = push_types || ARRAY['ARRIVED_ON_TIME','LEFT_ON_TIME','ARRIVED_LATE','LEFT_LATE']
 WHERE 'NOT_ARRIVED' = ANY(push_types) AND NOT ('ARRIVED_ON_TIME' = ANY(push_types));
UPDATE user_notification_settings
   SET popup_types = popup_types || ARRAY['ARRIVED_ON_TIME','LEFT_ON_TIME','ARRIVED_LATE','LEFT_LATE']
 WHERE 'NOT_ARRIVED' = ANY(popup_types) AND NOT ('ARRIVED_ON_TIME' = ANY(popup_types));
UPDATE user_notification_settings
   SET sound_types = sound_types || ARRAY['ARRIVED_ON_TIME','LEFT_ON_TIME','ARRIVED_LATE','LEFT_LATE']
 WHERE 'NOT_ARRIVED' = ANY(sound_types) AND NOT ('ARRIVED_ON_TIME' = ANY(sound_types));
