-- EyeOn V28: road-snapped pieces of a person's route (RouteService).
--
-- A piece of GPS track is sent to an OSRM map-matching service once and the road geometry it
-- returns is kept here, so a day's route is snapped once, not on every map refresh. One row per
-- tracker and piece start; when the piece grows (the person is still moving) the row is replaced.
-- `geometry` is a JSON array of [lat, lng]; NULL means "could not be matched, draw the raw points".
--
-- Rollback: DROP TABLE route_matches;

CREATE TABLE route_matches (
    device_imei VARCHAR(20) NOT NULL,
    start_ts    TIMESTAMPTZ NOT NULL,
    end_ts      TIMESTAMPTZ NOT NULL,
    points      INTEGER NOT NULL,
    profile     VARCHAR(8) NOT NULL,
    geometry    JSONB,
    confidence  DOUBLE PRECISION,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (device_imei, start_ts)
);
