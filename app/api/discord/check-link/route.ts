import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/discord/check-link - Check if Discord account is linked to Minecraft
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const discordId = searchParams.get('discordId');

    console.log('[Discord Link Check] Checking for discordId:', discordId);

    if (!discordId) {
      return NextResponse.json({ error: 'Discord ID required' }, { status: 400 });
    }

    // Check bot_discord_links table
    const { data: discordLink, error } = await supabaseAdmin
      .from('bot_discord_links')
      .select('*')
      .eq('discord_id', discordId)
      .maybeSingle();

    console.log('[Discord Link Check] Query result:', { discordLink, error });

    return NextResponse.json({
      linked: !!discordLink,
      minecraftUsername: discordLink?.minecraft_username || null,
      minecraftUuid: discordLink?.minecraft_uuid || null,
    });
  } catch (error) {
    console.error('[Discord Link Check] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
