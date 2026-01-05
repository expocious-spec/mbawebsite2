import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

const GUILD_ID = process.env.DISCORD_GUILD_ID;

// GET - Fetch all seasons
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('seasons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching seasons:', error);
      // Return empty array if table doesn't exist
      return NextResponse.json([]);
    }

    // Map database columns to frontend format
    const mappedData = data?.map(season => ({
      id: season.id,
      name: season.season_name,
      displayOrder: 0, // Not stored in DB, can add if needed
      isCurrent: season.is_active,
      startDate: season.start_date,
      endDate: season.end_date,
      createdAt: season.created_at,
      guildId: season.guild_id,
    })) || [];

    return NextResponse.json(mappedData);
  } catch (error) {
    console.error('Error fetching seasons:', error);
    return NextResponse.json([]);
  }
}

// POST - Create new season
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, isCurrent, startDate, endDate } = body;

    console.log('[SEASONS API] POST request:', { name, isCurrent, startDate, endDate });

    if (!name) {
      return NextResponse.json({ error: 'Season name is required' }, { status: 400 });
    }

    if (!GUILD_ID) {
      console.error('[SEASONS API] DISCORD_GUILD_ID not configured in environment');
      return NextResponse.json({ error: 'Discord Guild ID not configured in .env.local' }, { status: 500 });
    }

    console.log('[SEASONS API] Using GUILD_ID:', GUILD_ID);

    // If setting as current, unset all other current seasons
    if (isCurrent) {
      console.log('[SEASONS API] Unsetting other active seasons');
      const { error: updateError } = await supabaseAdmin
        .from('seasons')
        .update({ is_active: false })
        .eq('guild_id', GUILD_ID)
        .eq('is_active', true);
      
      if (updateError) {
        console.error('[SEASONS API] Error unsetting active seasons:', updateError);
      }
    }

    const insertData = {
      guild_id: GUILD_ID,
      season_name: name,
      is_active: isCurrent || false,
      start_date: startDate || null,
      end_date: endDate || null,
    };

    console.log('[SEASONS API] Inserting season:', insertData);

    const { data, error } = await supabaseAdmin
      .from('seasons')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('[SEASONS API] Database error creating season:', error);
      console.error('[SEASONS API] Error code:', error.code);
      console.error('[SEASONS API] Error message:', error.message);
      console.error('[SEASONS API] Error details:', JSON.stringify(error, null, 2));
      throw error;
    }

    console.log('[SEASONS API] Successfully created season:', data);

    // Map response back to frontend format
    const mappedData = {
      id: data.id,
      name: data.season_name,
      displayOrder: 0,
      isCurrent: data.is_active,
      startDate: data.start_date,
      endDate: data.end_date,
      createdAt: data.created_at,
      guildId: data.guild_id,
    };

    return NextResponse.json(mappedData, { status: 201 });
  } catch (error: any) {
    console.error('[SEASONS API] Error creating season:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to create season',
      details: error.details || error.hint || 'Check server logs for more information'
    }, { status: 500 });
  }
}