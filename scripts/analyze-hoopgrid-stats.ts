/**
 * Query actual database to find realistic stat thresholds for HoopGrids
 */

// MUST load dotenv FIRST before any other imports
import { config } from 'dotenv';
import { resolve } from 'path';

const result = config({ path: resolve(process.cwd(), '.env.local') });

if (result.error) {
  console.error('Error loading .env.local:', result.error);
  process.exit(1);
}

// Debug: Check if env vars are loaded
console.log('Environment variables loaded from .env.local');
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...');
console.log('SERVICE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET (length: ' + process.env.SUPABASE_SERVICE_ROLE_KEY.length + ')' : 'NOT SET');
console.log('');

// NOW import Supabase after env vars are loaded
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function analyzeStats() {
  if (!supabaseAdmin) {
    console.error('Supabase admin client not available');
    return;
  }

  console.log('\nAnalyzing actual player stats in database...\n');

  // Get all seasons to see what data exists
  const { data: allSeasons, error: seasonsError } = await supabaseAdmin
    .from('seasons')
    .select('season_name, id')
    .order('id', { ascending: false });

  console.log('Available seasons:');
  if (seasonsError) {
    console.error('Error fetching seasons:', seasonsError);
  } else {
    console.log(allSeasons);
  }

  // Check what season values exist in games table
  const { data: gameSeason, error: gamesError } = await supabaseAdmin
    .from('games')
    .select('season')
    .limit(10);

  console.log('\nSample game seasons:');
  if (gamesError) {
    console.error('Error fetching games:', gamesError);
  } else {
    console.log(gameSeason);
  }

  // Get all player season averages 
  // Join game_stats with games to get season info
  const { data: stats, error: statsError } = await supabaseAdmin
    .from('game_stats')
    .select(`
      player_id,
      points,
      rebounds,
      assists,
      steals,
      blocks,
      games!inner(season)
    `);

  if (statsError) {
    console.error('\nError fetching game stats:', statsError);
    return;
  }

  if (!stats || stats.length === 0) {
    console.log('\nNo game stats found at all');
    return;
  }

  console.log(`\nFound ${stats.length} total game stat records`);

  // Show sample of the data
  console.log('\nSample records:');
  console.log(stats.slice(0, 3));

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

  for (const [playerId, stats] of Array.from(playerStats.entries())) {
    if (stats.games > 0) {
      ppgValues.push(stats.totalPoints / stats.games);
      rpgValues.push(stats.totalRebounds / stats.games);
      apgValues.push(stats.totalAssists / stats.games);
      spgValues.push(stats.totalSteals / stats.games);
      bpgValues.push(stats.totalBlocks / stats.games);
    }
  }

  console.log(`\n=== PPG Distribution ===`);
  printDistribution(ppgValues);
  
  console.log(`\n=== RPG Distribution ===`);
  printDistribution(rpgValues);
  
  console.log(`\n=== APG Distribution ===`);
  printDistribution(apgValues);
  
  console.log(`\n=== SPG Distribution ===`);
  printDistribution(spgValues);
  
  console.log(`\n=== BPG Distribution ===`);
  printDistribution(bpgValues);

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total players analyzed: ${playerStats.size}`);
  console.log(`Total game records: ${stats.length}`);
}

function printDistribution(values: number[]) {
  values.sort((a, b) => a - b);
  
  const thresholds = [0.5, 1, 2, 3, 5, 8, 10, 12, 15, 20];
  
  console.log(`Total players: ${values.length}`);
  console.log(`Min: ${values[0]?.toFixed(2) || 0}`);
  console.log(`Max: ${values[values.length - 1]?.toFixed(2) || 0}`);
  console.log(`Median: ${values[Math.floor(values.length / 2)]?.toFixed(2) || 0}`);
  console.log(`\nThreshold counts:`);
  
  for (const threshold of thresholds) {
    const count = values.filter(v => v >= threshold).length;
    const percentage = ((count / values.length) * 100).toFixed(1);
    console.log(`  ${threshold}+: ${count} players (${percentage}%)`);
  }
}

analyzeStats().catch(console.error);
