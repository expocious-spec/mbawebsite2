# HoopGrids Discord Bot Integration

## Overview
When a player completes HoopGrids, the website automatically sends the completion data to your Discord bot's API. Your bot then creates and sends the embed however you want.

---

## 🔧 Setup Instructions for Website

### 1. Add Bot API URL to Environment Variables

Add this to your `.env.local` file:

```bash
# Your Discord bot's API endpoint (where it receives webhook notifications)
DISCORD_BOT_API_URL=https://your-bot-api.com

# Optional: Secret key for authentication (should match your bot's config)
BOT_SECRET_KEY=your-secret-key-here
```

### 2. Deploy Changes

- Restart your local dev server if testing locally
- Redeploy to Vercel/production and add the environment variables there

---

## 🤖 Discord Bot Implementation Guide

### Required: Create API Endpoint

Your Discord bot needs to expose an HTTP endpoint at:
```
POST /minigames/completion
```

This endpoint will receive completion data from the website.

### Example Implementation (Python with Flask):

```python
from flask import Flask, request, jsonify
import discord
from discord import Embed

app = Flask(__name__)
bot = discord.Client()

# Channel ID where you want to post completions
HOOPGRIDS_CHANNEL_ID = 1234567890  # Replace with your channel ID

@app.route('/minigames/completion', methods=['POST'])
async def minigame_completion():
    try:
        # Verify authorization header (optional but recommended)
        auth_header = request.headers.get('Authorization')
        if auth_header != f"Bearer {YOUR_SECRET_KEY}":
            return jsonify({"error": "Unauthorized"}), 401
        
        data = request.json
        
        # Check which minigame was completed
        if data['minigame'] == 'hoopgrids':
            await handle_hoopgrids_completion(data)
        
        return jsonify({"success": True})
    
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500


async def handle_hoopgrids_completion(data):
    """Handle HoopGrids completion and send embed to Discord"""
    
    channel = bot.get_channel(HOOPGRIDS_CHANNEL_ID)
    if not channel:
        print(f"Channel {HOOPGRIDS_CHANNEL_ID} not found")
        return
    
    player = data['player']
    completion = data['completion']
    score = completion['score']
    
    # Determine emoji and color based on performance
    if score['isPerfect']:
        emoji = '🏆'
        color = 0xFFD700  # Gold
    elif score['correct'] >= 7:
        emoji = '⭐'
        color = 0x00FF00  # Green
    elif score['correct'] >= 5:
        emoji = '✅'
        color = 0x3B82F6  # Blue
    else:
        emoji = '📊'
        color = 0x9CA3AF  # Gray
    
    # Create embed
    embed = Embed(
        title=f"{emoji} HoopGrids Completion",
        description=f"**{player['minecraftUsername'] or player['username']}** completed today's HoopGrids!",
        color=color,
        timestamp=datetime.fromisoformat(data['timestamp'].replace('Z', '+00:00'))
    )
    
    # Add fields
    embed.add_field(
        name="📊 Score",
        value=f"{score['correct']}/{score['total']} correct ({score['percentage']}%)",
        inline=True
    )
    embed.add_field(
        name="🎯 Rarity",
        value=completion['rarity']['formatted'],
        inline=True
    )
    embed.add_field(
        name="⏱️ Time",
        value=completion['time']['formatted'],
        inline=True
    )
    embed.add_field(
        name="🏆 Rank",
        value=completion['rank']['formatted'],
        inline=True
    )
    embed.add_field(
        name="📅 Date",
        value=completion['puzzleDate'],
        inline=True
    )
    embed.add_field(
        name="🎮 Player",
        value=player['minecraftUsername'] or player['username'],
        inline=True
    )
    
    # Set thumbnail (player avatar)
    if player['avatarUrl']:
        embed.set_thumbnail(url=player['avatarUrl'])
    
    embed.set_footer(text="MBA HoopGrids")
    
    # Send embed
    await channel.send(embed=embed)
    
    # Optional: Add reactions based on performance
    message = await channel.send(embed=embed)
    if score['isPerfect']:
        await message.add_reaction('🏆')


if __name__ == '__main__':
    # Run Flask app in a separate thread
    from threading import Thread
    
    def run_flask():
        app.run(host='0.0.0.0', port=5000)
    
    flask_thread = Thread(target=run_flask)
    flask_thread.start()
    
    # Run Discord bot
    bot.run('YOUR_BOT_TOKEN')
```

---

## 📊 Data Structure Your Bot Receives

When a player completes HoopGrids, your bot receives this JSON payload:

```json
{
  "minigame": "hoopgrids",
  "minigameName": "HoopGrids",
  "player": {
    "userId": "123456789012345678",
    "username": "PlayerName",
    "discordUsername": "player#1234",
    "minecraftUsername": "MCPlayer",
    "minecraftUserId": "uuid-here",
    "avatarUrl": "https://crafatar.com/avatars/uuid?size=256"
  },
  "completion": {
    "puzzleDate": "2026-04-20",
    "score": {
      "correct": 9,
      "total": 9,
      "percentage": 100,
      "isPerfect": true
    },
    "rarity": {
      "score": 12.5,
      "formatted": "12.5%"
    },
    "time": {
      "seconds": 154,
      "formatted": "2m 34s"
    },
    "rank": {
      "position": 1,
      "total": 12,
      "formatted": "#1 of 12"
    }
  },
  "timestamp": "2026-04-20T12:34:56.789Z"
}
```

### Field Descriptions:

