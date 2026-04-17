# 🚀 Quick Start Guide - Discord OAuth2 Login

## ⚡ Get Started in 5 Minutes

### 1. Run Database Migration (1 minute)

Open Supabase SQL Editor and run:

```sql
-- Copy and paste the entire content of supabase-discord-auth-migration.sql
```

Or run it via command line:
```bash
# If you have Supabase CLI installed
supabase db reset
```

### 2. Add Environment Variables (2 minutes)

Create or update `.env.local`:

```env
# Discord OAuth (Required)
DISCORD_CLIENT_ID=1451637424638660640
DISCORD_CLIENT_SECRET=YOUR_SECRET_HERE

# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://cnibqlzrtxxayecipkte.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_KEY

# NextAuth (Required)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=YOUR_SECRET_HERE

# Admin Discord IDs (Optional)
ADMIN_DISCORD_IDS=your_discord_id
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 3. Configure Discord App (1 minute)

1. Go to: https://discord.com/developers/applications/1451637424638660640
2. Navigate to: **OAuth2 → General**
3. Add Redirect URI:
   ```
   http://localhost:3000/api/auth/callback/discord
   ```
4. Click **Save Changes**

### 4. Start Development Server (30 seconds)

```bash
npm install  # If first time
npm run dev
```

### 5. Test the Flow (30 seconds)

1. Open: http://localhost:3000
2. Click the **Login** button (top-right)
3. Try logging in with Discord
4. If not linked → You'll see an error (expected!)
5. Go to Discord and use `/linkdiscord` command
6. Try logging in again → Success! 🎉
7. Visit dashboard at: http://localhost:3000/dashboard

---

## 🧪 Testing Scenarios

### Test 1: Unlinked User (Should Fail)
1. Login with Discord account that hasn't used `/linkdiscord`
2. **Expected**: Error page with instructions
3. **Message**: "You must link your Minecraft account..."

### Test 2: New Linked User (Should Auto-Create)
1. Use `/linkdiscord` in Discord
2. Login with Discord on website
3. **Expected**: Account created automatically
4. **Redirect**: To dashboard

### Test 3: Existing User (Should Login)
1. Login again with same Discord account
2. **Expected**: Instant login
3. **Redirect**: To dashboard

### Test 4: Profile Editing
1. Go to dashboard
2. Click "Edit Profile"
3. Add description (max 500 chars)
4. Click "Save Changes"
5. **Expected**: Success message appears
6. **Result**: Description saved

### Test 5: Security - Cannot Edit Others
1. Try accessing `/api/profile` with another user's ID
2. **Expected**: Unauthorized error
3. **Result**: Only your own profile is accessible

### Test 6: Admin Access
1. Add your Discord ID to `ADMIN_DISCORD_IDS`
2. Login without Minecraft link
3. **Expected**: Login succeeds (admins bypass requirement)

---

## 📱 Quick Test Commands

### Test API Endpoints

```bash
# Get your profile (must be logged in)
curl http://localhost:3000/api/profile \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"

# Update profile (must be logged in)
curl -X PATCH http://localhost:3000/api/profile \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -d '{"profile_description":"Test description"}'
```

### Check Database

```sql
-- Check if discord_links table exists
SELECT * FROM discord_links LIMIT 5;

-- Check if users have new columns
SELECT id, discord_id, minecraft_uuid, profile_description 
FROM users 
LIMIT 5;

-- Check your user
SELECT * FROM users WHERE discord_id = 'YOUR_DISCORD_ID';
```

---

## ✅ Success Indicators

You'll know it's working when:

- ✅ Login button appears in navigation
- ✅ Clicking login redirects to Discord OAuth
- ✅ After OAuth, you see your Discord name in session
- ✅ Dashboard shows your Minecraft username
- ✅ Team info displays (or "Free Agent")
- ✅ Profile editing works and saves
- ✅ Logout button appears when logged in

---

## ❌ Common Issues & Quick Fixes

### Issue: "Callback URL Mismatch"
**Fix**: Make sure Discord redirect URI matches exactly:
```
http://localhost:3000/api/auth/callback/discord
```

### Issue: "NEXTAUTH_URL is not defined"
**Fix**: Add to `.env.local`:
```env
NEXTAUTH_URL=http://localhost:3000
```

### Issue: "Cannot find discord_links table"
**Fix**: Run the migration SQL in Supabase

### Issue: "User creation failed"
**Fix**: Check that bot has created entry in `users` table with format `discord-{id}`

### Issue: "Profile update fails"
**Fix**: Check you're logged in and session is valid

---

## 🎯 What to Check If Something's Wrong

1. **Check Browser Console** - Look for error messages
2. **Check Server Logs** - Look at terminal output
3. **Check Supabase Logs** - Go to Supabase Dashboard → Logs
4. **Check Environment Variables** - Ensure all are set correctly
5. **Check Discord App Settings** - Verify redirect URI
6. **Check Database** - Ensure migration ran successfully

---

## 📊 Key URLs

| Page | URL | Purpose |
|------|-----|---------|
| Login | `/api/auth/signin` | Discord OAuth login |
| Dashboard | `/dashboard` | Player profile management |
| Error | `/auth/error` | Authentication errors |
| Settings | `/settings` | Theme and preferences |
| Profile API | `/api/profile` | Get/update profile |

---

## 🎮 Discord Bot Requirements

Your Discord bot must:

1. **Create `discord_links` entry** when user runs `/linkdiscord`
2. **Create `users` entry** with ID format: `discord-{discord_id}`
3. **Include required fields**:
   - `minecraft_username`
   - `minecraft_uuid`
   - `discord_id`
   - `team_id` (or null)

---

## 🚀 Ready to Deploy?

Once everything works locally:

1. **Update `.env` for production** with production values
2. **Update Discord redirect URI** to production URL
3. **Run migration on production Supabase**
4. **Deploy to Vercel/Netlify/etc.**
5. **Test production login flow**

---

## 📖 Need More Help?

Refer to:
- **Full Setup Guide**: `DISCORD-OAUTH-SETUP.md`
- **Implementation Summary**: `DISCORD-OAUTH-IMPLEMENTATION-SUMMARY.md`
- **Code Comments**: Check inline comments in the code

---

## 🎉 You're Ready!

If you followed all steps, your Discord OAuth2 login should be working!

**Test it now:**
1. Go to http://localhost:3000
2. Click Login
3. Sign in with Discord
4. Enjoy your new player dashboard! 🏀

---

**Need help?** Check the troubleshooting section or review the detailed setup guide.
