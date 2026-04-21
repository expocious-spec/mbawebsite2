# HoopGrids Discord Integration Setup

## Overview
The website now automatically sends HoopGrids completion notifications to Discord via a webhook when players finish the puzzle.

---

## 🔧 Setup Instructions for Website

### 1. Create a Discord Webhook

1. Go to your Discord server
2. Navigate to the channel where you want HoopGrids completions posted (e.g., `#hoopgrids` or `#minigames`)
3. Right-click the channel → **Edit Channel**
4. Go to **Integrations** → **Webhooks**
5. Click **New Webhook**
6. Name it something like "HoopGrids Completions"
7. Copy the **Webhook URL**

### 2. Add Webhook URL to Environment Variables

Add this to your `.env.local` file:

```bash
HOOPGRIDS_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
```

### 3. Deploy Changes

After adding the environment variable:
- Restart your local dev server if testing locally
- Redeploy to Vercel/production and add the environment variable there

---

## 📊 What Gets Sent to Discord

When a player completes HoopGrids, an embed is automatically sent with:

- **Player name** (Discord username and Minecraft username)
- **Score** (X/9 correct cells with percentage)
- **Rarity score** (average rarity percentage)
- **Completion time** (formatted as Xm Ys)
- **Rank** (#1 of 5 players, etc.)
- **Puzzle date**
- **Player avatar** (thumbnail)
- **Color coding**:
  - 🏆 Gold - Perfect game (9/9)
  - ⭐ Green - Great game (7-8/9)
  - ✅ Blue - Good game (5-6/9)
  - 📊 Gray - Okay game (0-4/9)

### Example Embed:

```
🏆 HoopGrids Completion
PlayerName completed today's HoopGrids!

📊 Score: 9/9 correct (100%)
🎯 Rarity: 12.5%
⏱️ Time: 2m 34s
🏆 Rank: #1 of 12
📅 Date: 2026-04-20
🎮 Player: MinecraftUser
```

---

## 🤖 Discord Bot Instructions (For Your Bot AI)

If you want your Discord bot to do additional processing when these messages are sent, here's how:

### Option 1: Listen to Webhook Messages (Recommended)

Since webhooks post messages normally, your bot can listen for messages in the HoopGrids channel:

```python
@bot.event
async def on_message(message):
    # Ignore own messages
    if message.author == bot.user:
        return
    
    # Check if message is from the HoopGrids webhook
    if message.author.bot and message.channel.id == HOOPGRIDS_CHANNEL_ID:
        # Check if it's a HoopGrids completion
        if message.embeds and "HoopGrids Completion" in message.embeds[0].title:
            embed = message.embeds[0]
            
            # You can now:
            # - Add reactions based on score
            # - Give roles for perfect scores
            # - Track leaderboards
            # - Award points/currency
            
            # Example: Add trophy reaction for perfect scores
            if "9/9" in str(embed.fields):
                await message.add_reaction("🏆")
```

### Option 2: Create a Custom Bot Endpoint (Advanced)

If you want to receive data directly without using webhooks, you can modify the website code:

**In your Discord bot**, create an HTTP endpoint:

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/hoopgrids/completion', methods=['POST'])
def hoopgrids_completion():
    data = request.json
    
    # Data structure:
    # {
    #   "userId": "discord-123456789",
    #   "username": "PlayerName",
    #   "minecraftUsername": "MCPlayer",
    #   "rarityScore": 12.5,
    #   "completionTime": 154,
    #   "correctCells": 9,
    #   "totalCells": 9,
    #   "rank": 1,
    #   "totalPlayers": 12,
    #   "puzzleDate": "2026-04-20"
    # }
    
    # Your bot logic here
    # - Send custom messages
    # - Award roles
    # - Update database
    # - etc.
    
    return jsonify({"success": True})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

Then update the webhook URL in `.env.local` to point to your bot's endpoint:
```bash
HOOPGRIDS_DISCORD_WEBHOOK_URL=https://your-bot-api.com/hoopgrids/completion
```

---

## 🎨 Customization Options

### Change Webhook Channel

Just change which channel the webhook is created in, or edit the webhook settings to post to a different channel.

### Modify Embed Appearance

Edit `/app/api/minigames/hoopgrids/webhook/route.ts` to customize:
- Colors
- Fields
- Emojis
- Footer text
- Thumbnail

### Add Additional Data

The webhook endpoint has access to all user and puzzle data. You can add more fields like:
- Individual cell details
- Team logos
- Stat criteria that were correct/wrong
- Comparison to previous attempts

---

## 🧪 Testing

1. Complete a HoopGrids puzzle
2. Check the Discord channel for the embed
3. Verify all data is correct
4. Test with different scores (perfect, partial, failed)

---

## 🐛 Troubleshooting

### Webhook not sending
- Check that `HOOPGRIDS_DISCORD_WEBHOOK_URL` is set correctly
- Verify the webhook URL is valid in Discord
- Check server logs for errors

### Missing data in embed
- Check Supabase for user data (discord_user_id, etc.)
- Verify user has completed the puzzle successfully
- Check webhook route logs

### Wrong channel
- Edit the webhook in Discord settings to change the channel
- Or create a new webhook in the correct channel

---

## 📝 Notes

- Webhooks are **non-blocking** - if they fail, the completion still saves
- Webhook calls are logged but don't prevent game completion
- The webhook URL should be kept secure (it's in environment variables)
- Rate limits: Discord webhooks can handle ~5 requests per second

---

## 🚀 Future Enhancements

Possible additions:
- Daily leaderboard summary at midnight
- Weekly/monthly stats
- Achievement announcements
- Streak tracking
- Perfect game celebrations
- Team-based competitions
