-- ============================================================
-- V16__password_reset.sql
-- Self-service password change + forgot-password (SMS one-time code).
-- Codes are stored hashed (SHA-256), expire after 15 minutes, allow 5
-- attempts and are single-use. Rollback:
--   DROP TABLE password_reset_codes; ALTER TABLE users DROP COLUMN password_changed_at;
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

CREATE TABLE password_reset_codes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash   VARCHAR(255) NOT NULL,
    channel     VARCHAR(20) NOT NULL DEFAULT 'SMS',   -- SMS, LOG (dev fallback)
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    attempts    INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_password_reset_codes_user ON password_reset_codes(user_id, created_at DESC);
