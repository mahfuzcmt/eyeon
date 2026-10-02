-- EyeOn V26: cache of reverse-geocoded area names for the "where did they stay" report.
--
-- One row per ~110 m grid cell (latitude and longitude rounded to 3 decimals) and language.
-- The name of a street corner is public map data, so the cache is shared by every organization;
-- it holds no tracker, person or organization reference. An empty name means "looked up, the
-- map has nothing here" and stops the same cell being asked for again.
--
-- Rollback: DROP TABLE place_names;

CREATE TABLE place_names (
    cell        VARCHAR(24) NOT NULL,          -- '23.751,90.393'
    lang        VARCHAR(5)  NOT NULL,          -- 'en' | 'bn'
    name        VARCHAR(200) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (cell, lang)
);
