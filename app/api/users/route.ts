import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const GUILD_ID = process.env.DISCORD_GUILD_ID;

// Helper function to sync team staff roles
async function syncTeamStaffRoles(userId: string, teamId: string | null, roles: string[], previousRoles: string[] = []) {
  if (!teamId) {
    // If no team, remove all team staff entries for this user
    await supabaseAdmin
      .from('team_staff')
      .delete()
      .eq('player_id', userId);
    return;
  }

  const teamRoles = ['Franchise Owner', 'Head Coach', 'Assistant Coach', 'General Manager'];
  const userTeamRoles = roles.filter(role => teamRoles.includes(role));
  const previousTeamRoles = previousRoles.filter(role => teamRoles.includes(role));

  // Determine which roles were added and which were removed
  const addedRoles = userTeamRoles.filter(role => !previousTeamRoles.includes(role));
  const removedRoles = previousTeamRoles.filter(role => !userTeamRoles.includes(role));

  // Remove existing team staff entries for this player on this team
  await supabaseAdmin
    .from('team_staff')
    .delete()
    .eq('player_id', userId)
    .eq('team_id', teamId);

  // Add new team staff entries for each team role
  if (userTeamRoles.length > 0) {
    const staffEntries = userTeamRoles.map(role => ({
      team_id: teamId,
      player_id: userId,
      role: role,
    }));

    await supabaseAdmin
      .from('team_staff')
      .insert(staffEntries);
  }

  // Create transaction records for role changes
  try {
    // Get user and team info for transaction description
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('username')
      .eq('id', userId)
      .single();

    const { data: team } = await supabaseAdmin
      .from('teams')
      .select('name')
      .eq('id', teamId)
      .single();

    if (user && team) {
      const transactions = [];

      // Create transactions for added roles (promotions)
      for (const role of addedRoles) {
        const isPromotion = previousTeamRoles.length === 0 || 
          (role === 'Franchise Owner' || role === 'Head Coach') && 
          !previousTeamRoles.includes('Franchise Owner') && 
          !previousTeamRoles.includes('Head Coach');

        transactions.push({
          type: 'role_assignment',
          player_id: userId,
          team_id: teamId,
          title: isPromotion ? 'Promotion' : 'Role Assignment',
          description: `${user.username} has been appointed ${role} of the ${team.name}`,
          role: role,
          status: 'completed',
          completed_at: new Date().toISOString(),
        });
      }

      // Create transactions for removed roles (demotions)
      for (const role of removedRoles) {
        const isDemotion = userTeamRoles.length === 0 || 
          (role === 'Franchise Owner' || role === 'Head Coach') &&
          !userTeamRoles.includes('Franchise Owner') &&
          !userTeamRoles.includes('Head Coach');

        transactions.push({
          type: 'role_assignment',
          player_id: userId,
          team_id: teamId,
          title: isDemotion ? 'Demotion' : 'Role Removed',
          description: `${user.username} has been removed from ${role} of the ${team.name}`,
          previous_role: role,
          status: 'completed',
          completed_at: new Date().toISOString(),
        });
      }

      // Insert all transactions
      if (transactions.length > 0) {
        await supabaseAdmin
          .from('transactions')
          .insert(transactions);
      }
    }
  } catch (error) {
    console.error('Error creating role change transactions:', error);
    // Don't fail the whole operation if transaction recording fails
  }
}

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
              totalTurnovers: 0,
            });
          }
          const current = statsMap.get(stat.player_id);
          current.gamesPlayed += stat.games_played;
          current.totalPoints += stat.total_points;
          current.totalRebounds += stat.total_rebounds;
          current.totalAssists += stat.total_assists;
          current.totalSteals += stat.total_steals;
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
        stars: user.stars || 1,
        coinWorth: user.coin_worth || 1000,
        stats: {
          gamesPlayed: stats.gamesPlayed,
          points: parseFloat((stats.totalPoints / gp).toFixed(1)),
          rebounds: parseFloat((stats.totalRebounds / gp).toFixed(1)),
          assists: parseFloat((stats.totalAssists / gp).toFixed(1)),
          steals: parseFloat((stats.totalSteals / gp).toFixed(1)),
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

    // Sync team staff roles
    await syncTeamStaffRoles(data.id, data.team_id, data.roles);

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

    // Fetch existing user to get previous roles
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('roles, team_id')
      .eq('id', body.id)
      .single();

    // Build update object with only provided fields
    const updates: any = {};
    if (body.username !== undefined) updates.username = body.username;
    if (body.minecraftUsername !== undefined) updates.minecraft_username = body.minecraftUsername;
    if (body.teamId !== undefined) {
      // Only set team_id if it's a valid non-empty value, otherwise set to null
      updates.team_id = body.teamId && body.teamId.trim() !== '' ? body.teamId : null;
    }
    if (body.roles !== undefined) updates.roles = body.roles;
    if (body.description !== undefined) updates.description = body.description;
    if (body.discordUsername !== undefined) updates.discord_username = body.discordUsername;
    if (body.stars !== undefined) updates.stars = body.stars;
    if (body.coinWorth !== undefined) updates.coin_worth = body.coinWorth;

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

    // Sync team staff roles if roles or team_id were updated
    if (updates.roles !== undefined || updates.team_id !== undefined) {
      const previousRoles = existingUser?.roles || [];
      await syncTeamStaffRoles(data.id, data.team_id, data.roles, previousRoles);
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
