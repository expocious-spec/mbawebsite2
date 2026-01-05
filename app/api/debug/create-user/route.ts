import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

async function createUser() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const discordId = session.user.id.replace('discord-', '');
    const userId = `discord-${discordId}`;

    console.log('[CREATE USER] Attempting to create user:', userId);

    // Check if user exists
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (existingUser) {
      return NextResponse.json({ 
        success: true, 
        message: 'User already exists',
        user: existingUser 
      });
    }

    // Create new user
    const { data: newUser, error: createError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        username: session.user.name || `User-${discordId}`,
        discord_username: session.user.name || null,
        email: (session.user as any).email || null,
        avatar_url: session.user.image || null,
        roles: ['Player']
      })
      .select()
      .single();

    if (createError) {
      console.error('[CREATE USER] Error:', createError);
      return NextResponse.json({ 
        error: 'Failed to create user', 
        details: createError 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User created successfully',
      user: newUser 
    });

  } catch (error) {
    console.error('[CREATE USER] Exception:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error 
    }, { status: 500 });
  }
}

export async function GET() {
  return createUser();
}

export async function POST() {
  return createUser();
}
