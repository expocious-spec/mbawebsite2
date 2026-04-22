import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST /api/games/[gameId]/comments/[commentId]/like - Like a comment
export async function POST(
  request: NextRequest,
  { params }: { params: { gameId: string; commentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { commentId } = params;

    // Verify comment exists and is not deleted
    const { data: comment } = await supabaseAdmin
      .from('game_comments')
      .select('id')
      .eq('id', commentId)
      .is('deleted_at', null)
      .single();

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Check if already liked
    const { data: existingLike } = await supabaseAdmin
      .from('game_comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (existingLike) {
      return NextResponse.json({ error: 'Comment already liked' }, { status: 400 });
    }

    // Create like
    const { error } = await supabaseAdmin
      .from('game_comment_likes')
      .insert({
        comment_id: commentId,
        user_id: session.user.id,
      });

    if (error) {
      console.error('[Comments API] Error creating like:', error);
      return NextResponse.json({ error: 'Failed to like comment' }, { status: 500 });
    }

    // Get updated like count
    const { count } = await supabaseAdmin
      .from('game_comment_likes')
      .select('*', { count: 'exact', head: true })
      .eq('comment_id', commentId);

    return NextResponse.json({ 
      success: true,
      likeCount: count || 0,
      likedByUser: true,
    });
  } catch (error) {
    console.error('[Comments API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/games/[gameId]/comments/[commentId]/like - Unlike a comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { gameId: string; commentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { commentId } = params;

    // Delete like
    const { error } = await supabaseAdmin
      .from('game_comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('[Comments API] Error deleting like:', error);
      return NextResponse.json({ error: 'Failed to unlike comment' }, { status: 500 });
    }

    // Get updated like count
    const { count } = await supabaseAdmin
      .from('game_comment_likes')
      .select('*', { count: 'exact', head: true })
      .eq('comment_id', commentId);

    return NextResponse.json({ 
      success: true,
      likeCount: count || 0,
      likedByUser: false,
    });
  } catch (error) {
    console.error('[Comments API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
