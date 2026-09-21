-- ============================================================
-- EyeOn V5 — org-defined alarm rules
-- ============================================================
-- Replaces hard-coded alarm logic with rules operators can manage themselves.
-- Three rule types in v1:
--   SPEED_OVER             threshold = max km/h, fires OVERSPEED
--   VOLTAGE_UNDER          threshold = min mV,    fires LOW_BATTERY
--   ACC_ON_DURING_WINDOW   uses window_start/end, fires CURFEW_VIOLATION

CREATE TABLE alarm_rules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    rule_type       VARCHAR(50) NOT NULL,            -- SPEED_OVER, VOLTAGE_UNDER, ACC_ON_DURING_WINDOW
    threshold       DOUBLE PRECISION,                 -- speed kph, voltage mV, etc.
    window_start    TIME,                             -- local time (Asia/Dhaka)
    window_end      TIME,                             -- exclusive; allows wrap (e.g. 22:00 → 06:00)
    cooldown_seconds INTEGER NOT NULL DEFAULT 300,   -- min seconds between repeated firings per device
    severity        VARCHAR(20) NOT NULL DEFAULT 'WARNING',
    is_active       BOOLEAN NOT NULL DEFAULT true,
    applies_to_all  BOOLEAN NOT NULL DEFAULT true,    -- if true, applies to every device in org
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alarm_rules_org_active ON alarm_rules(org_id) WHERE is_active = true;

-- Per-rule device assignment for rules where applies_to_all = false.
CREATE TABLE alarm_rule_devices (
    rule_id     UUID NOT NULL REFERENCES alarm_rules(id) ON DELETE CASCADE,
    device_imei VARCHAR(20) NOT NULL,
    PRIMARY KEY (rule_id, device_imei)
);

-- Cooldown state: one row per (rule, device) tracking when we last raised the alarm.
-- Updated by AlarmRuleService.evaluate; checked before re-firing.
CREATE TABLE alarm_rule_state (
    rule_id       UUID NOT NULL REFERENCES alarm_rules(id) ON DELETE CASCADE,
    device_imei   VARCHAR(20) NOT NULL,
    last_fired_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (rule_id, device_imei)
);
