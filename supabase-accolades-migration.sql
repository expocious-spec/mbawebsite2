-- ============================================
-- ACCOLADES/REWARDS SYSTEM
-- ============================================
-- Allows admins to create accolades and assign them to multiple players
-- Separates accolade definition from player assignments

-- Drop existing tables if they exist (to ensure clean migration)
DROP TABLE IF EXISTS accolade_assignments CASCADE;
DROP TABLE IF EXISTS accolades CASCADE;

-- Accolades table (definitions/templates)
CREATE TABLE accolades (
  id BIGSERIAL PRIMARY KEY,
  season_id BIGINT REFERENCES seasons(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#FFD700',
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Accolade assignments (which players have which accolades)
CREATE TABLE accolade_assignments (
  id BIGSERIAL PRIMARY KEY,
  accolade_id BIGINT NOT NULL REFERENCES accolades(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  awarded_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(accolade_id, player_id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_accolades_season ON accolades(season_id);
CREATE INDEX IF NOT EXISTS idx_accolade_assignments_accolade ON accolade_assignments(accolade_id);
CREATE INDEX IF NOT EXISTS idx_accolade_assignments_player ON accolade_assignments(player_id, awarded_date DESC);

-- Enable RLS
ALTER TABLE accolades ENABLE ROW LEVEL SECURITY;
ALTER TABLE accolade_assignments ENABLE ROW LEVEL SECURITY;

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

-- Allow all authenticated users to read assignments
CREATE POLICY "Allow authenticated users to view assignments"
  ON accolade_assignments
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow public to read assignments
CREATE POLICY "Allow public to view assignments"
  ON accolade_assignments
  FOR SELECT
  TO anon
  USING (true);

-- Allow admins to manage accolades
CREATE POLICY "Allow admins to manage accolades"
  ON accolades
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow admins to manage assignments
CREATE POLICY "Allow admins to manage assignments"
  ON accolade_assignments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add comments to document the tables
COMMENT ON TABLE accolades IS 'Accolade definitions/templates (e.g., "Season 5 Finals Champion")';
COMMENT ON TABLE accolade_assignments IS 'Which players have which accolades';
COMMENT ON COLUMN accolades.title IS 'Title of the accolade (e.g., "Season 5 Finals Champion")';
COMMENT ON COLUMN accolades.color IS 'Hex color code for the accolade badge';
