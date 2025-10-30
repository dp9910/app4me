import { createClient } from '@/lib/supabase/server';
import { createClient as createClientWithAuth } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const supabase = createClient();
  
  // Try to get auth from headers first
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    // Create a new client with the access token for proper RLS context
    const authenticatedSupabase = createClientWithAuth(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );
    
    const { data: { user }, error: authError } = await authenticatedSupabase.auth.getUser();
    
    if (user) {
      const { data, error } = await authenticatedSupabase
        .from('user_app_interactions')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
      }

      return new NextResponse(JSON.stringify(data), { status: 200 });
    }
  }
  
  // Fallback to cookie auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { data, error } = await supabase
    .from('user_app_interactions')
    .select('*')
    .eq('user_id', user.id);

  if (error) {
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new NextResponse(JSON.stringify(data), { status: 200 });
}

export async function POST(req: Request) {
  const supabase = createClient();
  
  // Try to get auth from headers first
  const authHeader = req.headers.get('authorization');
  let user = null;
  let authenticatedSupabase = supabase;
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    // Create a new client with the access token for proper RLS context
    authenticatedSupabase = createClientWithAuth(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );
    
    const { data: { user: headerUser }, error: authError } = await authenticatedSupabase.auth.getUser();
    user = headerUser;
  }
  
  // Fallback to cookie auth if header auth failed
  if (!user) {
    const { data: { user: cookieUser }, error: authError } = await supabase.auth.getUser();
    user = cookieUser;
    authenticatedSupabase = supabase;
  }

  if (!user) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { app_id, liked, downloaded } = await req.json();

  const { data, error } = await authenticatedSupabase
    .from('user_app_interactions')
    .upsert({ user_id: user.id, app_id, liked, downloaded }, { onConflict: 'user_id, app_id' });

  if (error) {
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new NextResponse(JSON.stringify(data), { status: 200 });
}