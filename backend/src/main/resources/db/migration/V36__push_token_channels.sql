-- EyeOn V36: which Android notification channels an install has.
-- App 0.3.28 created new channels (alarms_v2 / arrivals_v2) and the backend switched to them on
-- 2026-11-17; installs of older versions do not have them, so their alerts fell back to a
-- default channel that some phones keep silent. NULL = an older app (channels "alarms" /
-- "arrivals"); 'v2' = the app said it has the second generation (0.3.29 on).
ALTER TABLE push_tokens ADD COLUMN channels VARCHAR(10);
