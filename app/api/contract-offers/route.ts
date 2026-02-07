import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Fetch all contract offers or filter by player
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    const teamId = searchParams.get('teamId');

    let query = supabaseAdmin
      .from('contract_offers')
      .select(`
        *,
        player:users!contract_offers_player_id_fkey(id, username, avatar_url, discord_username, coin_worth),
        team:teams!contract_offers_team_id_fkey(id, name, logo, primary_color, secondary_color),
        franchise_owner:users!contract_offers_franchise_owner_id_fkey(id, username, avatar_url, discord_username)
      `)
      .order('created_at', { ascending: false });

    if (playerId) {
      query = query.eq('player_id', playerId);
    }

    if (teamId) {
      query = query.eq('team_id', teamId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching contract offers:', error);
      // Return empty array instead of error object for frontend compatibility
      return NextResponse.json([]);
    }

    // If no data, return empty array
    if (!data) {
      return NextResponse.json([]);
    }

    // Transform to camelCase
    const formattedOffers = data.map(offer => ({
      id: offer.id,
      playerId: offer.player_id,
      teamId: offer.team_id,
      franchiseOwnerId: offer.franchise_owner_id,
      contractPrice: offer.contract_price,
      status: offer.status,
      createdAt: offer.created_at,
      updatedAt: offer.updated_at,
      acceptedAt: offer.accepted_at,
      player: offer.player ? {
        id: offer.player.id,
        username: offer.player.username,
        avatarUrl: offer.player.avatar_url,
        discordUsername: offer.player.discord_username,
        coinWorth: offer.player.coin_worth,
      } : null,
      team: offer.team ? {
        id: offer.team.id,
        name: offer.team.name,
        logo: offer.team.logo,
        primaryColor: offer.team.primary_color,
        secondaryColor: offer.team.secondary_color,
      } : null,
      franchiseOwner: offer.franchise_owner ? {
        id: offer.franchise_owner.id,
        username: offer.franchise_owner.username,
        avatarUrl: offer.franchise_owner.avatar_url,
        discordUsername: offer.franchise_owner.discord_username,
      } : null,
    }));

    return NextResponse.json(formattedOffers);
  } catch (error) {
    console.error('Error in contract offers API:', error);
    // Return empty array instead of error object for frontend compatibility
    return NextResponse.json([]);
  }
}

// POST - Create new contract offer
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { playerId, teamId, franchiseOwnerId, contractPrice } = body;

    if (!playerId || !teamId || !franchiseOwnerId || !contractPrice) {
      return NextResponse.json({ 
        error: 'Missing required fields: playerId, teamId, franchiseOwnerId, contractPrice' 
      }, { status: 400 });
    }

    // Validate that contract price is at least the player's coin worth
    const { data: player, error: playerError } = await supabaseAdmin
      .from('users')
      .select('coin_worth')
      .eq('id', playerId)
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

    // Create the contract offer
    const { data, error } = await supabaseAdmin
      .from('contract_offers')
      .insert([{
        player_id: playerId,
        team_id: teamId,
        franchise_owner_id: franchiseOwnerId,
        contract_price: contractPrice,
        status: 'pending',
      }])
      .select(`
        *,
        player:users!contract_offers_player_id_fkey(id, username, avatar_url, discord_username, coin_worth),
        team:teams!contract_offers_team_id_fkey(id, name, logo, primary_color, secondary_color),
        franchise_owner:users!contract_offers_franchise_owner_id_fkey(id, username, avatar_url, discord_username)
      `)
      .single();

    if (error) {
      console.error('Database error creating contract offer:', error);
      return NextResponse.json({ error: 'Failed to create contract offer' }, { status: 500 });
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

    return NextResponse.json(formattedOffer, { status: 201 });
  } catch (error: any) {
    console.error('Error creating contract offer:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to create contract offer' 
    }, { status: 500 });
  }
}
