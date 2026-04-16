/**
 * API Route to analyze actual player stats for HoopGrids criteria
 * Call this via: http://localhost:3000/api/admin/analyze-stats
 */
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase admin not configured' }, { status: 500 });
  }

  const results: any = {
    seasons: [],
    sampleGames: [],
    totalStats: 0,
    ppg: {},
    rpg: {},
    apg: {},
    spg: {},
    bpg: {},
  };

  // Get all seasons
  const { data: allSeasons } = await supabaseAdmin
    .from('seasons')
    .select('season_name, id, is_current')
    .order('id', { ascending: false });

  results.seasons = allSeasons;

  // Check what season values exist in games table
  const { data: gameSeason } = await supabaseAdmin
    .from('games')
    .select('season')
    .limit(10);

  results.sampleGames = gameSeason;

  // Get all player stats (limit to recent for performance)
  const { data: stats, error } = await supabaseAdmin
    .from('game_stats')
    .select(`
      player_id,
      points,
      rebounds,
      assists,
      steals,
      blocks,
      games!inner(season, team_id)
    `)
    .limit(5000);

  if (error) {
    return NextResponse.json({ error: error.message, results }, { status: 500 });
  }

  if (!stats || stats.length === 0) {
    return NextResponse.json({ error: 'No stats found', results }, { status: 404 });
  }

  results.totalStats = stats.length;
  results.sampleRecords = stats.slice(0, 3);

  // Calculate season averages per player
  interface PlayerSeasonStats {
    games: number;
    totalPoints: number;
    totalRebounds: number;
    totalAssists: number;
    totalSteals: number;
    totalBlocks: number;
  }

  const playerStats = new Map<string, PlayerSeasonStats>();

  for (const stat of stats) {
    const current = playerStats.get(stat.player_id) || {
      games: 0,
      totalPoints: 0,
      totalRebounds: 0,
      totalAssists: 0,
      totalSteals: 0,
      totalBlocks: 0,
    };

    current.games++;
    current.totalPoints += stat.points || 0;
    current.totalRebounds += stat.rebounds || 0;
    current.totalAssists += stat.assists || 0;
    current.totalSteals += stat.steals || 0;
    current.totalBlocks += stat.blocks || 0;

    playerStats.set(stat.player_id, current);
  }

  // Calculate averages
  const ppgValues: number[] = [];
  const rpgValues: number[] = [];
  const apgValues: number[] = [];
  const spgValues: number[] = [];
  const bpgValues: number[] = [];

  for (const [playerId, playerStat] of Array.from(playerStats.entries())) {
    if (playerStat.games > 0) {
      ppgValues.push(playerStat.totalPoints / playerStat.games);
      rpgValues.push(playerStat.totalRebounds / playerStat.games);
      apgValues.push(playerStat.totalAssists / playerStat.games);
      spgValues.push(playerStat.totalSteals / playerStat.games);
      bpgValues.push(playerStat.totalBlocks / playerStat.games);
    }
  }

  results.ppg = analyzeDistribution(ppgValues);
  results.rpg = analyzeDistribution(rpgValues);
  results.apg = analyzeDistribution(apgValues);
  results.spg = analyzeDistribution(spgValues);
  results.bpg = analyzeDistribution(bpgValues);

  return NextResponse.json(results);
}

function analyzeDistribution(values: number[]) {
  values.sort((a, b) => a - b);
  
  const thresholds = [0.5, 1, 2, 3, 5, 8, 10, 12, 15, 20];
  const distribution: any = {
    total: values.length,
    min: values[0] || 0,
    max: values[values.length - 1] || 0,
    median: values[Math.floor(values.length / 2)] || 0,
    thresholds: {},
  };
  
  for (const threshold of thresholds) {
    const count = values.filter(v => v >= threshold).length;
    const percentage = values.length > 0 ? ((count / values.length) * 100).toFixed(1) : '0';
    distribution.thresholds[`${threshold}+`] = { count, percentage: `${percentage}%` };
  }

  return distribution;
}
