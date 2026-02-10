import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Get all transactions
export async function GET(request: NextRequest) {
  try {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        *,
        player:users!player_id (
          id,
          username,
          minecraft_username,
          minecraft_user_id,
          discord_username,
          avatar_url,
          coin_worth
        ),
        team:teams!team_id (
          id,
          name,
          logo,
          primary_color,
          secondary_color
        ),
        from_user:users!from_user_id (
          id,
          username,
          discord_username,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format the transactions for the frontend
    const formattedTransactions = (transactions || []).map((t: any) => ({
      id: t.id,
      type: t.type,
      playerId: t.player_id,
      teamId: t.team_id,
      fromUserId: t.from_user_id,
      title: t.title,
      description: t.description,
      contractOfferId: t.contract_offer_id,
      contractPrice: t.contract_price,
      role: t.role,
      previousRole: t.previous_role,
      status: t.status,
      createdAt: t.created_at,
      completedAt: t.completed_at,
      player: t.player ? {
        id: t.player.id,
        username: t.player.username,
        minecraftUsername: t.player.minecraft_username,
        minecraftUserId: t.player.minecraft_user_id,
        discordUsername: t.player.discord_username,
        avatarUrl: t.player.avatar_url,
        coinWorth: t.player.coin_worth,
      } : null,
      team: t.team ? {
        id: t.team.id,
        name: t.team.name,
        logo: t.team.logo,
        primaryColor: t.team.primary_color,
        secondaryColor: t.team.secondary_color,
      } : null,
      fromUser: t.from_user ? {
        id: t.from_user.id,
        username: t.from_user.username,
        discordUsername: t.from_user.discord_username,
        avatarUrl: t.from_user.avatar_url,
      } : null,
    }));

    return NextResponse.json(formattedTransactions);
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
