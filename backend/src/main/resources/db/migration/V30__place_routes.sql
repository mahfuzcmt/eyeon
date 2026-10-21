-- ============================================================
-- V30__place_routes.sql
--
-- The usual way to and from a trusted place: "to School" and "from School", each optional.
-- A parent taps a few points on the map; the line is snapped to the roads and stored here.
-- While a trip is expected (around the place's arrival time for TO, after leaving for FROM,
-- see PlaceRouteService) every fix is compared with the line: more than width_m away for
-- two minutes raises ROUTE_DEVIATION for the place's owner, coming back BACK_ON_ROUTE.
--
-- waypoints: the points the parent tapped, [{lat,lng}], to edit the route again.
-- path:      the road line drawn between them, [{lat,lng}], what fixes are compared with.
--
-- Rollback:
--   DROP TABLE place_routes;
-- ============================================================

CREATE TABLE place_routes (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    geofence_id  UUID NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
    direction    VARCHAR(8) NOT NULL CHECK (direction IN ('TO', 'FROM')),
    mode         VARCHAR(8) NOT NULL DEFAULT 'VEHICLE' CHECK (mode IN ('WALK', 'VEHICLE')),
    waypoints    JSONB NOT NULL,
    path         JSONB NOT NULL,
    width_m      SMALLINT NOT NULL DEFAULT 100 CHECK (width_m BETWEEN 50 AND 500),
    is_active    BOOLEAN NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (geofence_id, direction)
);

-- New alarm types: a user who saved notification settings and kept NOT_ARRIVED on gets them too
-- (a saved row lists types explicitly, so new ones would otherwise never show).
UPDATE user_notification_settings
   SET push_types = push_types || ARRAY['ROUTE_DEVIATION','BACK_ON_ROUTE']
 WHERE 'NOT_ARRIVED' = ANY(push_types) AND NOT ('ROUTE_DEVIATION' = ANY(push_types));
UPDATE user_notification_settings
   SET popup_types = popup_types || ARRAY['ROUTE_DEVIATION','BACK_ON_ROUTE']
 WHERE 'NOT_ARRIVED' = ANY(popup_types) AND NOT ('ROUTE_DEVIATION' = ANY(popup_types));
UPDATE user_notification_settings
   SET sound_types = sound_types || ARRAY['ROUTE_DEVIATION','BACK_ON_ROUTE']
 WHERE 'NOT_ARRIVED' = ANY(sound_types) AND NOT ('ROUTE_DEVIATION' = ANY(sound_types));
