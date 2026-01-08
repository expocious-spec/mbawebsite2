import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET all game stats
export async function GET(request: NextRequest) {
  try {
    const { data: gameStats, error } = await supabaseAdmin
      .from('game_stats')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching game stats from database:', error);
      // Return empty array instead of error object for consistency
      return NextResponse.json([]);
    }

    // Convert snake_case to camelCase
    const formattedStats = gameStats?.map(stat => ({
      id: stat.id,
      playerId: stat.player_id,
      gameId: stat.game_id,
      date: stat.date,
      opponent: stat.opponent,
      points: stat.points,
      rebounds: stat.rebounds,
      assists: stat.assists,
      steals: stat.steals,
      blocks: stat.blocks,
      turnovers: stat.turnovers,
      fieldGoalsMade: stat.field_goals_made,
      fieldGoalsAttempted: stat.field_goals_attempted,
      threePointersMade: stat.three_pointers_made,
      threePointersAttempted: stat.three_pointers_attempted,
      freeThrowsMade: stat.free_throws_made,
      freeThrowsAttempted: stat.free_throws_attempted,
      fouls: stat.fouls,
      possessionTime: stat.possession_time,
      result: stat.result,
    })) || [];

    return NextResponse.json(formattedStats);
  } catch (error) {
    console.error('Error fetching game stats:', error);
    // Return empty array instead of error object
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const gameStats = await request.json();
    
    // Insert the game stats
    const { data: newGameStats, error: insertError } = await supabaseAdmin
      .from('game_stats')
      .insert({
        player_id: gameStats.playerId,
        game_id: gameStats.gameId,
        date: gameStats.date,
        opponent: gameStats.opponent,
        points: gameStats.points,
        rebounds: gameStats.rebounds,
        assists: gameStats.assists,
        steals: gameStats.steals,
        blocks: gameStats.blocks,
        turnovers: gameStats.turnovers,
        field_goals_made: gameStats.fieldGoalsMade,
        field_goals_attempted: gameStats.fieldGoalsAttempted,
        three_pointers_made: gameStats.threePointersMade,
        three_pointers_attempted: gameStats.threePointersAttempted,
        free_throws_made: gameStats.freeThrowsMade,
        free_throws_attempted: gameStats.freeThrowsAttempted,
        fouls: gameStats.fouls,
        possession_time: gameStats.possessionTime || 0,
        result: gameStats.result,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { success: false, message: insertError.message },
        { status: 500 }
      );
    }

    // Get all game stats for this player to recalculate averages
    const { data: allGameStats, error: fetchError } = await supabaseAdmin
      .from('game_stats')
      .select('*')
      .eq('player_id', gameStats.playerId);

    if (fetchError || !allGameStats) {
      return NextResponse.json({
        success: true,
        message: 'Game stats added but could not update averages',
      });
    }

    // Recalculate overall stats
    const totalGames = allGameStats.length;
    const updatedStats = {
      games_played: totalGames,
      points: allGameStats.reduce((sum, g) => sum + g.points, 0) / totalGames,
      rebounds: allGameStats.reduce((sum, g) => sum + g.rebounds, 0) / totalGames,
      assists: allGameStats.reduce((sum, g) => sum + g.assists, 0) / totalGames,
      steals: allGameStats.reduce((sum, g) => sum + g.steals, 0) / totalGames,
      blocks: allGameStats.reduce((sum, g) => sum + g.blocks, 0) / totalGames,
      turnovers: allGameStats.reduce((sum, g) => sum + g.turnovers, 0) / totalGames,
      field_goals_made: Math.round(allGameStats.reduce((sum, g) => sum + g.field_goals_made, 0) / totalGames),
      field_goals_attempted: Math.round(allGameStats.reduce((sum, g) => sum + g.field_goals_attempted, 0) / totalGames),
      field_goal_percentage: calculatePercentage(
        allGameStats.reduce((sum, g) => sum + g.field_goals_made, 0),
        allGameStats.reduce((sum, g) => sum + g.field_goals_attempted, 0)
      ),
      three_pointers_made: Math.round(allGameStats.reduce((sum, g) => sum + g.three_pointers_made, 0) / totalGames),
      three_pointers_attempted: Math.round(allGameStats.reduce((sum, g) => sum + g.three_pointers_attempted, 0) / totalGames),
      three_point_percentage: calculatePercentage(
        allGameStats.reduce((sum, g) => sum + g.three_pointers_made, 0),
        allGameStats.reduce((sum, g) => sum + g.three_pointers_attempted, 0)
      ),
      free_throws_made: Math.round(allGameStats.reduce((sum, g) => sum + g.free_throws_made, 0) / totalGames),
      free_throws_attempted: Math.round(allGameStats.reduce((sum, g) => sum + g.free_throws_attempted, 0) / totalGames),
      free_throw_percentage: calculatePercentage(
        allGameStats.reduce((sum, g) => sum + g.free_throws_made, 0),
        allGameStats.reduce((sum, g) => sum + g.free_throws_attempted, 0)
      ),
      fouls: Math.round(allGameStats.reduce((sum, g) => sum + g.fouls, 0) / totalGames),
      assist_turnover_ratio: calculateRatio(
        allGameStats.reduce((sum, g) => sum + g.assists, 0),
        allGameStats.reduce((sum, g) => sum + g.turnovers, 0)
      ),
    };

    // Update player stats
    const { error: updateError } = await supabaseAdmin
      .from('players')
      .update(updatedStats)
      .eq('id', gameStats.playerId);

    if (updateError) {
      console.error('Error updating player stats:', updateError);
    }

    return NextResponse.json({
      success: true,
      message: 'Game stats added successfully',
    });
  } catch (error) {
    console.error('Error adding game stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add game stats' },
      { status: 500 }
    );
  }
}

