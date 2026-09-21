-- V9: Add cell tower (LBS) columns for GSM-based location when GPS is unavailable
-- OpenCellID integration requires MCC, MNC, LAC, Cell ID

ALTER TABLE locations ADD COLUMN IF NOT EXISTS mcc INTEGER;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS mnc INTEGER;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS lac INTEGER;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS cell_id BIGINT;

-- Index for cell tower lookups (useful for caching/analysis)
CREATE INDEX IF NOT EXISTS idx_locations_cell ON locations(mcc, mnc, lac, cell_id)
WHERE mcc IS NOT NULL;

COMMENT ON COLUMN locations.mcc IS 'Mobile Country Code (470 = Bangladesh)';
COMMENT ON COLUMN locations.mnc IS 'Mobile Network Code (1=GP, 2=Robi, 3=Banglalink, etc.)';
COMMENT ON COLUMN locations.lac IS 'Location Area Code';
COMMENT ON COLUMN locations.cell_id IS 'Cell Tower ID';
