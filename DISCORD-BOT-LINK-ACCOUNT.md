# Discord Bot - Account Linking Integration

## Overview

The website now supports linking Discord accounts to existing Minecraft players. When a user verifies their Minecraft username through the Discord bot, the bot should use this API endpoint to either:
1. **Link** their Discord account to an existing player (if manually created in admin panel)
2. **Update** their existing Discord account info (if already verified)
3. **Create** a new player account (if neither exists)

This prevents duplicate accounts and allows admins to pre-create player profiles.

---

## API Endpoint

### POST `/api/bot/link-account`

Links a Discord account to a Minecraft username, intelligently handling existing accounts.

**Request Body:**
```json
{
  "discord_id": "123456789",
  "discord_username": "PlayerName#1234",
  "minecraft_username": "NotchPlayer",
  "minecraft_user_id": "069a79f4-44e9-4726-a5be-fca90e38aaf5",
  "avatar_url": "https://cdn.discordapp.com/avatars/...",
  "team_id": "team-uuid-here" // Optional
}
```

**Response Scenarios:**

#### 1. Linked Existing Account
User already existed with this Minecraft username (e.g., manually created by admin).
```json
{
  "success": true,
  "action": "linked",
  "message": "Linked Discord account to existing Minecraft player: NotchPlayer",
  "old_user_id": "manually-created-id",
  "user": {
    "id": "discord-123456789",
    "username": "PlayerName",
    "minecraft_username": "NotchPlayer",
    "minecraft_user_id": "069a79f4-44e9-4726-a5be-fca90e38aaf5",
    "discord_username": "PlayerName#1234",
    "team_id": "team-uuid",
    ...
  }
}
```

#### 2. Updated Existing Discord Account
User already verified before, just updating info.
```json
{
  "success": true,
  "action": "updated",
  "message": "Updated existing Discord account with Minecraft info",
  "user": {
    "id": "discord-123456789",
    ...
  }
}
```

#### 3. Created New Account
First time verification, no existing account found.
```json
{
  "success": true,
  "action": "created",
  "message": "Created new user account",
  "user": {
    "id": "discord-123456789",
    ...
  }
}
```

---

## GET `/api/bot/link-account?minecraft_username=NotchPlayer`

Check if a Minecraft username is already taken.

**Response:**
```json
{
  "exists": true,
  "user": {
    "id": "some-id",
    "username": "Player Name",
    "minecraft_username": "NotchPlayer",
    "discord_username": "PlayerName#1234",
    "team_id": "team-uuid"
  }
}
```

Or if not found:
```json
{
  "exists": false
}
```

---

## Bot Implementation Guide

### When User Verifies Minecraft Account

1. **User runs verification command** (e.g., `/verify NotchPlayer`)

2. **Bot validates Minecraft username** via Mojang API

3. **Bot calls the link-account endpoint:**

```javascript
const response = await fetch('https://your-website.com/api/bot/link-account', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    discord_id: interaction.user.id,
    discord_username: interaction.user.tag,
    minecraft_username: 'NotchPlayer',
    minecraft_user_id: 'minecraft-uuid-from-mojang',
    avatar_url: interaction.user.displayAvatarURL(),
    team_id: null // or assigned team ID if you have team assignment logic
  })
});

const data = await response.json();

if (data.success) {
  // Check what action was taken
  switch (data.action) {
    case 'linked':
      await interaction.reply(`✅ Successfully linked your Discord account to existing player: ${data.user.minecraft_username}`);
      break;
    case 'updated':
      await interaction.reply(`✅ Updated your verification info!`);
      break;
    case 'created':
      await interaction.reply(`✅ Account created! You can now sign in to the website.`);
      break;
  }
} else {
  await interaction.reply(`❌ Error: ${data.error}`);
}
```

---

## Authentication Flow

### For Admins (Manual Player Creation):
1. Admin creates player in admin panel with Minecraft username
2. Player runs `/verify` on Discord with same Minecraft username
3. Bot calls `/api/bot/link-account`
4. API **links** the Discord account to existing player
5. Player can now sign in with Discord OAuth ✅

### For New Players:
1. Player runs `/verify` on Discord
2. Bot calls `/api/bot/link-account`
3. API **creates** new player account
4. Player can now sign in with Discord OAuth ✅

### For Re-verification:
1. Player already verified, runs `/verify` again
2. Bot calls `/api/bot/link-account`
3. API **updates** existing info
4. No duplicate accounts created ✅

---

## Database Changes

The endpoint automatically:
- ✅ Preserves existing user data (team, description, etc.)
- ✅ Updates Discord info (id, username, avatar)
- ✅ Adds Minecraft verification (username, UUID)
- ✅ Maintains user ID format as `discord-{discord_id}`
- ✅ Deletes old manually-created accounts when linking

---

## Security Notes

- This endpoint uses `supabaseAdmin` to bypass RLS policies
- Only the Discord bot should call this endpoint
- Consider adding API key authentication in production:

```typescript
const BOT_API_KEY = process.env.BOT_API_KEY;
const authHeader = request.headers.get('authorization');

if (authHeader !== `Bearer ${BOT_API_KEY}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

---

## Testing

Test all three scenarios:

### Test 1: Link Existing Account
```bash
# 1. Manually create player in admin panel with minecraft_username "TestPlayer"
# 2. Call API:
curl -X POST http://localhost:3000/api/bot/link-account \
  -H "Content-Type: application/json" \
  -d '{
    "discord_id": "111111111",
    "discord_username": "TestUser#1111",
    "minecraft_username": "TestPlayer",
    "minecraft_user_id": "test-uuid-1234"
  }'
# Expected: action = "linked"
```

### Test 2: Create New Account
```bash
curl -X POST http://localhost:3000/api/bot/link-account \
  -H "Content-Type: application/json" \
  -d '{
    "discord_id": "222222222",
    "discord_username": "NewUser#2222",
    "minecraft_username": "BrandNewPlayer",
    "minecraft_user_id": "new-uuid-5678"
  }'
# Expected: action = "created"
```

### Test 3: Update Existing
```bash
# Run Test 2 again with same data
# Expected: action = "updated"
```

---

## Conclusion

Your Discord bot should now call `/api/bot/link-account` whenever a user verifies their Minecraft account. The endpoint will automatically handle:
- Linking to manually created accounts
- Creating new accounts
- Updating existing verifications

This ensures players can log in regardless of whether they were created manually or via bot verification.
