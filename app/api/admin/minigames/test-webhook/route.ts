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
        userId: '123456789', // Fake Discord user ID
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
      const botResponse = await fetch(`${botApiUrl}/minigames/completion`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.BOT_SECRET_KEY || ''}`,
        },
        body: JSON.stringify(fakePayload),
      });

      const responseText = await botResponse.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      if (!botResponse.ok) {
        return NextResponse.json({ 
          success: false,
          error: 'Bot API returned an error',
          status: botResponse.status,
          response: responseData,
          sentData: fakePayload,
        }, { status: 200 }); // Return 200 so we can see the error
      }

      return NextResponse.json({ 
        success: true,
        message: 'Test webhook sent successfully to Discord bot!',
        botResponse: responseData,
        sentData: fakePayload,
      });
    } catch (botError: any) {
      return NextResponse.json({ 
        success: false,
        error: 'Failed to connect to Discord bot API',
        details: botError.message,
        botApiUrl: botApiUrl,
        sentData: fakePayload,
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
