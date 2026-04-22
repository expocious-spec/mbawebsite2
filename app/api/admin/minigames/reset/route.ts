import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    
    console.log('[Admin Reset] Session check:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      isAdmin: session?.user?.isAdmin,
      userId: session?.user?.id,
    });
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Get today's EST date
    const now = new Date();
    const estDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const today = `${estDate.getFullYear()}-${String(estDate.getMonth() + 1).padStart(2, '0')}-${String(estDate.getDate()).padStart(2, '0')}`;

    console.log('[Admin Reset] Starting reset for date:', today);

    // Get today's puzzle ID first (if exists) to delete related data
    const { data: todayPuzzle, error: puzzleQueryError } = await supabaseAdmin
      .from('hoopgrid_puzzles')
      .select('id')
      .eq('puzzle_date', today)
      .single();
    
    console.log('[Admin Reset] Today puzzle query:', { todayPuzzle, error: puzzleQueryError });

    // Delete all attempts for today's puzzle
    if (todayPuzzle) {
      console.log('[Admin Reset] Deleting attempts for puzzle:', todayPuzzle.id);
      const { error: attemptsError } = await supabaseAdmin
        .from('hoopgrid_attempts')
        .delete()
        .eq('puzzle_id', todayPuzzle.id);

      if (attemptsError && attemptsError.code !== 'PGRST116') {
        console.error('[Admin Reset] Error deleting attempts:', attemptsError);
      } else {
        console.log('[Admin Reset] Attempts deleted successfully');
      }

      // Delete all completions for today's puzzle (leaderboard data)
      console.log('[Admin Reset] Deleting completions for puzzle:', todayPuzzle.id);
      const { error: completionsError } = await supabaseAdmin
        .from('hoopgrid_completions')
        .delete()
        .eq('puzzle_id', todayPuzzle.id);

      if (completionsError && completionsError.code !== 'PGRST116') {
        console.error('[Admin Reset] Error deleting completions:', completionsError);
      } else {
        console.log('[Admin Reset] Completions deleted successfully');
      }
    } else {
      console.log('[Admin Reset] No puzzle found for today, skipping attempts/completions deletion');
    }

    // Delete today's puzzle (this will trigger a new puzzle to be generated)
    console.log('[Admin Reset] Deleting puzzle for date:', today);
    const { error: deleteError } = await supabaseAdmin
      .from('hoopgrid_puzzles')
      .delete()
      .eq('puzzle_date', today);

    if (deleteError && deleteError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('[Admin Reset] Error deleting puzzle:', deleteError);
      return NextResponse.json(
        { error: 'Failed to reset puzzle', details: deleteError.message },
        { status: 500 }
      );
    }
    
    console.log('[Admin Reset] Puzzle deleted successfully');

    console.log('[Admin Reset] Puzzle deleted, generating new puzzle...');

    // Immediately generate a new puzzle by calling the daily endpoint
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      console.log('[Admin Reset] Calling daily endpoint at:', `${baseUrl}/api/minigames/hoopgrids/daily`);
      
      const dailyResponse = await fetch(`${baseUrl}/api/minigames/hoopgrids/daily`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      console.log('[Admin Reset] Daily endpoint response status:', dailyResponse.status);

      if (!dailyResponse.ok) {
        const errorText = await dailyResponse.text();
        console.error('[Admin Reset] Failed to generate new puzzle:', errorText);
        return NextResponse.json({
          success: false,
          error: 'Puzzle deleted but failed to generate new one. Try reloading the page.',
          details: errorText,
        }, { status: 500 });
      }

      const newPuzzle = await dailyResponse.json();
      console.log('[Admin Reset] New puzzle generated:', newPuzzle.id);

      return NextResponse.json({
        success: true,
        message: 'Minigames reset successfully! New puzzle generated and ready to play.',
        date: today,
        puzzleId: newPuzzle.id,
      });
    } catch (generateError) {
      console.error('[Admin Reset] Error generating new puzzle:', generateError);
      return NextResponse.json({
        success: false,
        error: 'Puzzle deleted but failed to generate new one. Try reloading the page.',
        details: generateError instanceof Error ? generateError.message : String(generateError),
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[Admin Reset] Error resetting minigames:', error);
    return NextResponse.json(
      { 
        error: 'Failed to reset minigames',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
