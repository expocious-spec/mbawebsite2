import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/discord/check-link - Check if Discord account is linked to Minecraft
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const discordId = searchParams.get('discordId');

    if (!discordId) {
      return NextResponse.json({ error: 'Discord ID required' }, { status: 400 });
    }

    // Check bot_discord_links table
    const { data: discordLink } = await supabaseAdmin
      .from('bot_discord_links')
      .select('*')
      .eq('discord_id', discordId)
      .maybeSingle();

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
