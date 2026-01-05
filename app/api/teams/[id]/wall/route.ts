import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { getMinecraftHeadshot } from '@/lib/minecraft';

// GET - Get wall posts for a team
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: posts, error } = await supabaseAdmin
      .from('team_wall_posts')
      .select('id, content, is_pinned, created_at, player_id')
      .eq('team_id', params.id)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching wall posts:', error);
      return NextResponse.json({ error: 'Failed to fetch wall posts' }, { status: 500 });
    }

    // Fetch player data for each post
    const playerIds = Array.from(new Set(posts?.map(p => p.player_id) || []));
    const { data: players } = await supabaseAdmin
      .from('users')
      .select('id, username, minecraft_username, minecraft_user_id, avatar_url, roles')
      .in('id', playerIds);

    // Map player data to posts
    const playersMap = new Map(players?.map(p => [p.id, p]) || []);
    const postsWithPlayers = posts?.map(post => {
      const player = playersMap.get(post.player_id);
      return {
        ...post,
        players: player ? {
          id: player.id,
          display_name: player.username,
          minecraft_username: player.minecraft_username,
          profile_picture: player.minecraft_user_id 
            ? getMinecraftHeadshot(player.minecraft_user_id, 128)
            : player.avatar_url || getMinecraftHeadshot(null, 128),
          roles: player.roles || ['Player'],
        } : null
      };
    }) || [];

    return NextResponse.json({ posts: postsWithPlayers });
  } catch (error) {
    console.error('Error in GET /api/teams/[id]/wall:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a wall post
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user.playerId) {
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 });
    }

    // Check if user is on this team
    const { data: player } = await supabaseAdmin
      .from('players')
      .select('team_id')
      .eq('id', session.user.playerId)
      .single();

    if (!player || player.team_id !== params.id) {
      return NextResponse.json({ error: 'Forbidden - You must be on this team to post' }, { status: 403 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Post content is required' }, { status: 400 });
    }

    if (content.length > 500) {
      return NextResponse.json({ error: 'Post is too long (max 500 characters)' }, { status: 400 });
    }

    const { data: post, error } = await supabaseAdmin
      .from('team_wall_posts')
      .insert({
        team_id: params.id,
        player_id: session.user.playerId,
        content: content.trim(),
        is_pinned: false,
      })
      .select('id, content, is_pinned, created_at, player_id')
      .single();

    if (error) {
      console.error('Error creating wall post:', error);
      return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
    }

    // Fetch player data
    const { data: player } = await supabaseAdmin
      .from('users')
      .select('id, username, minecraft_username, minecraft_user_id, avatar_url, roles')
      .eq('id', session.user.playerId)
      .single();

    const postWithPlayer = {
      ...post,
      players: player ? {
        id: player.id,
        display_name: player.username,
        minecraft_username: player.minecraft_username,
        profile_picture: player.minecraft_user_id 
          ? getMinecraftHeadshot(player.minecraft_user_id, 128)
          : player.avatar_url || getMinecraftHeadshot(null, 128),
        roles: player.roles || ['Player'],
      } : null
    };

    return NextResponse.json(postWithPlayer);
  } catch (error) {
    console.error('Error in POST /api/teams/[id]/wall:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Pin/unpin a post (franchise owners only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user.playerId) {
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 });
    }

    const body = await request.json();
    const { postId, isPinned } = body;

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    // Check if user is a franchise owner of this team
    const { data: player } = await supabaseAdmin
      .from('players')
      .select('team_id, roles')
      .eq('id', session.user.playerId)
      .single();

    if (!player || player.team_id !== params.id || !player.roles.includes('Franchise Owner')) {
      return NextResponse.json({ error: 'Forbidden - Only franchise owners can pin posts' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('team_wall_posts')
      .update({ is_pinned: isPinned })
      .eq('id', postId)
      .eq('team_id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating post:', error);
      return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PATCH /api/teams/[id]/wall:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a post (own posts or franchise owners)
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
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    // Check if user is a franchise owner or post owner
    const { data: player } = await supabaseAdmin
      .from('players')
      .select('team_id, roles')
      .eq('id', session.user.playerId)
      .single();

    const { data: post } = await supabaseAdmin
      .from('team_wall_posts')
      .select('player_id')
      .eq('id', postId)
      .single();

    const isFranchiseOwner = player?.team_id === params.id && player?.roles.includes('Franchise Owner');
    const isPostOwner = post?.player_id === session.user.playerId;

    if (!isFranchiseOwner && !isPostOwner) {
      return NextResponse.json({ error: 'Forbidden - You can only delete your own posts' }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from('team_wall_posts')
      .delete()
      .eq('id', postId);

    if (error) {
      console.error('Error deleting post:', error);
      return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/teams/[id]/wall:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
