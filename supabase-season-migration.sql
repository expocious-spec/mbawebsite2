-- Migrate season column from INTEGER to TEXT
-- This allows games to be categorized by season names (Preseason 1, Season 1, Season 2, Season 3)

-- First, check if season column is INTEGER and convert it
DO $$ 
BEGIN
  -- Check if column exists and is INTEGER type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'games' 
    AND column_name = 'season' 
    AND data_type = 'integer'
  ) THEN
    -- Drop the INTEGER column
    ALTER TABLE games DROP COLUMN season;
  END IF;
END $$;

-- Add season column as TEXT
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS season TEXT DEFAULT 'Preseason 1';

-- Update any existing games without a season to Preseason 1
UPDATE games 
SET season = 'Preseason 1' 
WHERE season IS NULL OR season = '';

-- Add comment to document the column
COMMENT ON COLUMN games.season IS 'Season identifier: Preseason 1, Season 1, Season 2, Season 3, etc.';
