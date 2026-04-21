# Discord Bot Team Sync Implementation

## Overview
The website now automatically syncs team changes from your Discord bot. When a player is signed, released, or traded in Discord, those changes are immediately reflected on the website.

## How It Works

### 1. Sync Endpoint
**URL:** `/api/bot/sync-team`  
**Method:** `POST`  
**Authentication:** Requires `X-Bot-Secret` header

### 2. Request Format
```json
{
  "discord_id": "123456789012345678",
  "team_id": "team-abc",
  "transaction_type": "sign",
  "from_team_id": null,
  "performed_by": "Admin Username",
  "notes": "Signed for $50,000",
  "guild_id": "your-guild-id"
}
```

### 3. Transaction Types
- `sign` - Player signed to a team from free agency
- `release` - Player released to free agency
- `trade` - Player traded from one team to another
- `demand` - Player demanded release from team

### 4. Response
```json
{
  "success": true,
  "message": "PlayerName signed to TeamName",
  "user": {
    "id": "discord-123456789012345678",
    "username": "PlayerName",
    "previous_team": "Free Agency",
    "current_team": "TeamName"
  },
  "transaction": {
    "id": 123,
    "guild_id": "...",
    "transaction_type": "sign",
    "player_id": "discord-123456789012345678",
    "from_team_id": null,
    "to_team_id": "team-abc",
    "performed_by": "Admin Username",
    "notes": "Signed for $50,000",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

## Setup Instructions

### Step 1: Add Environment Variable
Add this to your `.env.local` file (and Vercel environment variables):

```env
# Bot Authentication - Must match Discord bot's secret
BOT_SECRET_KEY=your-secure-random-key-here
```

**Generate a secure key:**
```bash
# On Linux/Mac:
openssl rand -base64 32

# On Windows PowerShell:
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# Or use any random string generator
```

### Step 2: Configure Discord Bot
Update your Discord bot to call this endpoint whenever a team change occurs.

**Example Discord Bot Code (Python):**
```python
import aiohttp
import os

BOT_SECRET = os.getenv('BOT_SECRET_KEY')  # Must match website's BOT_SECRET_KEY
WEBSITE_URL = os.getenv('WEBSITE_URL', 'https://mbaassociation.com')

async def sync_team_change(
    discord_id: str,
    team_id: str | None,
    transaction_type: str,
    from_team_id: str | None = None,
    performed_by: str | None = None,
    notes: str | None = None
):
    """Sync team change to website"""
    url = f"{WEBSITE_URL}/api/bot/sync-team"
    headers = {
        'Content-Type': 'application/json',
        'X-Bot-Secret': BOT_SECRET
    }
    data = {
        'discord_id': discord_id,
        'team_id': team_id,
        'transaction_type': transaction_type,
        'from_team_id': from_team_id,
        'performed_by': performed_by,
        'notes': notes,
        'guild_id': str(ctx.guild.id)
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=data, headers=headers) as response:
            if response.status == 200:
                result = await response.json()
                return result
            else:
                error = await response.text()
                print(f"Error syncing team: {error}")
                return None

# Example: When signing a player
async def sign_player(ctx, discord_id: str, team_id: str):
    # ... your existing Discord bot logic ...
    
    # Sync to website
    await sync_team_change(
        discord_id=discord_id,
        team_id=team_id,
        transaction_type='sign',
        from_team_id=None,  # From free agency
        performed_by=str(ctx.author),
        notes=f"Signed by {ctx.author.name}"
    )
    
# Example: When releasing a player
async def release_player(ctx, discord_id: str, current_team_id: str):
    # ... your existing Discord bot logic ...
    
    # Sync to website
    await sync_team_change(
        discord_id=discord_id,
        team_id=None,  # To free agency
        transaction_type='release',
        from_team_id=current_team_id,
        performed_by=str(ctx.author),
        notes=f"Released by {ctx.author.name}"
    )
    
# Example: When trading a player
async def trade_player(ctx, discord_id: str, from_team: str, to_team: str):
    # ... your existing Discord bot logic ...
    
    # Sync to website
    await sync_team_change(
        discord_id=discord_id,
        team_id=to_team,
        transaction_type='trade',
        from_team_id=from_team,
        performed_by=str(ctx.author),
        notes=f"Traded by {ctx.author.name}"
    )
```

**Example Discord Bot Code (JavaScript/TypeScript):**
```typescript
import axios from 'axios';

