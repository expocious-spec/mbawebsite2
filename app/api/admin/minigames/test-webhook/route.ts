import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Test Discord bot webhook with fake completion data
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Create fake completion data
    const fakePayload = {
      minigame: 'hoopgrids',
      minigameName: 'HoopGrids',
      player: {
        userId: '1116798128901865582', // Real Discord user ID for testing
        username: 'TestPlayer',
        discordUsername: 'TestPlayer#1234',
        minecraftUsername: 'TestMinecraftPlayer',
        minecraftUserId: 'abc123def456',
        avatarUrl: 'https://mc-heads.net/avatar/abc123def456',
      },
      completion: {
        puzzleDate: new Date().toISOString().split('T')[0],
        score: {
          correct: 9,
          total: 9,
          percentage: 100,
          isPerfect: true,
        },
        rarity: {
          score: 15.3,
          formatted: '15.3%',
        },
        time: {
          seconds: 142,
          formatted: '2m 22s',
        },
        rank: {
          position: 1,
          total: 5,
          formatted: '#1 of 5',
        },
      },
      timestamp: new Date().toISOString(),
    };

    // Send to Discord bot API
    const botApiUrl = process.env.DISCORD_BOT_API_URL;
    
    if (!botApiUrl) {
      return NextResponse.json({ 
        error: 'DISCORD_BOT_API_URL not configured in environment variables',
        fakeData: fakePayload,
      }, { status: 400 });
    }

    try {
      console.log(`[Test Webhook] Attempting to connect to: ${botApiUrl}/minigames/completion`);
      
      const botResponse = await fetch(`${botApiUrl}/minigames/completion`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.BOT_SECRET_KEY || ''}`,
        },
        body: JSON.stringify(fakePayload),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      console.log(`[Test Webhook] Response status: ${botResponse.status}`);
      
      const responseText = await botResponse.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      if (!botResponse.ok) {
        console.error(`[Test Webhook] Bot returned error: ${botResponse.status}`, responseData);
        return NextResponse.json({ 
          success: false,
          error: `Bot API returned HTTP ${botResponse.status}`,
          status: botResponse.status,
          response: responseData,
          sentData: fakePayload,
          endpoint: `${botApiUrl}/minigames/completion`,
          troubleshooting: [
            `Check if your bot has a POST endpoint at /minigames/completion`,
            `Verify the bot is running at ${botApiUrl}`,
            `Check bot logs for incoming request details`,
            `Ensure the endpoint returns a 200 status code`,
          ],
        }, { status: 200 }); // Return 200 so we can see the error
      }

      console.log(`[Test Webhook] Success!`, responseData);
      return NextResponse.json({ 
        success: true,
        message: '✅ Test webhook sent successfully to Discord bot!',
        botResponse: responseData,
        sentData: fakePayload,
        endpoint: `${botApiUrl}/minigames/completion`,
      });
    } catch (botError: any) {
      console.error(`[Test Webhook] Connection failed:`, botError);
      
      // Provide more specific error messages
      let errorDetails = botError.message;
      let troubleshooting = [
        `Verify your bot is running at ${botApiUrl}`,
        `Try accessing ${botApiUrl}/minigames/completion in a browser or Postman`,
        `Check your bot's console logs for any startup errors`,
      ];

      if (botError.message?.includes('ECONNREFUSED')) {
        errorDetails = 'Connection refused - bot is not accepting connections';
        troubleshooting.unshift('Your bot is not running or not listening on the specified port');
      } else if (botError.message?.includes('ETIMEDOUT')) {
        errorDetails = 'Connection timed out - bot took too long to respond';
        troubleshooting.unshift('Check if there\'s a firewall blocking the connection');
      } else if (botError.message?.includes('ENOTFOUND')) {
        errorDetails = 'Host not found - DNS lookup failed';
        troubleshooting.unshift('Check if the IP address is correct in DISCORD_BOT_API_URL');
      } else if (botError.message?.includes('aborted')) {
        errorDetails = 'Request timed out after 10 seconds';
        troubleshooting.unshift('Your bot might be running but not responding to requests');
      }

      return NextResponse.json({ 
        success: false,
        error: 'Failed to connect to Discord bot API',
        details: errorDetails,
        originalError: botError.message,
        botApiUrl: botApiUrl,
        endpoint: `${botApiUrl}/minigames/completion`,
        sentData: fakePayload,
        troubleshooting: troubleshooting,
      }, { status: 200 }); // Return 200 so we can see the error
    }
  } catch (error: any) {
    console.error('Error in test webhook handler:', error);
    return NextResponse.json({ 
      error: 'Failed to process test webhook',
      details: error.message,
    }, { status: 500 });
  }
}
