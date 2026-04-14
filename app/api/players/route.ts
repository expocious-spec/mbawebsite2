import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { getMinecraftHeadshot } from '@/lib/minecraft';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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

// This endpoint is kept for backward compatibility
// New code should use /api/users instead
export async function GET() {
  try {
    // Debug: Log environment to verify correct Supabase project
    console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('SERVICE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log('SERVICE_KEY first 20 chars:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20));
    
    // Try to fetch with season stats first
    let { data: users, error } = await supabaseAdmin
      .from('users')
      .select('*, player_season_stats(*)')
      .not('minecraft_username', 'is', null)
      .order('username');

    // If that fails, try without season stats
    if (error) {
      console.warn('Error fetching users with season stats:', error);
      console.log('Retrying without season stats...');
      
      const fallback = await supabaseAdmin
        .from('users')
        .select('*')
        .not('minecraft_username', 'is', null)
        .order('username');
      
      users = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error('Error fetching users:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      // Return empty array instead of error to prevent frontend crashes
      return NextResponse.json([]);
    }

    console.log(`Fetched ${users?.length || 0} users from database`);

    // Fetch all game stats for these users
    let gameStatsMap = new Map();
    try {
      const { data: allGameStats } = await supabaseAdmin
        .from('game_stats')
        .select('*')
        .order('date', { ascending: false });
      
      if (allGameStats) {
        // Group game stats by player_id
        allGameStats.forEach(stat => {
          if (!gameStatsMap.has(stat.player_id)) {
            gameStatsMap.set(stat.player_id, []);
          }
          gameStatsMap.get(stat.player_id).push({
            id: stat.id,
            playerId: stat.player_id,
            gameId: stat.game_id,
            date: stat.date,
            opponent: stat.opponent,
            minutes: stat.minutes || 0,
            points: stat.points || 0,
            rebounds: stat.rebounds || 0,
            offensiveRebounds: stat.offensive_rebounds || 0,
            defensiveRebounds: stat.defensive_rebounds || 0,
            assists: stat.assists || 0,
            steals: stat.steals || 0,
            blocks: stat.blocks || 0,
            turnovers: stat.turnovers || 0,
            missesForced: stat.misses_forced || 0,
            fieldGoalsMade: stat.field_goals_made || 0,
            fieldGoalsAttempted: stat.field_goals_attempted || 0,
            threePointersMade: stat.three_pointers_made || 0,
            threePointersAttempted: stat.three_pointers_attempted || 0,
            possessionTime: stat.possession_time || 0,
            result: stat.result || 'L',
          });
        });
      }
    } catch (error) {
      console.warn('Could not fetch game stats:', error);
    }

    // Format users to match expected player format
    const formattedPlayers = (users || []).map((user: any) => {
      // Get current season stats if available
      const currentStats = user.player_season_stats?.[0] || {};
      const userGameStats = gameStatsMap.get(user.id) || [];
      
      return {
        id: user.id,
        displayName: user.username || '',
        minecraftUsername: user.minecraft_username || '',
        minecraftUserId: user.minecraft_user_id || '',
        profilePicture: user.minecraft_user_id 
          ? getMinecraftHeadshot(user.minecraft_user_id, 256)
          : user.avatar_url || getMinecraftHeadshot(null, 256),
        description: user.description || '',
        discordUsername: user.discord_username || '',
        teamId: user.team_id || null,
        roles: user.roles || ['Player'],
        stars: user.stars || 1,
        coinWorth: user.coin_worth ?? 1000,
        stats: {
          gamesPlayed: currentStats.games_played || 0,
          points: parseFloat(currentStats.points || 0),
          rebounds: parseFloat(currentStats.rebounds || 0),
          assists: parseFloat(currentStats.assists || 0),
          steals: parseFloat(currentStats.steals || 0),
          turnovers: parseFloat(currentStats.turnovers || 0),
          fieldGoalsMade: currentStats.field_goals_made || 0,
          fieldGoalsAttempted: currentStats.field_goals_attempted || 0,
          fieldGoalPercentage: parseFloat(currentStats.field_goal_percentage || 0),
          threePointersMade: currentStats.three_pointers_made || 0,
          threePointersAttempted: currentStats.three_pointers_attempted || 0,
          threePointPercentage: parseFloat(currentStats.three_point_percentage || 0),
          freeThrowsMade: currentStats.free_throws_made || 0,
          freeThrowsAttempted: currentStats.free_throws_attempted || 0,
          freeThrowPercentage: parseFloat(currentStats.free_throw_percentage || 0),
          fouls: currentStats.fouls || 0,
          assistTurnoverRatio: 0,
          assistPercentage: 0,
          efficiency: 0,
        },
        gameStats: userGameStats,
      };
    });

    return NextResponse.json(formattedPlayers);
  } catch (error) {
    console.error('Error in players API:', error);
    // Return empty array on any error
    return NextResponse.json([]);
  }
}

// POST - Import player from Minecraft (admin only)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { minecraftUsername, discordUsername, teamId, roles, stars, coinWorth, starRating, playerLevel } = body;

    if (!minecraftUsername) {
      return NextResponse.json({ error: 'Minecraft username is required' }, { status: 400 });
    }

    // Fetch Minecraft UUID from Mojang API
    let minecraftUserId = null;
    let displayName = minecraftUsername;
    
    try {
      const mojangResponse = await fetch(`https://api.mojang.com/users/profiles/minecraft/${minecraftUsername}`);
      if (mojangResponse.ok) {
        const mojangData = await mojangResponse.json();
        minecraftUserId = mojangData.id;
        displayName = mojangData.name; // Use exact capitalization from Mojang
      }
    } catch (error) {
      console.warn('Failed to fetch Minecraft UUID:', error);
    }

    // Generate a temporary user ID (will be replaced when they log in with Discord)
    const tempUserId = `minecraft-${minecraftUsername.toLowerCase()}`;

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('minecraft_username', minecraftUsername)
      .single();

    if (existingUser) {
      return NextResponse.json({ 
        error: 'A player with this Minecraft username already exists' 
      }, { status: 409 });
    }

    // Create user
    const { data: newUser, error: createError } = await supabaseAdmin
      .from('users')
      .insert({
        id: tempUserId,
        username: displayName,
        minecraft_username: minecraftUsername,
        minecraft_user_id: minecraftUserId,
        discord_username: discordUsername || null,
        team_id: teamId || null,
        roles: roles || ['Player'],
        stars: stars || 1,
        coin_worth: coinWorth || 1000,
        star_rating: starRating !== undefined ? starRating : 0,
        player_level: playerLevel || 'mba'
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json({ 
        error: 'Failed to import player',
        details: createError.message 
      }, { status: 500 });
    }

    // Sync team staff roles
    await syncTeamStaffRoles(newUser.id, newUser.team_id, newUser.roles);

    return NextResponse.json({ 
      success: true, 
      data: newUser,
      message: 'Player imported successfully' 
    });

  } catch (error) {
    console.error('Error in POST /api/players:', error);
    return NextResponse.json({ 
      error: 'Failed to import player' 
    }, { status: 500 });
  }
}
