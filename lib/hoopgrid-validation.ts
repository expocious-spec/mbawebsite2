import { supabaseAdmin } from '@/lib/supabase';

// Validate that a criterion has at least minMatches valid players
export async function validateCriterionHasPlayers(
  type: string,
  value: string,
  minMatches: number = 3
): Promise<boolean> {
  try {
    let validPlayerCount = 0;

    switch (type) {
      case 'stat_threshold':
        validPlayerCount = await countPlayersWithStatThreshold(value);
        break;
      
      case 'accolade':
        const { data } = await supabaseAdmin
          .from('accolades')
          .select('player_id')
          .eq('accolade_type', value);
        validPlayerCount = new Set(data?.map(a => a.player_id) || []).size;
        break;
      
      case 'seasons_count':
        validPlayerCount = await countPlayersWithSeasons(parseInt(value));
        break;
      
      case 'transaction':
        const { data: trans } = await supabaseAdmin
          .from('transaction_history')
          .select('player_id')
          .ilike('transaction_type', `%${value}%`);
        validPlayerCount = new Set(trans?.map(t => t.player_id) || []).size;
        break;
      
      case 'multiple_teams':
        validPlayerCount = await countPlayersWithMultipleTeams(parseInt(value));
        break;
      
      default:
        return false;
    }

    return validPlayerCount >= minMatches;
  } catch (error) {
    console.error('Error validating criterion:', error);
    return false;
  }
}

// Validate that team has at least minMatches players
export async function validateTeamHasPlayers(teamId: string, minMatches: number = 3): Promise<boolean> {
  const playerIds = new Set<string>();

  // Current players
  const { data: currentPlayers } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('team_id', teamId);
  currentPlayers?.forEach(p => playerIds.add(p.id));

  // Past players via transactions
  const { data: transactions } = await supabaseAdmin
    .from('transaction_history')
    .select('player_id')
    .or(`to_team_id.eq.${teamId},from_team_id.eq.${teamId}`);
  transactions?.forEach(t => playerIds.add(t.player_id));

  return playerIds.size >= minMatches;
}

async function countPlayersWithStatThreshold(threshold: string): Promise<number> {
  const [stat, valueStr] = threshold.split('_');
  const thresholdValue = parseFloat(valueStr);
  const playersWithThreshold = new Set<string>();

  const { data: gameStats } = await supabaseAdmin
    .from('game_stats')
    .select('player_id, points, rebounds, assists, game_id');

  if (!gameStats || gameStats.length === 0) return 0;

  const gameIds = [...new Set(gameStats.map(gs => gs.game_id))];
  const { data: games } = await supabaseAdmin
    .from('games')
    .select('id, season')
    .in('id', gameIds);

  if (!games) return 0;

  const gameSeasonMap = new Map(games.map(g => [g.id, g.season]));
  const playerSeasonStats = new Map<string, Map<string, { total: number; games: number }>>();

  for (const gs of gameStats) {
    const season = gameSeasonMap.get(gs.game_id);
    if (!season) continue;

    const statValue = stat === 'ppg' ? gs.points : 
                     stat === 'rpg' ? gs.rebounds :
                     stat === 'apg' ? gs.assists : 0;

    if (!playerSeasonStats.has(gs.player_id)) {
      playerSeasonStats.set(gs.player_id, new Map());
    }
    const seasonMap = playerSeasonStats.get(gs.player_id)!;
    const current = seasonMap.get(season) || { total: 0, games: 0 };
    current.total += statValue || 0;
    current.games += 1;
    seasonMap.set(season, current);
  }

  // Check each player's seasons
  for (const [playerId, seasonMap] of Array.from(playerSeasonStats.entries())) {
    for (const [_, data] of Array.from(seasonMap.entries())) {
      const average = data.total / data.games;
      if (average >= thresholdValue) {
        playersWithThreshold.add(playerId);
        break;
      }
    }
  }

  return playersWithThreshold.size;
}

async function countPlayersWithSeasons(minSeasons: number): Promise<number> {
  const playersWithEnoughSeasons = new Set<string>();

  const { data: gameStats } = await supabaseAdmin
    .from('game_stats')
    .select('player_id, game_id, team_id');

  if (!gameStats) return 0;

  const gameIds = [...new Set(gameStats.map(gs => gs.game_id))];
  const { data: games } = await supabaseAdmin
    .from('games')
    .select('id, season')
    .in('id', gameIds);

  if (!games) return 0;

  const gameSeasonMap = new Map(games.map(g => [g.id, g.season]));
  const playerTeamSeasons = new Map<string, Map<string, Set<string>>>();

  for (const gs of gameStats) {
    const season = gameSeasonMap.get(gs.game_id);
    if (!season || !gs.team_id) continue;

    if (!playerTeamSeasons.has(gs.player_id)) {
      playerTeamSeasons.set(gs.player_id, new Map());
    }
    const teamMap = playerTeamSeasons.get(gs.player_id)!;
    if (!teamMap.has(gs.team_id)) {
      teamMap.set(gs.team_id, new Set());
    }
    teamMap.get(gs.team_id)!.add(season);
  }

  // Check each player
  for (const [playerId, teamMap] of Array.from(playerTeamSeasons.entries())) {
    for (const [_, seasons] of Array.from(teamMap.entries())) {
      if (seasons.size >= minSeasons) {
        playersWithEnoughSeasons.add(playerId);
        break;
      }
    }
  }

  return playersWithEnoughSeasons.size;
}

async function countPlayersWithMultipleTeams(minTeams: number): Promise<number> {
  const playerTeams = new Map<string, Set<string>>();

  // Current teams
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, team_id');

  users?.forEach(u => {
    if (u.team_id) {
      if (!playerTeams.has(u.id)) playerTeams.set(u.id, new Set());
      playerTeams.get(u.id)!.add(u.team_id);
    }
  });

  // Transaction history
  const { data: transactions } = await supabaseAdmin
    .from('transaction_history')
    .select('player_id, to_team_id, from_team_id');

  transactions?.forEach(t => {
    if (!playerTeams.has(t.player_id)) playerTeams.set(t.player_id, new Set());
    if (t.to_team_id) playerTeams.get(t.player_id)!.add(t.to_team_id);
    if (t.from_team_id) playerTeams.get(t.player_id)!.add(t.from_team_id);
  });

  let count = 0;
  for (const [_, teams] of Array.from(playerTeams.entries())) {
    if (teams.size >= minTeams) count++;
  }

  return count;
}
