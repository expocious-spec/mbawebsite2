-- Create transactions table for tracking all player transactions
-- This includes contract offers, role assignments (promotions/demotions), trades, etc.

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('contract', 'role_assignment', 'trade', 'release')),
  player_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  from_user_id TEXT, -- The user initiating the transaction (franchise owner for contracts, admin for role changes)
  
  -- Transaction details
  title TEXT NOT NULL, -- e.g., "Contract Offer", "Appointed Head Coach", "Released from Team"
  description TEXT, -- Detailed description of the transaction
  
  -- Contract-specific fields
  contract_offer_id INTEGER, -- Link to contract_offers table if applicable
  contract_price INTEGER,
  
  -- Role assignment specific fields
  role TEXT, -- The role assigned (Franchise Owner, Head Coach, etc.)
  previous_role TEXT, -- If changing roles (for demotion tracking)
  
  -- Status
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'rejected', 'cancelled')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Foreign keys
  CONSTRAINT fk_player
    FOREIGN KEY (player_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_team
    FOREIGN KEY (team_id)
    REFERENCES public.teams(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_from_user
    FOREIGN KEY (from_user_id)
    REFERENCES public.users(id)
    ON DELETE SET NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_player_id ON public.transactions(player_id);
CREATE INDEX IF NOT EXISTS idx_transactions_team_id ON public.transactions(team_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_contract_offer ON public.transactions(contract_offer_id) WHERE contract_offer_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON public.transactions;
DROP POLICY IF EXISTS "Enable write access for all users" ON public.transactions;

-- Create policy for public read access
CREATE POLICY "Enable read access for all users" ON public.transactions
  FOR SELECT USING (true);

-- Create policy for write access (allow all for now - you can restrict this later)
CREATE POLICY "Enable write access for all users" ON public.transactions
  FOR ALL USING (true);

-- Add comments for documentation
COMMENT ON TABLE public.transactions IS 'Stores all player transactions including contracts, role assignments, trades, and releases';
COMMENT ON COLUMN public.transactions.id IS 'Unique identifier for the transaction';
COMMENT ON COLUMN public.transactions.type IS 'Type of transaction: contract, role_assignment, trade, or release';
COMMENT ON COLUMN public.transactions.player_id IS 'Foreign key reference to the users table';
COMMENT ON COLUMN public.transactions.team_id IS 'Foreign key reference to the teams table';
COMMENT ON COLUMN public.transactions.from_user_id IS 'User who initiated the transaction';
COMMENT ON COLUMN public.transactions.title IS 'Short title/summary of the transaction';
COMMENT ON COLUMN public.transactions.description IS 'Detailed description of the transaction';
COMMENT ON COLUMN public.transactions.contract_offer_id IS 'Link to contract_offers table if this is a contract transaction';
COMMENT ON COLUMN public.transactions.role IS 'Role assigned in role_assignment transactions';
COMMENT ON COLUMN public.transactions.status IS 'Status of the transaction';
COMMENT ON COLUMN public.transactions.created_at IS 'Timestamp when the transaction was created';
COMMENT ON COLUMN public.transactions.completed_at IS 'Timestamp when the transaction was completed';
