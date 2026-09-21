-- ============================================================
-- V12__drivers.sql
-- Adds driver management for assigning drivers to vehicles
-- Matches ADL Moto Viewer's driver management functionality
-- ============================================================

-- Drivers table
CREATE TABLE drivers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    phone           VARCHAR(50),
    email           VARCHAR(255),
    license_no      VARCHAR(100),
    license_type    VARCHAR(50),          -- MOTORCYCLE, CAR, TRUCK, HEAVY
    license_expiry  DATE,
    nid             VARCHAR(50),          -- National ID (Bangladesh)
    photo_url       VARCHAR(500),
    rfid_card       VARCHAR(100),         -- RFID card number for driver ID
    emergency_contact VARCHAR(100),
    emergency_phone VARCHAR(50),
    address         TEXT,
    date_of_birth   DATE,
    hire_date       DATE,
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE, INACTIVE, SUSPENDED
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_drivers_org ON drivers(org_id);
CREATE INDEX idx_drivers_status ON drivers(org_id, status);
CREATE INDEX idx_drivers_rfid ON drivers(rfid_card) WHERE rfid_card IS NOT NULL;
CREATE INDEX idx_drivers_phone ON drivers(phone) WHERE phone IS NOT NULL;

-- Add driver_id to devices table
ALTER TABLE devices ADD COLUMN driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL;
CREATE INDEX idx_devices_driver ON devices(driver_id) WHERE driver_id IS NOT NULL;

-- Driver assignment history (for tracking who drove what and when)
CREATE TABLE driver_assignments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL,
    driver_id       UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    device_imei     VARCHAR(20) NOT NULL,
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    unassigned_at   TIMESTAMPTZ,
    assigned_by     UUID REFERENCES users(id),
    notes           TEXT
);

CREATE INDEX idx_driver_assignments_driver ON driver_assignments(driver_id, assigned_at DESC);
CREATE INDEX idx_driver_assignments_device ON driver_assignments(device_imei, assigned_at DESC);
CREATE INDEX idx_driver_assignments_active ON driver_assignments(device_imei)
    WHERE unassigned_at IS NULL;

-- Function to auto-record driver assignment changes
CREATE OR REPLACE FUNCTION record_driver_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- If driver changed (not just other fields)
    IF (OLD.driver_id IS DISTINCT FROM NEW.driver_id) THEN
        -- Close previous assignment if exists
        IF OLD.driver_id IS NOT NULL THEN
            UPDATE driver_assignments
            SET unassigned_at = now()
            WHERE device_imei = NEW.imei
              AND driver_id = OLD.driver_id
              AND unassigned_at IS NULL;
        END IF;

        -- Create new assignment if new driver
        IF NEW.driver_id IS NOT NULL THEN
            INSERT INTO driver_assignments (org_id, driver_id, device_imei)
            VALUES (NEW.org_id, NEW.driver_id, NEW.imei);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_record_driver_assignment
AFTER UPDATE ON devices
FOR EACH ROW
WHEN (OLD.driver_id IS DISTINCT FROM NEW.driver_id)
EXECUTE FUNCTION record_driver_assignment();
