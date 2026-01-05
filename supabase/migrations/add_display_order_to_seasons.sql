-- Add display_order column to seasons table
ALTER TABLE seasons 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Create index on display_order for efficient sorting
CREATE INDEX IF NOT EXISTS idx_seasons_display_order ON seasons(display_order);

-- Update existing seasons with sequential display order based on creation date
WITH numbered_seasons AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY guild_id ORDER BY created_at) - 1 AS order_num
  FROM seasons
)
UPDATE seasons
SET display_order = numbered_seasons.order_num
FROM numbered_seasons
WHERE seasons.id = numbered_seasons.id AND seasons.display_order = 0;
