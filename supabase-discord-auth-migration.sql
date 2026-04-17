-- Discord OAuth2 Authentication Migration
-- This migration adds columns to the existing users table
-- to support Discord OAuth login with Minecraft account verification
-- 
-- Note: Your Discord bot manages bot_discord_links and bot_users tables
-- This migration adds columns to the website's users table

-- Update users table to match bot database structure
-- Add columns if they don't exist
DO $$ 
BEGIN
  -- Add discord_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'discord_id') THEN
    ALTER TABLE users ADD COLUMN discord_id TEXT;
  END IF;

  -- Add minecraft_uuid column if it doesn't exist (different from minecraft_user_id)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'minecraft_uuid') THEN
    ALTER TABLE users ADD COLUMN minecraft_uuid TEXT;
  END IF;

  -- Add profile_description for editable profile descriptions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'profile_description') THEN
    ALTER TABLE users ADD COLUMN profile_description TEXT;
  END IF;
  
  -- Add discord_username if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'discord_username') THEN
    ALTER TABLE users ADD COLUMN discord_username TEXT;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id);
CREATE INDEX IF NOT EXISTS idx_users_minecraft_username ON users(minecraft_username);
CREATE INDEX IF NOT EXISTS idx_users_minecraft_uuid ON users(minecraft_uuid);

-- Comment documentation
COMMENT ON COLUMN users.discord_id IS 'Discord user ID (without discord- prefix)';
COMMENT ON COLUMN users.minecraft_uuid IS 'Minecraft account UUID';
COMMENT ON COLUMN users.profile_description IS 'User-editable profile description (max 500 characters)';
COMMENT ON COLUMN users.discord_username IS 'Discord username for display';

-- Note: bot_discord_links and bot_users tables are managed by your Discord bot
-- The website reads from these tables but does not modify them
