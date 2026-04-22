import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    
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

    // Get today's puzzle ID first (if exists) to delete related data
    const { data: todayPuzzle } = await supabaseAdmin
      .from('hoopgrid_puzzles')
      .select('id')
      .eq('puzzle_date', today)
      .single();

    // Delete all attempts for today's puzzle
    if (todayPuzzle) {
      const { error: attemptsError } = await supabaseAdmin
        .from('hoopgrid_attempts')
        .delete()
        .eq('puzzle_id', todayPuzzle.id);

      if (attemptsError && attemptsError.code !== 'PGRST116') {
        console.error('Error deleting attempts:', attemptsError);
      }

      // Delete all completions for today's puzzle (leaderboard data)
      const { error: completionsError } = await supabaseAdmin
        .from('hoopgrid_completions')
        .delete()
        .eq('puzzle_id', todayPuzzle.id);

      if (completionsError && completionsError.code !== 'PGRST116') {
        console.error('Error deleting completions:', completionsError);
      }
    }

    // Delete today's puzzle (this will trigger a new puzzle to be generated)
    const { error: deleteError } = await supabaseAdmin
      .from('hoopgrid_puzzles')
      .delete()
      .eq('puzzle_date', today);

    if (deleteError && deleteError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error deleting puzzle:', deleteError);
      return NextResponse.json(
        { error: 'Failed to reset puzzle' },
        { status: 500 }
      );
    }

    console.log('[Admin Reset] Puzzle deleted, generating new puzzle...');

    // Immediately generate a new puzzle by calling the daily endpoint
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const dailyResponse = await fetch(`${baseUrl}/api/minigames/hoopgrids/daily`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!dailyResponse.ok) {
        console.error('[Admin Reset] Failed to generate new puzzle:', await dailyResponse.text());
        return NextResponse.json({
          success: false,
          error: 'Puzzle deleted but failed to generate new one. Try reloading the page.',
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
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error resetting minigames:', error);
    return NextResponse.json(
      { error: 'Failed to reset minigames' },
      { status: 500 }
    );
  }
}
