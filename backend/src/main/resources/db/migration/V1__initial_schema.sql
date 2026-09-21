-- ============================================================
-- EyeOn V1 — initial schema
-- See CLAUDE.md §5
-- ============================================================
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----- Organizations (tenants) -----
CREATE TABLE organizations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(255) NOT NULL,
    slug          VARCHAR(100) UNIQUE NOT NULL,
    plan_tier     VARCHAR(50) NOT NULL DEFAULT 'BASIC',
    status        VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address       TEXT,
    locale        VARCHAR(10) DEFAULT 'bn-BD',
    timezone      VARCHAR(50) DEFAULT 'Asia/Dhaka',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----- Users -----
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email         VARCHAR(255) UNIQUE NOT NULL,
    phone         VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(255),
    role          VARCHAR(50) NOT NULL DEFAULT 'ORG_USER',
    is_active     BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_org ON users(org_id);

-- ----- Refresh tokens (rotated, hashed) -----
CREATE TABLE refresh_tokens (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash    VARCHAR(255) NOT NULL,
    expires_at    TIMESTAMPTZ NOT NULL,
    revoked_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- ----- Devices -----
CREATE TABLE devices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    imei            VARCHAR(20) UNIQUE NOT NULL,
    name            VARCHAR(255),
    sim_msisdn      VARCHAR(20),
    sim_iccid       VARCHAR(30),
    vehicle_plate   VARCHAR(50),
    vehicle_type    VARCHAR(50),
    protocol        VARCHAR(20) NOT NULL DEFAULT 'GT06',
    protocol_variant VARCHAR(10),
    model           VARCHAR(100),
    status          VARCHAR(50) NOT NULL DEFAULT 'NEVER_CONNECTED',
    last_seen_at    TIMESTAMPTZ,
    last_location   GEOGRAPHY(POINT, 4326),
    last_speed      INTEGER,
    last_course     INTEGER,
    last_voltage_mv INTEGER,
    icon_color      VARCHAR(20) DEFAULT '#E8900A',
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_devices_org ON devices(org_id);
CREATE INDEX idx_devices_imei ON devices(imei);
CREATE INDEX idx_devices_status ON devices(org_id, status);

-- ----- Locations (time-series) -----
CREATE TABLE locations (
    id            BIGSERIAL PRIMARY KEY,
    device_imei   VARCHAR(20) NOT NULL,
    org_id        UUID NOT NULL,
    ts            TIMESTAMPTZ NOT NULL,
    received_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    geom          GEOGRAPHY(POINT, 4326) NOT NULL,
    latitude      DOUBLE PRECISION NOT NULL,
    longitude     DOUBLE PRECISION NOT NULL,
    speed         INTEGER NOT NULL DEFAULT 0,
    course        INTEGER NOT NULL DEFAULT 0,
    altitude      INTEGER,
    satellites    INTEGER,
    valid         BOOLEAN NOT NULL DEFAULT true,
    acc_on        BOOLEAN,
    voltage_mv    INTEGER,
    mileage_m     BIGINT,
    raw_payload   BYTEA
);

CREATE INDEX idx_locations_device_ts ON locations(device_imei, ts DESC);
CREATE INDEX idx_locations_org_ts ON locations(org_id, ts DESC);
CREATE INDEX idx_locations_geom ON locations USING GIST(geom);

-- ----- Alarms -----
CREATE TABLE alarms (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL,
    device_imei     VARCHAR(20) NOT NULL,
    type            VARCHAR(50) NOT NULL,
    severity        VARCHAR(20) NOT NULL,
    ts              TIMESTAMPTZ NOT NULL,
    geom            GEOGRAPHY(POINT, 4326),
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    acknowledged    BOOLEAN NOT NULL DEFAULT false,
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMPTZ,
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alarms_org_ts ON alarms(org_id, ts DESC);
CREATE INDEX idx_alarms_device ON alarms(device_imei, ts DESC);
CREATE INDEX idx_alarms_unack ON alarms(org_id, acknowledged, ts DESC) WHERE acknowledged = false;

-- ----- Geofences -----
CREATE TABLE geofences (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name          VARCHAR(255) NOT NULL,
    type          VARCHAR(20) NOT NULL,
    geom          GEOGRAPHY NOT NULL,
    radius_m      INTEGER,
    center        GEOGRAPHY(POINT, 4326),
    color         VARCHAR(20) DEFAULT '#0F2742',
    notify_on     VARCHAR(20) NOT NULL DEFAULT 'BOTH',
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_geofences_org ON geofences(org_id) WHERE is_active = true;
CREATE INDEX idx_geofences_geom ON geofences USING GIST(geom) WHERE is_active = true;

CREATE TABLE geofence_devices (
    geofence_id   UUID NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
    device_imei   VARCHAR(20) NOT NULL,
    PRIMARY KEY (geofence_id, device_imei)
);

CREATE TABLE geofence_states (
    geofence_id    UUID NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
    device_imei    VARCHAR(20) NOT NULL,
    is_inside      BOOLEAN NOT NULL,
    last_change_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (geofence_id, device_imei)
);

-- ----- Trips -----
CREATE TABLE trips (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id        UUID NOT NULL,
    device_imei   VARCHAR(20) NOT NULL,
    started_at    TIMESTAMPTZ NOT NULL,
    ended_at      TIMESTAMPTZ,
    start_geom    GEOGRAPHY(POINT, 4326),
    end_geom      GEOGRAPHY(POINT, 4326),
    distance_m    INTEGER NOT NULL DEFAULT 0,
    duration_s    INTEGER,
    max_speed     INTEGER NOT NULL DEFAULT 0,
    avg_speed     INTEGER NOT NULL DEFAULT 0,
    idle_time_s   INTEGER NOT NULL DEFAULT 0,
    status        VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trips_org_started ON trips(org_id, started_at DESC);
CREATE INDEX idx_trips_device_started ON trips(device_imei, started_at DESC);
CREATE INDEX idx_trips_in_progress ON trips(device_imei) WHERE status = 'IN_PROGRESS';

-- ----- Subscriptions / Billing -----
CREATE TABLE subscriptions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    device_imei       VARCHAR(20) NOT NULL,
    plan_tier         VARCHAR(50) NOT NULL,
    monthly_price_bdt INTEGER NOT NULL,
    started_at        DATE NOT NULL,
    next_due_at       DATE NOT NULL,
    status            VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    auto_renew        BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_org ON subscriptions(org_id);
CREATE INDEX idx_subscriptions_device ON subscriptions(device_imei);
CREATE INDEX idx_subscriptions_due ON subscriptions(next_due_at) WHERE status = 'ACTIVE' AND auto_renew = true;

CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id),
    org_id          UUID NOT NULL,
    amount_bdt      INTEGER NOT NULL,
    method          VARCHAR(20) NOT NULL,
    bkash_trx_id    VARCHAR(100),
    nagad_ref       VARCHAR(100),
    status          VARCHAR(20) NOT NULL,
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_subscription ON payments(subscription_id);
CREATE INDEX idx_payments_org ON payments(org_id);

-- ----- Audit log -----
CREATE TABLE audit_log (
    id            BIGSERIAL PRIMARY KEY,
    org_id        UUID,
    user_id       UUID,
    action        VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id   VARCHAR(100),
    metadata      JSONB,
    ip_address    INET,
    user_agent    TEXT,
    ts            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_org_ts ON audit_log(org_id, ts DESC);
