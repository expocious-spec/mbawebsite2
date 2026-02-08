# Accolades System Restructure - Multi-Player Assignment

## What Changed

The accolades system has been restructured to allow you to **create an accolade once and assign it to multiple players**, rather than creating duplicate accolades for each player.

### Old System
- One accolade row per player (if 5 players got "Season 5 Champion", you had to create it 5 times)
- Difficult to maintain consistency
- Redundant data

### New System
- **Accolades table**: Stores the accolade definition (title, description, color, icon, season)
- **Accolade Assignments table**: Stores which players have which accolades
- Create one accolade, assign to multiple players
- Easy to edit accolades (changes apply to all assigned players)

## Database Migration Required

**IMPORTANT**: You need to run the migration SQL file to update your database structure.

### How to Run the Migration

1. **Go to your Supabase Dashboard**
   - Navigate to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar

3. **Run the Migration**
   - Copy the entire contents of `supabase-accolades-migration.sql`
   - Paste into the SQL editor
   - Click "Run" or press Ctrl+Enter

### What the Migration Does

- Drops old `accolades` table (if exists)
- Creates new `accolades` table (templates/definitions)
- Creates new `accolade_assignments` table (player mappings)
- Sets up indexes for fast queries
- Configures Row Level Security (RLS) policies
- Adds proper foreign key constraints

**WARNING**: This will delete existing accolades data! If you have important data, back it up first.

## New Admin Workflow

### Creating an Accolade

1. Click "Create Accolade" button
2. Fill in:
   - **Season**: Which season (or "Lifetime Achievement")
   - **Title**: e.g., "Season 5 Champion" 
   - **Description**: Optional details
   - **Color**: Pick from presets or custom color
   - **Icon**: Optional emoji (🏆, 👑, ⭐, 🥇)
3. **Optional**: Select players to assign immediately
4. Click "Create Accolade"

### Assigning Players

You can assign players in two ways:

#### Method 1: During Creation
- In the create form, check the boxes next to players
- They'll be assigned when you create the accolade

#### Method 2: Manage Later
- Click the 👥 (Users) icon on any accolade card
- See all currently assigned players
- Check boxes to assign more players
- Click "Assign to X Player(s)"

### Managing Assignments

- **View assignments**: Click 👥 icon on accolade card
- **Remove player**: Click 🗑️ (trash) icon next to player
- **Delete accolade**: Click 🗑️ on accolade card (removes from all players)

## API Changes

### GET `/api/accolades`
- Returns all accolade templates (for admin)
- No player information

### GET `/api/accolades?playerId=USER_ID`
- Returns accolades for a specific player
- Used on player profile pages

### GET `/api/accolades/[id]`
- Returns all players assigned to this accolade
- Includes player info and awarded dates

### POST `/api/accolades`
```json
{
  "seasonId": 5,
  "title": "Season 5 Champion",
  "description": "Winner of Season 5 Finals",
  "color": "#FFD700",
  "icon": "🏆",
  "playerIds": ["user1", "user2", "user3"]  // Optional
}
```

### POST `/api/accolades/[id]`
```json
{
  "playerIds": ["user4", "user5"]  // Assign more players
}
```

### DELETE `/api/accolades/[id]?playerId=USER_ID`
- Removes assignment from specific player

### DELETE `/api/accolades?id=ACCOLADE_ID`
- Deletes entire accolade (cascades to all assignments)

## Files Modified

### New Files
- `app/api/accolades/[id]/route.ts` - Manage assignments endpoint

### Updated Files
- `app/api/accolades/route.ts` - Complete rewrite for new structure
- `components/admin/AccoladesAdmin.tsx` - New UI with manage/assign workflow
- `app/accolades/page.tsx` - Updated to show accolades with multiple players
- `supabase-accolades-migration.sql` - Database schema update

### Files That Still Work (No Changes Needed)
- Player profile pages automatically work with new API structure
- Navigation, layout files unchanged

## Example Use Case

### Before (Old System)
1. Team Omega wins Season 5 Finals
2. Admin creates "Season 5 Champion" accolade for Player1
3. Admin creates "Season 5 Champion" accolade for Player2
4. Admin creates "Season 5 Champion" accolade for Player3
5. Admin creates "Season 5 Champion" accolade for Player4
6. Admin creates "Season 5 Champion" accolade for Player5
7. Later realizes typo in description → has to edit 5 times!

### After (New System)
1. Team Omega wins Season 5 Finals
2. Admin creates ONE "Season 5 Champion" accolade
3. Admin selects all 5 players and assigns them
4. Later notices typo → edits once, applies to all players!

## Benefits

✅ **Efficiency**: Create once, assign to many
✅ **Consistency**: All players get identical accolade
✅ **Maintainability**: Edit once, affects all
✅ **Scalability**: Easy to assign to entire teams
✅ **Flexibility**: Add/remove players from accolades anytime

## Testing Checklist

After running migration:

- [ ] Run the SQL migration in Supabase dashboard
- [ ] Visit `/admin` and go to "Accolades & Awards" tab
- [ ] Create a new accolade with a title and color
- [ ] Assign it to 2-3 players
- [ ] Visit each player's profile page - verify accolade shows
- [ ] Visit `/accolades` page - verify accolade shows all players
- [ ] Click "Manage" (👥) on the accolade
- [ ] Remove one player's assignment
- [ ] Assign the accolade to another player
- [ ] Delete the test accolade
- [ ] Verify it's removed from all player profiles

## Troubleshooting

### "Could not find the 'accolade_id' column"
- You need to run the migration first

### "Foreign key violation"
- Make sure players exist in the `users` table
- Check that season IDs are valid

### Accolades not showing on player profiles
- Check browser console for API errors
- Verify RLS policies are active
- Ensure assignments table has data

### Can't assign players
- Verify you're logged in as admin
- Check that player IDs are valid
- Look for duplicate assignment errors (UNIQUE constraint)

## Migration Rollback (If Needed)

If something goes wrong, you can restore the old structure by running your backup or previous migration. Contact support if you need help.
