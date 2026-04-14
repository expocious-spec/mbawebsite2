import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const WEBHOOK_URL = 'https://discord.com/api/webhooks/1493635560198242406/ZCb0813Cx6Y-E3cp06UqTIIZEuNM-t89T13fT5tgVN14b5zH63exU2AfA_zQDdE1d0hs';

export async function POST(req: NextRequest) {
  try {
    const { gameId } = await req.json();

    if (!gameId) {
      return NextResponse.json({ error: 'Game ID is required' }, { status: 400 });
    }

    // Get the base URL from the request or environment
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const host = req.headers.get('host') || 'localhost:3000';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`;
    const boxScoreUrl = `${baseUrl}/games/${gameId}`;

    // Fetch game details
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Fetch teams
    const { data: homeTeam, error: homeError } = await supabase
      .from('teams')
      .select('name, logo')
      .eq('id', game.home_team_id)
      .single();

    const { data: awayTeam, error: awayError } = await supabase
      .from('teams')
      .select('name, logo')
      .eq('id', game.away_team_id)
      .single();

    if (!homeTeam || !awayTeam) {
      console.error('Teams fetch error:', { homeError, awayError, homeTeamId: game.home_team_id, awayTeamId: game.away_team_id });
      return NextResponse.json({ 
        error: 'Teams not found',
        details: { homeFound: !!homeTeam, awayFound: !!awayTeam }
      }, { status: 404 });
    }

    // Generate abbreviations from team names
    const homeAbbr = homeTeam.name.substring(0, 3).toUpperCase();
    const awayAbbr = awayTeam.name.substring(0, 3).toUpperCase();

    // Fetch player of the game if exists
    let potgPlayer = null;
    let potgStats = null;
    if (game.player_of_game_id) {
      console.log('POTG ID found:', game.player_of_game_id);
      
      const { data: player, error: playerError } = await supabase
        .from('users')
        .select('username, minecraft_username, team_id')
        .eq('id', game.player_of_game_id)
        .single();

      const { data: stats, error: statsError } = await supabase
        .from('player_game_stats')
        .select('*')
        .eq('game_id', gameId)
        .eq('player_id', game.player_of_game_id)
        .single();

      console.log('POTG Player:', player, 'Error:', playerError);
      console.log('POTG Stats:', stats, 'Error:', statsError);

      potgPlayer = player;
      potgStats = stats;
    } else {
      console.log('No POTG ID found for game:', gameId);
    }

    // Format the date
    const gameDate = new Date(game.scheduled_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    // Build Discord embed
    const embed: any = {
      title: '🏀 MBA Scores',
      description: `**${awayAbbr} ${game.away_score} — ${game.home_score} ${homeAbbr}**\n\n${game.is_forfeit ? '⚠️ **FORFEIT**' : '✅ **FINAL**'} • ${gameDate}`,
      color: 0x1E40AF, // Blue color
      fields: [],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'MBA League'
      }
    };

    // Add team info as thumbnail (use winner's logo)
    const winningTeam = game.home_score > game.away_score ? homeTeam : awayTeam;
    if (winningTeam.logo) {
      embed.thumbnail = {
        url: winningTeam.logo
      };
    }

    // Add Player of the Game if exists
    if (potgPlayer && potgStats) {
      const playerName = potgPlayer.minecraft_username || potgPlayer.username;
      embed.fields.push({
        name: '🏆 Player of the Game',
        value: `**${playerName}**\n${potgStats.points || 0} PTS • ${potgStats.rebounds || 0} REB • ${potgStats.assists || 0} AST • ${potgStats.steals || 0} STL • ${potgStats.blocks || 0} BLK`,
        inline: false
      });
    }

    // Add box score link
    embed.fields.push({
      name: '📊 Full Box Score',
      value: `[View Details](${boxScoreUrl})`,
      inline: false
    });

    // Send to Discord webhook
    const discordResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [embed]
      })
    });

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text();
      console.error('Discord webhook error:', errorText);
      return NextResponse.json({ error: 'Failed to send Discord embed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Embed sent successfully' });

  } catch (error) {
    console.error('Error sending Discord embed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
