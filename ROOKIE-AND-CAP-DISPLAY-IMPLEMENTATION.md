# Rookie Role and Salary Cap Display Implementation

## Overview
This document describes the implementation of three new features:
1. Rookie player role with automatic $0 cap value
2. Player cap worth display in search and profiles
3. Team salary cap space display on branding and team pages

## Features Implemented

### 1. Rookie Role (`components/admin/PlayersAdmin.tsx`)

**Changes:**
- Added "Rookie" to the roles checkbox list
- Made `coinWorth` input field disabled when "Rookie" role is selected
- Automatically sets `coinWorth` to $0 when Rookie is checked
- Updated helper text to show "Rookies are worth $0 MBA coins" when Rookie role is active

**Implementation Details:**
- Rookie is positioned as the second option after "Player" in the roles list
- The coin worth input has `disabled={roles.includes('Rookie')}` attribute
- When Rookie is selected, the onChange handler sets `setCoinWorth(0)`
- The disabled input has visual styling (opacity-50, cursor-not-allowed)

**Usage:**
When editing or creating a player, administrators can now:
1. Check the "Rookie" role checkbox
2. The coin worth field becomes disabled and shows $0
3. The player is saved with $0 cap value
4. Unchecking "Rookie" re-enables manual entry of coin worth

---

### 2. Player Cap Worth Display

#### A. Player Search Page (`app/players/page.tsx`)

**Changes:**
- Added "Cap Value" display above the quick stats section on each player card
- Shows formatted cap worth: `$X,XXX` format using `toLocaleString()`
- Styled with green colors to indicate financial value

**Visual Design:**
```
Cap Value: $5,000
┌─────────────────┐
│ PTS | REB | AST │
└─────────────────┘
```

#### B. Player Profile Page (`app/players/[id]/page.tsx`)

**Changes:**
- Added a prominent salary cap worth card below the roles section
- Uses gradient background (green to emerald)
- Includes DollarSign icon from lucide-react
- Formatted display with "Cap Value" label

**Visual Design:**
- Gradient green background card with border
- DollarSign icon (green)
- Two-line display: label + value
- Value formatted as `$X,XXX` (e.g., $5,000)

**Location:** Added between the Roles section and Accolades section

---

### 3. Team Salary Cap Display

#### A. Branding Page (`app/branding/page.tsx`)

**Changes:**
1. Added `players` state and `fetchPlayers()` function
2. Created `getTeamCapSpace()` helper function to calculate:
   - `totalSpent`: Sum of all player coinWorth values for the team
   - `salaryCap`: Default $19,000
   - `remaining`: Cap space remaining
3. Added salary cap section to each team card

**Implementation:**
```typescript
const getTeamCapSpace = (teamId: string) => {
  const teamPlayers = players.filter(p => p.teamId === teamId);
  const totalSpent = teamPlayers.reduce((sum, p) => sum + (p.coinWorth || 0), 0);
  const salaryCap = 19000;
  const remaining = salaryCap - totalSpent;
  return { totalSpent, salaryCap, remaining };
};
```

**Visual Features:**
- Progress bar showing cap usage
- Color-coded progress bar:
  - Green: < 90% used
  - Yellow: 90-100% used
  - Red: > 100% (over cap)
- Display format: "$X.Xk remaining"
- Shows spent/cap amounts below progress bar

#### B. Team Detail Page (`app/teams/[id]/page.tsx`)

**Changes:**
1. Added DollarSign icon import
2. Calculated cap metrics using existing `teamPlayers` data:
   - `totalCapSpent`: Sum of all player coinWorth
   - `salaryCap`: From team object or default $19,000
   - `capRemaining`: Difference
   - `capPercentage`: Usage percentage
3. Created new "Salary Cap Status" card as first item in left column

**Visual Design:**
- Highlighted card with green border (border-green-200)
- DollarSign icon header
- Large cap space display at top
- Progress bar with color coding (green/yellow/red)
- Three stat boxes showing:
  - Spent: $X.Xk
  - Salary Cap: $19.0k
  - Usage: XX.X%

**Location:** Added as the first card in the left column (lg:col-span-2), before Team Statistics

**Color Coding Logic:**
- Remaining cap space shows green (positive) or red (negative)
- Progress bar: green < 90%, yellow 90-100%, red > 100%
- Usage percentage shows red if over 100%

---

## Technical Details

### Data Flow

**Player Cap Worth:**
1. Database: `users.coin_worth` column (INTEGER)
2. API: `/api/players` returns `coinWorth` field
3. Components: Access via `player.coinWorth`

**Team Cap Calculation:**
1. Fetch all players from `/api/players`
2. Filter by `teamId`
3. Sum all `coinWorth` values
4. Compare to salary cap ($19,000 default)

### Formatting Conventions

- **Thousands format:** `$X.Xk` (e.g., "$12.5k" for $12,500)
- **Full format:** `$X,XXX` with comma separators (e.g., "$5,000")
- **Decimals:** One decimal place for thousands format

### Color Scheme

**Cap Worth Display:**
- Primary color: Green 600 (dark mode: Green 400)
- Background: Green gradient or Green 100/900 (dark mode)

**Cap Space Status:**
- Safe (< 90%): Green 500
- Warning (90-100%): Yellow 500
- Over Cap (> 100%): Red 500/600

---

## Files Modified

1. **components/admin/PlayersAdmin.tsx**
   - Added "Rookie" to roles array
   - Added conditional logic to disable coinWorth when Rookie selected
   - Updated helper text

2. **app/players/page.tsx**
   - Added cap value display to player cards in search results

3. **app/players/[id]/page.tsx**
   - Added DollarSign import
   - Added salary cap worth card to profile layout

4. **app/branding/page.tsx**
   - Added players state and fetch function
   - Added getTeamCapSpace helper function
   - Added cap space section to team cards

5. **app/teams/[id]/page.tsx**
   - Added DollarSign import
   - Added cap calculation logic
   - Created salary cap status card
   - Positioned card as first in left column

---

## Testing Checklist

- [ ] Verify Rookie role checkbox appears in PlayersAdmin
- [ ] Confirm coinWorth field disables when Rookie is checked
- [ ] Test that Rookie players save with $0 cap value
- [ ] Check cap worth displays on player search page
- [ ] Verify cap worth shows on player profile pages
- [ ] Confirm cap space displays on branding page for all teams
- [ ] Test cap space card on team detail pages
- [ ] Verify color coding works correctly (green/yellow/red)
- [ ] Test with teams under, at, and over the salary cap
- [ ] Check dark mode styling for all new components

---

## Database Schema

No database changes required. Uses existing fields:
- `users.coin_worth` (INTEGER, DEFAULT 1000)
- `teams.salary_cap` (INTEGER, DEFAULT 19000)
- `users.roles` (TEXT[]) - now includes "Rookie" option

---

## Notes

- Rookie players are worth $0 and cannot have their coinWorth manually adjusted while the Rookie role is active
- Default salary cap is $19,000 per team
- Cap space calculations sum all players on a team roster
- Teams can exceed the cap (shows red warning)
- All monetary values use consistent formatting across the application
- Dark mode fully supported for all new UI elements

---

## Future Enhancements

Potential improvements:
1. Add cap history tracking over time
2. Show individual player cap hits on team roster view
3. Add cap projection tools for contract offers
4. Create cap violation warnings in admin panel
5. Add cap floor enforcement (minimum spending requirement)
6. Historical cap space tracking by season
