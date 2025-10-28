import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase/client';

// Helper function to get authenticated user from request
async function getAuthenticatedUser(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  console.log('Authorization header:', authorization ? 'Present' : 'Missing');
  
  if (!authorization) {
    return { user: null, error: 'No authorization header' };
  }

  const token = authorization.replace('Bearer ', '');
  console.log('Token length:', token.length);
  
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError) {
    console.error('Auth error:', authError);
    return { user: null, error: `Auth error: ${authError.message}` };
  }
  
  if (!user) {
    console.error('No user found');
    return { user: null, error: 'No user found' };
  }
  
  console.log('Authenticated user:', user.id, user.email);
  return { user, error: null };
}

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user
    const { user, error: authError } = await getAuthenticatedUser(request);
    
    if (authError || !user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    // Fetch user personalization data using admin client to bypass RLS
    const { data, error } = await supabaseAdmin
      .from('user_personalization')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching personalization:', error);
      return NextResponse.json({ error: 'Failed to fetch personalization data' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || null,
      hasCompleted: data?.completed_at ? true : false
    });

  } catch (error: any) {
    console.error('Error in GET /api/personalization:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/personalization - Starting...');
    
    // Get the authenticated user
    const { user, error: authError } = await getAuthenticatedUser(request);
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const body = await request.json();
    console.log('Request body:', body);
    const { nickname, gender, age, appInterests } = body;

    // Validate input
    if (!nickname || !gender || !age || !appInterests) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (age < 13 || age > 120) {
      return NextResponse.json({ error: 'Age must be between 13 and 120' }, { status: 400 });
    }

    // Process app interests - convert to array of keywords
    const processAppInterests = (text: string): string[] => {
      return text
        .toLowerCase()
        .split(/[,\s]+/) // Split by comma or space
        .map(item => item.trim())
        .filter(item => item.length > 0)
        .filter(item => item.length > 2) // Remove very short words
        .slice(0, 20); // Limit to 20 keywords
    };

    const appInterestsArray = processAppInterests(appInterests);

    // Prepare data for insertion/update
    const personalizationData = {
      user_id: user.id,
      email: user.email!,
      nickname: nickname.trim(),
      gender,
      age: parseInt(age),
      app_interests: appInterestsArray,
      app_interests_text: appInterests.trim(),
      completed_at: new Date().toISOString() // Explicitly set completion timestamp
    };

    console.log('Prepared data for upsert:', personalizationData);

    // Try to update existing record first, then insert if it doesn't exist using admin client
    const { data, error } = await supabaseAdmin
      .from('user_personalization')
      .upsert(personalizationData, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    console.log('Database operation result:', { data, error });

    if (error) {
      console.error('Error saving personalization:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json({ 
        error: 'Failed to save personalization data', 
        details: error.message || 'Unknown error',
        code: error.code 
      }, { status: 500 });
    }

    console.log('Personalization saved successfully, returning response with completed_at:', data?.completed_at);
    
    return NextResponse.json({
      success: true,
      data,
      message: 'Personalization saved successfully',
      hasCompleted: data?.completed_at ? true : false
    });

  } catch (error: any) {
    console.error('Error in POST /api/personalization:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get the authenticated user
    const { user, error: authError } = await getAuthenticatedUser(request);
    
    if (authError || !user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const body = await request.json();
    const { nickname, gender, age, appInterests } = body;

    // Validate input
    if (!nickname || !gender || !age || !appInterests) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (age < 13 || age > 120) {
      return NextResponse.json({ error: 'Age must be between 13 and 120' }, { status: 400 });
    }

    // Process app interests
    const processAppInterests = (text: string): string[] => {
      return text
        .toLowerCase()
        .split(/[,\s]+/)
        .map(item => item.trim())
        .filter(item => item.length > 0)
        .filter(item => item.length > 2)
        .slice(0, 20);
    };

    const appInterestsArray = processAppInterests(appInterests);

    // Update existing record using admin client
    const { data, error } = await supabaseAdmin
      .from('user_personalization')
      .update({
        nickname: nickname.trim(),
        gender,
        age: parseInt(age),
        app_interests: appInterestsArray,
        app_interests_text: appInterests.trim()
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating personalization:', error);
      return NextResponse.json({ error: 'Failed to update personalization data' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Personalization record not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Personalization updated successfully'
    });

  } catch (error: any) {
    console.error('Error in PUT /api/personalization:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}