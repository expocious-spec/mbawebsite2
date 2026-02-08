import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Fetch all accolades with optional filters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    const seasonId = searchParams.get('seasonId');

    if (playerId) {
      // Get accolades for a specific player
      const { data, error } = await supabaseAdmin
        .from('accolade_assignments')
        .select(`
          id,
          awarded_date,
          accolade:accolades(id, title, description, color, icon, season_id)
        `)
        .eq('player_id', playerId)
        .order('awarded_date', { ascending: false });

      if (error) {
        console.error('Error fetching player accolades:', error);
        return NextResponse.json([]);
      }

      const formatted = data?.map(assignment => ({
        id: assignment.accolade.id,
        title: assignment.accolade.title,
        description: assignment.accolade.description,
        color: assignment.accolade.color,
        icon: assignment.accolade.icon,
        seasonId: assignment.accolade.season_id,
        awardedDate: assignment.awarded_date,
      })) || [];

      return NextResponse.json(formatted);
    }

    // Get all accolades (for admin)
    let query = supabaseAdmin
      .from('accolades')
      .select('*')
      .order('created_at', { ascending: false });

    if (seasonId) {
      query = query.eq('season_id', seasonId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching accolades:', error);
      return NextResponse.json([]);
    }

    const formatted = data?.map(accolade => ({
      id: accolade.id,
      seasonId: accolade.season_id,
      title: accolade.title,
      description: accolade.description,
      color: accolade.color,
      icon: accolade.icon,
      createdAt: accolade.created_at,
      updatedAt: accolade.updated_at,
    })) || [];

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error in accolades API:', error);
    return NextResponse.json([]);
  }
}

// POST - Create new accolade and optionally assign to players
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { seasonId, title, description, color, icon, playerIds } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Create the accolade
    const { data: accolade, error: accoladeError } = await supabaseAdmin
      .from('accolades')
      .insert([{
        season_id: seasonId || null,
        title,
        description: description || null,
        color: color || '#FFD700',
        icon: icon || null,
      }])
      .select()
      .single();

    if (accoladeError) {
      console.error('Error creating accolade:', accoladeError);
      return NextResponse.json({ error: 'Failed to create accolade' }, { status: 500 });
    }

    // Assign to players if playerIds provided
    if (playerIds && playerIds.length > 0) {
      const assignments = playerIds.map((playerId: string) => ({
        accolade_id: accolade.id,
        player_id: playerId,
      }));

      const { error: assignError } = await supabaseAdmin
        .from('accolade_assignments')
        .insert(assignments);

      if (assignError) {
        console.error('Error assigning accolade:', assignError);
        // Don't fail the request, accolade was created successfully
      }
    }

    return NextResponse.json({
      id: accolade.id,
      seasonId: accolade.season_id,
      title: accolade.title,
      description: accolade.description,
      color: accolade.color,
      icon: accolade.icon,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating accolade:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to create accolade' 
    }, { status: 500 });
  }
}

// DELETE - Delete accolade (and all assignments)
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accoladeId = searchParams.get('id');

    if (!accoladeId) {
      return NextResponse.json({ error: 'Accolade ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('accolades')
      .delete()
      .eq('id', accoladeId);

    if (error) {
      console.error('Error deleting accolade:', error);
      return NextResponse.json({ error: 'Failed to delete accolade' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Accolade deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting accolade:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to create accolade' 
    }, { status: 500 });
  }
}
