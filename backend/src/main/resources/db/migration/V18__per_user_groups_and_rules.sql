-- ============================================================
-- V18__per_user_groups_and_rules.sql
-- Vehicle groups and alarm rules become per user instead of per org.
--
-- Groups: each group has an owner (users.id); membership moves from
-- devices.group_id (one grouping shared by the whole org) to
-- device_group_members, so the same vehicle can sit in different groups for
-- different users. The org-level "Ungrouped" rows and the trigger that
-- created them go away — "Ungrouped" is simply "not in any of my groups".
-- Rules: alarm_rules.owner_user_id; only the owner sees and edits a rule.
--
-- Existing rows are handed to the org's earliest ORG_ADMIN (earliest user
-- if the org has no admin) so nothing disappears for the account that most
-- likely created them.
--
-- Rollback (manual):
--   ALTER TABLE devices ADD COLUMN group_id UUID REFERENCES device_groups(id) ON DELETE SET NULL;
--   UPDATE devices d SET group_id = m.group_id FROM device_group_members m WHERE m.device_imei = d.imei;
--   DROP TABLE device_group_members;
--   ALTER TABLE device_groups DROP CONSTRAINT device_groups_owner_name_key,
--       ADD CONSTRAINT device_groups_org_id_name_key UNIQUE (org_id, name),
--       DROP COLUMN owner_user_id, ADD COLUMN is_default BOOLEAN DEFAULT false;
--   ALTER TABLE alarm_rules DROP COLUMN owner_user_id;
--   (then re-create the V11 default rows + trigger)
-- ============================================================

-- ---------- groups ----------
ALTER TABLE device_groups ADD COLUMN owner_user_id UUID REFERENCES users(id) ON DELETE CASCADE;

UPDATE device_groups g
   SET owner_user_id = (SELECT u.id FROM users u
                         WHERE u.org_id = g.org_id
                         ORDER BY (u.role <> 'ORG_ADMIN'), u.created_at
                         LIMIT 1)
 WHERE is_default = false;

CREATE TABLE device_group_members (
    group_id    UUID NOT NULL REFERENCES device_groups(id) ON DELETE CASCADE,
    device_imei VARCHAR(20) NOT NULL,
    PRIMARY KEY (group_id, device_imei)
);
CREATE INDEX idx_device_group_members_imei ON device_group_members(device_imei);

INSERT INTO device_group_members (group_id, device_imei)
SELECT d.group_id, d.imei
  FROM devices d
  JOIN device_groups g ON g.id = d.group_id
 WHERE g.is_default = false AND g.owner_user_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_create_default_group ON organizations;
DROP FUNCTION IF EXISTS create_default_device_group();

DELETE FROM device_groups WHERE is_default = true OR owner_user_id IS NULL;

ALTER TABLE device_groups ALTER COLUMN owner_user_id SET NOT NULL;
ALTER TABLE device_groups DROP CONSTRAINT device_groups_org_id_name_key;
ALTER TABLE device_groups ADD CONSTRAINT device_groups_owner_name_key UNIQUE (owner_user_id, name);
ALTER TABLE device_groups DROP COLUMN is_default;
CREATE INDEX idx_device_groups_owner ON device_groups(owner_user_id, sort_order);

ALTER TABLE devices DROP COLUMN group_id;

-- ---------- rules ----------
ALTER TABLE alarm_rules ADD COLUMN owner_user_id UUID REFERENCES users(id) ON DELETE CASCADE;

UPDATE alarm_rules r
   SET owner_user_id = (SELECT u.id FROM users u
                         WHERE u.org_id = r.org_id
                         ORDER BY (u.role <> 'ORG_ADMIN'), u.created_at
                         LIMIT 1);

DELETE FROM alarm_rules WHERE owner_user_id IS NULL;
ALTER TABLE alarm_rules ALTER COLUMN owner_user_id SET NOT NULL;
CREATE INDEX idx_alarm_rules_owner ON alarm_rules(owner_user_id, created_at DESC);
