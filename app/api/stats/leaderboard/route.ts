import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { getMinecraftHeadshot } from '@/lib/minecraft';

const GUILD_ID = process.env.DISCORD_GUILD_ID;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stat = searchParams.get('stat') || 'ppg';
  const limit = parseInt(searchParams.get('limit') || '5');
  const seasonId = searchParams.get('seasonId');

  try {
    // Find the target season
    let targetSeasonId = seasonId;
    if (!targetSeasonId) {
      const { data: activeSeason } = await supabaseAdmin
        .from('seasons')
        .select('id')
        .eq('is_active', true)
        .single();
      targetSeasonId = activeSeason?.id ? String(activeSeason.id) : null;
    }

    // --- FG% leaderboard: aggregate from game_stats joined with games ---
    if (stat === 'fgpct') {
      // Get all game_stats for games in this season
      let gsQuery = supabaseAdmin
        .from('game_stats')
        .select('player_id, field_goals_made, field_goals_attempted, games!inner(season_id)');

      if (targetSeasonId) {
        gsQuery = gsQuery.eq('games.season_id', targetSeasonId);
      }

      const { data: gsData, error: gsError } = await gsQuery;

      if (gsError) {
        console.error('FG% leaderboard error:', gsError);
        return NextResponse.json([]);
      }

      // Aggregate per player
      const fgMap = new Map<string, { made: number; attempted: number }>();
      for (const row of (gsData || [])) {
        const cur = fgMap.get(row.player_id) ?? { made: 0, attempted: 0 };
        cur.made += row.field_goals_made ?? 0;
        cur.attempted += row.field_goals_attempted ?? 0;
        fgMap.set(row.player_id, cur);
      }

      // Filter to players with at least 5 FG attempts
      const playerIds = Array.from(fgMap.entries())
        .filter(([, v]) => v.attempted >= 5)
        .map(([id]) => id);

      if (playerIds.length === 0) return NextResponse.json([]);

      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, username, minecraft_username, minecraft_user_id, avatar_url, team_id')
        .in('id', playerIds);

      const teamIds = (users || []).map(u => u.team_id).filter(Boolean);
      const { data: teams } = teamIds.length
        ? await supabaseAdmin.from('teams').select('id, name').in('id', teamIds)
        : { data: [] };
      const teamMap = new Map((teams || []).map(t => [t.id, t]));

      const result = (users || [])
        .map((user: any) => {
          const fg = fgMap.get(user.id) ?? { made: 0, attempted: 0 };
          const pct = fg.attempted > 0 ? parseFloat(((fg.made / fg.attempted) * 100).toFixed(1)) : 0;
          const team = user.team_id ? teamMap.get(user.team_id) : null;
          return {
            playerId: user.id,
            username: user.username,
            minecraftUsername: user.minecraft_username,
            avatarUrl: user.minecraft_user_id
              ? getMinecraftHeadshot(user.minecraft_user_id, 64)
              : user.avatar_url,
            teamName: team?.name,
            fgpct: pct,
          };
        })
        .sort((a: any, b: any) => b.fgpct - a.fgpct)
        .slice(0, limit);

      return NextResponse.json(result);
    }

    // --- Standard leaderboards (ppg / rpg / apg / spg) from player_season_stats ---
    if (!GUILD_ID) {
      // Fall back to filtering only by season if no guild id
    }

    let query = supabaseAdmin
      .from('player_season_stats')
      .select(`*, users!inner(id, username, minecraft_username, minecraft_user_id, avatar_url, team_id), seasons!inner(id, season_name, is_active)`)
      .gt('games_played', 0);

    if (targetSeasonId) {
      query = query.eq('season_id', targetSeasonId);
    } else if (GUILD_ID) {
      query = query.eq('guild_id', GUILD_ID).eq('seasons.is_active', true);
    }

    const { data, error } = await query.limit(100);

    if (error) {
      console.error('Leaderboard fetch error:', error);
      return NextResponse.json([]);
    }

    if (!data || data.length === 0) return NextResponse.json([]);

    const teamIds = data.map((p: any) => p.users?.team_id).filter(Boolean);
    const { data: teams } = teamIds.length
      ? await supabaseAdmin.from('teams').select('id, name').in('id', teamIds)
      : { data: [] };
    const teamMap = new Map((teams || []).map(t => [t.id, t]));

    const leaderboard = data.map((row: any) => {
      const user = row.users;
      const gp = row.games_played;
      const team = user?.team_id ? teamMap.get(user.team_id) : null;
      return {
        playerId: row.player_id,
        username: user?.username || 'Unknown',
        minecraftUsername: user?.minecraft_username,
        avatarUrl: user?.minecraft_user_id
          ? getMinecraftHeadshot(user.minecraft_user_id, 64)
          : user?.avatar_url,
        teamName: team?.name,
        gamesPlayed: gp,
        ppg: parseFloat((row.total_points / gp).toFixed(1)),
        rpg: parseFloat((row.total_rebounds / gp).toFixed(1)),
        apg: parseFloat((row.total_assists / gp).toFixed(1)),
        spg: parseFloat((row.total_steals / gp).toFixed(1)),
      };
    });

    const sortKey = stat as keyof (typeof leaderboard)[0];
    leaderboard.sort((a: any, b: any) => (b[sortKey] ?? 0) - (a[sortKey] ?? 0));

    return NextResponse.json(leaderboard.slice(0, limit));
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json([]);
  }
}
