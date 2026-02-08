# Season Deletion Fix

## Current Issue
Teams have "Preseason 6" in their seasons array, but the season was already deleted from the seasons table. This causes the season to be "stuck" on those teams.

## Immediate Fix
Run the following SQL in your Supabase SQL Editor:

```sql
-- Remove "Preseason 6" from all teams
UPDATE teams
SET seasons = array_remove(seasons, 'Preseason 6')
WHERE 'Preseason 6' = ANY(seasons);

-- Verify the fix
SELECT id, name, seasons
FROM teams
WHERE seasons IS NOT NULL AND array_length(seasons, 1) > 0
ORDER BY name;
```

## Prevention System
I've implemented a prevention system to avoid this issue in the future:

### 1. API Protection
The `DELETE /api/seasons/[id]` endpoint now:
- Checks if any teams are assigned to the season before deletion
- Returns a 400 error with the list of affected teams if any exist
- Only allows deletion if no teams are assigned

### 2. Cleanup Endpoint
New endpoint: `POST /api/seasons/[id]/remove-from-teams`
- Removes a specific season from all teams
- Returns the number of teams updated
- Useful for cleaning up orphaned references

### 3. Admin UI Enhancement
The Seasons Admin panel now:
- Shows an error message when trying to delete a season with assigned teams
- Prompts the user to remove the season from teams first
- Offers a one-click option to remove from teams and delete
- Prevents accidental data orphaning

## How It Works

### Before Deletion
```
User clicks Delete → API checks teams → Teams assigned? 
                                        ↓
                                      YES → Show error + offer to remove from teams
                                      NO → Delete season
```

### If Teams Are Assigned
```
User confirms removal → Remove season from all teams → Delete season → Success
User cancels → Abort deletion
```

## Usage

### From Admin Panel
1. Go to Admin → Seasons
2. Click delete on any season
3. If teams are assigned, you'll see a confirmation dialog
4. Choose to remove from teams and delete, or cancel

### Manual Cleanup (API)
```typescript
// Remove a season from all teams
const response = await fetch(`/api/seasons/${seasonId}/remove-from-teams`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ seasonName: 'Preseason 6' })
});
```

## Files Modified
- `/app/api/seasons/[id]/route.ts` - Added team check before deletion
- `/app/api/seasons/[id]/remove-from-teams/route.ts` - New cleanup endpoint
- `/components/admin/SeasonsAdmin.tsx` - Enhanced delete handling with user prompts

## Testing
To test the prevention system:
1. Create a test season
2. Assign it to a team
3. Try to delete the season
4. Verify you see the warning and team list
5. Confirm removal and verify the season is removed from the team
6. Verify the season is deleted
