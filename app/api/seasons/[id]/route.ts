import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

const GUILD_ID = process.env.DISCORD_GUILD_ID;

// PATCH - Update season
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, displayOrder, isCurrent, startDate, endDate } = body;

    // If setting as current, unset all other current seasons
    if (isCurrent) {
      await supabaseAdmin
        .from('seasons')
        .update({ is_active: false })
        .eq('is_active', true)
        .neq('id', params.id);
    }

    const updates: any = {};
    if (name !== undefined) updates.season_name = name;
    if (displayOrder !== undefined) updates.display_order = displayOrder;
    if (isCurrent !== undefined) updates.is_active = isCurrent;
    if (startDate !== undefined) updates.start_date = startDate || null;
    if (endDate !== undefined) updates.end_date = endDate || null;

    const { data, error } = await supabaseAdmin
      .from('seasons')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Database error updating season:', error);
      throw error;
    }

    // Map response back to frontend format
    const mappedData = {
      id: data.id,
      name: data.season_name,
      displayOrder: data.display_order || 0,
      isCurrent: data.is_active,
      startDate: data.start_date,
      endDate: data.end_date,
      createdAt: data.created_at,
      guildId: data.guild_id,
    };

    return NextResponse.json(mappedData);
  } catch (error: any) {
    console.error('Error updating season:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to update season' 
    }, { status: 500 });
  }
}

// DELETE - Delete season
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabaseAdmin
      .from('seasons')
      .delete()
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting season:', error);
    return NextResponse.json({ error: 'Failed to delete season' }, { status: 500 });
  }
}
