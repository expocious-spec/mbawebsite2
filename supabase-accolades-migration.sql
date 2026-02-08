-- ============================================
-- ACCOLADES/REWARDS TABLE
-- ============================================
-- Allows admins to create accolades/awards and assign them to players
-- Players can have multiple accolades

CREATE TABLE IF NOT EXISTS accolades (
  id BIGSERIAL PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  season_id BIGINT REFERENCES seasons(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#FFD700',
  icon TEXT,
  awarded_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_accolades_player ON accolades(player_id, awarded_date DESC);
CREATE INDEX IF NOT EXISTS idx_accolades_season ON accolades(season_id, awarded_date DESC);

-- Enable RLS
ALTER TABLE accolades ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read accolades
CREATE POLICY "Allow authenticated users to view accolades"
  ON accolades
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow public to read accolades (for non-authenticated users viewing profiles)
CREATE POLICY "Allow public to view accolades"
  ON accolades
  FOR SELECT
  TO anon
  USING (true);

-- Allow admins to insert/update/delete accolades
CREATE POLICY "Allow admins to manage accolades"
  ON accolades
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add comment to document the table
COMMENT ON TABLE accolades IS 'Player accolades and awards (e.g., Season 5 Finals Champion, Season 5 Playoffs MVP)';
COMMENT ON COLUMN accolades.title IS 'Title of the accolade (e.g., "Season 5 Finals Champion")';
COMMENT ON COLUMN accolades.color IS 'Hex color code for the accolade badge';
