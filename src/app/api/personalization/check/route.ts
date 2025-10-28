import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  console.log('--- Personalization Check API Start ---');
  try {
    // Get authorization header
    const authorization = request.headers.get('authorization');
    if (!authorization) {
      console.log('No authorization header found.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract token from Bearer header
    const token = authorization.replace('Bearer ', '');
    
    console.log('Getting user from token...');
    // Get the authenticated user using the token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    console.log('Got user from token.');
    
    if (authError || !user) {
      console.log('Auth error or no user.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Checking personalization in database...');
    // Check if user has completed personalization using admin client
    const { data, error } = await supabaseAdmin
      .from('user_personalization')
      .select('completed_at')
      .eq('user_id', user.id)
      .single();
    console.log('Checked personalization in database.');

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking personalization status:', error);
      return NextResponse.json({ error: 'Failed to check personalization status' }, { status: 500 });
    }

    const hasCompleted = data?.completed_at ? true : false;
    console.log('Personalization status:', hasCompleted);

    console.log('--- Personalization Check API End ---');
    return NextResponse.json({
      success: true,
      hasCompleted,
      needsPersonalization: !hasCompleted
    });

  } catch (error: any) {
    console.error('Error in GET /api/personalization/check:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}