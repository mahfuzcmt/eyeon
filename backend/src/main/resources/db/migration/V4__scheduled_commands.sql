-- ============================================================
-- EyeOn V4 — scheduled commands
-- ============================================================
-- Lets operators queue device commands (cut fuel, query, raw) to fire at a
-- specific time or on a recurring daily schedule. The command_text is frozen
-- at schedule time so the queued payload survives device-password rotation.

CREATE TABLE scheduled_commands (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    device_imei     VARCHAR(20) NOT NULL,
    command_type    VARCHAR(50) NOT NULL,           -- CUT_FUEL, RESTORE_FUEL, QUERY_ADDRESS, RAW
    command_text    TEXT NOT NULL,                  -- literal GT06 ASCII e.g. 'DYD,123456#'
    schedule_kind   VARCHAR(20) NOT NULL,           -- ONE_TIME, DAILY
    run_at          TIMESTAMPTZ,                    -- ONE_TIME: scheduled instant; ignored for DAILY
    days_of_week    SMALLINT,                       -- DAILY: bitmask Sun=1, Mon=2, Tue=4, Wed=8, Thu=16, Fri=32, Sat=64; null = every day
    time_of_day     TIME,                           -- DAILY: local time in org timezone
    next_run_at     TIMESTAMPTZ NOT NULL,           -- precomputed next firing — index target
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING, SUCCEEDED, FAILED, CANCELLED
    last_attempt_at TIMESTAMPTZ,
    last_reply      TEXT,
    last_error      TEXT,
    attempt_count   INTEGER NOT NULL DEFAULT 0,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dispatcher polls this index every 30s — keep it tight by partial-indexing PENDING only.
CREATE INDEX idx_scheduled_commands_due
    ON scheduled_commands(next_run_at)
    WHERE status = 'PENDING';

CREATE INDEX idx_scheduled_commands_org
    ON scheduled_commands(org_id, created_at DESC);

CREATE INDEX idx_scheduled_commands_device
    ON scheduled_commands(device_imei, next_run_at);
