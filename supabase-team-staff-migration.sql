-- Create team_staff table for role-based team staff assignments
-- This allows players to be assigned specific roles within teams
-- Roles: Franchise Owner, Head Coach, Assistant Coach, General Manager

CREATE TABLE IF NOT EXISTS public.team_staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Franchise Owner', 'Head Coach', 'Assistant Coach', 'General Manager')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  CONSTRAINT fk_team
    FOREIGN KEY (team_id)
    REFERENCES public.teams(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_player
    FOREIGN KEY (player_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE,
  -- Ensure a player can only have one of each role per team
  CONSTRAINT unique_team_player_role UNIQUE (team_id, player_id, role)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_staff_team_id ON public.team_staff(team_id);
CREATE INDEX IF NOT EXISTS idx_team_staff_player_id ON public.team_staff(player_id);
CREATE INDEX IF NOT EXISTS idx_team_staff_role ON public.team_staff(role);
CREATE INDEX IF NOT EXISTS idx_team_staff_created_at ON public.team_staff(created_at DESC);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_team_staff_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_team_staff_updated_at 
  BEFORE UPDATE ON public.team_staff
  FOR EACH ROW 
  EXECUTE FUNCTION update_team_staff_updated_at();

-- Enable Row Level Security
ALTER TABLE public.team_staff ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON public.team_staff;
DROP POLICY IF EXISTS "Enable write access for all users" ON public.team_staff;

-- Create policy for public read access
CREATE POLICY "Enable read access for all users" ON public.team_staff
  FOR SELECT USING (true);

-- Create policy for write access (allow all for now - you can restrict this later)
CREATE POLICY "Enable write access for all users" ON public.team_staff
  FOR ALL USING (true);

-- Add comments for documentation
COMMENT ON TABLE public.team_staff IS 'Stores team staff assignments with role-based access';
COMMENT ON COLUMN public.team_staff.id IS 'Unique identifier for the team staff record';
COMMENT ON COLUMN public.team_staff.team_id IS 'Foreign key reference to the teams table';
COMMENT ON COLUMN public.team_staff.player_id IS 'Foreign key reference to the users table';
COMMENT ON COLUMN public.team_staff.role IS 'The staff role assigned to the player for this team';
COMMENT ON COLUMN public.team_staff.created_at IS 'Timestamp when the staff record was created';
COMMENT ON COLUMN public.team_staff.updated_at IS 'Timestamp when the staff record was last updated';
