import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Get all team staff or staff for a specific team
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    let query = supabase
      .from('team_staff')
      .select(`
        id,
        team_id,
        player_id,
        role,
        created_at,
        updated_at,
        player:users!player_id (
          id,
          username,
          minecraft_username,
          minecraft_user_id,
          discord_username,
          avatar_url
        ),
        team:teams!team_id (
          id,
          name,
          logo,
          primary_color,
          secondary_color
        )
      `)
      .order('created_at', { ascending: false });

    if (teamId) {
      query = query.eq('team_id', teamId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error fetching team staff:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create a new team staff assignment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamId, playerId, role } = body;

    // Validate required fields
    if (!teamId || !playerId || !role) {
      return NextResponse.json(
        { error: 'teamId, playerId, and role are required' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['Franchise Owner', 'Head Coach', 'Assistant Coach', 'General Manager'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Role must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if team exists
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // Check if player exists
    const { data: player, error: playerError } = await supabase
      .from('users')
      .select('id')
      .eq('id', playerId)
      .single();

    if (playerError || !player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    // For Franchise Owner and Head Coach roles, ensure only one person per team
    if (role === 'Franchise Owner' || role === 'Head Coach') {
      const { data: existing } = await supabase
        .from('team_staff')
        .select('id, player_id')
        .eq('team_id', teamId)
        .eq('role', role)
        .single();

      if (existing && existing.player_id !== playerId) {
        return NextResponse.json(
          { error: `This team already has a ${role}. Remove the existing one first.` },
          { status: 400 }
        );
      }
    }

    // Insert the new team staff assignment
    const { data: newStaff, error: insertError } = await supabase
      .from('team_staff')
      .insert([
        {
          team_id: teamId,
          player_id: playerId,
          role: role,
        },
      ])
      .select(`
        id,
        team_id,
        player_id,
        role,
        created_at,
        updated_at,
        player:users!player_id (
          id,
          username,
          minecraft_username,
          discord_username
        ),
        team:teams!team_id (
          id,
          name
        )
      `)
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(newStaff, { status: 201 });
  } catch (error: any) {
    console.error('Error creating team staff:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remove a team staff assignment
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('team_staff')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Team staff assignment deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting team staff:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
