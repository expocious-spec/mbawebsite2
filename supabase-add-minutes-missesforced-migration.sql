-- Add minutes and misses_forced columns to game stats tables
-- Migration to add MIN (minutes) and MISS-AG (misses forced) stats

-- Add columns to game_stats table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'game_stats') THEN
    -- Add minutes column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'game_stats' AND column_name = 'minutes') THEN
      ALTER TABLE game_stats ADD COLUMN minutes INTEGER DEFAULT 0;
    END IF;
    
    -- Add misses_forced column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'game_stats' AND column_name = 'misses_forced') THEN
      ALTER TABLE game_stats ADD COLUMN misses_forced INTEGER DEFAULT 0;
    END IF;
    
    -- Add blocks column if it doesn't exist (for backwards compatibility)
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'game_stats' AND column_name = 'blocks') THEN
      ALTER TABLE game_stats ADD COLUMN blocks INTEGER DEFAULT 0;
    END IF;
  END IF;
END $$;

-- Add columns to player_game_stats table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'player_game_stats') THEN
    -- Add minutes_played column if it doesn't exist (it might already exist)
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'player_game_stats' AND column_name = 'minutes_played') THEN
      ALTER TABLE player_game_stats ADD COLUMN minutes_played INTEGER DEFAULT 0;
    END IF;
    
    -- Add misses_forced column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'player_game_stats' AND column_name = 'misses_forced') THEN
      ALTER TABLE player_game_stats ADD COLUMN misses_forced INTEGER DEFAULT 0;
    END IF;
  END IF;
END $$;

-- Add comments to document the new columns
COMMENT ON COLUMN game_stats.minutes IS 'Minutes played in the game (stored as total seconds)';
COMMENT ON COLUMN game_stats.misses_forced IS 'Number of misses forced by defensive pressure';

COMMENT ON COLUMN player_game_stats.minutes_played IS 'Minutes played in the game (stored as total seconds)';
COMMENT ON COLUMN player_game_stats.misses_forced IS 'Number of misses forced by defensive pressure';

-- Note: The minutes are stored as total seconds (e.g., 5:30 = 330 seconds)
-- This makes calculations easier and the format conversion happens on the frontend
