import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// Send completion data to Discord bot API
export async function POST(request: NextRequest) {
  try {
    const { puzzleId, userId, rarityScore, completionTime } = await request.json();

    if (!puzzleId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get user details
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('username, discord_username, discord_user_id, minecraft_username, avatar_url, minecraft_user_id')
      .eq('id', userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get puzzle details
    const { data: puzzle } = await supabaseAdmin
      .from('hoopgrid_puzzles')
      .select('puzzle_date')
      .eq('id', puzzleId)
      .single();

    // Get user's rank for today
    const { data: completions } = await supabaseAdmin
      .from('hoopgrid_completions')
      .select('user_id, rarity_score, completion_time')
      .eq('puzzle_id', puzzleId)
      .order('rarity_score', { ascending: true })
      .order('completion_time', { ascending: true });

    const userRank = completions?.findIndex(c => c.user_id === userId) + 1 || 0;

    // Get user's attempt details
    const { data: attempts } = await supabaseAdmin
      .from('hoopgrid_attempts')
      .select('cell_row, cell_col, is_correct, rarity')
      .eq('puzzle_id', puzzleId)
      .eq('user_id', userId);

    const totalCells = 9;
    const correctCount = attempts?.filter(a => a.is_correct).length || 0;
    const completionPercentage = Math.round((correctCount / totalCells) * 100);
    const isPerfect = correctCount === 9;

    // Prepare data payload for Discord bot
    const botPayload = {
      minigame: 'hoopgrids',
      minigameName: 'HoopGrids',
      player: {
        userId: user.discord_user_id,
        username: user.username,
        discordUsername: user.discord_username,
        minecraftUsername: user.minecraft_username,
        minecraftUserId: user.minecraft_user_id,
        avatarUrl: user.avatar_url,
      },
      completion: {
        puzzleDate: puzzle?.puzzle_date || 'Unknown',
        score: {
          correct: correctCount,
          total: totalCells,
          percentage: completionPercentage,
          isPerfect: isPerfect,
        },
        rarity: {
          score: parseFloat(rarityScore.toFixed(2)),
          formatted: `${parseFloat(rarityScore.toFixed(2))}%`,
        },
        time: {
          seconds: completionTime,
          formatted: completionTime >= 60 
            ? `${Math.floor(completionTime / 60)}m ${completionTime % 60}s`
            : `${completionTime}s`,
        },
        rank: {
          position: userRank,
          total: completions?.length || 0,
          formatted: `#${userRank} of ${completions?.length || 0}`,
        },
      },
      timestamp: new Date().toISOString(),
    };

    // Send to Discord bot API
    const botApiUrl = process.env.DISCORD_BOT_API_URL;
    
    if (botApiUrl) {
      try {
        const botResponse = await fetch(`${botApiUrl}/minigames/completion`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.BOT_SECRET_KEY || ''}`,
          },
          body: JSON.stringify(botPayload),
        });

        if (!botResponse.ok) {
          console.error('Bot API call failed:', await botResponse.text());
        }
      } catch (botError) {
        console.error('Error sending to bot API:', botError);
        // Don't fail the request if bot call fails
      }
    } else {
      console.warn('DISCORD_BOT_API_URL not configured');
    }

    return NextResponse.json({ 
      success: true, 
      data: botPayload,
      botNotified: !!botApiUrl 
    });
  } catch (error) {
    console.error('Error in webhook handler:', error);
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}
