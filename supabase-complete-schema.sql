-- ============================================
-- MBA BASKETBALL LEAGUE - COMPLETE DATABASE SCHEMA
-- Bot + Website Integration (Fresh Installation)
-- ============================================
-- Run this in your Supabase SQL Editor for a blank database
-- This includes everything needed for both the website AND Discord bot

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TEAMS TABLE (Shared by Bot + Website)
-- ============================================
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,  -- Use TEXT for bot compatibility
  guild_id TEXT,  -- Discord server ID (for bot)
  name TEXT NOT NULL,
  logo TEXT,
  team_logo_url TEXT,  -- Bot field
  team_logo_emoji TEXT,  -- Bot field
  team_role_id TEXT,  -- Discord role ID (for bot)
  owner TEXT,
  general_manager TEXT,
  head_coach TEXT,
  assistant_coaches TEXT[],
  conference TEXT NOT NULL DEFAULT 'Eastern',  -- 'Eastern', 'Western', 'Desert', 'Plains'
  primary_color TEXT NOT NULL DEFAULT '#00A8E8',
  secondary_color TEXT NOT NULL DEFAULT '#0A0E27',
  wins INTEGER DEFAULT 0,  -- Bot field
  losses INTEGER DEFAULT 0,  -- Bot field
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USERS TABLE (Discord Bot Format - PRIMARY)
-- ============================================
-- This is the main user table used by the bot
-- ID format: 'discord-{discord_id}'
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,  -- Format: 'discord-{discord_id}'
  username TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  minecraft_username TEXT,
  minecraft_user_id TEXT,
  team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
  description TEXT,
  discord_username TEXT,
  roles TEXT[] DEFAULT ARRAY['Player']::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SEASONS TABLE (Bot Managed)
-- ============================================
CREATE TABLE IF NOT EXISTS seasons (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  season_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(guild_id, season_name)
);

-- ============================================
-- GAMES TABLE (Bot + Website)
-- ============================================
CREATE TABLE IF NOT EXISTS games (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT,  -- Bot field
  season_id BIGINT REFERENCES seasons(id) ON DELETE CASCADE,  -- Bot field
  
  -- Bot format (team1/team2)
  team1_id TEXT REFERENCES teams(id),
  team2_id TEXT REFERENCES teams(id),
  team1_score INTEGER,
  team2_score INTEGER,
  winner_id TEXT REFERENCES teams(id),
  
  -- Website format (home/away) - for backward compatibility
  home_team_id TEXT REFERENCES teams(id),
  away_team_id TEXT REFERENCES teams(id),
  home_score INTEGER,
  away_score INTEGER,
  
  scheduled_date TIMESTAMPTZ,
  played_at TIMESTAMPTZ DEFAULT NOW(),  -- Bot field
  status TEXT CHECK (status IN ('scheduled', 'live', 'completed')) DEFAULT 'scheduled',
  season INTEGER DEFAULT 0,  -- Website field (season number)
  week INTEGER,  -- Week number (1, 2, 3, etc.)
  recorded_by TEXT,  -- Bot field (who recorded the game)
  vod_url TEXT,  -- Bot field
  notes TEXT,  -- Bot field
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PLAYER SEASON STATS (Bot Managed - Aggregated)
-- ============================================
-- The bot automatically aggregates stats per season
CREATE TABLE IF NOT EXISTS player_season_stats (
  id BIGSERIAL PRIMARY KEY,
  player_id TEXT NOT NULL,  -- Format: 'discord-{discord_id}'
  season_id BIGINT REFERENCES seasons(id) ON DELETE CASCADE,
  guild_id TEXT NOT NULL,
  games_played INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  total_rebounds INTEGER DEFAULT 0,
  total_assists INTEGER DEFAULT 0,
  total_steals INTEGER DEFAULT 0,
  total_blocks INTEGER DEFAULT 0,
  total_turnovers INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, season_id)
);

-- ============================================
-- PLAYER GAME STATS (Individual Game Performance)
-- ============================================
CREATE TABLE IF NOT EXISTS player_game_stats (
  id BIGSERIAL PRIMARY KEY,
  game_id BIGINT REFERENCES games(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,  -- Format: 'discord-{discord_id}'
  team_id TEXT REFERENCES teams(id),
  points INTEGER DEFAULT 0,
  rebounds INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  steals INTEGER DEFAULT 0,
  blocks INTEGER DEFAULT 0,
  turnovers INTEGER DEFAULT 0,
  field_goals_made INTEGER DEFAULT 0,
  field_goals_attempted INTEGER DEFAULT 0,
  three_pointers_made INTEGER DEFAULT 0,
  three_pointers_attempted INTEGER DEFAULT 0,
  free_throws_made INTEGER DEFAULT 0,
  free_throws_attempted INTEGER DEFAULT 0,
  fouls INTEGER DEFAULT 0,
  minutes_played INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, player_id)
);

