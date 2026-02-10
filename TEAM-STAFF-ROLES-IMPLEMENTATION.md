# Team Staff Role System Implementation

## Overview
Implemented a role-based staff assignment system for teams. Team staff roles (Franchise Owner, Head Coach, Assistant Coach, General Manager) are assigned to players through the **Player Management** interface and automatically synced to a dedicated `team_staff` table for display on team pages.

## How It Works

### Role Assignment Flow:
1. Admins assign team-related roles to players in the **Admin Panel → Players**
2. When a player is created/updated with team roles, the system automatically syncs these to the `team_staff` table
3. Team pages display staff members by fetching from the `team_staff` table
4. If a player's team or roles change, the `team_staff` entries are automatically updated

## Changes Made

### 1. Database Migration (`supabase-team-staff-migration.sql`)
Created a new `team_staff` table with the following features:
- Links players to teams with specific roles
- Supports 4 roles: Franchise Owner, Head Coach, Assistant Coach, General Manager
- Ensures unique role assignments (one player can't have duplicate roles on same team)
- Includes foreign key relationships to teams and players
- Has proper indexes for performance
- Includes Row Level Security policies

### 2. API Endpoints

#### Team Staff API (`app/api/team-staff/route.ts`)
REST API for querying team staff (role assignment is handled through player API):
- **GET** `/api/team-staff?teamId={id}` - Fetch all staff for a team
- **POST** `/api/team-staff` - Manually add a staff member (rarely needed)
- **DELETE** `/api/team-staff?id={id}` - Remove a staff assignment (rarely needed)

#### User/Player API Updates (`app/api/users/route.ts`, `app/api/players/route.ts`)
Added automatic role syncing:
- **POST** - When creating a player, syncs team roles to `team_staff` table
- **PUT** - When updating a player's roles or team, automatically updates `team_staff` entries
- Removes old `team_staff` entries when player changes teams
- Adds new entries for any team-related roles assigned

### 3. Team Page Updates (`app/teams/[id]/page.tsx`)
- Added `teamStaff` state to store staff assignments
- Fetches team staff data on page load
- Displays staff by role in a 4-column grid:
  - Franchise Owner
  - Head Coach
  - Assistant Coach
  - General Manager
- Shows "TBD" when no one is assigned to a role
- Supports multiple people in the same role (e.g., multiple Assistant Coaches)

### 4. Players Admin (`components/admin/PlayersAdmin.tsx`)
**This is where team staff roles are managed!**
- Existing role checkboxes for:
  - Player (default)
  - Franchise Owner
  - Head Coach
  - Assistant Coach
  - General Manager
- When saving a player, roles are stored in the `users.roles` array field
- Team-related roles are automatically synced to `team_staff` table

### 5. Teams Admin (`components/admin/TeamsAdmin.tsx`)
- No longer has staff management interface (roles are managed via Players Admin)
- Simply manages team info (name, colors, logo, etc.)

### 6. TypeScript Types (`types/index.ts`)
Added `TeamStaff` interface with proper typing for:
- Staff record fields
- Role enum (Franchise Owner | Head Coach | Assistant Coach | General Manager)
- Related player and team data

## Usage Instructions

### For Admins:
1. Go to **Admin Panel → Players**
2. Find or create a player
3. Assign them to a team using the Team dropdown
4. Check the appropriate role(s):
   - Franchise Owner
   - Head Coach
   - Assistant Coach
   - General Manager
   - Player (can be checked along with team roles)
5. Save the player
6. The system automatically syncs the roles to the `team_staff` table
7. Team pages will now display the player in their assigned staff role(s)

### Database Setup:
Run the migration file in your Supabase SQL Editor:
```sql
-- Run supabase-team-staff-migration.sql
```

## Features
- ✅ Role-based staff assignments through Player Management
- ✅ Automatic syncing of roles to team_staff table
- ✅ Multiple people can have same role (except Franchise Owner & Head Coach have business logic limits in the API)
- ✅ Easy-to-use admin interface in Players panel
- ✅ Automatic cleanup when player changes teams
- ✅ Displays on public team pages
- ✅ Single source of truth (roles in users.roles field)

## Technical Details

### Role Syncing Logic:
When a player is saved with team-related roles:
1. System checks if player has a `team_id`
2. If yes, removes all existing `team_staff` entries for that player/team combo
3. Filters roles to find team-related ones (Franchise Owner, Head Coach, Assistant Coach, General Manager)
4. Creates new `team_staff` entries for each team role
5. If player has no team, removes all their `team_staff` entries

### Data Flow:
```
Player Edit → Save with Roles → API → Sync Function → team_staff Table → Team Page Display
```

## Notes
- The `users.roles` field is the source of truth for all roles
- The `team_staff` table is a derived/computed table for efficient querying on team pages
- Players can have multiple roles simultaneously
- The old `owner` and `headCoach` fields in the teams table are kept for backward compatibility but not used for display
- You may want to migrate existing owner/headCoach data by assigning those roles to players
