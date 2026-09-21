-- ============================================================
-- V11__device_groups.sql
-- Adds device groups for organizing vehicles into categories
-- Matches ADL Moto Viewer's device grouping functionality
-- ============================================================

-- Device groups table
CREATE TABLE device_groups (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    color       VARCHAR(20) DEFAULT '#0284C7',
    icon        VARCHAR(50) DEFAULT 'folder',
    sort_order  INTEGER DEFAULT 0,
    is_default  BOOLEAN DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(org_id, name)
);

CREATE INDEX idx_device_groups_org ON device_groups(org_id);
CREATE INDEX idx_device_groups_sort ON device_groups(org_id, sort_order);

-- Add group_id to devices table
ALTER TABLE devices ADD COLUMN group_id UUID REFERENCES device_groups(id) ON DELETE SET NULL;
CREATE INDEX idx_devices_group ON devices(group_id);

-- Create default "Ungrouped" group for each organization
INSERT INTO device_groups (org_id, name, description, is_default, sort_order)
SELECT id, 'Ungrouped', 'Devices not assigned to any group', true, 0
FROM organizations;

-- Trigger to auto-create default group for new organizations
CREATE OR REPLACE FUNCTION create_default_device_group()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO device_groups (org_id, name, description, is_default, sort_order)
    VALUES (NEW.id, 'Ungrouped', 'Devices not assigned to any group', true, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_create_default_group
AFTER INSERT ON organizations
FOR EACH ROW
EXECUTE FUNCTION create_default_device_group();
