import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing user_personalization table...');
    
    // Test if table exists and we can query it
    const { data, error } = await supabase
      .from('user_personalization')
      .select('*')
      .limit(1);

    console.log('Table query result:', { data, error });

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        code: error.code,
        details: error
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Table exists and is accessible',
      data: data || []
    });

  } catch (error: any) {
    console.error('Test error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Unknown error' 
    }, { status: 500 });
  }
}