| Field | Type | Description |
|-------|------|-------------|
| `minigame` | string | Always "hoopgrids" for now |
| `minigameName` | string | Display name: "HoopGrids" |
| `player.userId` | string | Discord user ID (can mention with <@userId>) |
| `player.username` | string | Website username |
| `player.discordUsername` | string | Discord username with discriminator |
| `player.minecraftUsername` | string | Minecraft IGN |
| `player.minecraftUserId` | string | Minecraft UUID |
| `player.avatarUrl` | string | Profile picture URL |
| `completion.puzzleDate` | string | Date of the puzzle (YYYY-MM-DD) |
| `completion.score.correct` | number | Number of correct cells (0-9) |
| `completion.score.total` | number | Total cells (always 9) |
| `completion.score.percentage` | number | Percentage correct (0-100) |
| `completion.score.isPerfect` | boolean | True if 9/9 correct |
| `completion.rarity.score` | number | Average rarity score |
| `completion.rarity.formatted` | string | Rarity with % sign |
| `completion.time.seconds` | number | Completion time in seconds |
| `completion.time.formatted` | string | Human-readable time (e.g., "2m 34s") |
| `completion.rank.position` | number | Player's rank (1 = best) |
| `completion.rank.total` | number | Total completions today |
| `completion.rank.formatted` | string | Formatted rank string |
| `timestamp` | string | ISO 8601 timestamp |

---

## 🎨 Customization Ideas

Your bot can do whatever you want with this data:

### Basic:
- Send a simple embed with the completion info
- Add reactions based on score (🏆 for perfect, etc.)
- Mention the player: `<@{player.userId}>`

### Advanced:
- **Roles**: Give "Perfect HoopGrids" role for 9/9
- **Leaderboards**: Track all completions in a database
- **Streaks**: Track consecutive days of completions
- **Achievements**: Award badges for milestones
- **Points/Currency**: Award coins/points based on rarity score
- **Daily summary**: Post a leaderboard at midnight
- **Voice announcements**: Use TTS to announce perfect games

---

## 🧪 Testing

### Test the Endpoint:

You can test your bot's endpoint manually:

```bash
curl -X POST https://your-bot-api.com/minigames/completion \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-key" \
  -d '{
    "minigame": "hoopgrids",
    "minigameName": "HoopGrids",
    "player": {
      "userId": "123456789",
      "username": "TestPlayer",
      "minecraftUsername": "TestMC",
      "avatarUrl": "https://example.com/avatar.png"
    },
    "completion": {
      "puzzleDate": "2026-04-20",
      "score": {
        "correct": 9,
        "total": 9,
        "percentage": 100,
        "isPerfect": true
      },
      "rarity": {
        "score": 15.5,
        "formatted": "15.5%"
      },
      "time": {
        "seconds": 120,
        "formatted": "2m 0s"
      },
      "rank": {
        "position": 1,
        "total": 5,
        "formatted": "#1 of 5"
      }
    },
    "timestamp": "2026-04-20T12:00:00Z"
  }'
```

---

## 🐛 Troubleshooting

### Bot not receiving data
- Check `DISCORD_BOT_API_URL` is set correctly in website env vars
- Verify your bot's API is running and accessible
- Check firewall/network settings
- Look at website logs for errors

### Authorization errors
- Make sure `BOT_SECRET_KEY` matches on both sides
- Check the Authorization header is being sent correctly

### Embeds not showing
- Verify channel ID is correct
- Check bot has permission to send messages in that channel
- Ensure bot has "Send Messages" and "Embed Links" permissions

---

## 🚀 Future Minigames

When more minigames are added, they'll send data to the same endpoint with:
- `minigame` field identifying which game (e.g., "trivia", "bracket")
- Similar structure with player and completion data
- You can handle different minigames differently in your code

---

## 💡 Example: Discord.py Implementation

```python
import discord
from discord.ext import commands
from aiohttp import web
import asyncio

bot = commands.Bot(command_prefix='!')

async def handle_webhook(request):
    """Handle incoming minigame completion"""
    try:
        # Verify auth
        auth = request.headers.get('Authorization', '')
        if not auth.startswith('Bearer ') or auth[7:] != BOT_SECRET:
            return web.json_response({'error': 'Unauthorized'}, status=401)
        
        data = await request.json()
        
        if data['minigame'] == 'hoopgrids':
            channel = bot.get_channel(HOOPGRIDS_CHANNEL_ID)
            
            player = data['player']
            comp = data['completion']
            score = comp['score']
            
            # Create embed
            embed = discord.Embed(
                title=f"{'🏆' if score['isPerfect'] else '📊'} HoopGrids Complete!",
                description=f"<@{player['userId']}> finished today's puzzle!",
                color=0xFFD700 if score['isPerfect'] else 0x3B82F6
            )
            
            embed.add_field(name="Score", value=f"{score['correct']}/{score['total']}")
            embed.add_field(name="Rarity", value=comp['rarity']['formatted'])
            embed.add_field(name="Time", value=comp['time']['formatted'])
            embed.add_field(name="Rank", value=comp['rank']['formatted'])
            
            if player['avatarUrl']:
                embed.set_thumbnail(url=player['avatarUrl'])
            
            await channel.send(embed=embed)
        
        return web.json_response({'success': True})
    
    except Exception as e:
        print(f"Error: {e}")
        return web.json_response({'error': str(e)}, status=500)

async def start_webserver():
    """Start the web server for webhooks"""
    app = web.Application()
    app.router.add_post('/minigames/completion', handle_webhook)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', 5000)
    await site.start()

@bot.event
async def on_ready():
    print(f'Bot is ready! Logged in as {bot.user}')
    await start_webserver()

bot.run('YOUR_TOKEN')
```

---

## 📝 Summary

1. ✅ Website sends completion data to YOUR bot's API
2. ✅ Your bot receives JSON with all the details
3. ✅ Your bot creates and sends the embed however you want
4. ✅ Full control over design, reactions, roles, etc.
