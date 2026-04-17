# Discord OAuth2 Login with Auto-Import Implementation Guide

## 🎯 Overview

This implementation enables Discord OAuth2 authentication with automatic player profile import and management for the MBA Basketball League website.

## ✅ Features Implemented

### 1. **Discord OAuth2 Authentication**
- Players log in using their Discord account
- Automatic verification of Minecraft account linkage
- Secure session management using NextAuth.js

### 2. **Minecraft Account Verification**
- Validates that users have linked their Minecraft account via Discord bot
- Uses `discord_links` table as source of truth
- Rejects login attempts from unlinked accounts with helpful error messages

### 3. **Automatic Profile Import**
- First-time users are automatically imported from bot database
- Syncs player data including:
  - Minecraft username
  - Discord information  
  - Team assignment (or Free Agent status)
  - Profile picture from Minecraft avatar

### 4. **Player Dashboard**
- View profile information
- Edit profile description (500 character limit)
- See team affiliation
- Quick links to team page and settings

### 5. **Security Features**
- XSS prevention (HTML tags stripped from descriptions)
- Users can only edit their own profiles
- Input validation and sanitization
- Session-based authentication

---

## 📋 Prerequisites

Before using the system, ensure:

1. **Discord Application** is set up with OAuth2 credentials
2. **Supabase Project** is configured with proper environment variables
3. **Discord Bot** is running and managing the `discord_links` table

---

## 🔧 Setup Instructions

### Step 1: Run Database Migration

Execute the database migration to create required tables and columns:

```bash
# Run this SQL in your Supabase SQL Editor
```

Open Supabase Dashboard → SQL Editor → Copy and paste the contents of:
**`supabase-discord-auth-migration.sql`**

This creates:
- `discord_links` table (for Minecraft-Discord linking)
- New columns in `users` table (`discord_id`, `minecraft_uuid`, `profile_description`)
- Indexes for better performance
- Row Level Security (RLS) policies

### Step 2: Configure Environment Variables

Add these to your `.env.local` file:

```env
# Discord OAuth
DISCORD_CLIENT_ID=1451637424638660640
DISCORD_CLIENT_SECRET=your_discord_client_secret_here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://cnibqlzrtxxayecipkte.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# NextAuth
NEXTAUTH_URL=http://localhost:3000  # Change for production
NEXTAUTH_SECRET=your_nextauth_secret_here  # Generate with: openssl rand -base64 32

# Admin Discord IDs (comma-separated)
ADMIN_DISCORD_IDS=your_admin_discord_id_1,your_admin_discord_id_2
```

### Step 3: Configure Discord OAuth2 Redirect URI

In your Discord Developer Portal:

1. Go to your application: https://discord.com/developers/applications/1451637424638660640
2. Navigate to **OAuth2** → **General**
3. Add redirect URI:
   - Development: `http://localhost:3000/api/auth/callback/discord`
   - Production: `https://yourdomain.com/api/auth/callback/discord`

### Step 4: Install Dependencies (if needed)

```bash
npm install
```

All required dependencies should already be in `package.json`.

### Step 5: Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

---

## 🔄 User Flow

### For New Players

1. **Visit Website** → Click "Login" or "Sign In"
2. **Click "Login with Discord"** → Discord OAuth consent screen
3. **System checks `discord_links` table**:
   - ✅ **If linked**: Proceed to step 4
   - ❌ **If NOT linked**: Show error with instructions to use `/linkdiscord` in Discord
4. **System checks website `users` table**:
   - If exists → Log in to existing account
   - If new → Auto-create account from bot's `users` table
5. **Redirect to Dashboard** → Player can view/edit their profile

### For Existing Players

1. **Visit Website** → Click "Login"
2. **Click "Login with Discord"** → Quick OAuth verification
3. **System verifies Minecraft link** → Checks if `discord_id` changed
4. **Log in to existing account** → Redirect to dashboard

### For Unlinked Users

1. **Try to login** → Error message appears
2. **Instructions shown**:
   - Join MBA Discord server
   - Use `/linkdiscord` command
   - Follow bot instructions
   - Return and try logging in again

---

## 🛠️ API Endpoints

### `GET /api/profile`
- **Purpose**: Fetch current user's profile
- **Auth**: Required (NextAuth session)
- **Returns**: User profile data and team info

### `PATCH /api/profile`
- **Purpose**: Update user's profile description
- **Auth**: Required (NextAuth session)
- **Body**: `{ "profile_description": "string" }`
- **Validation**: 
  - Max 500 characters
  - HTML tags stripped (XSS prevention)
  - Only description field is editable

---

## 📁 Key Files Created/Modified

### Created Files:
1. **`supabase-discord-auth-migration.sql`** - Database schema migration
2. **`app/api/profile/route.ts`** - Profile API endpoint
3. **`app/dashboard/page.tsx`** - Player dashboard UI

### Modified Files:
1. **`lib/auth.ts`** - Updated Discord OAuth flow with verification and auto-import
2. **`types/next-auth.d.ts`** - Added `profileDescription` field to session
3. **`app/auth/signin/page.tsx`** - Updated login page UI with instructions
4. **`app/auth/error/page.tsx`** - Added `MinecraftNotLinked` error handling

