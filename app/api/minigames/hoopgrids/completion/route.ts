import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { getMinecraftHeadshot } from '@/lib/minecraft';

// Check if user has completed today's puzzle
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const puzzleId = searchParams.get('puzzleId');
    const userId = searchParams.get('userId');

    if (!puzzleId) {
      return NextResponse.json({ error: 'Missing puzzleId' }, { status: 400 });
    }

    // Check if user is authenticated (from session or query param)
    if (!userId) {
      return NextResponse.json({ completed: false });
    }

    // Check for existing completion
    const { data: completion } = await supabaseAdmin
      .from('hoopgrid_completions')
      .select('*')
      .eq('puzzle_id', puzzleId)
      .eq('user_id', userId)
      .single();

    if (completion) {
      // Load their attempts to display the grid
      const { data: attempts } = await supabaseAdmin
        .from('hoopgrid_attempts')
        .select('*')
        .eq('puzzle_id', puzzleId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      // Get player details for each attempt
      const attemptsWithDetails = await Promise.all(
        (attempts || []).map(async (attempt) => {
          const { data: player } = await supabaseAdmin
            .from('users')
            .select('username, minecraft_username, minecraft_user_id, avatar_url')
            .eq('id', attempt.guessed_player_id)
            .single();

          return {
            ...attempt,
            player_name: player?.minecraft_username || player?.username || 'Unknown',
            player_picture: player?.minecraft_user_id
              ? getMinecraftHeadshot(player.minecraft_user_id, 128)
              : player?.avatar_url || getMinecraftHeadshot(null, 128),
            stat_value: attempt.stat_value,
            stat_label: attempt.stat_label,
          };
        })
      );

      return NextResponse.json({
        completed: true,
        rarity_score: completion.rarity_score,
        completion_time: completion.completion_time,
        attempts: attemptsWithDetails,
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }

    return NextResponse.json({ completed: false }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error checking completion:', error);
    return NextResponse.json({ error: 'Failed to check completion' }, { status: 500 });
  }
}

// Save puzzle completion
export async function POST(request: NextRequest) {
  try {
    const { puzzleId, userId, rarityScore, completionTime } = await request.json();

    if (!puzzleId || !userId || rarityScore === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if already completed (prevent duplicates)
    const { data: existing } = await supabaseAdmin
      .from('hoopgrid_completions')
      .select('id')
      .eq('puzzle_id', puzzleId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Puzzle already completed' }, { status: 400 });
    }

    // Save completion
    const { data, error } = await supabaseAdmin
      .from('hoopgrid_completions')
      .insert({
        puzzle_id: puzzleId,
        user_id: userId,
        rarity_score: rarityScore,
        completion_time: completionTime,
      })
      .select()
      .single();

    if (error) throw error;

    // Send to Discord webhook (non-blocking)
    try {
      fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/minigames/hoopgrids/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puzzleId,
          userId,
          rarityScore,
          completionTime,
        }),
      }).catch(err => console.error('Webhook call failed:', err));
    } catch (webhookError) {
      // Don't fail the completion if webhook fails
      console.error('Error triggering webhook:', webhookError);
    }

    return NextResponse.json({ success: true, completion: data });
  } catch (error) {
    console.error('Error saving completion:', error);
    return NextResponse.json({ error: 'Failed to save completion' }, { status: 500 });
  }
}
