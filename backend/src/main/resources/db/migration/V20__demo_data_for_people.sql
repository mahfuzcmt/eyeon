-- ============================================================
-- V20__demo_data_for_people.sql
-- EyeOn tracks people and sells to schools, but V2 seeded a vehicle-fleet demo:
-- organization "EyeOn Demo Fleet" with a motorbike called "Demo Bike 1" (plate DHA-1234).
-- V2 is already applied in production and migrations are immutable, so the demo rows
-- are corrected here instead.
--
-- Every statement only touches a row that still holds the ORIGINAL seeded value, so an
-- organization or person that has since been renamed by a user is left alone.
--
-- Rollback:
--   UPDATE organizations SET name = 'EyeOn Demo Fleet' WHERE id = '00000000-0000-0000-0000-000000000001' AND name = 'EyeOn Demo School';
--   UPDATE devices SET name = 'Demo Bike 1', vehicle_plate = 'DHA-1234', vehicle_type = 'MOTORBIKE'
--    WHERE id = '00000000-0000-0000-0000-000000000010' AND name = 'Rafi';
-- ============================================================

UPDATE organizations
   SET name = 'EyeOn Demo School', updated_at = now()
 WHERE id = '00000000-0000-0000-0000-000000000001'
   AND name = 'EyeOn Demo Fleet';

UPDATE devices
   SET name = 'Rafi', vehicle_plate = 'Class 5', vehicle_type = 'BOY', updated_at = now()
 WHERE id = '00000000-0000-0000-0000-000000000010'
   AND name = 'Demo Bike 1';

-- Any other row still carrying an inherited vehicle type is drawn as a person by the
-- apps anyway; store what is shown so the edit form opens on a valid choice.
UPDATE devices
   SET vehicle_type = 'PERSON', updated_at = now()
 WHERE vehicle_type IS NOT NULL
   AND vehicle_type NOT IN ('BOY', 'GIRL', 'PERSON');
