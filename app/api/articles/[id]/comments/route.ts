import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { getMinecraftHeadshot } from '@/lib/minecraft';

// GET - Get comments for an article
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Fetch comments
    const { data: comments, error: commentsError } = await supabaseAdmin
      .from('article_comments')
      .select('id, content, created_at, player_id')
      .eq('article_id', params.id)
      .order('created_at', { ascending: false });

    if (commentsError) {
      console.error('Error fetching comments:', commentsError);
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }

    // Fetch player data for each comment
    const playerIds = Array.from(new Set(comments?.map(c => c.player_id) || []));
    const { data: players, error: playersError } = await supabaseAdmin
      .from('users')
      .select('id, username, minecraft_username, minecraft_user_id, avatar_url')
      .in('id', playerIds);

    if (playersError) {
      console.error('Error fetching players:', playersError);
    }

    // Map player data to comments
    const playersMap = new Map(players?.map(p => [p.id, p]) || []);
    const commentsWithPlayers = comments?.map(comment => {
      const player = playersMap.get(comment.player_id);
      return {
        ...comment,
        players: player ? {
          id: player.id,
          display_name: player.username,
          minecraft_username: player.minecraft_username,
          profile_picture: player.minecraft_user_id 
            ? getMinecraftHeadshot(player.minecraft_user_id, 128)
            : player.avatar_url || getMinecraftHeadshot(null, 128),
        } : null
      };
    }) || [];

    return NextResponse.json({ comments: commentsWithPlayers });
  } catch (error) {
    console.error('Error in GET /api/articles/[id]/comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add a comment to an article
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user.playerId) {
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    if (content.length > 1000) {
      return NextResponse.json({ error: 'Comment is too long (max 1000 characters)' }, { status: 400 });
    }

    // Insert comment
    const { data: comment, error: commentError } = await supabaseAdmin
      .from('article_comments')
      .insert({
        article_id: params.id,
        player_id: session.user.playerId,
        content: content.trim(),
      })
      .select('id, content, created_at, player_id')
      .single();

    if (commentError) {
      console.error('Error creating comment:', commentError);
      return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
    }

    // Fetch player data
    const { data: player } = await supabaseAdmin
      .from('users')
      .select('id, username, minecraft_username, minecraft_user_id, avatar_url')
      .eq('id', session.user.playerId)
      .single();

    const commentWithPlayer = {
      ...comment,
      players: player ? {
        id: player.id,
        display_name: player.username,
        minecraft_username: player.minecraft_username,
        profile_picture: player.minecraft_user_id 
          ? getMinecraftHeadshot(player.minecraft_user_id, 128)
          : player.avatar_url || getMinecraftHeadshot(null, 128),
      } : null
    };

    return NextResponse.json(commentWithPlayer);
  } catch (error) {
    console.error('Error in POST /api/articles/[id]/comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a comment (only your own)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user.playerId) {
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
    }

    // Only allow deleting your own comments
    const { error } = await supabaseAdmin
      .from('article_comments')
      .delete()
      .eq('id', commentId)
      .eq('player_id', session.user.playerId);

    if (error) {
      console.error('Error deleting comment:', error);
      return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/articles/[id]/comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
