# Blocks Stat Implementation Summary

## Overview
Added "blocks" as a new statistical category throughout the MBA website, appearing in all the same locations as other stats like points, rebounds, assists, and steals.

## Changes Made

### 1. Database Schema
- **File**: `supabase-add-blocks-migration.sql` (NEW)
  - Added `blocks` column to `game_stats` table with INTEGER type and default value of 0
  - Run this migration on your Supabase database to add the column

### 2. TypeScript Types
- **File**: `types/index.ts`
  - Added `blocks: number` to `GameStats` interface

### 3. API Routes
- **File**: `app/api/players/game-stats/route.ts`
  - Added blocks to GET response formatting
  - Added blocks to POST insert operation
  - Added blocks to POST recalculation logic
  - Added blocks to PUT update operation
  - Added blocks to recalculatePlayerStats function

- **File**: `app/api/players/route.ts`
  - Added blocks to game stats mapping for players

### 4. Admin Component (GameStatsAdmin)
- **File**: `components/admin/GameStatsAdmin.tsx`
  - Added `blocks` field to form state
  - Added Blocks input field in the statistics section (between Steals and Turnovers)
  - Updated paste format parser to extract blocks from pasted stats
  - Updated placeholder text to include blocks in the new format:
    ```
    posterizing | Points: 14 | Assists: 7 | Rebounds: 22 | Steals: 0 | Blocks: 5 | Turnovers: 5 | Possession: 246 sec | ...
    ```
  - Added blocks display (BLK) in both stats listing sections
  - Updated grid layout from `lg:grid-cols-7` to `lg:grid-cols-8` to accommodate blocks
  - **NEW FEATURE**: Games that a player already has stats for are now filtered out when selecting a game (unless editing existing stats)

### 5. Stats Page
- **File**: `app/stats/page.tsx`
  - Added 'blocks' to StatCategory type union
  - Added blocks to statCategories array with label "Blocks" and abbreviation "BLK"
  - Added blocks to all season stats calculations (All-Time and per-season)
  - Added blocks to totals and averages calculations
  - Added blocks with default value 0 to all return statements

### 6. Player Profile Page
- **File**: `app/players/[id]/page.tsx`
  - Added blocks to totals calculation
  - Added blocks to stats averages calculation
  - Added blocks to Averages section display (with BLK label)
  - Updated Averages grid from `lg:grid-cols-8` to include all 8 stats
  - Added blocks to Career Totals - Main Statistics section (with red gradient styling)
  - Updated Main Statistics grid from `lg:grid-cols-5` to `lg:grid-cols-6`
  - Added blocks (BLK) to Recent Games display
  - Updated Recent Games grid from `grid-cols-5` to `grid-cols-6`

## Usage

### Running the Database Migration
Execute the following SQL in your Supabase SQL editor:
```sql
-- Add blocks column to game_stats table
ALTER TABLE game_stats ADD COLUMN IF NOT EXISTS blocks INTEGER DEFAULT 0;

-- Add comment to document the column
COMMENT ON COLUMN game_stats.blocks IS 'Number of blocks by the player in the game';
```

### Adding Stats with Blocks
In the admin panel, when adding game statistics:
1. The Blocks field will appear between Steals and Turnovers
2. You can use the paste format with blocks included:
   ```
   posterizing | Points: 14 | Assists: 7 | Rebounds: 22 | Steals: 0 | Blocks: 5 | Turnovers: 5 | Possession: 246 sec | Defended By: AshtonJeanty | DR: 108  | Pass Attempts: 25 | Misses Forced: 5 | FG: 6/13 | 3FG: 2/8 | FG%: 46.2 | 3FG%: 25.0 | eFG%: 53.8 | 3PT Rate: 61.5% | Assists/Pass: 0.3 | Fantasy Points: 61
   ```

### Where Blocks Appear
Blocks now appear in:
- ✅ Stats page (leaderboard/rankings)
- ✅ Player profile page (averages section)
- ✅ Player profile page (career totals section)
- ✅ Player profile page (recent games section)
- ✅ Admin game stats management (form and listings)
- ✅ Admin game stats paste format

## New Feature: Game Filtering
When selecting a game for a player in the admin panel:
- Games where the player already has statistics recorded will be automatically filtered out
- This prevents duplicate stat entries for the same player in the same game
- When editing existing stats, all games remain available

## Testing Checklist
- [ ] Run the database migration
- [ ] Add a new game stat with blocks included
- [ ] Verify blocks appear on the stats page
- [ ] Verify blocks appear on player profile page (averages)
- [ ] Verify blocks appear on player profile page (totals)
- [ ] Verify blocks appear on player profile page (recent games)
- [ ] Test the paste format with blocks
- [ ] Verify game filtering works (games with existing stats don't appear)
- [ ] Edit an existing stat and verify the game is available

## Notes
- Existing stats in the database will have blocks = 0 by default
- The blocks field is optional in forms and defaults to 0 if left empty
- Blocks are included in all the same displays as other traditional stats
