-- ============================================================
-- V21__per_user_geofences.sql
-- Geofences and trusted places become per user, like groups and alarm rules in V18.
--
-- A parent's "Home" is that parent's alone: other parents in the same school, and the school
-- admins, neither see it nor get its arrived/left alerts. Only the owner lists, edits and
-- deletes it, and its alarms carry metadata.geofenceOwnerId so the alarm list, push and the
-- live WebSocket feed deliver them to the owner only (see AlarmRepository.OWNER_FILTER).
--
-- Existing rows go to the user who created them (V19 created_by) or, failing that, to the
-- organization's earliest ORG_ADMIN (earliest user if there is no admin) - the V18 rule - so
-- nothing disappears for the account that most likely created it.
--
-- Rollback:
--   DROP INDEX IF EXISTS idx_geofences_owner;
--   ALTER TABLE geofences DROP COLUMN owner_user_id;
-- ============================================================

ALTER TABLE geofences ADD COLUMN owner_user_id UUID REFERENCES users(id) ON DELETE CASCADE;

UPDATE geofences g
   SET owner_user_id = COALESCE(
           (SELECT u.id FROM users u WHERE u.id = g.created_by AND u.org_id = g.org_id),
           (SELECT u.id FROM users u
             WHERE u.org_id = g.org_id
             ORDER BY (u.role <> 'ORG_ADMIN'), u.created_at
             LIMIT 1));

CREATE INDEX idx_geofences_owner ON geofences(owner_user_id) WHERE is_active = true;
