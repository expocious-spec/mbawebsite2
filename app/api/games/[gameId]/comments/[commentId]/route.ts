import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isAdminDiscordId } from '@/lib/auth';

// PATCH /api/games/[gameId]/comments/[commentId] - Update a comment
export async function PATCH(
  request: NextRequest,
  { params }: { params: { gameId: string; commentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { gameId, commentId } = params;
    const body = await request.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    // Fetch comment
    const { data: comment } = await supabaseAdmin
      .from('game_comments')
      .select('user_id, game_id')
      .eq('id', commentId)
      .eq('game_id', gameId)
      .is('deleted_at', null)
      .single();

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Verify user owns the comment
    if (comment.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden - You can only edit your own comments' }, { status: 403 });
    }

    // Update comment
    const { data: updatedComment, error } = await supabaseAdmin
      .from('game_comments')
      .update({ content: content.trim() })
      .eq('id', commentId)
      .select(`
        id,
        game_id,
        user_id,
        content,
        parent_comment_id,
        is_pinned,
        created_at,
        updated_at,
        users!game_comments_user_id_fkey (
          id,
          username,
          minecraft_username,
          minecraft_user_id,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('[Comments API] Error updating comment:', error);
      return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
    }

    return NextResponse.json({ comment: updatedComment });
  } catch (error) {
    console.error('[Comments API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/games/[gameId]/comments/[commentId] - Soft delete a comment (admin only)
export async function DELETE(
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

    const { gameId, commentId } = params;

    // Soft delete the comment
    const { error } = await supabaseAdmin
      .from('game_comments')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: session.user.id,
      })
      .eq('id', commentId)
      .eq('game_id', gameId);

    if (error) {
      console.error('[Comments API] Error deleting comment:', error);
      return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Comments API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
