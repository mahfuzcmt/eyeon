-- ============================================================
-- V25__expected_times_and_daily_checks.sql
--
-- 1. Expected times on a trusted place: "at School by 08:15", "left Coaching by 21:00".
--    A schedule belongs to a place (and so to the place's owner, V21) and applies to every
--    person assigned to that place. When someone is not where the schedule says at that
--    time, a NOT_ARRIVED / NOT_LEFT alarm is raised for the owner.
--
-- 2. daily_checks: "this check has been dealt with for this person today". It keeps a
--    schedule from alerting more than once a day and is shared with the battery reminders
--    (check_key 'battery:evening' / 'battery:morning').
--
-- Times are local to the organization's timezone (organizations.timezone); weekdays are
-- ISO numbers, 1 = Monday ... 7 = Sunday.
--
-- Rollback:
--   DROP TABLE daily_checks;
--   DROP TABLE place_schedules;
-- ============================================================

CREATE TABLE place_schedules (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    geofence_id  UUID NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
    kind         VARCHAR(16) NOT NULL,          -- ARRIVE_BY | LEAVE_BY
    local_time   TIME NOT NULL,
    weekdays     SMALLINT[] NOT NULL,
    is_active    BOOLEAN NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_place_schedules_geofence ON place_schedules(geofence_id);

CREATE TABLE daily_checks (
    check_key    VARCHAR(80) NOT NULL,          -- 'schedule:<uuid>' | 'battery:evening' | 'battery:morning'
    device_imei  VARCHAR(20) NOT NULL,
    day          DATE NOT NULL,                 -- local date in the organization's timezone
    status       VARCHAR(16) NOT NULL,          -- PROBED | OK | ALERTED
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (check_key, device_imei, day)
);
