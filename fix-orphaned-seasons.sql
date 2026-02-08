-- Remove "Preseason 6" from all teams' seasons array
-- Run this in your Supabase SQL Editor

UPDATE teams
SET seasons = array_remove(seasons, 'Preseason 6')
WHERE 'Preseason 6' = ANY(seasons);

-- Verify the update
SELECT id, name, seasons
FROM teams
WHERE seasons IS NOT NULL AND array_length(seasons, 1) > 0
ORDER BY name;
