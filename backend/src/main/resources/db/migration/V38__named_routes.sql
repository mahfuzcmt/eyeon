-- ============================================================
-- V38__named_routes.sql
--
-- Usual routes grow up (2026-11-28): a place can have several routes in each direction, each
-- with a name ("Home to School"), the place at its other end, its own days and time window, and
-- the alert level the parent chose.
--
-- weekdays / time_from / time_to: when the route is watched, in the organization's timezone
--   (ISO weekdays 1 = Monday ... 7 = Sunday). All three NULL = a route from before V38, which is
--   still watched around the place's expected arrival / leaving time as before.
-- other_geofence_id: where a TO route starts or a FROM route ends, when that is a trusted place.
--   Leaving it is what starts the "did not take the route" check of a TO route.
-- severity: of ROUTE_DEVIATION and ROUTE_NOT_TAKEN for this route (BACK_ON_ROUTE stays INFO).
--
-- Rollback (only while no place has two routes in one direction):
--   ALTER TABLE place_routes DROP COLUMN name, DROP COLUMN other_geofence_id, DROP COLUMN weekdays,
--     DROP COLUMN time_from, DROP COLUMN time_to, DROP COLUMN severity;
--   ALTER TABLE place_routes ADD UNIQUE (geofence_id, direction);
-- ============================================================

ALTER TABLE place_routes
    ADD COLUMN name              VARCHAR(80),
    ADD COLUMN other_geofence_id UUID REFERENCES geofences(id) ON DELETE SET NULL,
    ADD COLUMN weekdays          SMALLINT[],
    ADD COLUMN time_from         TIME,
    ADD COLUMN time_to           TIME,
    ADD COLUMN severity          VARCHAR(10) NOT NULL DEFAULT 'WARNING'
                                 CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL'));

ALTER TABLE place_routes DROP CONSTRAINT IF EXISTS place_routes_geofence_id_direction_key;
CREATE INDEX IF NOT EXISTS idx_place_routes_geofence ON place_routes(geofence_id);
