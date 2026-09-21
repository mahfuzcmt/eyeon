-- ============================================================
-- V19__trusted_places.sql
-- EyeOn family safety (docs/FAMILY_SAFETY_PLAN.md, step F2/F3).
--
-- 1. Geofences gain a `kind`: TRUSTED_PLACE (Home, School ... somewhere the
--    person is supposed to be; arrivals/departures are calm INFO events) or
--    BOUNDARY (an area they must not leave; exits are WARNING alarms).
--    Existing rows become BOUNDARY, which keeps their behaviour.
-- 2. Drift protection: a transition is first recorded as a candidate
--    (pending_inside / pending_since) and only committed once a later sample
--    agrees after min_dwell_s; leaving also requires being exit_buffer_m
--    beyond the edge. Stops a tracker sitting near the edge from flapping.
-- 3. push_tokens.locale: the language that phone's app is set to, so
--    notifications arrive in Bengali or English per install. NULL falls back
--    to organizations.locale.
-- 4. Users who already saved notification settings get the two new alarm
--    types switched on (users without a row get them via NotificationDefaults).
--
-- Rollback:
--   ALTER TABLE geofences DROP COLUMN kind, DROP COLUMN place_type, DROP COLUMN address,
--     DROP COLUMN created_by, DROP COLUMN exit_buffer_m, DROP COLUMN min_dwell_s;
--   ALTER TABLE geofence_states DROP COLUMN pending_inside, DROP COLUMN pending_since;
--   ALTER TABLE push_tokens DROP COLUMN locale;
--   UPDATE user_notification_settings
--      SET popup_types = array_remove(array_remove(popup_types, 'PLACE_ARRIVED'), 'PLACE_LEFT'),
--          push_types  = array_remove(array_remove(push_types,  'PLACE_ARRIVED'), 'PLACE_LEFT');
-- ============================================================

ALTER TABLE geofences
    ADD COLUMN kind          VARCHAR(20) NOT NULL DEFAULT 'BOUNDARY',  -- TRUSTED_PLACE | BOUNDARY
    ADD COLUMN place_type    VARCHAR(20),                              -- HOME SCHOOL COACHING MOSQUE HOSPITAL RELATIVE OTHER
    ADD COLUMN address       TEXT,
    ADD COLUMN created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN exit_buffer_m INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN min_dwell_s   INTEGER NOT NULL DEFAULT 60;

CREATE INDEX idx_geofences_org_kind ON geofences(org_id, kind) WHERE is_active = true;

ALTER TABLE geofence_states
    ADD COLUMN pending_inside BOOLEAN,
    ADD COLUMN pending_since  TIMESTAMPTZ;

ALTER TABLE push_tokens
    ADD COLUMN locale VARCHAR(10);

UPDATE user_notification_settings
   SET popup_types = popup_types || ARRAY['PLACE_ARRIVED', 'PLACE_LEFT'],
       push_types  = push_types  || ARRAY['PLACE_ARRIVED', 'PLACE_LEFT'],
       updated_at  = now();
