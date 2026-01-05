# Discord Bot - Account Linking Logic

## What You Need to Tell Your Bot Developer

When a user verifies their Minecraft username on Discord, the bot needs to check if an account with that Minecraft username already exists in the database **before** creating a new one.

---

## Required Bot Logic Changes

### Current Behavior (❌ Creates Duplicates)
```
User verifies Minecraft username → Bot creates new user with discord-{id}
```

### New Behavior (✅ Links to Existing Accounts)
```
User verifies Minecraft username
  ↓
Bot checks: Does a user with this minecraft_username already exist?
  ↓
YES → Update that user's Discord info (link the accounts)
  ↓
NO → Create new user with discord-{id}
```

---

## Step-by-Step Implementation

### 1. When User Runs Verification Command

Example: `/verify NotchPlayer`

### 2. Validate Minecraft Username
(Bot already does this - get UUID from Mojang API)

### 3. Check if User Already Exists with Discord ID

```javascript
// Check if this Discord user already has an account
const { data: existingDiscordUser } = await supabase
  .from('users')
  .select('*')
  .eq('id', `discord-${interaction.user.id}`)
  .single();
```

**If found:** Update their Minecraft info and you're done ✅

```javascript
if (existingDiscordUser) {
  await supabase
    .from('users')
    .update({
      minecraft_username: minecraftUsername,
      minecraft_user_id: minecraftUuid,
      discord_username: interaction.user.tag,
      avatar_url: interaction.user.displayAvatarURL(),
      updated_at: new Date().toISOString()
    })
    .eq('id', `discord-${interaction.user.id}`);
  
  return interaction.reply('✅ Updated your verification info!');
}
```

### 4. Check if User Exists with This Minecraft Username

```javascript
// Check if someone else has this Minecraft username (manually created account)
const { data: existingMinecraftUser } = await supabase
  .from('users')
  .select('*')
  .eq('minecraft_username', minecraftUsername)
  .single();
```

### 5A. If Existing Minecraft User Found (LINK ACCOUNTS)

This means an admin manually created a player with this Minecraft username.
We need to link it to this Discord user.

```javascript
if (existingMinecraftUser) {
  const oldUserId = existingMinecraftUser.id;
  const newUserId = `discord-${interaction.user.id}`;
  
  // Create new user with Discord ID, preserving all existing data
  const { data: linkedUser } = await supabase
    .from('users')
    .insert({
      id: newUserId,  // New ID format
      username: existingMinecraftUser.username,
      email: existingMinecraftUser.email,
      avatar_url: interaction.user.displayAvatarURL() || existingMinecraftUser.avatar_url,
      minecraft_username: minecraftUsername,
      minecraft_user_id: minecraftUuid,
      team_id: existingMinecraftUser.team_id,
      description: existingMinecraftUser.description,
      discord_username: interaction.user.tag,
      roles: existingMinecraftUser.roles || ['Player'],
      created_at: existingMinecraftUser.created_at  // Preserve original date
    })
    .select()
    .single();
  
  // Delete the old user record
  await supabase
    .from('users')
    .delete()
    .eq('id', oldUserId);
  
  return interaction.reply(
    `✅ Successfully linked your Discord account to existing player: ${minecraftUsername}\n` +
    `You can now sign in to the website!`
  );
}
```

### 5B. If No Existing User Found (CREATE NEW)

```javascript
// No existing account found - create a new one
const { data: newUser } = await supabase
  .from('users')
  .insert({
    id: `discord-${interaction.user.id}`,
    username: interaction.user.username,
    minecraft_username: minecraftUsername,
    minecraft_user_id: minecraftUuid,
    discord_username: interaction.user.tag,
    avatar_url: interaction.user.displayAvatarURL(),
    roles: ['Player']
  })
  .select()
  .single();

return interaction.reply(
  `✅ Account created! You can now sign in to the website with Discord.`
);
```

---

## Complete Verification Function Example

