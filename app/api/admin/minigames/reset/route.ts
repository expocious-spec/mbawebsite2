import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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

    // Get today's EST date
    const now = new Date();
    const estDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const today = `${estDate.getFullYear()}-${String(estDate.getMonth() + 1).padStart(2, '0')}-${String(estDate.getDate()).padStart(2, '0')}`;

    // Delete today's puzzle (if exists)
    const { error: deleteError } = await supabaseAdmin
      .from('hoopgrid_puzzles')
      .delete()
      .eq('puzzle_date', today);

    if (deleteError && deleteError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error deleting puzzle:', deleteError);
      return NextResponse.json(
        { error: 'Failed to reset puzzle' },
        { status: 500 }
      );
    }

    // Also delete any completions for today's puzzle
    // First get the puzzle ID (if it existed before deletion)
    const { data: completionsDeleted } = await supabaseAdmin
      .from('hoopgrid_attempts')
      .delete()
      .gte('created_at', `${today}T00:00:00Z`)
      .lt('created_at', `${today}T23:59:59Z`);

    return NextResponse.json({
      success: true,
      message: 'Minigames reset successfully. A new puzzle will be generated on next load.',
      date: today,
    });
  } catch (error) {
    console.error('Error resetting minigames:', error);
    return NextResponse.json(
      { error: 'Failed to reset minigames' },
      { status: 500 }
    );
  }
}