function calculatePercentage(made: number, attempted: number): number {
  if (attempted === 0) return 0;
  return (made / attempted) * 100;
}

function calculateRatio(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return numerator / denominator;
}

// Helper function to recalculate player stats
async function recalculatePlayerStats(playerId: string) {
  const { data: allGameStats, error: fetchError } = await supabaseAdmin
    .from('game_stats')
    .select('*')
    .eq('player_id', playerId);

  if (fetchError || !allGameStats || allGameStats.length === 0) {
    // No game stats, reset player stats
    await supabaseAdmin
      .from('players')
      .update({
        games_played: 0,
        points: 0,
        rebounds: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
        turnovers: 0,
        field_goals_made: 0,
        field_goals_attempted: 0,
        field_goal_percentage: 0,
        three_pointers_made: 0,
        three_pointers_attempted: 0,
        three_point_percentage: 0,
        free_throws_made: 0,
        free_throws_attempted: 0,
        free_throw_percentage: 0,
        fouls: 0,
      })
      .eq('id', playerId);
    return;
  }

  const totalGames = allGameStats.length;
  const updatedStats = {
    games_played: totalGames,
    points: allGameStats.reduce((sum, g) => sum + g.points, 0) / totalGames,
    rebounds: allGameStats.reduce((sum, g) => sum + g.rebounds, 0) / totalGames,
    assists: allGameStats.reduce((sum, g) => sum + g.assists, 0) / totalGames,
    steals: allGameStats.reduce((sum, g) => sum + g.steals, 0) / totalGames,
    blocks: allGameStats.reduce((sum, g) => sum + g.blocks, 0) / totalGames,
    turnovers: allGameStats.reduce((sum, g) => sum + g.turnovers, 0) / totalGames,
    field_goals_made: Math.round(allGameStats.reduce((sum, g) => sum + g.field_goals_made, 0) / totalGames),
    field_goals_attempted: Math.round(allGameStats.reduce((sum, g) => sum + g.field_goals_attempted, 0) / totalGames),
    field_goal_percentage: calculatePercentage(
      allGameStats.reduce((sum, g) => sum + g.field_goals_made, 0),
      allGameStats.reduce((sum, g) => sum + g.field_goals_attempted, 0)
    ),
    three_pointers_made: Math.round(allGameStats.reduce((sum, g) => sum + g.three_pointers_made, 0) / totalGames),
    three_pointers_attempted: Math.round(allGameStats.reduce((sum, g) => sum + g.three_pointers_attempted, 0) / totalGames),
    three_point_percentage: calculatePercentage(
      allGameStats.reduce((sum, g) => sum + g.three_pointers_made, 0),
      allGameStats.reduce((sum, g) => sum + g.three_pointers_attempted, 0)
    ),
    free_throws_made: Math.round(allGameStats.reduce((sum, g) => sum + g.free_throws_made, 0) / totalGames),
    free_throws_attempted: Math.round(allGameStats.reduce((sum, g) => sum + g.free_throws_attempted, 0) / totalGames),
    free_throw_percentage: calculatePercentage(
      allGameStats.reduce((sum, g) => sum + g.free_throws_made, 0),
      allGameStats.reduce((sum, g) => sum + g.free_throws_attempted, 0)
    ),
    fouls: Math.round(allGameStats.reduce((sum, g) => sum + g.fouls, 0) / totalGames),
    assist_turnover_ratio: calculateRatio(
      allGameStats.reduce((sum, g) => sum + g.assists, 0),
      allGameStats.reduce((sum, g) => sum + g.turnovers, 0)
    ),
  };

  await supabaseAdmin
    .from('players')
    .update(updatedStats)
    .eq('id', playerId);
}

