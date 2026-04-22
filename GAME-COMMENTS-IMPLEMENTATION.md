# Game Comments System Implementation

## Overview
A comprehensive commenting system for game box scores with threading, likes, mentions, and admin controls.

## Features Implemented

### 1. Database Schema (`supabase-game-comments-migration.sql`)
- **game_comments table**: Stores all comments with threading support
- **game_comment_likes table**: Tracks user likes on comments
- **Indexes**: Optimized for performance on common queries
- **RLS Policies**: Secure access control with Minecraft account requirement

### 2. API Endpoints

#### Comment CRUD
- `GET /api/games/[gameId]/comments` - Fetch all comments for a game
- `POST /api/games/[gameId]/comments` - Create new comment or reply
- `PATCH /api/games/[gameId]/comments/[commentId]` - Edit own comment
- `DELETE /api/games/[gameId]/comments/[commentId]` - Soft delete (admin only)

#### Like Functionality  
- `POST /api/games/[gameId]/comments/[commentId]/like` - Like a comment
- `DELETE /api/games/[gameId]/comments/[commentId]/like` - Unlike a comment

#### Admin Controls
- `POST /api/games/[gameId]/comments/[commentId]/pin` - Toggle pin status (admin only)

### 3. UI Component (`components/GameComments.tsx`)

#### User Features
- **Comment on games**: Share thoughts on completed games
- **Reply to comments**: Threaded conversation support
- **Like comments**: Heart icon with count
- **Edit comments**: Edit your own comments (shows "edited" indicator)
- **@Mentions**: Type @ to mention other players with autocomplete
- **Minecraft profiles**: Display Minecraft avatar and username
- **Time ago**: Relative timestamps (e.g., "5m ago")

#### Admin Features
- **Pin comments**: Highlight important comments at the top
- **Delete comments**: Remove inappropriate comments
- **All standard user features**

#### Access Control
- **Must be logged in**: Authenticated via Discord/Minecraft
- **Must have Minecraft linked**: Comments require Minecraft account
- **Visual prompts**: Clear messages for login/linking requirements

### 4. Integration
- Added to game detail pages (`app/games/[id]/page.tsx`)
- Only displays for completed games
- Seamlessly integrated with existing box score UI

## Usage

### For Players

1. **View Comments**: Navigate to any completed game box score
2. **Post Comment**: 
   - Type in the text area
   - Use @ to mention players (autocomplete will appear)
   - Click "Post Comment"
3. **Reply**: Click "Reply" button under any parent comment
4. **Like**: Click heart icon to like/unlike
5. **Edit**: Click "Edit" on your own comments

### For Admins

Additional controls appear on all comments:
- **Pin/Unpin**: Toggle pinned status
- **Delete**: Permanently remove comment

## Database Migration

Run this migration to set up the tables:

```bash
# In Supabase SQL Editor
supabase-game-comments-migration.sql
```

## Technical Details

### Comment Structure
- Parent comments display first (pinned at top)
- Replies are indented and grouped under parent
- Soft delete for admin removals (deleted_at timestamp)
- Updated_at tracking for edit indicator

### Mention System
- Regex parsing: `/@(\w+)/g`
- Live autocomplete while typing
- Highlights mentions in purple
- Searches player database for matches

### Security
- RLS policies enforce Minecraft account requirement
- Admin checks via `isAdminDiscordId()` function
- User can only edit/delete own comments
- Admins have full delete/pin permissions

### Performance
- Optimized database indexes on common queries
- Single query fetches comments with user data
- Like counts aggregated in memory
- Mention autocomplete debounced

## Styling
- Minecraft avatar integration (mc-heads.net)
- Dark mode support throughout
- Purple theme for mentions and actions
- Responsive design for mobile/desktop
- Pinned comments have purple left border

## Future Enhancements
- Notification system for mentions
- Reply notifications
- Comment editing history
- Reaction emojis beyond likes
- Comment moderation queue
- Search/filter comments
