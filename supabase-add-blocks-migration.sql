-- Add blocks column to game_stats table
ALTER TABLE game_stats ADD COLUMN IF NOT EXISTS blocks INTEGER DEFAULT 0;

-- Add comment to document the column
COMMENT ON COLUMN game_stats.blocks IS 'Number of blocks by the player in the game';
