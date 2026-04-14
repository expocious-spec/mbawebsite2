import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const { data: games, error } = await supabaseAdmin
    .from('games')
    .select('*')
    .order('scheduled_date', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const formattedGames = games?.map(game => ({
    id: game.id,
    homeTeamId: game.home_team_id,
    awayTeamId: game.away_team_id,
    homeScore: game.home_score,
    awayScore: game.away_score,
    scheduledDate: game.scheduled_date,
    status: game.status,
    season: game.season,
    week: game.week,
    isForfeit: game.is_forfeit ?? false,
    forfeitWinner: game.forfeit_winner ?? null,
    playerOfGameId: game.player_of_game_id ?? null,
  })) || [];

  return NextResponse.json(formattedGames);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.homeTeamId || !body.awayTeamId || !body.scheduledDate) {
      return NextResponse.json(
        { error: 'Home team, away team, and scheduled date are required' },
        { status: 400 }
      );
    }

    // Build insert object - only include forfeit fields if they exist in schema
    const insertData: any = {
      home_team_id: body.homeTeamId,
      away_team_id: body.awayTeamId,
      scheduled_date: body.scheduledDate,
      status: body.status || 'scheduled',
      season: body.season || 'Preseason 1',
      week: body.week,
      home_score: body.homeScore,
      away_score: body.awayScore,
    };

    // Only add forfeit fields if they're provided (for completed games)
    if (body.isForfeit !== undefined) insertData.is_forfeit = body.isForfeit;
    if (body.forfeitWinner !== undefined) insertData.forfeit_winner = body.forfeitWinner;
    if (body.playerOfGameId !== undefined) insertData.player_of_game_id = body.playerOfGameId;

    const { data, error } = await supabaseAdmin
      .from('games')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Game creation error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Game created successfully',
      game: {
        id: data.id,
        homeTeamId: data.home_team_id,
        awayTeamId: data.away_team_id,
        scheduledDate: data.scheduled_date,
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create game' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    // Check if service role key is configured
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    console.log('Service role key configured:', hasServiceKey);
    
    const body = await request.json();
    const { id, ...updates } = body;

    console.log('PUT request received:', { id, updates });

    if (!id) {
      return NextResponse.json(
        { error: 'Game ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (updates.homeTeamId !== undefined) updateData.home_team_id = updates.homeTeamId;
    if (updates.awayTeamId !== undefined) updateData.away_team_id = updates.awayTeamId;
    if (updates.homeScore !== undefined) updateData.home_score = updates.homeScore;
    if (updates.awayScore !== undefined) updateData.away_score = updates.awayScore;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.scheduledDate !== undefined) updateData.scheduled_date = updates.scheduledDate;
    if (updates.season !== undefined) updateData.season = updates.season;
    if (updates.week !== undefined) updateData.week = updates.week;
    if (updates.isForfeit !== undefined) updateData.is_forfeit = updates.isForfeit;
    if (updates.forfeitWinner !== undefined) updateData.forfeit_winner = updates.forfeitWinner;
    if (updates.playerOfGameId !== undefined) updateData.player_of_game_id = updates.playerOfGameId;
    if (updates.playerOfGameId !== undefined) updateData.player_of_game_id = updates.playerOfGameId;

    console.log('Update data:', updateData);

    const { data, error } = await supabaseAdmin
      .from('games')
      .update(updateData)
      .eq('id', id)
      .select();
    
    console.log('Supabase response:', { data, error });
    
    if (error) {
      console.error('Game update error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Game updated successfully',
      game: { id: data[0].id }
    });
  } catch (error: any) {
    console.error('Game update exception:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update game' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Game ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('games')
      .delete()
      .eq('id', id);
    
    if (error) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Game deleted successfully'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete game' },
      { status: 500 }
    );
  }
}

