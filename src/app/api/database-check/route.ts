import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchTerm } = body;

    if (!searchTerm) {
      return NextResponse.json({ error: 'searchTerm required' }, { status: 400 });
    }

    // Initialize Supabase
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Search for apps containing the search term
    const { data: apps, error } = await supabaseAdmin
      .from('apps_unified')
      .select('app_id, title, description, primary_category, rating, rating_count')
      .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,primary_category.ilike.%${searchTerm}%`)
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also get total count
    const { count, error: countError } = await supabaseAdmin
      .from('apps_unified')
      .select('*', { count: 'exact', head: true })
      .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,primary_category.ilike.%${searchTerm}%`);

    return NextResponse.json({
      success: true,
      searchTerm,
      apps: apps || [],
      totalCount: count || 0,
      foundApps: (apps || []).length
    });

  } catch (error) {
    console.error('Database check error:', error);
    return NextResponse.json(
      { success: false, error: 'Database check failed' },
      { status: 500 }
    );
  }
}