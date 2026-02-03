# Salary Cap System Setup Guide

## Overview
This document describes the salary cap system added to the MBA Website admin panel for managing player values and team salary caps.

## Features Added

### 1. Player Star Ratings & Coin Worth
- **Star Ratings**: Players can be assigned a star rating from 1 to 5 (in 0.5 increments)
- **Coin Worth**: Each star rating has a default coin worth value
- **Auto-calculation**: Coin worth is automatically filled based on star rating, but can be manually overridden

#### Star to Coin Worth Mapping
```
5 ⭐   = $12,000
4.5 ⭐ = $10,500
4 ⭐   = $9,000
3.5 ⭐ = $7,500
3 ⭐   = $6,000
2.5 ⭐ = $4,500
2 ⭐   = $3,000
1.5 ⭐ = $1,500
1 ⭐   = $1,000 (default)
```

### 2. Team Salary Cap Management
- **Default Salary Cap**: $19,000 per team
- **Customizable**: Each team can have a different salary cap
- **Real-time Calculation**: Team salary usage is calculated from all rostered players
- **Visual Indicators**: 
  - Green: Under salary cap
  - Red: At or over salary cap

### 3. Admin Panel Features

#### Player Management
- Edit player star ratings and coin worth
- View stars and coin worth in player list
- Default values: 1 star / $1,000 for unconfigured players

#### Team Management
- Set custom salary cap per team
- View current salary usage vs. cap limit
- Format: `$X.Xk / $X.Xk` (e.g., `$10.5k / $19k`)

## Database Changes

### New Columns Added

**users table:**
- `stars` (DECIMAL(2,1), default: 1.0) - Player star rating
- `coin_worth` (INTEGER, default: 1000) - Player coin worth value

**teams table:**
- `salary_cap` (INTEGER, default: 19000) - Team salary cap limit

### New Database View
A `team_salary_usage` view provides easy access to salary cap calculations:
```sql
SELECT * FROM team_salary_usage;
```

Returns:
- `team_id`
- `team_name`
- `salary_cap`
- `current_salary`
- `remaining_cap`
- `cap_status` ('Over Cap', 'At Cap', 'Under Cap')

## Supabase Migration

Run the migration file: `supabase-salary-cap-migration.sql`

This will:
1. Add `stars` and `coin_worth` columns to `users` table
2. Add `salary_cap` column to `teams` table
3. Set default values for existing records
4. Create indexes for performance
5. Create the `team_salary_usage` view

## API Updates

### Updated Endpoints

**GET /api/players**
- Now returns `stars` and `coinWorth` fields

**POST /api/players**
- Accepts `stars` and `coinWorth` in request body

**PUT /api/users**
- Accepts `stars` and `coinWorth` for updates

**GET /api/teams**
- Returns `salaryCap` field

**POST /api/teams**
- Accepts `salaryCap` in request body

**PUT /api/teams**
- Accepts `salaryCap` for updates

## UI Changes

### Players Admin Panel
- Added star rating dropdown in edit/create form
- Added coin worth input field (optional)
- Player list shows: `X ⭐ • $X.Xk`

### Teams Admin Panel
- Added salary cap input field in edit/create form
- Team cards show: `Salary Cap: $X.Xk / $X.Xk` (color-coded)

## Implementation Notes

### Front-End
- Star ratings use dropdown with 0.5 increments
- Coin worth auto-updates when star rating changes
- Manual coin worth override is supported
- Real-time salary calculations on team view

### Back-End
- Default values ensure backward compatibility
- All existing players default to 1 star / $1,000
- All existing teams default to $19,000 cap
- Database constraints prevent invalid values

## Future Season Use

This system is designed for future season management:
- Set player values based on performance
- Enforce salary cap during roster construction
- Track team spending in real-time
- Generate reports on cap usage

## Testing Checklist

- [ ] Run Supabase migration
- [ ] Verify new columns exist in database
- [ ] Test creating a new player with custom stars/coin worth
- [ ] Test editing existing player's stars/coin worth
- [ ] Test creating a new team with custom salary cap
- [ ] Test editing existing team's salary cap
- [ ] Verify salary cap calculations are correct
- [ ] Verify color coding (green/red) works correctly
- [ ] Test that defaults work for unconfigured players/teams
