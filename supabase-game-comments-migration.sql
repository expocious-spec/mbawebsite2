-- ============================================
-- GAME COMMENTS SYSTEM
-- ============================================
-- Commenting system for game box scores
-- Features: threading (replies), likes, mentions, admin controls (pin/delete)

-- Game Comments Table
CREATE TABLE IF NOT EXISTS game_comments (
  id BIGSERIAL PRIMARY KEY,
  game_id BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Comment content
  content TEXT NOT NULL,
  
  -- Threading support (for replies)
  parent_comment_id BIGINT REFERENCES game_comments(id) ON DELETE CASCADE,
  
  -- Admin features
  is_pinned BOOLEAN DEFAULT FALSE,
  pinned_by TEXT REFERENCES users(id),
  pinned_at TIMESTAMPTZ,
  
  -- Soft delete (admins can delete)
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT REFERENCES users(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure content is not empty
  CONSTRAINT content_not_empty CHECK (LENGTH(TRIM(content)) > 0)
);

-- Game Comment Likes Table
CREATE TABLE IF NOT EXISTS game_comment_likes (
  id BIGSERIAL PRIMARY KEY,
  comment_id BIGINT NOT NULL REFERENCES game_comments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One like per user per comment
  UNIQUE(comment_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_comments_game_id ON game_comments(game_id);
CREATE INDEX IF NOT EXISTS idx_game_comments_user_id ON game_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_game_comments_parent_id ON game_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_game_comments_created_at ON game_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_comments_pinned ON game_comments(is_pinned, created_at DESC) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_game_comment_likes_comment_id ON game_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_game_comment_likes_user_id ON game_comment_likes(user_id);

-- Enable Row Level Security
ALTER TABLE game_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for game_comments
-- Everyone can read non-deleted comments
CREATE POLICY "Anyone can view non-deleted comments"
  ON game_comments FOR SELECT
  USING (deleted_at IS NULL);

-- Logged in users with Minecraft accounts can create comments
CREATE POLICY "Minecraft users can create comments"
  ON game_comments FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND minecraft_user_id IS NOT NULL
    )
  );

-- Users can update their own comments (edit)
CREATE POLICY "Users can update own comments"
  ON game_comments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can delete (soft delete) any comment
CREATE POLICY "Admins can delete comments"
  ON game_comments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND discord_id IN (
        SELECT unnest(string_to_array(current_setting('app.admin_discord_ids', true), ','))
      )
    )
  );

-- Admins can pin/unpin comments
CREATE POLICY "Admins can pin comments"
  ON game_comments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND discord_id IN (
        SELECT unnest(string_to_array(current_setting('app.admin_discord_ids', true), ','))
      )
    )
  );

-- RLS Policies for game_comment_likes
-- Everyone can view likes
CREATE POLICY "Anyone can view comment likes"
  ON game_comment_likes FOR SELECT
  USING (true);

-- Logged in users can like comments
CREATE POLICY "Users can like comments"
  ON game_comment_likes FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

-- Users can unlike comments (delete their own likes)
CREATE POLICY "Users can unlike comments"
  ON game_comment_likes FOR DELETE
  USING (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_game_comment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER game_comments_updated_at
  BEFORE UPDATE ON game_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_game_comment_updated_at();
