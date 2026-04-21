import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Bot API Endpoint: Sync team changes from Discord to website
 * 
 * This endpoint is called by the Discord bot when a player's team changes.
 * It updates the user's team_id and creates a transaction history record.
 * 
 * Expected body:
 * {
 *   discord_id: string,
 *   team_id: string | null,  // null = free agent
 *   transaction_type: 'sign' | 'release' | 'trade' | 'demand',
 *   from_team_id?: string | null,
 *   performed_by?: string,
 *   notes?: string,
 *   guild_id?: string
 * }
 * 
 * Authentication: Requires BOT_SECRET_KEY header to match environment variable
 */
export async function POST(request: NextRequest) {
  try {
    // Verify bot authentication
    const botSecret = request.headers.get('X-Bot-Secret');
    const expectedSecret = process.env.BOT_SECRET_KEY;
    
    if (!expectedSecret) {
      console.error('[BOT SYNC] BOT_SECRET_KEY not configured in environment');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (botSecret !== expectedSecret) {
      console.error('[BOT SYNC] Invalid or missing bot secret');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      discord_id,
      team_id,
      transaction_type,
      from_team_id,
      performed_by,
      notes,
      guild_id,
    } = body;

    // Validate required fields
    if (!discord_id) {
      return NextResponse.json(
        { error: "Missing required field: discord_id" },
        { status: 400 }
      );
    }

    if (!transaction_type || !['sign', 'release', 'trade', 'demand'].includes(transaction_type)) {
      return NextResponse.json(
        { error: "Invalid or missing transaction_type. Must be: sign, release, trade, or demand" },
        { status: 400 }
      );
    }

    const userId = `discord-${discord_id}`;
    const guildId = guild_id || process.env.DISCORD_GUILD_ID;

    // Get current user data
    const { data: currentUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*, team:teams(id, name)')
      .eq('id', userId)
      .single();

    if (fetchError || !currentUser) {
      console.error('[BOT SYNC] User not found:', userId);
      return NextResponse.json(
        { error: 'User not found. Make sure the user has linked their account first.' },
        { status: 404 }
      );
    }

    const previousTeamId = currentUser.team_id;

    // Update user's team
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        team_id: team_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('*, team:teams(id, name)')
      .single();

    if (updateError) {
      console.error('[BOT SYNC] Error updating user team:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user team' },
        { status: 500 }
      );
    }

    // Create transaction history record
    const transactionData: any = {
      guild_id: guildId,
      transaction_type,
      player_id: userId,
      from_team_id: from_team_id || previousTeamId,
      to_team_id: team_id,
      performed_by: performed_by || 'Discord Bot',
      notes: notes || null,
    };

    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('transaction_history')
      .insert(transactionData)
      .select()
      .single();

    if (transactionError) {
      console.error('[BOT SYNC] Error creating transaction record:', transactionError);
      // Don't fail the request if transaction creation fails
      // The team update already succeeded
    }

    // Get team names for response
    let fromTeamName = 'Free Agency';
    let toTeamName = 'Free Agency';

    if (from_team_id || previousTeamId) {
      const { data: fromTeam } = await supabaseAdmin
        .from('teams')
        .select('name')
        .eq('id', from_team_id || previousTeamId)
        .single();
      if (fromTeam) fromTeamName = fromTeam.name;
    }

    if (team_id) {
      const { data: toTeam } = await supabaseAdmin
        .from('teams')
        .select('name')
        .eq('id', team_id)
        .single();
      if (toTeam) toTeamName = toTeam.name;
    }

    // Build response message
    let message = '';
    switch (transaction_type) {
      case 'sign':
        message = `${currentUser.username} signed to ${toTeamName}`;
        break;
      case 'release':
        message = `${currentUser.username} released from ${fromTeamName} to free agency`;
        break;
      case 'trade':
        message = `${currentUser.username} traded from ${fromTeamName} to ${toTeamName}`;
        break;
      case 'demand':
        message = `${currentUser.username} demanded release from ${fromTeamName}`;
        break;
    }

    console.log('[BOT SYNC] Success:', message);

    return NextResponse.json({
      success: true,
      message,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        previous_team: fromTeamName,
        current_team: toTeamName,
      },
      transaction: transaction || null,
    });

  } catch (error) {
    console.error('[BOT SYNC] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check if sync is working
 */
export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: '/api/bot/sync-team',
    description: 'Discord bot team synchronization endpoint',
    method: 'POST',
    requiredHeaders: ['X-Bot-Secret'],
    requiredFields: ['discord_id', 'transaction_type'],
    optionalFields: ['team_id', 'from_team_id', 'performed_by', 'notes', 'guild_id'],
  });
}
