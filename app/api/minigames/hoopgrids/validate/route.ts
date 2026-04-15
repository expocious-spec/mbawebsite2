import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// Validate a guess for a specific cell
export async function POST(request: Request) {
  try {
    const { puzzleId, row, col, playerId, userId } = await request.json();

    if (!puzzleId || row === undefined || col === undefined || !playerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch puzzle
    const { data: puzzle } = await supabaseAdmin
      .from('hoopgrid_puzzles')
      .select('*')
      .eq('id', puzzleId)
      .single();

    if (!puzzle) {
      return NextResponse.json({ error: 'Puzzle not found' }, { status: 404 });
    }

    // Get column and row criteria
    const colType = puzzle[`column${col + 1}_type`];
    const colValue = puzzle[`column${col + 1}_value`];
    const rowType = puzzle[`row${row + 1}_type`];
    const rowValue = puzzle[`row${row + 1}_value`];

    // Validate the guess
    const isValid = await validatePlayerForCell(playerId, colType, colValue, rowType, rowValue);

    // Calculate rarity (how many others guessed this player for ANY cell today)
    const { count } = await supabaseAdmin
      .from('hoopgrid_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('puzzle_id', puzzleId)
      .eq('guessed_player_id', playerId)
      .eq('is_correct', true);

    const rarity = count || 0;

    // Store the attempt
    if (userId) {
      await supabaseAdmin
        .from('hoopgrid_attempts')
        .insert({
          puzzle_id: puzzleId,
          user_id: userId,
          cell_row: row,
          cell_col: col,
          guessed_player_id: playerId,
          is_correct: isValid,
        });
    }

    return NextResponse.json({
      isValid,
      rarity,
      playerId,
    });
  } catch (error) {
    console.error('Error validating guess:', error);
    return NextResponse.json({ error: 'Validation failed' }, { status: 500 });
  }
}

async function validatePlayerForCell(
  playerId: string,
  colType: string,
  colValue: string,
  rowType: string,
  rowValue: string
): Promise<boolean> {
  // Validate column criteria (usually team)
  const columnValid = await validateCriteria(playerId, colType, colValue);
  if (!columnValid) return false;

  // Validate row criteria
  const rowValid = await validateCriteria(playerId, rowType, rowValue);
  return rowValid;
}

async function validateCriteria(playerId: string, type: string, value: string): Promise<boolean> {
  switch (type) {
    case 'team':
      return await validateTeam(playerId, value);
    
    case 'stat_threshold':
      return await validateStatThreshold(playerId, value);
    
    case 'accolade':
      return await validateAccolade(playerId, value);
    
    case 'seasons_count':
      return await validateSeasonsWithTeam(playerId, parseInt(value));
    
    case 'transaction':
      return await validateTransaction(playerId, value);
    
    case 'multiple_teams':
      return await validateMultipleTeams(playerId, parseInt(value));
    
    default:
      return false;
  }
}

async function validateTeam(playerId: string, teamId: string): Promise<boolean> {
  // Check if player ever played for this team (current team OR transactions)
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('team_id')
    .eq('id', playerId)
    .single();

  if (user?.team_id === teamId) return true;

  // Check transaction history
  const { data: transactions } = await supabaseAdmin
    .from('transaction_history')
    .select('to_team_id, from_team_id')
    .eq('player_id', playerId);

  return transactions?.some(t => 
    t.to_team_id === teamId || t.from_team_id === teamId
  ) || false;
}

async function validateStatThreshold(playerId: string, threshold: string): Promise<boolean> {
  // Parse threshold (e.g., 'ppg_15' means 15+ PPG)
  const [stat, valueStr] = threshold.split('_');
  const thresholdValue = parseFloat(valueStr);

  // Get all game stats for player
  const { data: gameStats } = await supabaseAdmin
    .from('game_stats')
    .select('points, rebounds, assists, game_id')
    .eq('player_id', playerId);

  if (!gameStats || gameStats.length === 0) return false;

  // Get games to group by season
  const gameIds = gameStats.map(gs => gs.game_id);
  const { data: games } = await supabaseAdmin
    .from('games')
    .select('id, season')
    .in('id', gameIds);

  if (!games) return false;

  // Group by season and calculate averages
  const seasonMap = new Map<string, { total: number; games: number }>();
  const gameSeasonMap = new Map(games.map(g => [g.id, g.season]));

  for (const gs of gameStats) {
    const season = gameSeasonMap.get(gs.game_id);
    if (!season) continue;

    const statValue = stat === 'ppg' ? gs.points : 
                     stat === 'rpg' ? gs.rebounds :
                     stat === 'apg' ? gs.assists : 0;

    const current = seasonMap.get(season) || { total: 0, games: 0 };
    current.total += statValue || 0;
    current.games += 1;
    seasonMap.set(season, current);
  }

  // Check if any season meets the threshold
  for (const [_, data] of Array.from(seasonMap.entries())) {
    const average = data.total / data.games;
    if (average >= thresholdValue) return true;
  }

  return false;
}

async function validateAccolade(playerId: string, accolade: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('accolades')
    .select('id')
    .eq('player_id', playerId)
    .eq('accolade_type', accolade)
    .limit(1);

  return (data?.length || 0) > 0;
}

async function validateSeasonsWithTeam(playerId: string, minSeasons: number): Promise<boolean> {
  // This requires team context - will be checked against column team
  // Get all game_stats grouped by season for this player
  const { data: gameStats } = await supabaseAdmin
    .from('game_stats')
    .select('game_id, team_id')
    .eq('player_id', playerId);

  if (!gameStats) return false;

  // Get games to find seasons
  const gameIds = gameStats.map(gs => gs.game_id);
  const { data: games } = await supabaseAdmin
    .from('games')
    .select('id, season')
    .in('id', gameIds);

  if (!games) return false;

  const gameSeasonMap = new Map(games.map(g => [g.id, g.season]));
  const teamSeasons = new Set<string>();

  for (const gs of gameStats) {
    const season = gameSeasonMap.get(gs.game_id);
    if (season && gs.team_id) {
      teamSeasons.add(`${gs.team_id}-${season}`);
    }
  }

  // Count unique seasons per team
  const seasonsByTeam = new Map<string, Set<string>>();
  for (const teamSeason of teamSeasons) {
    const [teamId, season] = teamSeason.split('-');
    if (!seasonsByTeam.has(teamId)) {
      seasonsByTeam.set(teamId, new Set());
    }
    seasonsByTeam.get(teamId)!.add(season);
  }

  // Check if any team has minSeasons+
  for (const [_, seasons] of Array.from(seasonsByTeam.entries())) {
    if (seasons.size >= minSeasons) return true;
  }

  return false;
}

async function validateTransaction(playerId: string, transactionType: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('transaction_history')
    .select('id')
    .eq('player_id', playerId)
    .eq('transaction_type', transactionType)
    .limit(1);

  return (data?.length || 0) > 0;
}

async function validateMultipleTeams(playerId: string, minTeams: number): Promise<boolean> {
  const teams = new Set<string>();

  // Current team
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('team_id')
    .eq('id', playerId)
    .single();

  if (user?.team_id) teams.add(user.team_id);

  // Transaction history
  const { data: transactions } = await supabaseAdmin
    .from('transaction_history')
    .select('to_team_id, from_team_id')
    .eq('player_id', playerId);

  transactions?.forEach(t => {
    if (t.to_team_id) teams.add(t.to_team_id);
    if (t.from_team_id) teams.add(t.from_team_id);
  });

  return teams.size >= minTeams;
}
