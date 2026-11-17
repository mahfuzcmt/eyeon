-- EyeOn V35: what the carer set on a "3G" smart watch from the app.
-- One LZ command carries both values: the display language and the time zone (whole hours from
-- UTC). The watch sets its clock itself from the network; the protocol has no set-the-time command.
CREATE TABLE watch_settings (
    device_imei VARCHAR(20) PRIMARY KEY,
    org_id      UUID        NOT NULL,
    language    INTEGER     NOT NULL,
    zone_hours  INTEGER     NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING until the watch has answered, then SYNCED
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    synced_at   TIMESTAMPTZ
);
