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
    
    // Try to find user by ID first
    let user = null;
    let userError = null;
    
    const { data: userById, error: errorById } = await supabaseAdmin
      .from('users')
      .select('id, username, discord_username, minecraft_username, avatar_url, minecraft_user_id')
      .eq('id', userId)
      .maybeSingle();

    if (userById) {
      user = userById;
    } else {
      // If not found by ID, try by minecraft_username (fallback for username-based IDs)
      console.log('[HoopGrids Webhook] User not found by ID, trying minecraft_username:', userId);
      const { data: userByUsername, error: errorByUsername } = await supabaseAdmin
        .from('users')
        .select('id, username, discord_username, minecraft_username, avatar_url, minecraft_user_id')
        .eq('minecraft_username', userId)
        .maybeSingle();
      
      if (userByUsername) {
        user = userByUsername;
        console.log('[HoopGrids Webhook] Found user by minecraft_username');
      } else {
        // Try by username as last resort
        const { data: userByUsernameField, error: errorByUsernameField } = await supabaseAdmin
          .from('users')
          .select('id, username, discord_username, minecraft_username, avatar_url, minecraft_user_id')
          .eq('username', userId)
          .maybeSingle();
        
        user = userByUsernameField;
        userError = errorByUsernameField;
        if (user) {
          console.log('[HoopGrids Webhook] Found user by username field');
        }
      }
    }

    if (!user) {
      console.error('[HoopGrids Webhook] User not found after all attempts:', userId);
      console.error('[HoopGrids Webhook] Last error:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('[HoopGrids Webhook] Found user:', {
      id: user.id,
      username: user.username,
      discordUsername: user.discord_username,
      minecraftUsername: user.minecraft_username,
    });

    // Extract Discord ID from user ID (format: "discord-123456789" -> "123456789")
    const discordId = user.id.startsWith('discord-') ? user.id.substring(8) : user.id;
    console.log('[HoopGrids Webhook] Extracted Discord ID:', discordId);

    // Longer delay to ensure all attempts are saved before querying
    // This prevents race condition where webhook is called before last validate completes
    await new Promise(resolve => setTimeout(resolve, 1000));

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

    // Retry mechanism to ensure attempts are fully saved
    let attempts = null;
    let attemptsError = null;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      const delayMs = retryCount * 500; // 0ms, 500ms, 1000ms
      if (delayMs > 0) {
        console.log(`[HoopGrids Webhook] Retry ${retryCount}, waiting ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      
      console.log('[HoopGrids Webhook] Querying attempts with:', { puzzleId, userId, retry: retryCount });
      const result = await supabaseAdmin
        .from('hoopgrid_attempts')
        .select('cell_row, cell_col, is_correct, rarity, guessed_player_id')
        .eq('puzzle_id', puzzleId)
        .eq('user_id', userId);
      
      attempts = result.data;
      attemptsError = result.error;
      
      // If we have attempts, break
      if (attempts && attempts.length > 0) {
        console.log(`[HoopGrids Webhook] Found ${attempts.length} attempts on retry ${retryCount}`);
        break;
      }
      
      retryCount++;
    }

    if (attemptsError) {
      console.error('[HoopGrids Webhook] Error fetching attempts:', attemptsError);
    }

    console.log('[HoopGrids Webhook] Final attempt count:', attempts?.length || 0);
    console.log('[HoopGrids Webhook] All attempt details:', JSON.stringify(attempts, null, 2));
    
    const totalCells = 9;
    const correctCount = attempts?.filter(a => a.is_correct).length || 0;
    const totalAttempts = attempts?.length || 0;
    const completionPercentage = Math.round((correctCount / totalCells) * 100);
    const isPerfect = correctCount === 9;

    console.log('[HoopGrids Webhook] Calculated score:', {
      correctCount,
      totalAttempts,
      totalCells,
      percentage: completionPercentage,
      isPerfect,
      attemptsData: attempts,
    });

    // Format puzzle date as MM/DD/YYYY for Discord
    let formattedDate = 'Unknown';
    if (puzzle?.puzzle_date) {
      const dateObj = new Date(puzzle.puzzle_date + 'T00:00:00'); // Add time to avoid timezone issues
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const year = dateObj.getFullYear();
      formattedDate = `${month}/${day}/${year}`;
    }

    // Prepare data payload for Discord bot (exact format expected by bot)
    const botPayload = {
      minigame: 'hoopgrids',
      player: {
        userId: discordId,
        username: user.username,
        minecraftUsername: user.minecraft_username,
        avatarUrl: user.avatar_url,
      },
      completion: {
        puzzleDate: formattedDate,
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
    };

    // Send to Discordiscord
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
