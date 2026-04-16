import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { validateCriterionHasPlayers, validateTeamHasPlayers } from '@/lib/hoopgrid-validation';

// Generate or fetch today's hoopgrid puzzle
export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Check if puzzle exists for today
    const { data: existingPuzzle } = await supabaseAdmin
      .from('hoopgrid_puzzles')
      .select('*')
      .eq('puzzle_date', today)
      .single();

    if (existingPuzzle) {
      return NextResponse.json(await formatPuzzle(existingPuzzle));
    }

    // Generate new puzzle for today
    const newPuzzle = await generateDailyPuzzle(today);
    
    const { data: createdPuzzle, error } = await supabaseAdmin
      .from('hoopgrid_puzzles')
      .insert(newPuzzle)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(await formatPuzzle(createdPuzzle));
  } catch (error) {
    console.error('Error fetching daily hoopgrid:', error);
    return NextResponse.json({ error: 'Failed to load puzzle' }, { status: 500 });
  }
}

async function generateDailyPuzzle(date: string) {
  // Fetch all teams
  const { data: teams } = await supabaseAdmin
    .from('teams')
    .select('id, name, logo, team_logo_url, team_logo_emoji')
    .order('name');

  if (!teams || teams.length < 3) {
    throw new Error('Not enough teams in database');
  }

  // Seed random based on date for consistency
  const seed = new Date(date).getTime();
  const random = seededRandom(seed);

  // Shuffle and pick 3 teams for columns
  const shuffledTeams = shuffle(teams, random);
  
  // Pick teams that have at least 1 player (lowered from 3)
  const validTeams = [];
  for (const team of shuffledTeams) {
    if (validTeams.length >= 3) break;
    const hasPlayers = await validateTeamHasPlayers(team.id, 1);
    if (hasPlayers) {
      validTeams.push(team);
    }
  }

  if (validTeams.length < 3) {
    // Fallback: just use first 3 teams
    validTeams.push(...shuffledTeams.slice(0, 3 - validTeams.length));
  }

  const selectedTeams = validTeams.slice(0, 3);

  // Define possible row criteria (using only criteria that likely have matches)
  const rowCriteria = [
    { type: 'stat_threshold', value: 'ppg_10' },  // Averaged 10+ PPG in a season
    { type: 'stat_threshold', value: 'ppg_5' },   // Averaged 5+ PPG in a season
    { type: 'stat_threshold', value: 'ppg_3' },   // Averaged 3+ PPG in a season
    { type: 'stat_threshold', value: 'rpg_5' },   // Averaged 5+ RPG in a season
    { type: 'stat_threshold', value: 'rpg_3' },   // Averaged 3+ RPG in a season
    { type: 'stat_threshold', value: 'apg_3' },   // Averaged 3+ APG in a season
    { type: 'stat_threshold', value: 'apg_2' },   // Averaged 2+ APG in a season
    { type: 'stat_threshold', value: 'apg_1' },   // Averaged 1+ APG in a season
    { type: 'seasons_count', value: '2' },  // Played 2+ seasons with team
    { type: 'multiple_teams', value: '2' },  // Played for 2+ teams
  ];

  // Shuffle and pick valid criteria with at least 1 matching player (lowered from 3)
  const shuffledCriteria = shuffle(rowCriteria, random);
  const selectedCriteria = [];
  
  for (const criterion of shuffledCriteria) {
    if (selectedCriteria.length >= 3) break;
    const hasPlayers = await validateCriterionHasPlayers(criterion.type, criterion.value, 1);
    console.log(`[HoopGrids] Criterion ${criterion.type}:${criterion.value} has players: ${hasPlayers}`);
    if (hasPlayers) {
      selectedCriteria.push(criterion);
    }
  }

  // Fallback: if we don't have enough valid criteria, just add some anyway (game must work)
  if (selectedCriteria.length < 3) {
    console.log(`[HoopGrids] Only found ${selectedCriteria.length} valid criteria, adding fallbacks`);
    const remaining = shuffledCriteria.filter(c => !selectedCriteria.includes(c)).slice(0, 3 - selectedCriteria.length);
    selectedCriteria.push(...remaining);
  }

  console.log(`[HoopGrids] Selected criteria:`, selectedCriteria);

  return {
    puzzle_date: date,
    column1_type: 'team',
    column1_value: selectedTeams[0].id,
    column2_type: 'team',
    column2_value: selectedTeams[1].id,
    column3_type: 'team',
    column3_value: selectedTeams[2].id,
    row1_type: selectedCriteria[0].type,
    row1_value: selectedCriteria[0].value,
    row2_type: selectedCriteria[1].type,
    row2_value: selectedCriteria[1].value,
    row3_type: selectedCriteria[2].type,
    row3_value: selectedCriteria[2].value,
  };
}

async function formatPuzzle(puzzle: any) {
  // Fetch team data for columns
  const teamIds = [puzzle.column1_value, puzzle.column2_value, puzzle.column3_value];
  const { data: teams } = await supabaseAdmin
    .from('teams')
    .select('id, name, logo, team_logo_url, team_logo_emoji, primary_color')
    .in('id', teamIds);

  const teamMap = new Map(teams?.map(t => [t.id, t]) || []);

  return {
    id: puzzle.id,
    date: puzzle.puzzle_date,
    columns: [
      {
        type: puzzle.column1_type,
        value: puzzle.column1_value,
        team: teamMap.get(puzzle.column1_value),
      },
      {
        type: puzzle.column2_type,
        value: puzzle.column2_value,
        team: teamMap.get(puzzle.column2_value),
      },
      {
        type: puzzle.column3_type,
        value: puzzle.column3_value,
        team: teamMap.get(puzzle.column3_value),
      },
    ],
    rows: [
      {
        type: puzzle.row1_type,
        value: puzzle.row1_value,
        label: formatCriteriaLabel(puzzle.row1_type, puzzle.row1_value),
      },
      {
        type: puzzle.row2_type,
        value: puzzle.row2_value,
        label: formatCriteriaLabel(puzzle.row2_type, puzzle.row2_value),
      },
      {
        type: puzzle.row3_type,
        value: puzzle.row3_value,
        label: formatCriteriaLabel(puzzle.row3_type, puzzle.row3_value),
      },
    ],
  };
}

function formatCriteriaLabel(type: string, value: string): string {
  switch (type) {
    case 'stat_threshold':
      if (value === 'ppg_15') return '15+ PPG in a Season';
      if (value === 'ppg_10') return '10+ PPG in a Season';
      if (value === 'ppg_5') return '5+ PPG in a Season';
      if (value === 'ppg_3') return '3+ PPG in a Season';
      if (value === 'rpg_10') return '10+ RPG in a Season';
      if (value === 'rpg_5') return '5+ RPG in a Season';
      if (value === 'rpg_3') return '3+ RPG in a Season';
      if (value === 'apg_5') return '5+ APG in a Season';
      if (value === 'apg_3') return '3+ APG in a Season';
      if (value === 'apg_2') return '2+ APG in a Season';
      if (value === 'apg_1') return '1+ APG in a Season';
      return value;
    case 'accolade':
      return value; // 'MVP', 'All-Star', etc.
    case 'seasons_count':
      return `${value}+ Seasons with Team`;
    case 'transaction':
      return 'Was Traded';
    case 'multiple_teams':
      return `Played for ${value}+ Teams`;
    default:
      return value;
  }
}

// Seeded random number generator
function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

function shuffle<T>(array: T[], random: () => number): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
