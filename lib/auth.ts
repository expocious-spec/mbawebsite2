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
        
        console.log("[AUTH] Discord sign in attempt:", { discordId, userId, isAdmin });

        try {
          // STEP 1: Check if Discord account is linked to Minecraft
          const { data: discordLink } = await supabaseAdmin
            .from("bot_discord_links")
            .select("*")
            .eq("discord_id", discordId)
            .single();

          // STEP 2: Verify Discord-Minecraft link exists
          if (!discordLink && !isAdmin) {
            // User hasn't linked their Minecraft account - reject login
            console.log("[AUTH] No Discord link found for:", discordId);
            throw new Error("MINECRAFT_NOT_LINKED");
          }

          // STEP 3: Allow admins to sign in even without Minecraft link
          if (isAdmin) {
            console.log("[AUTH] Admin user signing in:", userId);
            
            // Check if admin user exists in database
            const { data: existingAdmin } = await supabaseAdmin
              .from("users")
              .select("*")
              .eq("id", userId)
              .single();
            
            if (!existingAdmin) {
              // Create new admin user
              await supabaseAdmin.from("users").insert({
                id: userId,
                username: user.name || `Admin-${discordId}`,
                email: user.email,
                avatar_url: user.image,
                discord_username: user.name,
                discord_id: discordId,
                roles: ['Admin'],
              });
              console.log("[AUTH] Created new admin user");
            }
            
            return true; // Allow admin login
          }

          // STEP 4: For regular players - Check if user exists in website database
          const minecraftUsername = discordLink.minecraft_username;
          
          const { data: existingUser } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("minecraft_username", minecraftUsername)
            .single();

          if (existingUser) {
            // STEP 5a: User exists - update their discord_id if changed
            console.log("[AUTH] Existing user found:", existingUser.id);
            
            if (existingUser.discord_id !== discordId) {
              await supabaseAdmin
                .from("users")
                .update({ 
                  discord_id: discordId,
                  discord_username: discordLink.discord_username || user.name 
                })
                .eq("id", existingUser.id);
              
              console.log("[AUTH] Updated discord_id for user:", existingUser.id);
            }
            
            return true; // Allow login to existing account
          }

          // STEP 5b: User doesn't exist - Auto-import from bot database
          console.log("[AUTH] New user - importing from bot database");
          
          // Query bot's users table for full profile data
          const { data: botUser } = await supabaseAdmin
            .from("bot_users")
            .select("*")
            .eq("discord_id", discordId)
            .single();

          // Determine team status
          const teamId = botUser?.team_id || null;
          const teamStatus = teamId ? teamId : "Free Agent";

          // Create new player record in website database
          const newUserData = {
            id: userId,
            username: minecraftUsername,
            minecraft_username: minecraftUsername,
            minecraft_uuid: discordLink.minecraft_uuid,
            minecraft_user_id: discordLink.minecraft_uuid,
            discord_id: discordId,
            discord_username: discordLink.discord_username || user.name,
            team_id: teamId,
            profile_description: "", // Empty - user will fill later
            avatar_url: `https://mc-heads.net/avatar/${discordLink.minecraft_uuid}/128`,
            roles: ['Player'],
            email: user.email,
          };

          const { data: newUser, error: createError } = await supabaseAdmin
            .from("users")
            .insert(newUserData)
            .select()
            .single();

          if (createError) {
            console.error("[AUTH] Error creating new user:", createError);
            throw new Error("USER_CREATION_FAILED");
          }

          console.log("[AUTH] Successfully created new user:", newUser.id);
          return true; // Allow login to new account

        } catch (error: any) {
          console.error("[AUTH] Error in Discord signIn callback:", error);
          
          // Handle specific error cases
          if (error.message === "MINECRAFT_NOT_LINKED") {
            // Redirect to error page with message
            return "/auth/error?error=MinecraftNotLinked";
          }
          
          if (error.message === "USER_CREATION_FAILED") {
            return "/auth/error?error=UserCreationFailed";
          }
          
          // For other errors, block sign-in
          return false;
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
      
      // Add player data to session
      if (token.playerId) {
        session.user.playerId = token.playerId as string;
        session.user.teamId = token.teamId as string | null;
        session.user.playerName = token.playerName as string;
        session.user.profilePicture = token.profilePicture as string;
        session.user.minecraftUsername = token.minecraftUsername as string;
        session.user.profileDescription = token.profileDescription as string;
      }
      
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
            .select("id, username, team_id, avatar_url, minecraft_username, minecraft_user_id, minecraft_uuid, discord_username, profile_description")
            .eq("discord_id", discordId)
            .single();
          
          // If not found by discord_id, try by user id
          if (error && error.code === 'PGRST116') {
            const { data: userDataById } = await supabaseAdmin
              .from("users")
              .select("id, username, team_id, avatar_url, minecraft_username, minecraft_user_id, minecraft_uuid, discord_username, profile_description")
              .eq("id", userId)
              .single();
            
            userData = userDataById;
          }
          
          if (userData) {
            token.playerId = userData.id;
            token.teamId = userData.team_id;
            token.playerName = userData.username;
            token.minecraftUsername = userData.minecraft_username;
            token.profileDescription = userData.profile_description || "";
            
            // Use Minecraft headshot with UUID
            if (userData.minecraft_uuid || userData.minecraft_user_id) {
              const uuid = (userData.minecraft_uuid || userData.minecraft_user_id).replace(/-/g, '');
              token.profilePicture = `https://mc-heads.net/avatar/${uuid}/128`;
            } else {
              token.profilePicture = userData.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.username)}&size=128&background=0A0E27&color=00A8E8&bold=true`;
            }
            
            console.log("[AUTH] Loaded user data for token:", userData.id);
          }
        } catch (error) {
          console.error("[AUTH] Error fetching user data for JWT:", error);
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

