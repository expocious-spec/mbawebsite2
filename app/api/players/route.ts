import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

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
      .order('username');

    // If that fails, try without season stats
    if (error) {
      console.warn('Error fetching users with season stats:', error);
      console.log('Retrying without season stats...');
      
      const fallback = await supabaseAdmin
        .from('users')
        .select('*')
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

    // Format users to match expected player format
    const formattedPlayers = (users || []).map((user: any) => {
      // Get current season stats if available
      const currentStats = user.player_season_stats?.[0] || {};
      
      return {
        id: user.id,
        displayName: user.username || '',
        minecraftUsername: user.minecraft_username || '',
        minecraftUserId: user.minecraft_user_id || '',
        profilePicture: user.avatar_url || '',
        description: user.description || '',
        discordUsername: user.discord_username || '',
        teamId: user.team_id || null,
        roles: user.roles || ['Player'],
        stats: {
          gamesPlayed: currentStats.games_played || 0,
          points: parseFloat(currentStats.points || 0),
          rebounds: parseFloat(currentStats.rebounds || 0),
          assists: parseFloat(currentStats.assists || 0),
          steals: parseFloat(currentStats.steals || 0),
          blocks: parseFloat(currentStats.blocks || 0),
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
        gameStats: [],
      };
    });

    return NextResponse.json(formattedPlayers);
  } catch (error) {
    console.error('Error in players API:', error);
    // Return empty array on any error
    return NextResponse.json([]);
  }
}
