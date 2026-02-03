-- Add seasons column to teams table
-- This allows teams to be assigned to multiple seasons

ALTER TABLE teams
ADD COLUMN seasons text[] DEFAULT ARRAY[]::text[];

-- Set all current teams to Season 6 as default
UPDATE teams
SET seasons = ARRAY['Season 6']
WHERE seasons IS NULL OR seasons = ARRAY[]::text[];
