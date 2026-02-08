import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// POST - Remove a season from all teams
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { seasonName } = body;

    if (!seasonName) {
      return NextResponse.json({ error: 'Season name is required' }, { status: 400 });
    }

    // Get all teams that have this season
    const { data: teams, error: fetchError } = await supabaseAdmin
      .from('teams')
      .select('id, name, seasons')
      .not('seasons', 'is', null);

    if (fetchError) {
      console.error('Error fetching teams:', fetchError);
      throw fetchError;
    }

    // Filter teams that have this season
    const affectedTeams = teams?.filter(team => 
      team.seasons && team.seasons.includes(seasonName)
    ) || [];

    if (affectedTeams.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No teams were assigned to this season',
        teamsUpdated: 0
      });
    }

    // Remove the season from each affected team
    const updates = affectedTeams.map(team => {
      const updatedSeasons = team.seasons.filter((s: string) => s !== seasonName);
      return supabaseAdmin
        .from('teams')
        .update({ seasons: updatedSeasons })
        .eq('id', team.id);
    });

    await Promise.all(updates);

    return NextResponse.json({ 
      success: true,
      message: `Removed "${seasonName}" from ${affectedTeams.length} team(s)`,
      teamsUpdated: affectedTeams.length,
      affectedTeams: affectedTeams.map(t => ({ id: t.id, name: t.name }))
    });
  } catch (error) {
    console.error('Error removing season from teams:', error);
    return NextResponse.json({ 
      error: 'Failed to remove season from teams' 
    }, { status: 500 });
  }
}
