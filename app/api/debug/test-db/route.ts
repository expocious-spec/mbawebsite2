import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('[TEST DB] Testing database connection...');
    console.log('[TEST DB] SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('[TEST DB] SERVICE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    // Test basic query
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .limit(10);

    if (error) {
      console.error('[TEST DB] Error:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        details: error,
        hint: error.hint,
        code: error.code
      });
    }

    console.log(`[TEST DB] Successfully fetched ${users?.length || 0} users`);
    
    return NextResponse.json({ 
      success: true, 
      userCount: users?.length || 0,
      users: users
    });

  } catch (error: any) {
    console.error('[TEST DB] Exception:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    });
  }
}
