import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// Send completion data to Discord bot API
export async function POST(request: NextRequest) {
  console.log('[HoopGrids Webhook] ========== WEBHOOK ENDPOINT CALLED ==========');
  try {
    console.log('[HoopGrids Webhook] Received webhook request');
    const body = await request.json();
    console.log('[HoopGrids Webhook] Raw body:', JSON.stringify(body));
    
    const { puzzleId, userId, rarityScore, completionTime } = body;
    console.log('[HoopGrids Webhook] Parsed data:', { puzzleId, userId, rarityScore, completionTime });

    if (!puzzleId || !userId) {
      console.error('[HoopGrids Webhook] Missing required fields:', { puzzleId, userId });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get user details
    console.log('[HoopGrids Webhook] Fetching user details for:', userId);
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('username, discord_username, discord_user_id, minecraft_username, avatar_url, minecraft_user_id')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('[HoopGrids Webhook] Error fetching user:', userError);
    }

    if (!user) {
      console.error('[HoopGrids Webhook] User not found:', userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('[HoopGrids Webhook] Found user:', {
      username: user.username,
      discordUserId: user.discord_user_id,
      minecraftUsername: user.minecraft_username,
    });

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

    const userRank = completions ? completions.findIndex(c => c.user_id === userId) + 1 : 0;

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
    
    console.log('[HoopGrids Webhook] Preparing to send to bot:', {
      botApiUrl,
      discordUserId: botPayload.player.userId,
      username: botPayload.player.username,
    });
    
    if (botApiUrl) {
      try {
        console.log('[HoopGrids Webhook] Sending to bot API...');
        console.log('[HoopGrids Webhook] Request URL:', `${botApiUrl}/minigames/completion`);
        console.log('[HoopGrids Webhook] Request payload:', JSON.stringify(botPayload, null, 2));
        
        const botResponse = await fetch(`${botApiUrl}/minigames/completion`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.BOT_SECRET_KEY || ''}`,
          },
          body: JSON.stringify(botPayload),
        });

        console.log('[HoopGrids Webhook] Bot response status:', botResponse.status);
        const responseText = await botResponse.text();
        console.log('[HoopGrids Webhook] Bot response body:', responseText);
        
        if (!botResponse.ok) {
          console.error('[HoopGrids Webhook] Bot API call failed with status:', botResponse.status);
          console.error('[HoopGrids Webhook] Bot error response:', responseText);
        } else {
          console.log('[HoopGrids Webhook] Successfully sent to bot!');
        }
      } catch (botError) {
        console.error('[HoopGrids Webhook] Error sending to bot API:', botError);
        console.error('[HoopGrids Webhook] Error details:', {
          message: botError instanceof Error ? botError.message : String(botError),
          stack: botError instanceof Error ? botError.stack : undefined,
        });
        // Don't fail the request if bot call fails
      }
    } else {
      console.warn('[HoopGrids Webhook] DISCORD_BOT_API_URL not configured');
    }

    return NextResponse.json({ 
      success: true, 
      data: botPayload,
      botNotified: !!botApiUrl 
    });
  } catch (error) {
    console.error('[HoopGrids Webhook] ❌ FATAL ERROR in webhook handler');
    console.error('[HoopGrids Webhook] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: error instanceof Error ? error.constructor.name : typeof error,
    });
    return NextResponse.json({ 
      error: 'Failed to process webhook',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
