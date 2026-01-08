-- Create game_stats table if it doesn't exist
-- This table stores individual player performance statistics for each game

CREATE TABLE IF NOT EXISTS game_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id TEXT NOT NULL,
  game_id BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  opponent TEXT NOT NULL,
  points INTEGER DEFAULT 0,
  rebounds INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  steals INTEGER DEFAULT 0,
  blocks INTEGER DEFAULT 0,
  turnovers INTEGER DEFAULT 0,
  field_goals_made INTEGER DEFAULT 0,
  field_goals_attempted INTEGER DEFAULT 0,
  three_pointers_made INTEGER DEFAULT 0,
  three_pointers_attempted INTEGER DEFAULT 0,
  free_throws_made INTEGER DEFAULT 0,
  free_throws_attempted INTEGER DEFAULT 0,
  fouls INTEGER DEFAULT 0,
  minutes_played INTEGER DEFAULT 0,
  result TEXT CHECK (result IN ('W', 'L')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_game_stats_player_id ON game_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_game_stats_game_id ON game_stats(game_id);
CREATE INDEX IF NOT EXISTS idx_game_stats_date ON game_stats(date);

-- Enable Row Level Security
ALTER TABLE game_stats ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public read access to game_stats"
  ON game_stats FOR SELECT
  USING (true);

-- Allow authenticated users to manage game stats
CREATE POLICY "Authenticated users can manage game_stats"
  ON game_stats FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comment to document the table
COMMENT ON TABLE game_stats IS 'Individual player performance statistics for each game';
