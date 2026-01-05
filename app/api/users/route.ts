import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

const GUILD_ID = process.env.DISCORD_GUILD_ID;

// GET all users with their team and stats
export async function GET() {
  try {
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select(`
        *,
        teams(id, name, team_logo_url, team_logo_emoji, conference, wins, losses)
      `)
      .order('username');

    if (error) {
      console.error('Users fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch season stats if guild ID is configured
    let statsMap = new Map();
    if (GUILD_ID) {
      const { data: seasonStats } = await supabaseAdmin
        .from('player_season_stats')
        .select('*')
        .eq('guild_id', GUILD_ID);

      if (seasonStats) {
        seasonStats.forEach(stat => {
          if (!statsMap.has(stat.player_id)) {
            statsMap.set(stat.player_id, {
              gamesPlayed: 0,
              totalPoints: 0,
              totalRebounds: 0,
              totalAssists: 0,
              totalSteals: 0,
              totalBlocks: 0,
              totalTurnovers: 0,
            });
          }
          const current = statsMap.get(stat.player_id);
          current.gamesPlayed += stat.games_played;
          current.totalPoints += stat.total_points;
          current.totalRebounds += stat.total_rebounds;
          current.totalAssists += stat.total_assists;
          current.totalSteals += stat.total_steals;
          current.totalBlocks += stat.total_blocks;
          current.totalTurnovers += stat.total_turnovers;
        });
      }
    }

    // Format response
    const formattedUsers = users?.map(user => {
      const stats = statsMap.get(user.id) || {
        gamesPlayed: 0,
        totalPoints: 0,
        totalRebounds: 0,
        totalAssists: 0,
        totalSteals: 0,
        totalBlocks: 0,
        totalTurnovers: 0,
      };

      const gp = stats.gamesPlayed || 1; // Prevent division by zero

      return {
        id: user.id,
        displayName: user.username,
        minecraftUsername: user.minecraft_username,
        minecraftUserId: user.minecraft_user_id,
        profilePicture: user.avatar_url,
        description: user.description,
        discordUsername: user.discord_username,
        teamId: user.team_id,
        teamName: user.teams?.name,
        teamLogo: user.teams?.team_logo_url || user.teams?.team_logo_emoji,
        roles: user.roles || ['Player'],
        stats: {
          gamesPlayed: stats.gamesPlayed,
          points: parseFloat((stats.totalPoints / gp).toFixed(1)),
          rebounds: parseFloat((stats.totalRebounds / gp).toFixed(1)),
          assists: parseFloat((stats.totalAssists / gp).toFixed(1)),
          steals: parseFloat((stats.totalSteals / gp).toFixed(1)),
          blocks: parseFloat((stats.totalBlocks / gp).toFixed(1)),
          turnovers: parseFloat((stats.totalTurnovers / gp).toFixed(1)),
        },
      };
    }) || [];

    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error('Users API error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST create new user (admin only)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.discordId) {
      return NextResponse.json(
        { error: 'Discord ID is required' },
        { status: 400 }
      );
    }

    const userId = `discord-${body.discordId}`;

    // Check if user already exists
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    // Create new user
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        username: body.username || body.minecraftUsername || 'Unknown',
        minecraft_username: body.minecraftUsername,
        minecraft_user_id: body.minecraftUserId,
        avatar_url: body.avatarUrl,
        description: body.description,
        discord_username: body.discordUsername,
        team_id: body.teamId || null,
        roles: body.roles || ['Player'],
      })
      .select()
      .single();

    if (error) {
      console.error('User creation error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('POST users error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

// PUT update user (admin only)
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    if (!body.id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Build update object with only provided fields
    const updates: any = {};
    if (body.username !== undefined) updates.username = body.username;
    if (body.teamId !== undefined) updates.team_id = body.teamId;
    if (body.roles !== undefined) updates.roles = body.roles;
    if (body.description !== undefined) updates.description = body.description;
    if (body.discordUsername !== undefined) updates.discord_username = body.discordUsername;

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', body.id)
      .select()
      .single();

    if (error) {
      console.error('User update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('PUT users error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE user (admin only)
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      console.error('User deletion error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('DELETE users error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
