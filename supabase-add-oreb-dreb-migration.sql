-- Add offensive_rebounds and defensive_rebounds columns to game_stats table

-- Add new columns
ALTER TABLE game_stats 
ADD COLUMN IF NOT EXISTS offensive_rebounds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS defensive_rebounds INTEGER DEFAULT 0;

-- Update existing records to split rebounds evenly (or set to 0)
-- Since we don't have historical data, we'll set them to 0 and keep total rebounds as is
-- Future entries will have proper OREB/DREB values
UPDATE game_stats 
SET offensive_rebounds = 0, defensive_rebounds = 0
WHERE offensive_rebounds IS NULL OR defensive_rebounds IS NULL;

-- Note: The 'rebounds' column will be kept for now as calculated field (OREB + DREB)
-- or for backward compatibility
