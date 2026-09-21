-- ============================================================
-- V7__push_tokens.sql
-- Expo push notification tokens for the mobile app (Phase 5).
-- One row per (device install × user); token is globally unique —
-- re-registration by another user reassigns the row (phone changed hands).
-- Rollback: DROP TABLE push_tokens;
-- ============================================================

CREATE TABLE push_tokens (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token         VARCHAR(255) UNIQUE NOT NULL,          -- ExponentPushToken[...]
    platform      VARCHAR(20) NOT NULL DEFAULT 'UNKNOWN', -- ANDROID, IOS, UNKNOWN
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_tokens_org ON push_tokens(org_id);
CREATE INDEX idx_push_tokens_user ON push_tokens(user_id);
