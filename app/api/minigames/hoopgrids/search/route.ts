import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { getMinecraftHeadshot } from '@/lib/minecraft';

// Optimized lightweight search endpoint for hoopgrids
// Only returns basic player info, no stats calculation
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();

    if (!query || query.length < 1) {
      return NextResponse.json([]);
    }

    const searchPattern = `%${query}%`;

    // Fast database-level search with ILIKE and immediate LIMIT
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, username, minecraft_username, minecraft_user_id, avatar_url')
      .not('minecraft_username', 'is', null) // Only players with Minecraft accounts
      .or(`username.ilike.${searchPattern},minecraft_username.ilike.${searchPattern}`)
      .limit(15) // Limit at database level for speed
      .order('username');

    if (error) {
      console.error('Search error:', error);
      return NextResponse.json([]);
    }

    // Return minimal formatted data
    const results = (users || []).map(user => ({
      id: user.id,
      displayName: user.username || '',
      minecraftUsername: user.minecraft_username || '',
      minecraftUserId: user.minecraft_user_id || '',
      profilePicture: user.minecraft_user_id
        ? getMinecraftHeadshot(user.minecraft_user_id, 128) // Smaller image for faster loading
        : user.avatar_url || getMinecraftHeadshot(null, 128),
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error in player search:', error);
    return NextResponse.json([]);
  }
}