// PUT - Update existing game stats
export async function PUT(request: NextRequest) {
  try {
    const gameStats = await request.json();
    
    if (!gameStats.id) {
      return NextResponse.json(
        { success: false, message: 'Game stats ID is required' },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from('game_stats')
      .update({
        player_id: gameStats.playerId,
        game_id: gameStats.gameId,
        date: gameStats.date,
        opponent: gameStats.opponent,
        points: gameStats.points,
        rebounds: gameStats.rebounds,
        assists: gameStats.assists,
        steals: gameStats.steals,
        blocks: gameStats.blocks,
        turnovers: gameStats.turnovers,
        field_goals_made: gameStats.fieldGoalsMade,
        field_goals_attempted: gameStats.fieldGoalsAttempted,
        three_pointers_made: gameStats.threePointersMade,
        three_pointers_attempted: gameStats.threePointersAttempted,
        free_throws_made: gameStats.freeThrowsMade,
        free_throws_attempted: gameStats.freeThrowsAttempted,
        fouls: gameStats.fouls,
        possession_time: gameStats.possessionTime || 0,
        result: gameStats.result,
      })
      .eq('id', gameStats.id);

    if (updateError) {
      return NextResponse.json(
        { success: false, message: updateError.message },
        { status: 500 }
      );
    }

    // Recalculate player stats
    await recalculatePlayerStats(gameStats.playerId);

    return NextResponse.json({
      success: true,
      message: 'Game stats updated successfully',
    });
  } catch (error) {
    console.error('Error updating game stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update game stats' },
      { status: 500 }
    );
  }
}

// DELETE - Remove game stats
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Game stats ID is required' },
        { status: 400 }
      );
    }

    // Get the player ID before deleting
    const { data: stat } = await supabaseAdmin
      .from('game_stats')
      .select('player_id')
      .eq('id', id)
      .single();

    if (!stat) {
      return NextResponse.json(
        { success: false, message: 'Game stats not found' },
        { status: 404 }
      );
    }

    const playerId = stat.player_id;

    // Delete the game stats
    const { error: deleteError } = await supabaseAdmin
      .from('game_stats')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json(
        { success: false, message: deleteError.message },
        { status: 500 }
      );
    }

    // Recalculate player stats
    await recalculatePlayerStats(playerId);

    return NextResponse.json({
      success: true,
      message: 'Game stats deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting game stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete game stats' },
      { status: 500 }
    );
  }
}

