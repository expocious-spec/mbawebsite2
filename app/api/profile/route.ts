import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/profile - Get current user's profile
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Fetch user profile from database
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Fetch team info if user has a team
    let team = null;
    if (user.team_id) {
      const { data: teamData } = await supabaseAdmin
        .from('teams')
        .select('*')
        .eq('id', user.team_id)
        .single();
      
      team = teamData;
    }

    return NextResponse.json({
      user,
      team,
    });
  } catch (error) {
    console.error('[API] Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/profile - Update current user's profile
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();

    // Validate input
    const { profile_description } = body;

    // Security: Only allow editing profile_description
    const allowedFields = ['profile_description'];
    const updates: any = {};

    if (profile_description !== undefined) {
      // Sanitize and validate profile_description
      const sanitized = profile_description.trim();
      
      if (sanitized.length > 500) {
        return NextResponse.json(
          { error: 'Profile description must be 500 characters or less' },
          { status: 400 }
        );
      }

      // Basic XSS prevention (remove HTML tags)
      const cleaned = sanitized.replace(/<[^>]*>/g, '');
      updates.profile_description = cleaned;
    }

    // Check if there are any updates to make
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update the user's profile
    const { data: updatedUser, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('[API] Error updating profile:', error);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    console.log('[API] Profile updated successfully:', userId);

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error('[API] Error in profile update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
