-- V13__share_location_links.sql
-- Share location links allow users to share a vehicle's live location via a public URL

CREATE TABLE share_location_links (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    device_imei     VARCHAR(20) NOT NULL,
    token           VARCHAR(64) UNIQUE NOT NULL,  -- Secure random token for public URL
    label           VARCHAR(255),                  -- Optional friendly name (e.g., "Delivery tracking")
    expires_at      TIMESTAMPTZ NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    show_history    BOOLEAN NOT NULL DEFAULT false, -- Allow viewing route history
    allow_realtime  BOOLEAN NOT NULL DEFAULT true,  -- Allow real-time updates
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_accessed_at TIMESTAMPTZ,
    access_count    INTEGER NOT NULL DEFAULT 0
);

-- Index for fast token lookup (public endpoint)
CREATE UNIQUE INDEX idx_share_links_token ON share_location_links(token) WHERE is_active = true;

-- Index for listing links by device
CREATE INDEX idx_share_links_device ON share_location_links(device_imei, org_id);

-- Index for cleanup job (expired links)
CREATE INDEX idx_share_links_expires ON share_location_links(expires_at) WHERE is_active = true;

-- Track access log for share links (optional, for analytics)
CREATE TABLE share_link_access_log (
    id              BIGSERIAL PRIMARY KEY,
    link_id         UUID NOT NULL REFERENCES share_location_links(id) ON DELETE CASCADE,
    accessed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address      INET,
    user_agent      TEXT
);

CREATE INDEX idx_share_access_link ON share_link_access_log(link_id, accessed_at DESC);

COMMENT ON TABLE share_location_links IS 'Public share links for vehicle location tracking';
COMMENT ON COLUMN share_location_links.token IS 'URL-safe random token, 32-64 chars';
COMMENT ON COLUMN share_location_links.show_history IS 'When true, shared view shows last 24h route';
COMMENT ON COLUMN share_location_links.allow_realtime IS 'When true, WebSocket updates are allowed';
