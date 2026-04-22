import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isAdminDiscordId } from '@/lib/auth';

// POST /api/games/[gameId]/comments/[commentId]/pin - Toggle pin status (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: { gameId: string; commentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('discord_id')
      .eq('id', session.user.id)
      .single();

    if (!user?.discord_id || !isAdminDiscordId(user.discord_id)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { commentId } = params;

    // Get current pin status
    const { data: comment } = await supabaseAdmin
      .from('game_comments')
      .select('is_pinned')
      .eq('id', commentId)
      .is('deleted_at', null)
      .single();

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Toggle pin status
    const newPinStatus = !comment.is_pinned;
    const { error } = await supabaseAdmin
      .from('game_comments')
      .update({
        is_pinned: newPinStatus,
        pinned_by: newPinStatus ? session.user.id : null,
        pinned_at: newPinStatus ? new Date().toISOString() : null,
      })
      .eq('id', commentId);

    if (error) {
      console.error('[Comments API] Error updating pin status:', error);
      return NextResponse.json({ error: 'Failed to update pin status' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      isPinned: newPinStatus,
    });
  } catch (error) {
    console.error('[Comments API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
