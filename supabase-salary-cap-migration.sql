-- Migration: Add Stars, Coin Worth, and Salary Cap
-- Description: Adds player star ratings, coin worth for salary system, and team salary cap management
-- Date: 2026-02-02

-- Add stars and coin_worth columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS stars DECIMAL(2, 1) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS coin_worth INTEGER DEFAULT 1000;

-- Add salary_cap column to teams table
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS salary_cap INTEGER DEFAULT 19000;

-- Add comments for documentation
COMMENT ON COLUMN users.stars IS 'Player star rating (1.0 to 5.0 in 0.5 increments)';
COMMENT ON COLUMN users.coin_worth IS 'Player coin worth/value for salary cap system (in dollars)';
COMMENT ON COLUMN teams.salary_cap IS 'Team salary cap limit (default $19,000)';

-- Update existing users to have default values if NULL
UPDATE users
SET stars = 1.0
WHERE stars IS NULL;

UPDATE users
SET coin_worth = 1000
WHERE coin_worth IS NULL;

-- Update existing teams to have default salary cap if NULL
UPDATE teams
SET salary_cap = 19000
WHERE salary_cap IS NULL;

-- Create index for faster salary cap calculations
CREATE INDEX IF NOT EXISTS idx_users_team_coin_worth ON users(team_id, coin_worth);

-- Create a view to easily see team salary usage
CREATE OR REPLACE VIEW team_salary_usage AS
SELECT 
    t.id AS team_id,
    t.name AS team_name,
    t.salary_cap,
    COALESCE(SUM(u.coin_worth), 0) AS current_salary,
    t.salary_cap - COALESCE(SUM(u.coin_worth), 0) AS remaining_cap,
    CASE 
        WHEN COALESCE(SUM(u.coin_worth), 0) >= t.salary_cap THEN 'Over Cap'
        WHEN COALESCE(SUM(u.coin_worth), 0) = t.salary_cap THEN 'At Cap'
        ELSE 'Under Cap'
    END AS cap_status
FROM teams t
LEFT JOIN users u ON u.team_id = t.id
GROUP BY t.id, t.name, t.salary_cap;

-- Grant access to the view
GRANT SELECT ON team_salary_usage TO anon, authenticated;

-- Star to Coin Worth Reference (for documentation):
-- 5.0 stars   = $12,000
-- 4.5 stars   = $10,500
-- 4.0 stars   = $9,000
-- 3.5 stars   = $7,500
-- 3.0 stars   = $6,000
-- 2.5 stars   = $4,500
-- 2.0 stars   = $3,000
-- 1.5 stars   = $1,500
-- 1.0 stars   = $1,000
