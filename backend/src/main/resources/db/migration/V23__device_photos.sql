-- ============================================================
-- V23__device_photos.sql
-- A carer can upload a photo of the child or relative; it replaces the drawn portrait
-- on the map marker, in lists and in the edit form.
--
-- The image is stored in the database (always a 256x256 JPEG, re-encoded on the server,
-- about 15-40 kB) because EyeOn has no object storage. It lives in its own table so that
-- the hot `devices` row stays small; `devices.photo_updated_at` tells clients whether a
-- photo exists and doubles as the cache-busting version in the image URL.
--
-- Rollback:
--   ALTER TABLE devices DROP COLUMN photo_updated_at;
--   DROP TABLE device_photos;
-- ============================================================

CREATE TABLE device_photos (
    device_imei  VARCHAR(20) PRIMARY KEY,
    org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    content_type VARCHAR(40) NOT NULL,
    data         BYTEA NOT NULL,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE devices ADD COLUMN photo_updated_at TIMESTAMPTZ;
