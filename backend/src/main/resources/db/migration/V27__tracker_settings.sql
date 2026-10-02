-- EyeOn V27: settings of a personal tracker, as wanted by the carer and as confirmed by the tracker.
--
-- A Jimi PL601 is configured with text commands over its own connection (SOS numbers, reporting
-- mode, night rest, ...). A change can only be delivered while the tracker is connected, so each
-- setting keeps two values: `wanted` (what was asked for) and `applied` (what the tracker last
-- reported when asked). Both are small JSON objects whose shape is defined per setting in
-- service/TrackerSetting.java.
--
-- sync_status: SYNCED      the tracker reports the wanted value (or was only read, never changed)
--              PENDING     waiting for the tracker to connect
--              FAILED      the tracker did not take the value (see tracker_reply)
--              UNSUPPORTED the tracker's answer could not be understood
--
-- Rollback: DROP TABLE tracker_settings;

CREATE TABLE tracker_settings (
    device_imei   VARCHAR(20) NOT NULL REFERENCES devices(imei) ON DELETE CASCADE,
    setting_key   VARCHAR(32) NOT NULL,
    org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    wanted        JSONB,
    applied       JSONB,
    sync_status   VARCHAR(16) NOT NULL,
    tracker_reply VARCHAR(300),
    synced_at     TIMESTAMPTZ,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (device_imei, setting_key)
);

CREATE INDEX idx_tracker_settings_org ON tracker_settings(org_id, setting_key);
