-- ============================================================
-- V33__notification_known_types.sql
--
-- Client feedback 2026-11-05: "still notifications are not coming".
-- user_notification_settings stores the alarm types a user switched ON. A type that did not
-- exist when the user last saved the screen was therefore OFF for them: everyone who saved
-- Settings -> Notifications before 2026-10-02 never got a push (or popup / sound) for the
-- family-safety alarms added since - PLACE_ARRIVED / PLACE_LEFT, NOT_ARRIVED / NOT_LEFT, the
-- on-time / late messages, ROUTE_DEVIATION / BACK_ON_ROUTE, CHARGE_REMINDER.
--
-- known_types records which types the settings screen offered when the row was saved; a type
-- outside it gets the platform default (on) until the user saves again
-- (NotificationSettingsRepository, PushTokenRepository.listTokensForOrgAndType).
--
-- Existing rows: the types added after the fork (2026-09-21) are switched on, and known_types
-- is set to every current type. A user who had deliberately switched one of those off gets it
-- back once; the screen shows it and can switch it off again.
--
-- Rollback: ALTER TABLE user_notification_settings DROP COLUMN known_types;
-- ============================================================
alter table user_notification_settings add column known_types text[];

update user_notification_settings
   set popup_types = array(select distinct unnest(popup_types || n.added)),
       sound_types = array(select distinct unnest(sound_types || n.added)),
       push_types  = array(select distinct unnest(push_types  || n.added)),
       known_types = n.added || array['SOS','POWER_CUT','SHOCK','OVERSPEED','GEOFENCE_ENTER','GEOFENCE_EXIT',
                       'COLLISION','ACC_ON','ACC_OFF','LOW_BATTERY','EXTERNAL_LOW_VOLTAGE','REMOVE','DOOR',
                       'URGENT_ACCELERATION','URGENT_DECELERATION','CURFEW_VIOLATION','PARKING_TIMEOUT',
                       'OFFLINE_TIMEOUT']::text[]
  from (select array['PLACE_ARRIVED','PLACE_LEFT','NOT_ARRIVED','NOT_LEFT','ARRIVED_ON_TIME','LEFT_ON_TIME',
                     'ARRIVED_LATE','LEFT_LATE','ROUTE_DEVIATION','BACK_ON_ROUTE','CHARGE_REMINDER']::text[] as added) n;
