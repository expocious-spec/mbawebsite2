import { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { supabaseAdmin } from "./supabase";
import { getMinecraftHeadshot } from "./minecraft";

// List of Discord user IDs that have admin access
const ADMIN_DISCORD_IDS = process.env.ADMIN_DISCORD_IDS
  ? process.env.ADMIN_DISCORD_IDS
      .split(/[\s,]+/)
      .map((id) => id.replace(/[^0-9]/g, '').trim())
      .filter(Boolean)
  : [];

// Debug: Log environment variables (remove this after debugging)
console.log("Discord Client ID:", process.env.DISCORD_CLIENT_ID);
console.log("Admin IDs:", ADMIN_DISCORD_IDS);

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID || "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
    }),
    /* TODO: Replace Roblox OAuth with Minecraft authentication
    {
      id: "minecraft",
      name: "Minecraft",
      type: "oauth",
      clientId: process.env.MINECRAFT_CLIENT_ID || "",
      clientSecret: process.env.MINECRAFT_CLIENT_SECRET || "",
      // Minecraft OAuth configuration to be implemented
    },
    */
    /*
    // Roblox OAuth provider - replaced with Minecraft
    {
      id: "roblox",
      name: "Roblox",
      type: "oauth",
      clientId: process.env.ROBLOX_CLIENT_ID || "",
      clientSecret: process.env.ROBLOX_CLIENT_SECRET || "",
      authorization: {
        url: "https://apis.roblox.com/oauth/v1/authorize",
        params: {
          scope: "openid profile",
          response_type: "code",
        },
      },
      token: {
        url: "https://apis.roblox.com/oauth/v1/token",
        async request({ client, params, checks, provider }) {
          const tokenUrl = "https://apis.roblox.com/oauth/v1/token";
          const response = await fetch(tokenUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              grant_type: "authorization_code",
              code: params.code as string,
              redirect_uri: params.redirect_uri as string,
              client_id: provider.clientId as string,
              client_secret: provider.clientSecret as string,
            }),
          });

          const tokens = await response.json();
          
          if (!response.ok) {
            console.error("[ROBLOX TOKEN ERROR]", tokens);
            throw new Error(`Token exchange failed: ${JSON.stringify(tokens)}`);
          }
          
          console.log("[ROBLOX TOKEN SUCCESS]", { access_token: tokens.access_token ? "present" : "missing" });
          return { tokens };
        },
      },
      userinfo: "https://apis.roblox.com/oauth/v1/userinfo",
      profile(profile: any) {
        return {
          id: profile.sub,
          name: profile.preferred_username || profile.name,
          email: null,
          image: profile.picture,
        };
      },
    },
    */
  ],
  debug: true,
  callbacks: {
    async signIn({ user, account, profile }) {
      // Discord authentication - works for both admins and players
      if (account?.provider === "discord") {
        const discordId = account.providerAccountId;
        const userId = `discord-${discordId}`; // Bot format: discord-{id}
        const isAdmin = ADMIN_DISCORD_IDS.includes(discordId);
        
        console.log("Discord sign in attempt:", { discordId, userId, isAdmin });

        try {
          // Check if user exists with this Discord ID
          const { data: existingUser } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("id", userId)
            .single();

          // Allow admins to always sign in (for admin panel access)
          if (isAdmin) {
            console.log("Admin user signing in:", userId);
            
            if (!existingUser) {
              // For new admin users, create with Discord info only
              await supabaseAdmin.from("users").insert({
                id: userId,
                username: user.name || "Unknown",
                email: user.email,
                avatar_url: user.image,
                discord_username: user.name,
              });
              console.log("Created new admin user");
            }
            // Allow admin to sign in regardless of minecraft_username status
            return true;
          }

          // PROFILE SYSTEM DISABLED - Block non-admin users from signing in
          // Regular user authentication has been disabled
          // Only admins can sign in for admin panel access
          console.log("Non-admin user blocked from signing in:", userId);
          return false;

          /* // ORIGINAL CODE - Non-admin player authentication (DISABLED)
          // For non-admin players: Must be verified via Discord bot
          // The bot calls /api/bot/link-account to create/link user accounts
          // That endpoint handles checking for existing Minecraft usernames
          
          if (!existingUser) {
            // User doesn't exist with this Discord ID - must verify on Discord
            console.log("User not found - must verify Minecraft on Discord:", userId);
            throw new Error("MINECRAFT_NOT_VERIFIED");
          }

          // Check if user has minecraft_username (indicates Discord bot verification)
          if (!existingUser.minecraft_username) {
            console.log("User exists but no minecraft_username - must verify:", userId);
            throw new Error("MINECRAFT_NOT_VERIFIED");
          }

          // User is verified and has minecraft_username - allow sign in
          console.log("Verified user signing in:", userId, "Minecraft:", existingUser.minecraft_username);
          return true;
          */

        } catch (error: any) {
          console.error("Error in Discord signIn callback:", error);
          
          // If it's our custom verification error, reject sign-in
          if (error.message === "MINECRAFT_NOT_VERIFIED") {
            return false;
          }
          
          // For other errors, still allow sign in to avoid blocking users
          return true;
        }
      }
      
      return false;
    },
    async session({ session, token }) {
      // Add user ID and Discord info to session
      if (token.sub) {
        session.user.id = token.sub;
      }
      if (token.discordId) {
        session.user.discordId = token.discordId as string;
        session.user.isAdmin = ADMIN_DISCORD_IDS.includes(token.discordId as string);
      }
      
      // PROFILE SYSTEM DISABLED - Do not add player data to session for regular users
      // Only admin data is preserved in session
      /* // ORIGINAL CODE (DISABLED)
      // Add player/team data to session - only if user has minecraft_username
      if (token.playerId && token.minecraftUsername) {
        session.user.playerId = token.playerId as string;
        session.user.teamId = token.teamId as string | null;
        session.user.playerName = token.playerName as string;
        session.user.profilePicture = token.profilePicture as string;
        session.user.minecraftUsername = token.minecraftUsername as string;
      }
      */
      
      return session;
    },
    async jwt({ token, account, user }) {
      // Store Discord ID and fetch user data
      if (account?.provider === "discord") {
        const discordId = account.providerAccountId;
        const userId = `discord-${discordId}`;
        const isAdmin = ADMIN_DISCORD_IDS.includes(discordId);
        
        token.discordId = discordId;
        token.userId = userId;
        
        // Fetch user data from database
        try {
          let { data: userData, error } = await supabaseAdmin
            .from("users")
            .select("id, username, team_id, avatar_url, minecraft_username, minecraft_user_id, discord_username")
            .eq("id", userId)
            .single();
          
          // Only create user if they're an admin
          // Regular players must be created by Discord bot verification
          if (error && error.code === 'PGRST116') {
            if (isAdmin) {
              console.log(`[AUTH] Admin user not found, creating for Discord ID: ${discordId}`);
              const discordUser = user as any;
              
              const newUserData = {
                id: userId,
                username: discordUser?.name || `User-${discordId}`,
                discord_username: discordUser?.name || null,
                email: discordUser?.email || null,
                avatar_url: discordUser?.image || null,
                roles: ['Player']
              };
              
              console.log('[AUTH] Attempting to insert admin user:', newUserData);
              
              const { data: newUser, error: createError } = await supabaseAdmin
                .from("users")
                .insert(newUserData)
                .select("id, username, team_id, avatar_url, minecraft_username, minecraft_user_id, discord_username")
                .single();
              
              if (createError) {
                console.error("[AUTH] Error creating admin user:", createError);
                console.error("[AUTH] Error details:", JSON.stringify(createError, null, 2));
              } else {
                console.log("[AUTH] Successfully created admin user:", newUser);
                userData = newUser;
              }
            } else {
              console.log(`[AUTH] Non-admin user not found - they must verify via Discord bot: ${discordId}`);
            }
          } else if (error) {
            console.error("[AUTH] Error fetching user (not PGRST116):", error);
          }
          
          // PROFILE SYSTEM DISABLED - Do not fetch/store player data for regular users
          /* // ORIGINAL CODE (DISABLED)
          // If user exists, update discord_username if it's missing
          if (userData && !userData.discord_username && user) {
            const discordUser = user as any;
            const discordUsername = discordUser?.name;
            
            if (discordUsername) {
              console.log(`[AUTH] Updating discord_username for user ${userId}: ${discordUsername}`);
              const { error: updateError } = await supabaseAdmin
                .from("users")
                .update({ discord_username: discordUsername })
                .eq("id", userId);
              
              if (updateError) {
                console.error("[AUTH] Error updating discord_username:", updateError);
              } else {
                userData.discord_username = discordUsername;
              }
            }
          }
          
          if (userData) {
            token.playerId = userData.id;
            token.teamId = userData.team_id;
            token.playerName = userData.username;
            token.minecraftUsername = userData.minecraft_username;
            // Use Minecraft headshot with UUID - mc-heads.net for better compatibility
            if (userData.minecraft_user_id) {
              const uuid = userData.minecraft_user_id.replace(/-/g, '');
              token.profilePicture = `https://mc-heads.net/avatar/${uuid}/128`;
            } else {
              token.profilePicture = userData.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.username)}&size=128&background=0A0E27&color=00A8E8&bold=true`;
            }
          }
          */
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
      
      return token;
    },
  },
};

// Helper function to check if a Discord ID has admin access
export function isAdminDiscordId(discordId: string): boolean {
  return ADMIN_DISCORD_IDS.includes(discordId);
}

