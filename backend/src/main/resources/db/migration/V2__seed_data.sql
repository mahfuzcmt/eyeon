-- ============================================================
-- EyeOn V2 — minimal seed data for local dev
-- Admin user is seeded by DataSeeder (Java) so the BCrypt hash
-- is computed at runtime instead of hard-coded here.
-- ============================================================

-- Demo organization (Bangladesh-defaults) — fixed UUID for predictable tests
INSERT INTO organizations (id, name, slug, plan_tier, status, contact_email, contact_phone, locale, timezone)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'EyeOn Demo Fleet',
    'demo',
    'PRO',
    'ACTIVE',
    'demo@eyeon.com',
    '+8801700000000',
    'bn-BD',
    'Asia/Dhaka'
)
ON CONFLICT (slug) DO NOTHING;

-- Demo device (matches the example IMEI used in CLAUDE.md §9.2 and the simulator default)
INSERT INTO devices (id, org_id, imei, name, sim_msisdn, vehicle_plate, vehicle_type, protocol_variant, model)
VALUES (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    '864290061234567',
    'Demo Bike 1',
    '+8801711111111',
    'DHA-1234',
    'MOTORBIKE',
    'V3',
    'Concox GT06N'
)
ON CONFLICT (imei) DO NOTHING;
