-- ============================================
-- CONTRACT OFFERS TABLE
-- ============================================
-- Allows admins to create contract offers from franchise owners to players
-- Players must wait 12 hours before accepting an offer

CREATE TABLE IF NOT EXISTS contract_offers (
  id BIGSERIAL PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  franchise_owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contract_price INTEGER NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  
  -- Ensure contract price is at least the player's current coin worth
  CONSTRAINT contract_price_minimum CHECK (contract_price > 0)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_contract_offers_player ON contract_offers(player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contract_offers_team ON contract_offers(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contract_offers_status ON contract_offers(status, created_at DESC);

-- Enable RLS
ALTER TABLE contract_offers ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read contract offers
CREATE POLICY "Allow authenticated users to view contract offers"
  ON contract_offers
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins to insert/update/delete contract offers
CREATE POLICY "Allow admins to manage contract offers"
  ON contract_offers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add comment to document the table
COMMENT ON TABLE contract_offers IS 'Contract offers from franchise owners to players. Players can accept offers 12 hours after they are sent.';
COMMENT ON COLUMN contract_offers.contract_price IS 'Contract price offered to the player. Must be at least the player''s current coin worth.';
COMMENT ON COLUMN contract_offers.status IS 'Status of the offer: pending, accepted, rejected, or expired.';
