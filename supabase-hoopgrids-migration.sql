-- ============================================
-- HOOPGRIDS MINIGAME TABLES
-- ============================================

-- Store daily grid configurations
CREATE TABLE IF NOT EXISTS hoopgrid_puzzles (
  id BIGSERIAL PRIMARY KEY,
  puzzle_date DATE NOT NULL UNIQUE,
  column1_type TEXT NOT NULL,  -- 'team', 'stat', 'accolade', etc.
  column1_value TEXT NOT NULL,  -- team_id or criteria
  column2_type TEXT NOT NULL,
  column2_value TEXT NOT NULL,
  column3_type TEXT NOT NULL,
  column3_value TEXT NOT NULL,
  row1_type TEXT NOT NULL,
  row1_value TEXT NOT NULL,
  row2_type TEXT NOT NULL,
  row2_value TEXT NOT NULL,
  row3_type TEXT NOT NULL,
  row3_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store user attempts and scores
CREATE TABLE IF NOT EXISTS hoopgrid_attempts (
  id BIGSERIAL PRIMARY KEY,
  puzzle_id BIGINT REFERENCES hoopgrid_puzzles(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,  -- Format: 'discord-{discord_id}'
  cell_row INTEGER NOT NULL,  -- 0, 1, or 2
  cell_col INTEGER NOT NULL,  -- 0, 1, or 2
  guessed_player_id TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store daily completed grids
CREATE TABLE IF NOT EXISTS hoopgrid_completions (
  id BIGSERIAL PRIMARY KEY,
  puzzle_id BIGINT REFERENCES hoopgrid_puzzles(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  rarity_score DECIMAL(10,2) NOT NULL,
  completion_time INTEGER,  -- seconds
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(puzzle_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_hoopgrid_attempts_puzzle ON hoopgrid_attempts(puzzle_id);
CREATE INDEX IF NOT EXISTS idx_hoopgrid_attempts_user ON hoopgrid_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_hoopgrid_completions_puzzle ON hoopgrid_completions(puzzle_id);
CREATE INDEX IF NOT EXISTS idx_hoopgrid_completions_user ON hoopgrid_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_hoopgrid_puzzles_date ON hoopgrid_puzzles(puzzle_date);
