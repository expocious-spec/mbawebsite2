import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Get all staff
export async function GET() {
  try {
    const { data: staff, error } = await supabaseAdmin
      .from('staff')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json(staff || []);
  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
  }
}

// Add staff member
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { playerId, role } = body;

    if (!playerId || !role) {
      return NextResponse.json({ error: 'Player ID and role are required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('staff')
      .insert([{ player_id: playerId, role }])
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error adding staff:', error);
    return NextResponse.json({ error: 'Failed to add staff member' }, { status: 500 });
  }
}

// Update staff member
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, role } = body;

    if (!id || !role) {
      return NextResponse.json({ error: 'Staff ID and role are required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('staff')
      .update({ role })
      .eq('id', id)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error updating staff:', error);
    return NextResponse.json({ error: 'Failed to update staff member' }, { status: 500 });
  }
}

// Remove staff member
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Staff ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('staff')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing staff:', error);
    return NextResponse.json({ error: 'Failed to remove staff member' }, { status: 500 });
  }
}

