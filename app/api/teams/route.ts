import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { data: teams, error } = await supabaseAdmin
      .from('teams')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching teams:', error);
      return NextResponse.json([]);
    }

    // Transform snake_case to camelCase
    const formattedTeams = teams?.map(team => ({
      id: team.id,
      name: team.name,
      abbreviation: team.name.substring(0, 3).toUpperCase(), // Default abbreviation
      logo: team.logo,
      owner: team.owner,
      generalManager: team.general_manager,
      headCoach: team.head_coach,
      assistantCoaches: team.assistant_coaches,
      conference: team.conference,
      primaryColor: team.primary_color,
      secondaryColor: team.secondary_color,
      colors: {
        primary: team.primary_color,
        secondary: team.secondary_color,
      },
    })) || [];

    return NextResponse.json(formattedTeams);
  } catch (error) {
    console.error('Error in teams API:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.name) {
      return NextResponse.json(
        { error: 'Team name is required' },
        { status: 400 }
      );
    }

    // Generate a simple team ID from the team name
    const teamId = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const { data, error } = await supabaseAdmin
      .from('teams')
      .insert({
        id: teamId,
        name: body.name,
        logo: body.logo || null,
        owner: body.owner || '',
        general_manager: body.generalManager || '',
        head_coach: body.headCoach || '',
        assistant_coaches: body.assistantCoaches || [],
        conference: body.conference || 'Western',
        primary_color: body.primaryColor || '#00A8E8',
        secondary_color: body.secondaryColor || '#0A0E27',
        guild_id: '1450671860520976559',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating team:', error);
      return NextResponse.json({ 
        success: false,
        error: error.message || 'Failed to create team',
        details: error 
      }, { status: 500 });
    }

    const formattedTeam = {
      id: data.id,
      name: data.name,
      logo: data.logo,
      owner: data.owner,
      generalManager: data.general_manager,
      headCoach: data.head_coach,
      assistantCoaches: data.assistant_coaches,
      conference: data.conference,
      colors: {
        primary: data.primary_color,
        secondary: data.secondary_color,
      },
    };

    return NextResponse.json({ 
      success: true, 
      message: 'Team created successfully',
      team: formattedTeam 
    });
  } catch (error: any) {
    console.error('Exception in POST /api/teams:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to create team',
        details: error.toString()
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.logo !== undefined) updateData.logo = updates.logo;
    if (updates.owner !== undefined) updateData.owner = updates.owner;
    if (updates.generalManager !== undefined) updateData.general_manager = updates.generalManager;
    if (updates.headCoach !== undefined) updateData.head_coach = updates.headCoach;
    if (updates.assistantCoaches !== undefined) updateData.assistant_coaches = updates.assistantCoaches;
    if (updates.conference !== undefined) updateData.conference = updates.conference;
    if (updates.primaryColor !== undefined) updateData.primary_color = updates.primaryColor;
    if (updates.secondaryColor !== undefined) updateData.secondary_color = updates.secondaryColor;

    const { data, error } = await supabaseAdmin
      .from('teams')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error || !data) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    const formattedTeam = {
      id: data.id,
      name: data.name,
      logo: data.logo,
      owner: data.owner,
      generalManager: data.general_manager,
      headCoach: data.head_coach,
      assistantCoaches: data.assistant_coaches,
      conference: data.conference,
      colors: {
        primary: data.primary_color,
        secondary: data.secondary_color,
      },
    };

    return NextResponse.json({
      success: true,
      message: 'Team updated successfully',
      team: formattedTeam
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update team' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('teams')
      .delete()
      .eq('id', id);
    
    if (error) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Team deleted successfully'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete team' },
      { status: 500 }
    );
  }
}


