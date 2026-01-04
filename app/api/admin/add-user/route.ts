import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    // Check if user is admin
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { discordId, minecraftUsername, minecraftUuid } = body;

    if (!discordId || !minecraftUsername || !minecraftUuid) {
      return NextResponse.json(
        { error: 'Discord ID, Minecraft username, and UUID are required' },
        { status: 400 }
      );
    }

    const userId = `discord-${discordId}`;

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (existingUser) {
      // Update existing user
      const { data, error } = await supabaseAdmin
        .from('users')
        .update({
          minecraft_username: minecraftUsername,
          minecraft_user_id: minecraftUuid,
          username: minecraftUsername,
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating user:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'User updated successfully',
        user: data 
      });
    } else {
      // Create new user
      const { data, error } = await supabaseAdmin
        .from('users')
        .insert({
          id: userId,
          username: minecraftUsername,
          minecraft_username: minecraftUsername,
          minecraft_user_id: minecraftUuid,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating user:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'User created successfully',
        user: data 
      });
    }
  } catch (error: any) {
    console.error('Error in add-user API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
