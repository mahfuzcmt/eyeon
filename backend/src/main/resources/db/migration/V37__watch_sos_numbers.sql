-- EyeOn V37: the SOS numbers a carer set on a "3G" smart watch from the app (2026-11-23).
-- One command, SOS,<n1>,<n2>,<n3>, answered with SOS. When the watch's SOS button is held it
-- calls the numbers in order (twice round if nobody answers) and texts all three.
-- numbers: up to three, comma-separated, each digits with an optional leading +; '' = none.
CREATE TABLE watch_sos_numbers (
    device_imei VARCHAR(20) PRIMARY KEY,
    org_id      UUID        NOT NULL,
    numbers     VARCHAR(80) NOT NULL DEFAULT '',
    status      VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING until the watch has answered, then SYNCED
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    synced_at   TIMESTAMPTZ
);
