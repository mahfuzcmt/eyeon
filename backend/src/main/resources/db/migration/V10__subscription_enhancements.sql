-- ============================================================
-- V10 — Subscription enhancements for billing feature
-- Adds indexes for expired subscription lookup and admin search
-- ============================================================

-- Index for finding active/grace subscriptions that are due soon or expired
CREATE INDEX idx_subscriptions_status_due ON subscriptions(status, next_due_at)
    WHERE status IN ('ACTIVE', 'GRACE');

-- Index for IMEI pattern search (admin search)
CREATE INDEX idx_subscriptions_imei_pattern ON subscriptions(device_imei varchar_pattern_ops);

-- Index for finding subscriptions by device IMEI (unique per device)
CREATE UNIQUE INDEX idx_subscriptions_device_unique ON subscriptions(device_imei)
    WHERE status NOT IN ('CANCELLED');
