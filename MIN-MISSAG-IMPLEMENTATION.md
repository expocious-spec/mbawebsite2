# MIN (Minutes) and MISS-AG (Misses Forced) Stats Implementation

## Summary
Successfully added two new statistics to track on player profiles and the statistics page:
1. **MIN (Minutes)** - Minutes played in a game (stored as seconds, displayed as MM:SS)
2. **MISS-AG (Misses Forced)** - Number of misses forced by defensive pressure

## Changes Made

### 1. Type Definitions (`types/index.ts`)
- Added `minutes: number` field to `GameStats` interface
- Added `missesForced: number` field to `GameStats` interface

### 2. Database Schema Updates
#### New Migration File: `supabase-add-minutes-missesforced-migration.sql`
- Adds `minutes` column to `game_stats` table (INTEGER DEFAULT 0)
- Adds `misses_forced` column to `game_stats` table (INTEGER DEFAULT 0)
- Adds `misses_forced` column to `player_game_stats` table (INTEGER DEFAULT 0)
- Includes backward compatibility checks

#### Updated Base Schema: `supabase-game-stats-table.sql`
- Added `minutes` and `misses_forced` columns to default table creation

### 3. Admin Interface Updates

#### `components/admin/GameStatsAdmin.tsx`
- Added `minutes` and `missesForced` to form state
- Updated `handlePasteStats()` function to parse new format:
  - `MIN 0:00` - Parses MM:SS format and converts to seconds
  - `MISS-AG 0` - Parses misses forced value
  - Supports both new format (PTS, REB, STL, etc.) and old format (Points:, Rebounds:, etc.)
- Added form input fields for manual entry:
  - Minutes (with helper text: "seconds")
  - Misses Forced
- Updated `handleSubmit()` to include new fields in database inserts/updates
- Updated `handleEdit()` and `resetForm()` to handle new fields
- Updated placeholder text to show new format examples

#### `components/admin/BulkGameStatsModal.tsx`
- Updated `ParsedPlayerStat` interface to include:
  - `minutes: number`
  - `missesForced: number`
  - `possessionTime: number`
- Added parsing functions:
  - `extractTime()` - Converts MIN 0:00 format to seconds
  - `extractPossession()` - Handles POSS 0s format
  - Updated `extractStat()` to support both new and old formats
- Updated `parseBulkStats()` to extract new stats from pasted data
- Updated `handleSaveAll()` to include new fields when saving
- Updated placeholder text with new format examples

### 4. Statistics Page (`app/stats/page.tsx`)
- Added `minutes` and `missesForced` to `StatCategory` type
- Updated `statCategories` array:
  - Added MIN as **first** category (as requested)
  - Added MISS-AG category
- Changed default selected stat from 'points' to 'minutes'
- Updated `getPlayerSeasonStats()` function:
  - Added aggregation for minutes and missesForced
  - Handles both All-Time and season-specific calculations
  - Includes these fields in all return statements
- Updated stats table:
  - Added MIN column (displays as MM:SS format)
  - Added MISS-AG column
  - Updated column headers for totals/averages modes (MIN/MPG, MISS-AG/MFPG)
  - Updated empty row colspan from 14 to 16
- MIN display converts seconds to MM:SS format for readability

### 5. API Updates (`app/api/players/game-stats/route.ts`)
- **GET endpoint**: Added `minutes` and `missesForced` to response formatting
- **POST endpoint**: Added new fields to database insert operations
- **PUT endpoint**: Added new fields to database update operations
- Handles snake_case to camelCase conversion for both fields

## New Paste Format
The system now accepts stats in this format:

```
=== Atlanta Hawks ===
Jigglebutt67 | MIN 0:00 | PTS 0 | FG 0/0 | 3FG 0/0 | AST/PASS 0/0 | OREB 0 | DREB 0 | REB 0 | STL 0 | BLK 0 | TOV 0 | MISS-AG 0 | POSS 0s
player2 | MIN 12:30 | PTS 24 | FG 10/18 | 3FG 4/9 | AST/PASS 6/15 | OREB 2 | DREB 5 | REB 7 | STL 3 | BLK 1 | TOV 2 | MISS-AG 5 | POSS 245s

=== Chicago Bulls ===
player3 | MIN 15:00 | PTS 18 | FG 7/14 | 3FG 2/5 | AST/PASS 4/10 | OREB 1 | DREB 3 | REB 4 | STL 2 | BLK 0 | TOV 1 | MISS-AG 3 | POSS 180s
```

### Format Details:
- **MIN 0:00** - Minutes in MM:SS format (e.g., 5:30 = 5 minutes 30 seconds)
- **PTS, REB, STL, BLK, TOV** - Abbreviated stat names (replaces Points:, Rebounds:, etc.)
- **MISS-AG** - Misses forced stat
- **POSS 0s** - Possession time ends with 's' (e.g., 246s = 246 seconds)

## Backward Compatibility
- Old paste format still supported (Points:, Rebounds:, etc.)
- Database migration uses conditional checks (IF NOT EXISTS)
- Code handles missing values with default of 0

## Database Migration Instructions

To apply the database changes, run this SQL in your Supabase SQL editor:

```sql
-- Located in: supabase-add-minutes-missesforced-migration.sql
-- This script will add the new columns safely
```

## Statistics Page Updates
- **MIN is now the first tab/category** (as requested)
- Table shows minutes in MM:SS format for better readability
- MISS-AG appears in the stats table
- Both stats work with totals vs averages toggle

## Next Steps (Optional Future Enhancements)
- Consider adding these stats to player profile game logs
- Add MIN and MISS-AG to season totals/averages displays on profile pages
- Consider adding visual indicators for defensive stats (like MISS-AG)
- Add filtering/sorting options for these new stats on the stats page
