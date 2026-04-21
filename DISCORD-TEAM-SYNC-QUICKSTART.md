# Quick Setup: Discord Team Sync

## What This Does
Your Discord bot can now automatically update player teams on the website. When players are signed, released, or traded in Discord, the website updates instantly.

## Quick Setup (3 Steps)

### 1. Add Secret Key to Environment
Add to `.env.local` (create if it doesn't exist):
```env
BOT_SECRET_KEY=your-random-secret-key-here
```

**Generate a random key:**
```powershell
# PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### 2. Add Same Key to Vercel
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add: `BOT_SECRET_KEY` = (same value as step 1)
3. Redeploy your website

### 3. Update Discord Bot
Add this to your Discord bot code when signing/releasing/trading players:

**Python Example:**
```python
import aiohttp
import os

async def sync_to_website(discord_id, team_id, transaction_type, from_team=None):
    url = "https://mbaassociation.com/api/bot/sync-team"
    headers = {
        "Content-Type": "application/json",
        "X-Bot-Secret": os.getenv("BOT_SECRET_KEY")
    }
    data = {
        "discord_id": discord_id,
        "team_id": team_id,  # null for free agents
        "transaction_type": transaction_type,  # "sign", "release", "trade", "demand"
        "from_team_id": from_team,
        "performed_by": "Bot Admin"
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=data, headers=headers) as resp:
            return await resp.json()

# Example usage:
# Sign player
await sync_to_website("123456789", "team-id", "sign", None)

# Release player
await sync_to_website("123456789", None, "release", "old-team-id")

# Trade player
await sync_to_website("123456789", "new-team-id", "trade", "old-team-id")
```

**JavaScript/TypeScript Example:**
```typescript
async function syncToWebsite(discordId, teamId, transactionType, fromTeam = null) {
    const response = await fetch("https://mbaassociation.com/api/bot/sync-team", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Bot-Secret": process.env.BOT_SECRET_KEY
        },
        body: JSON.stringify({
            discord_id: discordId,
            team_id: teamId,  // null for free agents
            transaction_type: transactionType,  // "sign", "release", "trade", "demand"
            from_team_id: fromTeam,
            performed_by: "Bot Admin"
        })
    });
    return await response.json();
}

// Example usage:
// Sign player
await syncToWebsite("123456789", "team-id", "sign", null);

// Release player
await syncToWebsite("123456789", null, "release", "old-team-id");

// Trade player
await syncToWebsite("123456789", "new-team-id", "trade", "old-team-id");
```

## Done! ✅
Team changes in Discord now automatically sync to:
- Player profiles
- Team rosters
- Transactions page
- All website data

## Full Documentation
See [DISCORD-TEAM-SYNC.md](./DISCORD-TEAM-SYNC.md) for complete details.
