import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { getMinecraftHeadshot } from '@/lib/minecraft';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stat = searchParams.get('stat') || 'ppg';
  const limit = parseInt(searchParams.get('limit') || '5');
  const seasonId = searchParams.get('seasonId');

  try {
    // Step 1: Find the target season name (text) that matches games.season
    let targetSeasonName: string | null = null;
    if (seasonId) {
      const { data: s } = await supabaseAdmin
        .from('seasons')
        .select('season_name')
        .eq('id', seasonId)
        .single();
      targetSeasonName = s?.season_name ?? null;
    } else {
      const { data: s } = await supabaseAdmin
        .from('seasons')
        .select('season_name')
        .eq('is_active', true)
        .single();
      targetSeasonName = s?.season_name ?? null;
    }

    // Step 2: Get completed game IDs for that season (same as stats page logic)
    let seasonGameIds: Set<number> | null = null;
    if (targetSeasonName) {
      const { data: games } = await supabaseAdmin
        .from('games')
        .select('id')
        .eq('season', targetSeasonName)
        .eq('status', 'completed');
      if (games && games.length > 0) {
        seasonGameIds = new Set(games.map((g: any) => g.id));
      }
    }
    // If no season found or no games in season, fall back to all completed games
    if (!seasonGameIds) {
      const { data: games } = await supabaseAdmin
        .from('games')
        .select('id')
        .eq('status', 'completed');
      if (games && games.length > 0) {
        seasonGameIds = new Set(games.map((g: any) => g.id));
      }
    }

    if (!seasonGameIds || seasonGameIds.size === 0) return NextResponse.json([]);

    // Step 3: Fetch all game_stats (same as /api/players does)
    const { data: allGameStats, error: gsError } = await supabaseAdmin
      .from('game_stats')
      .select('player_id, points, rebounds, assists, steals, blocks, field_goals_made, field_goals_attempted, game_id');

    if (gsError || !allGameStats || allGameStats.length === 0) return NextResponse.json([]);

    // Step 4: Aggregate per player for games in target season
    const agg = new Map<string, { pts: number; reb: number; ast: number; stl: number; fgm: number; fga: number; gp: number }>();
    for (const row of allGameStats) {
      if (!seasonGameIds.has(row.game_id)) continue;
      const cur = agg.get(row.player_id) ?? { pts: 0, reb: 0, ast: 0, stl: 0, fgm: 0, fga: 0, gp: 0 };
      cur.pts += row.points ?? 0;
      cur.reb += row.rebounds ?? 0;
      cur.ast += row.assists ?? 0;
      cur.stl += row.steals ?? 0;
      cur.fgm += row.field_goals_made ?? 0;
      cur.fga += row.field_goals_attempted ?? 0;
      cur.gp += 1;
      agg.set(row.player_id, cur);
    }

    if (agg.size === 0) return NextResponse.json([]);

    // Step 5: Fetch user info
    const playerIds = Array.from(agg.keys());
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, username, minecraft_username, minecraft_user_id, avatar_url, team_id')
      .in('id', playerIds);

    const userMap = new Map((users || []).map((u: any) => [u.id, u]));
    const teamIds = [...new Set((users || []).map((u: any) => u.team_id).filter(Boolean))];
    const { data: teams } = teamIds.length
      ? await supabaseAdmin.from('teams').select('id, name').in('id', teamIds)
      : { data: [] };
    const teamMap = new Map((teams || []).map((t: any) => [t.id, t]));

    // Step 6: Build and sort leaderboard
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
