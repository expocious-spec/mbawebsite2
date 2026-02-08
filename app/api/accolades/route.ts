import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Fetch all accolades or filter by player/season
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    const seasonId = searchParams.get('seasonId');

    let query = supabaseAdmin
      .from('accolades')
      .select(`
        *,
        player:users!accolades_player_id_fkey(id, username, avatar_url, discord_username),
        season:seasons(id, season_name, is_active)
      `)
      .order('awarded_date', { ascending: false });

    if (playerId) {
      query = query.eq('player_id', playerId);
    }

    if (seasonId) {
      query = query.eq('season_id', seasonId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching accolades:', error);
      return NextResponse.json([]);
    }

    if (!data) {
      return NextResponse.json([]);
    }

    // Transform to camelCase
    const formattedAccolades = data.map(accolade => ({
      id: accolade.id,
      playerId: accolade.player_id,
      seasonId: accolade.season_id,
      title: accolade.title,
      description: accolade.description,
      color: accolade.color,
      icon: accolade.icon,
      awardedDate: accolade.awarded_date,
      createdAt: accolade.created_at,
      updatedAt: accolade.updated_at,
      player: accolade.player ? {
        id: accolade.player.id,
        username: accolade.player.username,
        avatarUrl: accolade.player.avatar_url,
        discordUsername: accolade.player.discord_username,
      } : null,
      season: accolade.season ? {
        id: accolade.season.id,
        name: accolade.season.season_name,
        isActive: accolade.season.is_active,
      } : null,
    }));

    return NextResponse.json(formattedAccolades);
  } catch (error) {
    console.error('Error in accolades API:', error);
    return NextResponse.json([]);
  }
}

// POST - Create new accolade
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { playerId, seasonId, title, description, color, icon } = body;

    if (!playerId || !title) {
      return NextResponse.json({ 
        error: 'Missing required fields: playerId, title' 
      }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('accolades')
      .insert([{
        player_id: playerId,
        season_id: seasonId || null,
        title,
        description: description || null,
        color: color || '#FFD700',
        icon: icon || null,
      }])
      .select(`
        *,
        player:users!accolades_player_id_fkey(id, username, avatar_url, discord_username),
        season:seasons(id, season_name, is_active)
      `)
      .single();

    if (error) {
      console.error('Database error creating accolade:', error);
      return NextResponse.json({ error: 'Failed to create accolade' }, { status: 500 });
    }

    const formattedAccolade = {
      id: data.id,
      playerId: data.player_id,
      seasonId: data.season_id,
      title: data.title,
      description: data.description,
      color: data.color,
      icon: data.icon,
      awardedDate: data.awarded_date,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      player: data.player ? {
        id: data.player.id,
        username: data.player.username,
        avatarUrl: data.player.avatar_url,
        discordUsername: data.player.discord_username,
      } : null,
      season: data.season ? {
        id: data.season.id,
        name: data.season.season_name,
        isActive: data.season.is_active,
      } : null,
    };

    return NextResponse.json(formattedAccolade, { status: 201 });
  } catch (error: any) {
    console.error('Error creating accolade:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to create accolade' 
    }, { status: 500 });
  }
}

// DELETE - Delete accolade
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing accolade ID' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('accolades')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Database error deleting accolade:', error);
      return NextResponse.json({ error: 'Failed to delete accolade' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting accolade:', error);
    return NextResponse.json({ error: 'Failed to delete accolade' }, { status: 500 });
  }
}
