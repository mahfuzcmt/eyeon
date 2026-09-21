-- V8: User-level device assignments
-- Allows assigning specific devices to specific users within an organization.
-- ORG_ADMIN/SUPER_ADMIN see all org devices; ORG_USER sees only assigned devices.

CREATE TABLE user_devices (
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_imei   VARCHAR(20) NOT NULL,
    assigned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    PRIMARY KEY (user_id, device_imei)
);

CREATE INDEX idx_user_devices_user ON user_devices(user_id);
CREATE INDEX idx_user_devices_device ON user_devices(device_imei);

-- Add a flag to control whether user sees all devices or only assigned ones
-- When true, user sees all org devices regardless of assignments (default for admins)
ALTER TABLE users ADD COLUMN see_all_devices BOOLEAN NOT NULL DEFAULT false;

-- Set existing admins to see all devices
UPDATE users SET see_all_devices = true WHERE role IN ('SUPER_ADMIN', 'ORG_ADMIN');
