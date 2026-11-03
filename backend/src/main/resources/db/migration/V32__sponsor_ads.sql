-- ============================================================
-- V32__sponsor_ads.sql
--
-- Sponsor ads shown as a slider on the mobile app's Home (owner, 2026-11-03). Platform-wide:
-- every organization sees the same ads, and only a SUPER_ADMIN can create or change them.
-- An ad is a banner image (stored re-encoded as a 1200x600 JPEG, like device_photos there is
-- no object storage), an optional title and an optional http(s) link opened when it is tapped.
-- Ads are not private: the active ones and their images are served without a login
-- (/public/sponsor-ads), so the app can load them as plain image URLs.
--
-- Rollback: DROP TABLE sponsor_ads;
-- ============================================================

create table sponsor_ads (
    id               uuid primary key default gen_random_uuid(),
    title            varchar(120),
    link_url         varchar(500),
    sort_order       integer not null default 0,
    active           boolean not null default true,
    image            bytea,
    image_type       varchar(30),
    image_updated_at timestamptz,
    created_by       uuid references users(id) on delete set null,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now()
);

create index idx_sponsor_ads_active on sponsor_ads(sort_order, created_at) where active = true;
