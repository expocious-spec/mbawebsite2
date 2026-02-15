-- Migration: Add week column to games table
-- This allows games to be organized by week (Week 1, Week 2, etc.)

-- Add week column to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS week INTEGER;

-- Create index for better performance when filtering by week
CREATE INDEX IF NOT EXISTS idx_games_week ON games(week);

-- Add comment for documentation
COMMENT ON COLUMN games.week IS 'Week number for the game (e.g., 1 for Week 1, 2 for Week 2, etc.)';
