-- Add player_of_game_id column to games table
-- This column stores the ID of the player who was awarded Player of the Game

ALTER TABLE games 
ADD COLUMN IF NOT EXISTS player_of_game_id TEXT;

-- Add foreign key constraint (but don't enforce it strictly since player_id is TEXT)
-- The website will validate this relationship
COMMENT ON COLUMN games.player_of_game_id IS 'ID of the player awarded Player of the Game (must be on winning team)';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_games_player_of_game ON games(player_of_game_id);
