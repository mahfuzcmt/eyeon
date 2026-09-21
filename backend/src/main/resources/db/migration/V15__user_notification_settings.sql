-- ============================================================
-- V15__user_notification_settings.sql
-- Per-user alarm notification preferences (ADL-style "alarm settings"):
-- which alarm types open a popup on the web dashboard, which of those also
-- play a sound, and which are pushed to the user's mobile installs.
-- No row = platform defaults (see domain.NotificationDefaults).
-- Rollback: DROP TABLE user_notification_settings;
-- ============================================================

CREATE TABLE user_notification_settings (
    user_id      UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    popup_types  TEXT[] NOT NULL DEFAULT '{}',
    sound_types  TEXT[] NOT NULL DEFAULT '{}',
    push_types   TEXT[] NOT NULL DEFAULT '{}',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_notification_settings_org ON user_notification_settings(org_id);