---

## 🔐 Security Implementation

### Input Validation
- Profile descriptions limited to 500 characters
- HTML tags stripped to prevent XSS attacks
- Input sanitized before database storage

### Authentication & Authorization
- Users can only edit their own profiles
- Session verification on every API request
- Discord ID verification against `discord_links` table

### Database Security
- Row Level Security (RLS) enabled on all tables
- Service role key used only server-side
- Anon key for client-side operations respects RLS

---

## 🎮 Discord Bot Integration

### Required Bot Tables

Your Discord bot should maintain these tables:

#### `discord_links` table:
```sql
minecraft_uuid TEXT
minecraft_username TEXT
discord_id TEXT (unique)
discord_username TEXT
discord_tag TEXT
created_at TIMESTAMP
```

#### `users` table:
```sql
id TEXT (format: discord-{discord_id})
minecraft_uuid TEXT
minecraft_username TEXT
discord_id TEXT
discord_username TEXT
team_id TEXT (or null for Free Agents)
created_at TIMESTAMP
updated_at TIMESTAMP
```

### Bot Commands

Players use `/linkdiscord` in Discord to:
1. Link their Minecraft account to Discord
2. Create entries in both `discord_links` and `users` tables
3. Enable website login

---

## 🧪 Testing Checklist

- [ ] New player login (not linked) → Shows error message
- [ ] New player after `/linkdiscord` → Auto-creates account
- [ ] Existing player login → Logs in successfully
- [ ] Profile editing → Can update description
- [ ] Profile editing → Cannot exceed 500 characters
- [ ] Profile editing → HTML tags are stripped
- [ ] Admin login → Works regardless of Minecraft link
- [ ] Team info displayed correctly (or "Free Agent")
- [ ] Minecraft avatar displays correctly
- [ ] Session persists across page refreshes

---

## 📊 Database Schema

### `discord_links` Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| minecraft_uuid | TEXT | Minecraft account UUID |
| minecraft_username | TEXT | Minecraft username |
| discord_id | TEXT | Discord user ID (unique) |
| discord_username | TEXT | Discord username |
| discord_tag | TEXT | Full Discord tag |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### `users` Table (New Columns)
| Column | Type | Description |
|--------|------|-------------|
| discord_id | TEXT | Discord ID (without prefix) |
| minecraft_uuid | TEXT | Minecraft UUID |
| profile_description | TEXT | User-editable description |

---

## 🚀 Deployment Checklist

### Before Deploying:

1. **Update Environment Variables** in production (Vercel/Netlify/etc.)
2. **Update Discord OAuth Redirect URI** to production URL
3. **Run Database Migration** on production Supabase
4. **Test Discord OAuth flow** on production
5. **Verify admin access** works correctly
6. **Test new player signup flow**
7. **Verify profile editing** works on production

### Environment Variables for Production:

```env
NEXTAUTH_URL=https://yourdomain.com
DISCORD_CLIENT_ID=1451637424638660640
DISCORD_CLIENT_SECRET=production_secret
NEXT_PUBLIC_SUPABASE_URL=https://cnibqlzrtxxayecipkte.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=production_anon_key
SUPABASE_SERVICE_ROLE_KEY=production_service_key
NEXTAUTH_SECRET=production_secret
ADMIN_DISCORD_IDS=comma,separated,ids
```

---

## 🐛 Troubleshooting

### "Minecraft Not Linked" Error
- **Cause**: User hasn't linked Minecraft via Discord bot
- **Solution**: Use `/linkdiscord` command in Discord server

### OAuth Callback Error
- **Cause**: Incorrect redirect URI
- **Solution**: Verify redirect URI matches Discord app settings

### Profile Update Fails
- **Cause**: User not authenticated or session expired
- **Solution**: Log out and log back in

### User Creation Failed
- **Cause**: Missing data in bot's `users` table
- **Solution**: Verify bot has created user entry after `/linkdiscord`

### Cannot Find Team
- **Cause**: `team_id` in bot database doesn't match website teams
- **Solution**: User shows as "Free Agent" (this is expected behavior)

---

## 📝 Next Steps / Future Enhancements

1. **Add more editable profile fields** (bio, social links, etc.)
2. **Email notifications** for profile updates
3. **Profile visibility settings** (public/private)
4. **Achievement badges** on profiles
5. **Profile banner images**
6. **Statistics integration** from game data
7. **Friend system** between players
8. **Profile completion progress** indicator

---

## 📞 Support

For issues or questions:
1. Check this documentation first
2. Review error messages in browser console
3. Check Supabase logs for database errors
4. Verify Discord bot is running and managing links
5. Contact system administrator

---

## 📄 License

This implementation is part of the MBA Basketball League website project.

---

## 🎉 Credits

Implemented by: GitHub Copilot  
Date: April 2026  
Framework: Next.js 14 with NextAuth.js  
Database: Supabase (PostgreSQL)  
Authentication: Discord OAuth2