-- ============================================
-- TRANSACTION HISTORY (Bot Managed)
-- ============================================
CREATE TABLE IF NOT EXISTS transaction_history (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL,  -- 'sign', 'release', 'trade', 'demand'
  player_id TEXT NOT NULL,  -- Format: 'discord-{discord_id}'
  from_team_id TEXT REFERENCES teams(id),
  to_team_id TEXT REFERENCES teams(id),
  performed_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ACCOLADES (Player Awards)
-- ============================================
CREATE TABLE IF NOT EXISTS accolades (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  player_id TEXT NOT NULL,  -- Format: 'discord-{discord_id}'
  season_id BIGINT REFERENCES seasons(id),
  accolade_type TEXT NOT NULL,  -- 'MVP', 'DPOY', 'All-Star', 'Champion', etc.
  description TEXT,
  awarded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ARTICLES (Website Content)
-- ============================================
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  published_date TIMESTAMPTZ NOT NULL,
  cover_image TEXT,
  excerpt TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STAFF TABLE (Website - Team Staff Roles)
-- ============================================
CREATE TABLE IF NOT EXISTS staff (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  player_id TEXT NOT NULL,  -- References users.id
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LIVE STREAM TABLE (Website Feature)
-- ============================================
CREATE TABLE IF NOT EXISTS live_stream (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  twitch_channel TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SOCIAL FEATURES (Website)
-- ============================================

-- Article Likes
CREATE TABLE IF NOT EXISTS article_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,  -- References users.id
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(article_id, player_id)
);

-- Article Comments
CREATE TABLE IF NOT EXISTS article_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,  -- References users.id
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comment Likes
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES article_comments(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,  -- References users.id
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, player_id)
);

-- Team Wall Posts
CREATE TABLE IF NOT EXISTS team_wall_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,  -- References users.id
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  pinned_at TIMESTAMPTZ,
  pinned_by TEXT,  -- References users.id
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_team ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_users_minecraft_username ON users(minecraft_username);
CREATE INDEX IF NOT EXISTS idx_users_discord_username ON users(discord_username);

-- Teams indexes
CREATE INDEX IF NOT EXISTS idx_teams_guild ON teams(guild_id);
CREATE INDEX IF NOT EXISTS idx_teams_conference ON teams(conference);

-- Games indexes
CREATE INDEX IF NOT EXISTS idx_games_team1 ON games(team1_id);
CREATE INDEX IF NOT EXISTS idx_games_team2 ON games(team2_id);
CREATE INDEX IF NOT EXISTS idx_games_home_team ON games(home_team_id);
CREATE INDEX IF NOT EXISTS idx_games_away_team ON games(away_team_id);
CREATE INDEX IF NOT EXISTS idx_games_season ON games(season_id);
CREATE INDEX IF NOT EXISTS idx_games_guild ON games(guild_id);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_scheduled_date ON games(scheduled_date);

-- Stats indexes
CREATE INDEX IF NOT EXISTS idx_player_season_stats_player ON player_season_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_player_season_stats_season ON player_season_stats(season_id);
CREATE INDEX IF NOT EXISTS idx_player_season_stats_guild ON player_season_stats(guild_id);
CREATE INDEX IF NOT EXISTS idx_player_game_stats_game ON player_game_stats(game_id);
CREATE INDEX IF NOT EXISTS idx_player_game_stats_player ON player_game_stats(player_id);

-- Transaction indexes
CREATE INDEX IF NOT EXISTS idx_transaction_history_player ON transaction_history(player_id);
CREATE INDEX IF NOT EXISTS idx_transaction_history_guild ON transaction_history(guild_id);
CREATE INDEX IF NOT EXISTS idx_transaction_history_created ON transaction_history(created_at DESC);

-- Accolades indexes
CREATE INDEX IF NOT EXISTS idx_accolades_player ON accolades(player_id);
CREATE INDEX IF NOT EXISTS idx_accolades_season ON accolades(season_id);

-- Articles indexes
CREATE INDEX IF NOT EXISTS idx_articles_published_date ON articles(published_date DESC);

-- Social features indexes
CREATE INDEX IF NOT EXISTS idx_article_likes_article ON article_likes(article_id);
CREATE INDEX IF NOT EXISTS idx_article_likes_player ON article_likes(player_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_article ON article_comments(article_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_player ON article_comments(player_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_team_wall_posts_team ON team_wall_posts(team_id);
CREATE INDEX IF NOT EXISTS idx_team_wall_posts_player ON team_wall_posts(player_id);
CREATE INDEX IF NOT EXISTS idx_team_wall_posts_pinned ON team_wall_posts(is_pinned, created_at DESC);

-- Staff indexes
CREATE INDEX IF NOT EXISTS idx_staff_player ON staff(player_id);
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role);

-- ============================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers (drop first to avoid errors)
DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_games_updated_at ON games;
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_player_season_stats_updated_at ON player_season_stats;
CREATE TRIGGER update_player_season_stats_updated_at BEFORE UPDATE ON player_season_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_articles_updated_at ON articles;
CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_article_comments_updated_at ON article_comments;
CREATE TRIGGER update_article_comments_updated_at BEFORE UPDATE ON article_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_team_wall_posts_updated_at ON team_wall_posts;
CREATE TRIGGER update_team_wall_posts_updated_at BEFORE UPDATE ON team_wall_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_season_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_game_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE accolades ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_stream ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_wall_posts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES - Public Read Access
-- ============================================

DROP POLICY IF EXISTS "Public read teams" ON teams; 
CREATE POLICY "Public read teams" ON teams FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read users" ON users; 
CREATE POLICY "Public read users" ON users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read seasons" ON seasons; 
CREATE POLICY "Public read seasons" ON seasons FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read games" ON games; 
CREATE POLICY "Public read games" ON games FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read player_season_stats" ON player_season_stats; 
CREATE POLICY "Public read player_season_stats" ON player_season_stats FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read player_game_stats" ON player_game_stats; 
CREATE POLICY "Public read player_game_stats" ON player_game_stats FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read transaction_history" ON transaction_history; 
CREATE POLICY "Public read transaction_history" ON transaction_history FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read accolades" ON accolades; 
CREATE POLICY "Public read accolades" ON accolades FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read articles" ON articles; 
CREATE POLICY "Public read articles" ON articles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read staff" ON staff; 
CREATE POLICY "Public read staff" ON staff FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read live_stream" ON live_stream; 
CREATE POLICY "Public read live_stream" ON live_stream FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read article_likes" ON article_likes; 
CREATE POLICY "Public read article_likes" ON article_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read article_comments" ON article_comments; 
CREATE POLICY "Public read article_comments" ON article_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read comment_likes" ON comment_likes; 
CREATE POLICY "Public read comment_likes" ON comment_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read team_wall_posts" ON team_wall_posts; 
CREATE POLICY "Public read team_wall_posts" ON team_wall_posts FOR SELECT USING (true);

-- ============================================
-- RLS POLICIES - Service Role Write Access
-- (Bot and website service role can write)
-- ============================================

DROP POLICY IF EXISTS "Service role teams" ON teams; 
CREATE POLICY "Service role teams" ON teams FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Service role users" ON users; 
CREATE POLICY "Service role users" ON users FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Service role seasons" ON seasons; 
CREATE POLICY "Service role seasons" ON seasons FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role games" ON games; 
CREATE POLICY "Service role games" ON games FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Service role player_season_stats" ON player_season_stats; 
CREATE POLICY "Service role player_season_stats" ON player_season_stats FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role player_game_stats" ON player_game_stats; 
CREATE POLICY "Service role player_game_stats" ON player_game_stats FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role transaction_history" ON transaction_history; 
CREATE POLICY "Service role transaction_history" ON transaction_history FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role accolades" ON accolades; 
CREATE POLICY "Service role accolades" ON accolades FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role articles" ON articles; 
CREATE POLICY "Service role articles" ON articles FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Service role staff" ON staff; 
CREATE POLICY "Service role staff" ON staff FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Service role live_stream" ON live_stream; 
CREATE POLICY "Service role live_stream" ON live_stream FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Service role article_likes" ON article_likes; 
CREATE POLICY "Service role article_likes" ON article_likes FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Service role article_comments" ON article_comments; 
CREATE POLICY "Service role article_comments" ON article_comments FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Service role comment_likes" ON comment_likes; 
CREATE POLICY "Service role comment_likes" ON comment_likes FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Service role team_wall_posts" ON team_wall_posts; 
CREATE POLICY "Service role team_wall_posts" ON team_wall_posts FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- ============================================
-- HELPFUL VIEWS
-- ============================================

-- Player Stats View with Calculated Averages
CREATE OR REPLACE VIEW player_stats_view AS
SELECT 
  pss.player_id,
  u.username,
  u.minecraft_username,
  u.avatar_url,
  u.team_id,
  t.name as team_name,
  t.team_logo_url,
  t.team_logo_emoji,
  s.season_name,
  s.id as season_id,
  pss.guild_id,
  pss.games_played,
  pss.total_points,
  pss.total_rebounds,
  pss.total_assists,
  pss.total_steals,
  pss.total_blocks,
  pss.total_turnovers,
  ROUND(pss.total_points::numeric / NULLIF(pss.games_played, 0), 1) as ppg,
  ROUND(pss.total_rebounds::numeric / NULLIF(pss.games_played, 0), 1) as rpg,
  ROUND(pss.total_assists::numeric / NULLIF(pss.games_played, 0), 1) as apg,
  ROUND(pss.total_steals::numeric / NULLIF(pss.games_played, 0), 1) as spg,
  ROUND(pss.total_blocks::numeric / NULLIF(pss.games_played, 0), 1) as bpg,
  ROUND(pss.total_turnovers::numeric / NULLIF(pss.games_played, 0), 1) as tpg
FROM player_season_stats pss
JOIN users u ON pss.player_id = u.id
LEFT JOIN teams t ON u.team_id = t.id
JOIN seasons s ON pss.season_id = s.id;

-- Team Standings View
CREATE OR REPLACE VIEW team_standings AS
SELECT 
  t.id,
  t.name,
  t.conference,
  t.team_logo_url,
  t.team_logo_emoji,
  t.guild_id,
  COALESCE(t.wins, 0) as wins,
  COALESCE(t.losses, 0) as losses,
  COALESCE(t.wins, 0) + COALESCE(t.losses, 0) as games_played,
  CASE 
    WHEN (COALESCE(t.wins, 0) + COALESCE(t.losses, 0)) > 0 
    THEN ROUND(t.wins::numeric / (t.wins + t.losses), 3)
    ELSE 0
  END as win_percentage
FROM teams t
ORDER BY t.conference, wins DESC;

-- Recent Transactions View
CREATE OR REPLACE VIEW recent_transactions AS
SELECT 
  th.id,
  th.transaction_type,
  th.created_at,
  th.notes,
  th.performed_by,
  u.username as player_name,
  u.minecraft_username,
  u.avatar_url,
  ft.name as from_team_name,
  tt.name as to_team_name
FROM transaction_history th
JOIN users u ON th.player_id = u.id
LEFT JOIN teams ft ON th.from_team_id = ft.id
LEFT JOIN teams tt ON th.to_team_id = tt.id
ORDER BY th.created_at DESC;

-- ============================================
-- TABLE COMMENTS
-- ============================================

COMMENT ON TABLE teams IS 'Teams - shared by bot and website';
COMMENT ON TABLE users IS 'Main users table - uses discord-{id} format, shared with Discord bot';
COMMENT ON TABLE seasons IS 'Season tracking - managed by Discord bot';
COMMENT ON TABLE games IS 'Games - supports both bot (team1/team2) and website (home/away) formats';
COMMENT ON TABLE player_season_stats IS 'Aggregated player stats per season - automatically updated by Discord bot';
COMMENT ON TABLE player_game_stats IS 'Individual game performance stats - recorded by Discord bot';
COMMENT ON TABLE transaction_history IS 'Team roster transaction log - managed by Discord bot';
COMMENT ON TABLE accolades IS 'Player awards and achievements';
COMMENT ON TABLE articles IS 'Website news articles and content';
COMMENT ON TABLE staff IS 'Team staff roles (website feature)';
COMMENT ON TABLE live_stream IS 'Active live streams (website feature)';

-- ============================================
-- COMPLETED! 
-- ============================================
-- Your database is now ready for both:
-- 1. Discord Bot (stats tracking, teams, rosters)
-- 2. Website (articles, social features, display)
--
-- Next steps:
-- 1. Configure Discord Guild ID in your .env.local
-- 2. Test Discord authentication on website
-- 3. Have bot create a team and sign players
-- 4. Verify data appears on website
-- ============================================



