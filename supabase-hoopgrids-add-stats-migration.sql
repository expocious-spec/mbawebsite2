-- Add stat display fields to hoopgrid_attempts table
ALTER TABLE hoopgrid_attempts 
ADD COLUMN IF NOT EXISTS stat_value TEXT,
ADD COLUMN IF NOT EXISTS stat_label TEXT;
