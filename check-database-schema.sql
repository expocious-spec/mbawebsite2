-- Run this in Supabase SQL Editor to check your database schema
-- This will show you what columns exist in your tables

-- Check discord_links table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'discord_links'
ORDER BY ordinal_position;

-- Check users table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Check if discord_links table has data
SELECT COUNT(*) as discord_links_count FROM discord_links;

-- Check if users table has discord-related data
SELECT COUNT(*) as users_with_discord_id FROM users WHERE discord_id IS NOT NULL;

-- Sample data from discord_links (first 3 rows)
SELECT * FROM discord_links LIMIT 3;

-- Sample data from users with discord info (first 3 rows)
SELECT 
  id,
  username,
  minecraft_username,
  discord_id,
  discord_username,
  team_id,
  profile_description
FROM users 
WHERE discord_id IS NOT NULL
LIMIT 3;
