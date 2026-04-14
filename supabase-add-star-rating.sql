-- Add star_rating column to users table
-- Default is 0 stars, can be 0-5

ALTER TABLE users ADD COLUMN IF NOT EXISTS star_rating INTEGER DEFAULT 0 CHECK (star_rating >= 0 AND star_rating <= 5);

-- Set all existing users to 0 star rating
UPDATE users SET star_rating = 0 WHERE star_rating IS NULL;

-- Create an index for efficient querying by star rating
CREATE INDEX IF NOT EXISTS idx_users_star_rating ON users(star_rating);

-- Comment
COMMENT ON COLUMN users.star_rating IS 'Player star rating from 0-5 stars (recruit level)';
