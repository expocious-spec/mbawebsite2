import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Bot API Endpoint: Link Discord account to existing Minecraft player
 * 
 * This endpoint is called by the Discord bot when a user verifies their Minecraft username.
 * It checks if a user already exists with that Minecraft username:
 * - If yes: Updates the existing user with Discord info
 * - If no: Creates a new user
 * 
 * Expected body:
 * {
 *   discord_id: string,
 *   discord_username: string,
 *   minecraft_username: string,
 *   minecraft_user_id: string,
 *   avatar_url?: string,
 *   team_id?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      discord_id,
      discord_username,
      minecraft_username,
      minecraft_user_id,
      avatar_url,
      team_id,
    } = body;

    // Validate required fields
    if (!discord_id || !minecraft_username || !minecraft_user_id) {
      return NextResponse.json(
        { error: "Missing required fields: discord_id, minecraft_username, minecraft_user_id" },
        { status: 400 }
      );
    }

    const userId = `discord-${discord_id}`;

    // First, check if a user already exists with this Discord ID
    const { data: existingDiscordUser } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (existingDiscordUser) {
      // User already exists with this Discord ID
      // Update their info (in case something changed)
      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from("users")
        .update({
          minecraft_username,
          minecraft_user_id,
          discord_username,
          avatar_url: avatar_url || existingDiscordUser.avatar_url,
          team_id: team_id || existingDiscordUser.team_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select()
        .single();

      if (updateError) {
        console.error("[BOT API] Error updating existing Discord user:", updateError);
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        action: "updated",
        user: updatedUser,
        message: "Updated existing Discord account with Minecraft info",
      });
    }

    // User doesn't exist with this Discord ID
    // Check if there's an existing user with this Minecraft username
    const { data: existingMinecraftUser } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("minecraft_username", minecraft_username)
      .single();

    if (existingMinecraftUser) {
      // Found an existing user with this Minecraft username
      // This might be a manually created account - we need to link it
      
      // First, delete the old user record (to free up the minecraft_username)
      const oldUserId = existingMinecraftUser.id;
      
      // Create new user with Discord ID but preserve existing data
      const { data: newUser, error: createError } = await supabaseAdmin
        .from("users")
        .insert({
          id: userId, // Use new Discord ID format
          username: existingMinecraftUser.username || discord_username || minecraft_username,
          email: existingMinecraftUser.email,
          avatar_url: avatar_url || existingMinecraftUser.avatar_url,
          minecraft_username,
          minecraft_user_id,
          team_id: team_id || existingMinecraftUser.team_id,
          description: existingMinecraftUser.description,
          discord_username,
          roles: existingMinecraftUser.roles || ['Player'],
          created_at: existingMinecraftUser.created_at, // Preserve original creation date
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error("[BOT API] Error creating linked user:", createError);
        return NextResponse.json({ error: "Failed to link account" }, { status: 500 });
      }

      // Now delete the old user record
      const { error: deleteError } = await supabaseAdmin
        .from("users")
        .delete()
        .eq("id", oldUserId);

      if (deleteError) {
        console.error("[BOT API] Error deleting old user record:", deleteError);
        // Don't fail the request - the new user was created successfully
      }

      return NextResponse.json({
        success: true,
        action: "linked",
        user: newUser,
        message: `Linked Discord account to existing Minecraft player: ${minecraft_username}`,
        old_user_id: oldUserId,
      });
    }

    // No existing user found - create a new one
    const { data: newUser, error: createError } = await supabaseAdmin
      .from("users")
      .insert({
        id: userId,
        username: discord_username || minecraft_username,
        minecraft_username,
        minecraft_user_id,
        discord_username,
        avatar_url,
        team_id: team_id || null,
        roles: ['Player'],
      })
      .select()
      .single();

    if (createError) {
      console.error("[BOT API] Error creating new user:", createError);
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      action: "created",
      user: newUser,
      message: "Created new user account",
    });

  } catch (error) {
    console.error("[BOT API] Error in link-account endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to check if a Minecraft username is already taken
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const minecraft_username = searchParams.get("minecraft_username");

  if (!minecraft_username) {
    return NextResponse.json(
      { error: "Missing minecraft_username parameter" },
      { status: 400 }
    );
  }

  try {
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id, username, minecraft_username, discord_username, team_id")
      .eq("minecraft_username", minecraft_username)
      .single();

    if (existingUser) {
      return NextResponse.json({
        exists: true,
        user: existingUser,
      });
    }

    return NextResponse.json({
      exists: false,
    });

  } catch (error) {
    console.error("[BOT API] Error checking Minecraft username:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
