import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { getMinecraftHeadshot } from '@/lib/minecraft';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stat = searchParams.get('stat') || 'ppg';
  const limit = parseInt(searchParams.get('limit') || '5');
  const seasonId = searchParams.get('seasonId');

  try {
    // Find the target season_id
    let targetSeasonId: string | null = seasonId;
    if (!targetSeasonId) {
      const { data: activeSeason } = await supabaseAdmin
        .from('seasons')
        .select('id')
        .eq('is_active', true)
        .single();
      targetSeasonId = activeSeason?.id ? String(activeSeason.id) : null;
    }

    // Fetch game IDs for the target season
    let gameIds: Set<number> = new Set();
    if (targetSeasonId) {
      const { data: seasonGames } = await supabaseAdmin
        .from('games')
        .select('id')
        .eq('season_id', targetSeasonId)
        .eq('status', 'completed');
      (seasonGames || []).forEach((g: any) => gameIds.add(g.id));
    } else {
      // Fallback: all completed games
      const { data: allGames } = await supabaseAdmin
        .from('games')
        .select('id')
        .eq('status', 'completed');
      (allGames || []).forEach((g: any) => gameIds.add(g.id));
    }

    if (gameIds.size === 0) return NextResponse.json([]);

    // Fetch game_stats for those game IDs
    const { data: gameStats, error: gsError } = await supabaseAdmin
      .from('game_stats')
      .select('player_id, points, rebounds, assists, steals, blocks, field_goals_made, field_goals_attempted, game_id')
      .in('game_id', Array.from(gameIds));

    if (gsError || !gameStats || gameStats.length === 0) return NextResponse.json([]);

    // Aggregate per player
    const agg = new Map<string, {
      pts: number; reb: number; ast: number; stl: number; blk: number;
      fgm: number; fga: number; gp: number;
    }>();

    for (const row of gameStats) {
      const cur = agg.get(row.player_id) ?? { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, fgm: 0, fga: 0, gp: 0 };
      cur.pts += row.points ?? 0;
      cur.reb += row.rebounds ?? 0;
      cur.ast += row.assists ?? 0;
      cur.stl += row.steals ?? 0;
      cur.blk += row.blocks ?? 0;
      cur.fgm += row.field_goals_made ?? 0;
      cur.fga += row.field_goals_attempted ?? 0;
      cur.gp += 1;
      agg.set(row.player_id, cur);
    }

    // Fetch users for all player IDs
    const playerIds = Array.from(agg.keys());
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, username, minecraft_username, minecraft_user_id, avatar_url, team_id')
      .in('id', playerIds);

    const userMap = new Map((users || []).map((u: any) => [u.id, u]));

    // Fetch teams
    const teamIds = [...new Set((users || []).map((u: any) => u.team_id).filter(Boolean))];
    const { data: teams } = teamIds.length
      ? await supabaseAdmin.from('teams').select('id, name').in('id', teamIds)
      : { data: [] };
    const teamMap = new Map((teams || []).map((t: any) => [t.id, t]));

    // Build leaderboard entries
    const rows = playerIds
      .map(pid => {
        const s = agg.get(pid)!;
        const user = userMap.get(pid);
        if (!user || s.gp === 0) return null;
        const team = user.team_id ? teamMap.get(user.team_id) : null;
        const fgpct = s.fga >= 5 ? parseFloat(((s.fgm / s.fga) * 100).toFixed(1)) : null;
        return {
          playerId: pid,
          username: user.username,
          minecraftUsername: user.minecraft_username,
          avatarUrl: user.minecraft_user_id
            ? getMinecraftHeadshot(user.minecraft_user_id, 64)
            : user.avatar_url,
          teamName: team?.name,
          ppg: parseFloat((s.pts / s.gp).toFixed(1)),
          rpg: parseFloat((s.reb / s.gp).toFixed(1)),
          apg: parseFloat((s.ast / s.gp).toFixed(1)),
          spg: parseFloat((s.stl / s.gp).toFixed(1)),
          fgpct,
        };
      })
      .filter(Boolean) as any[];

    // Sort by requested stat, filter nulls for fgpct
    const sorted = rows
      .filter(r => stat !== 'fgpct' || r.fgpct !== null)
      .sort((a, b) => (b[stat] ?? 0) - (a[stat] ?? 0))
      .slice(0, limit);

    return NextResponse.json(sorted);
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json([]);
  }
}
