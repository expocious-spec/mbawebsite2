import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

const GUILD_ID = process.env.DISCORD_GUILD_ID;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stat = searchParams.get('stat') || 'ppg';
  const limit = parseInt(searchParams.get('limit') || '10');

  if (!GUILD_ID) {
    return NextResponse.json({ error: 'Guild ID not configured' }, { status: 500 });
  }

  try {
    // Fetch player season stats with user and team data
    const { data, error } = await supabaseAdmin
      .from('player_season_stats')
      .select(`
        *,
        users!inner(id, username, avatar_url, minecraft_username, team_id),
        seasons!inner(id, season_name, is_active)
      `)
      .eq('guild_id', GUILD_ID)
      .eq('seasons.is_active', true)
      .gt('games_played', 0)
      .order('total_points', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Leaderboard fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch team data separately for players that have teams
    const teamIds = data
      .map((p: any) => p.users?.team_id)
      .filter((id: string | null) => id != null);

    const { data: teams } = await supabaseAdmin
      .from('teams')
      .select('id, name, team_logo_url, team_logo_emoji')
      .in('id', teamIds);

    const teamMap = new Map(teams?.map(t => [t.id, t]) || []);

    // Calculate averages and format response
    const leaderboard = data.map((stat: any) => {
      const user = stat.users;
      const team = user?.team_id ? teamMap.get(user.team_id) : null;

      return {
        playerId: stat.player_id,
        username: user?.username || 'Unknown',
        minecraftUsername: user?.minecraft_username,
        avatarUrl: user?.avatar_url,
        teamId: user?.team_id,
        teamName: team?.name,
        teamLogo: team?.team_logo_url || team?.team_logo_emoji,
        gamesPlayed: stat.games_played,
        totalPoints: stat.total_points,
        totalRebounds: stat.total_rebounds,
        totalAssists: stat.total_assists,
        totalSteals: stat.total_steals,
        totalTurnovers: stat.total_turnovers,
        totalPossessionTime: stat.total_possession_time,
        ppg: parseFloat((stat.total_points / stat.games_played).toFixed(1)),
        rpg: parseFloat((stat.total_rebounds / stat.games_played).toFixed(1)),
        apg: parseFloat((stat.total_assists / stat.games_played).toFixed(1)),
        spg: parseFloat((stat.total_steals / stat.games_played).toFixed(1)),
        tpg: parseFloat((stat.total_turnovers / stat.games_played).toFixed(1)),
        ptpg: parseFloat((stat.total_possession_time / stat.games_played).toFixed(1)),
      };
    });

    // Sort by requested stat
    const statMap: { [key: string]: string } = {
      ppg: 'ppg',
      rpg: 'rpg',
      apg: 'apg',
      spg: 'spg',
      tpg: 'tpg',
      ptpg: 'ptpg',
    };

    const sortKey = statMap[stat] || 'ppg';
    leaderboard.sort((a: any, b: any) => b[sortKey] - a[sortKey]);

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