const BOT_SECRET = process.env.BOT_SECRET_KEY;  // Must match website's BOT_SECRET_KEY
const WEBSITE_URL = process.env.WEBSITE_URL || 'https://mbaassociation.com';

interface TeamSyncData {
  discord_id: string;
  team_id: string | null;
  transaction_type: 'sign' | 'release' | 'trade' | 'demand';
  from_team_id?: string | null;
  performed_by?: string;
  notes?: string;
  guild_id?: string;
}

async function syncTeamChange(data: TeamSyncData) {
  try {
    const response = await axios.post(
      `${WEBSITE_URL}/api/bot/sync-team`,
      data,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Bot-Secret': BOT_SECRET
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error syncing team:', error.response?.data || error.message);
    return null;
  }
}

// Example: Sign player command
async function signPlayer(interaction, discordId: string, teamId: string) {
  // ... your existing Discord bot logic ...
  
  // Sync to website
  await syncTeamChange({
    discord_id: discordId,
    team_id: teamId,
    transaction_type: 'sign',
    from_team_id: null,
    performed_by: interaction.user.tag,
    notes: `Signed by ${interaction.user.tag}`,
    guild_id: interaction.guildId
  });
}

// Example: Release player command
async function releasePlayer(interaction, discordId: string, currentTeamId: string) {
  // ... your existing Discord bot logic ...
  
  // Sync to website
  await syncTeamChange({
    discord_id: discordId,
    team_id: null,  // null = free agent
    transaction_type: 'release',
    from_team_id: currentTeamId,
    performed_by: interaction.user.tag,
    notes: `Released by ${interaction.user.tag}`,
    guild_id: interaction.guildId
  });
}

// Example: Trade player command
async function tradePlayer(interaction, discordId: string, fromTeam: string, toTeam: string) {
  // ... your existing Discord bot logic ...
  
  // Sync to website
  await syncTeamChange({
    discord_id: discordId,
    team_id: toTeam,
    transaction_type: 'trade',
    from_team_id: fromTeam,
    performed_by: interaction.user.tag,
    notes: `Traded by ${interaction.user.tag}`,
    guild_id: interaction.guildId
  });
}
```

### Step 3: Deploy Changes
1. Add `BOT_SECRET_KEY` to your environment variables (locally and on Vercel)
2. Deploy the website
3. Update your Discord bot with the sync code
4. Deploy your Discord bot with the same `BOT_SECRET_KEY`

## Testing

### Test the Endpoint
```bash
# Test with curl
curl -X POST https://mbaassociation.com/api/bot/sync-team \
  -H "Content-Type: application/json" \
  -H "X-Bot-Secret: your-secret-key-here" \
  -d '{
    "discord_id": "123456789012345678",
    "team_id": "team-id-here",
    "transaction_type": "sign",
    "performed_by": "Test User",
    "notes": "Test signing"
  }'
```

### Check Status
```bash
# GET request to check if endpoint is online
curl https://mbaassociation.com/api/bot/sync-team
```

## What Gets Synced

When you call this endpoint:
1. ✅ User's `team_id` is updated in the database
2. ✅ Transaction record is created in `transaction_history` table
3. ✅ Website transactions page shows the change immediately
4. ✅ Player's profile shows their new team
5. ✅ Team rosters are automatically updated

## Security

- The endpoint requires authentication via `X-Bot-Secret` header
- Only requests with the correct secret key can update teams
- The secret must match between your website and Discord bot
- Never expose `BOT_SECRET_KEY` in client-side code or public repositories

## Error Handling

The endpoint returns appropriate error codes:
- `400` - Missing or invalid parameters
- `401` - Unauthorized (invalid or missing bot secret)
- `404` - User not found (player hasn't linked their account yet)
- `500` - Server error

## Notes

- Players must link their Discord account first using `/api/bot/link-account`
- Set `team_id` to `null` for free agents
- The `guild_id` field is optional (defaults to `DISCORD_GUILD_ID` from environment)
- Transaction history is automatically visible on the website's transactions page

## Troubleshooting

**"User not found" error:**
- Make sure the player has linked their Minecraft/Discord account
- Verify the `discord_id` is correct
- Check that the user exists in the `users` table

**"Unauthorized" error:**
- Verify `BOT_SECRET_KEY` matches between website and bot
- Check that `X-Bot-Secret` header is being sent
- Ensure the header value matches exactly

**Team not updating:**
- Check Supabase logs for errors
- Verify `team_id` is a valid team ID from the `teams` table
- Check that RLS policies allow service role to update users table
