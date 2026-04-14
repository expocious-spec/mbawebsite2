-- Add player_level column to users table
-- Three levels: 'highschool', 'collegiate', 'mba'

ALTER TABLE users ADD COLUMN IF NOT EXISTS player_level TEXT DEFAULT 'mba' CHECK (player_level IN ('highschool', 'collegiate', 'mba'));

-- Set all existing users to MBA level
UPDATE users SET player_level = 'mba' WHERE player_level IS NULL;

-- Create an index for efficient querying by player level
CREATE INDEX IF NOT EXISTS idx_users_player_level ON users(player_level);

-- Comment
COMMENT ON COLUMN users.player_level IS 'Player competition level: highschool (HS Athlete), collegiate (Collegiate Athlete), or mba (MBA Athlete)';
