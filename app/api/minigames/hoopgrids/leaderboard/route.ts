import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { getMinecraftHeadshot } from '@/lib/minecraft';

// Get today's HoopGrids leaderboard
export async function GET() {
  try {
    // Use EST timezone (America/New_York) - properly extract date components
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(now);
    const year = parts.find(p => p.type === 'year')!.value;
    const month = parts.find(p => p.type === 'month')!.value;
    const day = parts.find(p => p.type === 'day')!.value;
    const today = `${year}-${month}-${day}`; // YYYY-MM-DD in EST

    // Get today's puzzle
    const { data: puzzle } = await supabaseAdmin
      .from('hoopgrid_puzzles')
      .select('id')
      .eq('puzzle_date', today)
      .single();

    if (!puzzle) {
      return NextResponse.json({ leaderboard: [] }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }

    // Get all completions for today's puzzle
    const { data: completions } = await supabaseAdmin
      .from('hoopgrid_completions')
      .select('user_id, rarity_score, completion_time, completed_at')
      .eq('puzzle_id', puzzle.id)
      .order('rarity_score', { ascending: true }) // Lower is better
      .limit(50); // Top 50 players

    if (!completions || completions.length === 0) {
      return NextResponse.json({ leaderboard: [] }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }

    // Get user details for each completion
    const userIds = completions.map(c => c.user_id);
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, username, minecraft_username, minecraft_user_id, avatar_url')
      .in('id', userIds);

    // Map users by ID for quick lookup
    const userMap = new Map(users?.map(u => [u.id, u]) || []);

    // Build leaderboard with user info
    const leaderboard = completions.map((completion, index) => {
      const user = userMap.get(completion.user_id);
      
      return {
        rank: index + 1,
        userId: completion.user_id,
        displayName: user?.minecraft_username || user?.username || 'Anonymous',
        profilePicture: user?.minecraft_user_id
          ? getMinecraftHeadshot(user.minecraft_user_id, 128)
          : user?.avatar_url || getMinecraftHeadshot(null, 128),
        rarityScore: completion.rarity_score,
        completionTime: completion.completion_time,
        completedAt: completion.completed_at,
      };
    });

    return NextResponse.json({ leaderboard }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
