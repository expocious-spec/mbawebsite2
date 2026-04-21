import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// Send completion data to Discord webhook
export async function POST(request: NextRequest) {
  try {
    const { puzzleId, userId, rarityScore, completionTime, correctCells } = await request.json();

    if (!puzzleId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get user details
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('username, discord_username, discord_user_id, minecraft_username, avatar_url')
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

    // Calculate accuracy emoji
    const getAccuracyEmoji = (correct: number) => {
      if (correct === 9) return '🏆';
      if (correct >= 7) return '⭐';
      if (correct >= 5) return '✅';
      return '📊';
    };

    // Format time
    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    };

    // Prepare Discord embed data
    const webhookData = {
      userId: user.discord_user_id,
      username: user.discord_username || user.username,
      minecraftUsername: user.minecraft_username,
      avatarUrl: user.avatar_url,
      puzzleDate: puzzle?.puzzle_date || 'Unknown',
      rarityScore: parseFloat(rarityScore.toFixed(2)),
      completionTime: completionTime,
      formattedTime: formatTime(completionTime),
      correctCells: correctCount,
      totalCells: totalCells,
      completionPercentage: completionPercentage,
      rank: userRank,
      totalPlayers: completions?.length || 0,
      emoji: getAccuracyEmoji(correctCount),
      timestamp: new Date().toISOString(),
    };

    // Send to Discord webhook (environment variable)
    const webhookUrl = process.env.HOOPGRIDS_DISCORD_WEBHOOK_URL;
    
    if (webhookUrl) {
      try {
        const discordResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: `${webhookData.emoji} HoopGrids Completion`,
              description: `**${webhookData.username}** completed today's HoopGrids!`,
              color: correctCount === 9 ? 0xFFD700 : // Gold for perfect
                     correctCount >= 7 ? 0x00FF00 : // Green for great
                     correctCount >= 5 ? 0x3B82F6 : // Blue for good
                     0x9CA3AF, // Gray for okay
              fields: [
                {
                  name: '📊 Score',
                  value: `${correctCount}/${totalCells} correct (${completionPercentage}%)`,
                  inline: true
                },
                {
                  name: '🎯 Rarity',
                  value: `${webhookData.rarityScore}%`,
                  inline: true
                },
                {
                  name: '⏱️ Time',
                  value: webhookData.formattedTime,
                  inline: true
                },
                {
                  name: '🏆 Rank',
                  value: `#${webhookData.rank} of ${webhookData.totalPlayers}`,
                  inline: true
                },
                {
                  name: '📅 Date',
                  value: webhookData.puzzleDate,
                  inline: true
                },
                {
                  name: '🎮 Player',
                  value: webhookData.minecraftUsername || webhookData.username,
                  inline: true
                }
              ],
              thumbnail: webhookData.avatarUrl ? {
                url: webhookData.avatarUrl
              } : undefined,
              timestamp: webhookData.timestamp,
              footer: {
                text: 'MBA HoopGrids'
              }
            }]
          }),
        });

        if (!discordResponse.ok) {
          console.error('Discord webhook failed:', await discordResponse.text());
        }
      } catch (webhookError) {
        console.error('Error sending to Discord webhook:', webhookError);
        // Don't fail the request if webhook fails
      }
    } else {
      console.warn('HOOPGRIDS_DISCORD_WEBHOOK_URL not configured');
    }

    return NextResponse.json({ 
      success: true, 
      data: webhookData,
      webhookSent: !!webhookUrl 
    });
  } catch (error) {
    console.error('Error in webhook handler:', error);
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}
