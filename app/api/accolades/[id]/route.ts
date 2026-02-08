import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Get assignments for an accolade
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const accoladeId = params.id;

    const { data, error } = await supabaseAdmin
      .from('accolade_assignments')
      .select(`
        id,
        player_id,
        awarded_date,
        player:users!accolade_assignments_player_id_fkey(
          minecraft_user_id,
          minecraft_username
        )
      `)
      .eq('accolade_id', accoladeId)
      .order('awarded_date', { ascending: false });

    if (error) {
      console.error('Error fetching accolade assignments:', error);
      return NextResponse.json([]);
    }

    const formatted = data?.map((assignment: any) => {
      const player = Array.isArray(assignment.player) ? assignment.player[0] : assignment.player;
      return {
        id: assignment.id,
        playerId: assignment.player_id,
        minecraftUserId: player?.minecraft_user_id || '',
        minecraftUsername: player?.minecraft_username || '',
        awardedDate: assignment.awarded_date,
      };
    }) || [];

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error in accolade assignments API:', error);
    return NextResponse.json([]);
  }
}

// POST - Assign accolade to additional players
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accoladeId = params.id;
    const { playerIds } = await request.json();

    if (!playerIds || playerIds.length === 0) {
      return NextResponse.json({ error: 'Player IDs are required' }, { status: 400 });
    }

    const assignments = playerIds.map((playerId: string) => ({
      accolade_id: accoladeId,
      player_id: playerId,
    }));

    const { error } = await supabaseAdmin
      .from('accolade_assignments')
      .insert(assignments);

    if (error) {
      console.error('Error assigning accolade:', error);
      return NextResponse.json({ error: 'Failed to assign accolade' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Accolade assigned successfully' }, { status: 201 });
  } catch (error: any) {
    console.error('Error assigning accolade:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to assign accolade' 
    }, { status: 500 });
  }
}

// DELETE - Remove assignment(s)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accoladeId = params.id;
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');

    if (!playerId) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('accolade_assignments')
      .delete()
      .eq('accolade_id', accoladeId)
      .eq('player_id', playerId);

    if (error) {
      console.error('Error removing accolade assignment:', error);
      return NextResponse.json({ error: 'Failed to remove assignment' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Assignment removed successfully' });
  } catch (error: any) {
    console.error('Error removing accolade assignment:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to remove assignment' 
    }, { status: 500 });
  }
}
