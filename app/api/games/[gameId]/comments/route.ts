import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/games/[gameId]/comments - Get all comments for a game
export async function GET(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const { gameId } = params;

    // Fetch comments with user data and like counts
    const { data: comments, error } = await supabaseAdmin
      .from('game_comments')
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
      .eq('game_id', gameId)
      .is('deleted_at', null)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Comments API] Error fetching comments:', error);
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }

    // Fetch like counts and user's likes
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // Get like counts for all comments
    const commentIds = comments?.map(c => c.id) || [];
    const { data: likeCounts } = await supabaseAdmin
      .from('game_comment_likes')
      .select('comment_id, user_id')
      .in('comment_id', commentIds);

    // Build like count map and user's likes
    const likeCountMap: Record<number, number> = {};
    const userLikesSet = new Set<number>();
    
    likeCounts?.forEach(like => {
      likeCountMap[like.comment_id] = (likeCountMap[like.comment_id] || 0) + 1;
      if (userId && like.user_id === userId) {
        userLikesSet.add(like.comment_id);
      }
    });

    // Organize comments into tree structure (parent comments + replies)
    const commentsWithMetadata = comments?.map(comment => ({
      ...comment,
      likeCount: likeCountMap[comment.id] || 0,
      likedByUser: userLikesSet.has(comment.id),
      user: comment.users,
    }));

    // Separate parent comments and replies
    const parentComments = commentsWithMetadata?.filter(c => !c.parent_comment_id) || [];
    const replies = commentsWithMetadata?.filter(c => c.parent_comment_id) || [];

    // Attach replies to parent comments
    const commentsTree = parentComments.map(parent => ({
      ...parent,
      replies: replies.filter(reply => reply.parent_comment_id === parent.id),
    }));

    return NextResponse.json({
      comments: commentsTree,
      totalCount: commentsWithMetadata?.length || 0,
    });
  } catch (error) {
    console.error('[Comments API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/games/[gameId]/comments - Create a new comment
export async function POST(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Comments API] Creating comment for user:', session.user.id);

    const userId = session.user.id;

    const { gameId } = params;
    const body = await request.json();
    const { content, parentCommentId } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    // Verify game exists
    const { data: game } = await supabaseAdmin
      .from('games')
      .select('id')
      .eq('id', gameId)
      .single();

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // If replying, verify parent comment exists
    if (parentCommentId) {
      const { data: parentComment } = await supabaseAdmin
        .from('game_comments')
        .select('id')
        .eq('id', parentCommentId)
        .eq('game_id', gameId)
        .is('deleted_at', null)
        .single();

      if (!parentComment) {
        return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 });
      }
    }

    // Create comment
    const { data: newComment, error } = await supabaseAdmin
      .from('game_comments')
      .insert({
        game_id: gameId,
        user_id: session.user.id,
        content: content.trim(),
        parent_comment_id: parentCommentId || null,
      })
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
      console.error('[Comments API] Error creating comment:', error);
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
    }

    return NextResponse.json({
      comment: {
        ...newComment,
        likeCount: 0,
        likedByUser: false,
        user: newComment.users,
        replies: [],
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[Comments API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
