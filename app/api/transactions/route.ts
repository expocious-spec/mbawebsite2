import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - Get all transactions (both website and Discord bot)
export async function GET(request: NextRequest) {
  try {
    // Fetch website transactions
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

    // Fetch Discord bot transactions
    const { data: botTransactions, error: botError } = await supabase
      .from('transaction_history')
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
        from_team:teams!from_team_id (
          id,
          name,
          logo,
          primary_color,
          secondary_color
        ),
        to_team:teams!to_team_id (
          id,
          name,
          logo,
          primary_color,
          secondary_color
        )
      `)
      .order('created_at', { ascending: false });

    if (botError) {
      console.error('Bot transactions error:', botError);
      // Don't fail the request, just log the error
    }

    // Format website transactions
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
      source: 'website',
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

    // Format Discord bot transactions
    const formattedBotTransactions = (botTransactions || []).map((t: any) => {
      // Generate title and description based on transaction type
      let title = '';
      let description = '';
      
      switch (t.transaction_type) {
        case 'sign':
          title = 'Player Signed';
          description = `${t.player?.username || 'Player'} signed to ${t.to_team?.name || 'team'}`;
          break;
        case 'release':
          title = 'Player Released';
          description = `${t.player?.username || 'Player'} released from ${t.from_team?.name || 'team'} to free agency`;
          break;
        case 'trade':
          title = 'Player Traded';
          description = `${t.player?.username || 'Player'} traded from ${t.from_team?.name || 'team'} to ${t.to_team?.name || 'team'}`;
          break;
        case 'demand':
          title = 'Release Demand';
          description = `${t.player?.username || 'Player'} demanded release from ${t.from_team?.name || 'team'}`;
          break;
      }

      if (t.notes) {
        description += ` - ${t.notes}`;
      }

      return {
        id: `bot-${t.id}`,
        type: t.transaction_type,
        playerId: t.player_id,
        teamId: t.to_team_id,
        fromTeamId: t.from_team_id,
        title,
        description,
        performedBy: t.performed_by,
        status: 'completed',
        createdAt: t.created_at,
        completedAt: t.created_at,
        source: 'discord',
        player: t.player ? {
          id: t.player.id,
          username: t.player.username,
          minecraftUsername: t.player.minecraft_username,
          minecraftUserId: t.player.minecraft_user_id,
          discordUsername: t.player.discord_username,
          avatarUrl: t.player.avatar_url,
          coinWorth: t.player.coin_worth,
        } : null,
        team: t.to_team ? {
          id: t.to_team.id,
          name: t.to_team.name,
          logo: t.to_team.logo,
          primaryColor: t.to_team.primary_color,
          secondaryColor: t.to_team.secondary_color,
        } : null,
        fromTeam: t.from_team ? {
          id: t.from_team.id,
          name: t.from_team.name,
          logo: t.from_team.logo,
          primaryColor: t.from_team.primary_color,
          secondaryColor: t.from_team.secondary_color,
        } : null,
      };
    });

    // Merge and sort by date
    const allTransactions = [...formattedTransactions, ...formattedBotTransactions].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json(allTransactions);
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete a transaction (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('id');
    const transactionType = searchParams.get('type');
    
    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    // If it's a contract transaction, delete from contract_offers table
    if (transactionType === 'contract' && transactionId.startsWith('contract-')) {
      const contractId = transactionId.replace('contract-', '');
      const { error } = await supabaseAdmin
        .from('contract_offers')
        .delete()
        .eq('id', contractId);

      if (error) {
        console.error('Contract offer deletion error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } 
    // If it's a Discord bot transaction, delete from transaction_history table
    else if (transactionId.startsWith('bot-')) {
      const botTransactionId = transactionId.replace('bot-', '');
      const { error } = await supabaseAdmin
        .from('transaction_history')
        .delete()
        .eq('id', botTransactionId);

      if (error) {
        console.error('Bot transaction deletion error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
    // Otherwise, delete from transactions table
    else {
      const { error } = await supabaseAdmin
        .from('transactions')
        .delete()
        .eq('id', transactionId);

      if (error) {
        console.error('Transaction deletion error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error: any) {
    console.error('DELETE transactions error:', error);
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 });
  }
}
