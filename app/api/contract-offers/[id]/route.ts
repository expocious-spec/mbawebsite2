import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// PATCH - Update contract offer
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { contractPrice, status } = body;
    const offerId = params.id;

    if (contractPrice === undefined && status === undefined) {
      return NextResponse.json({ 
        error: 'At least one field (contractPrice or status) is required' 
      }, { status: 400 });
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (contractPrice !== undefined) {
      // Validate contract price if provided
      const { data: offer, error: offerError } = await supabaseAdmin
        .from('contract_offers')
        .select('player_id')
        .eq('id', offerId)
        .single();

      if (offerError || !offer) {
        return NextResponse.json({ error: 'Contract offer not found' }, { status: 404 });
      }

      const { data: player, error: playerError } = await supabaseAdmin
        .from('users')
        .select('coin_worth')
        .eq('id', offer.player_id)
        .single();

      if (playerError || !player) {
        return NextResponse.json({ error: 'Player not found' }, { status: 404 });
      }

      const minPrice = player.coin_worth || 0;
      if (contractPrice < minPrice) {
        return NextResponse.json({ 
          error: `Contract price must be at least ${minPrice} (player's current coin worth)` 
        }, { status: 400 });
      }

      updateData.contract_price = contractPrice;
    }

    if (status !== undefined) {
      // Validate status
      const validStatuses = ['pending', 'accepted', 'rejected', 'expired'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ 
          error: `Status must be one of: ${validStatuses.join(', ')}` 
        }, { status: 400 });
      }

      updateData.status = status;

      // Set accepted_at if status is being changed to accepted
      if (status === 'accepted') {
        updateData.accepted_at = new Date().toISOString();
      }
    }

    // Update the contract offer
    const { data, error } = await supabaseAdmin
      .from('contract_offers')
      .update(updateData)
      .eq('id', offerId)
      .select(`
        *,
        player:users!contract_offers_player_id_fkey(id, username, avatar_url, discord_username, coin_worth, minecraft_user_id),
        team:teams!contract_offers_team_id_fkey(id, name, logo, primary_color, secondary_color),
        franchise_owner:users!contract_offers_franchise_owner_id_fkey(id, username, avatar_url, discord_username)
      `)
      .single();

    if (error) {
      console.error('Database error updating contract offer:', error);
      return NextResponse.json({ error: 'Failed to update contract offer' }, { status: 500 });
    }

    // Transform to camelCase
    const formattedOffer = {
      id: data.id,
      playerId: data.player_id,
      teamId: data.team_id,
      franchiseOwnerId: data.franchise_owner_id,
      contractPrice: data.contract_price,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      acceptedAt: data.accepted_at,
      player: data.player ? {
        id: data.player.id,
        username: data.player.username,
        avatarUrl: data.player.avatar_url,
        discordUsername: data.player.discord_username,
        coinWorth: data.player.coin_worth,
        minecraftUserId: data.player.minecraft_user_id,
      } : null,
      team: data.team ? {
        id: data.team.id,
        name: data.team.name,
        logo: data.team.logo,
        primaryColor: data.team.primary_color,
        secondaryColor: data.team.secondary_color,
      } : null,
      franchiseOwner: data.franchise_owner ? {
        id: data.franchise_owner.id,
        username: data.franchise_owner.username,
        avatarUrl: data.franchise_owner.avatar_url,
        discordUsername: data.franchise_owner.discord_username,
      } : null,
    };

    return NextResponse.json(formattedOffer);
  } catch (error: any) {
    console.error('Error updating contract offer:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to update contract offer' 
    }, { status: 500 });
  }
}

// DELETE - Delete contract offer
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const offerId = params.id;

    const { error } = await supabaseAdmin
      .from('contract_offers')
      .delete()
      .eq('id', offerId);

    if (error) {
      console.error('Database error deleting contract offer:', error);
      return NextResponse.json({ error: 'Failed to delete contract offer' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Contract offer deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting contract offer:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to delete contract offer' 
    }, { status: 500 });
  }
}