```javascript
async function handleMinecraftVerification(interaction, minecraftUsername) {
  try {
    // 1. Get Minecraft UUID from Mojang API
    const mojangResponse = await fetch(
      `https://api.mojang.com/users/profiles/minecraft/${minecraftUsername}`
    );
    
    if (!mojangResponse.ok) {
      return interaction.reply('❌ Invalid Minecraft username');
    }
    
    const { id: minecraftUuid, name: verifiedUsername } = await mojangResponse.json();
    const userId = `discord-${interaction.user.id}`;
    
    // 2. Check if user already exists with this Discord ID
    const { data: existingDiscordUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (existingDiscordUser) {
      // Update existing Discord user
      await supabase
        .from('users')
        .update({
          minecraft_username: verifiedUsername,
          minecraft_user_id: minecraftUuid,
          discord_username: interaction.user.tag,
          avatar_url: interaction.user.displayAvatarURL(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      return interaction.reply('✅ Updated your verification info!');
    }
    
    // 3. Check if user exists with this Minecraft username
    const { data: existingMinecraftUser } = await supabase
      .from('users')
      .select('*')
      .eq('minecraft_username', verifiedUsername)
      .single();
    
    if (existingMinecraftUser) {
      // LINK: Account exists with this Minecraft username
      const oldUserId = existingMinecraftUser.id;
      
      // Create new user with Discord ID format
      await supabase
        .from('users')
        .insert({
          id: userId,
          username: existingMinecraftUser.username,
          email: existingMinecraftUser.email,
          avatar_url: interaction.user.displayAvatarURL() || existingMinecraftUser.avatar_url,
          minecraft_username: verifiedUsername,
          minecraft_user_id: minecraftUuid,
          team_id: existingMinecraftUser.team_id,
          description: existingMinecraftUser.description,
          discord_username: interaction.user.tag,
          roles: existingMinecraftUser.roles || ['Player'],
          created_at: existingMinecraftUser.created_at
        });
      
      // Delete old user record
      await supabase
        .from('users')
        .delete()
        .eq('id', oldUserId);
      
      return interaction.reply(
        `✅ Successfully linked Discord to existing player: ${verifiedUsername}\n` +
        `You can now sign in to the website!`
      );
    }
    
    // 4. CREATE: No existing user found
    await supabase
      .from('users')
      .insert({
        id: userId,
        username: interaction.user.username,
        minecraft_username: verifiedUsername,
        minecraft_user_id: minecraftUuid,
        discord_username: interaction.user.tag,
        avatar_url: interaction.user.displayAvatarURL(),
        roles: ['Player']
      });
    
    return interaction.reply(
      `✅ Verification complete! Account created.\n` +
      `You can now sign in to the website with Discord.`
    );
    
  } catch (error) {
    console.error('Verification error:', error);
    return interaction.reply('❌ An error occurred during verification. Please try again.');
  }
}
```

---

## What This Achieves

### Scenario 1: Admin Creates Player Manually
1. Admin creates player in admin panel: `minecraft_username: "NotchPlayer"`
2. Player verifies on Discord: `/verify NotchPlayer`
3. Bot finds existing user with that Minecraft username
4. Bot **links** Discord account to that player (preserves team, stats, etc.)
5. Player logs in with Discord ✅

### Scenario 2: New Player Verification
1. Player verifies on Discord: `/verify NewPlayer`
2. Bot finds no existing user
3. Bot **creates** new account with `discord-{id}`
4. Player logs in with Discord ✅

### Scenario 3: Re-verification
1. Player already verified, runs `/verify` again
2. Bot finds existing Discord user
3. Bot **updates** their info
4. No duplicate created ✅

---

## Database Table Structure Reference

The `users` table your bot interacts with:

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,              -- Format: 'discord-{discord_id}'
  username TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  minecraft_username TEXT,          -- Verified Minecraft username
  minecraft_user_id TEXT,           -- Minecraft UUID
  team_id TEXT,                     -- Foreign key to teams table
  description TEXT,
  discord_username TEXT,            -- Discord tag (e.g., "User#1234")
  roles TEXT[] DEFAULT ['Player'],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Summary for Bot Developer

**Add this logic to your verification command:**

1. ✅ Check if `discord-{user.id}` exists → Update if found
2. ✅ Check if `minecraft_username` exists → Link if found (create new with Discord ID, delete old)
3. ✅ Create new user if neither exists

This prevents duplicate accounts when admins pre-create players!
