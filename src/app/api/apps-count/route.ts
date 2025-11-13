import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Use service role key for server-side access without auth
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Get the count of apps from apps_unified table
    const { count, error } = await supabase
      .from('apps_unified')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Error fetching apps count:', error);
      // Return fallback count on error
      return NextResponse.json({
        success: true,
        count: 9020,
        fallback: true
      });
    }

    return NextResponse.json({
      success: true,
      count: count || 9020,
      fallback: !count
    });

  } catch (error) {
    console.error('Apps count API error:', error);
    // Return fallback count on any error
    return NextResponse.json({
      success: true,
      count: 9020,
      fallback: true
    });
  }
}