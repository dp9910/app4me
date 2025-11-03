import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user using server client
    const supabase = createClient();
    
    // Try to get the session first
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      console.log('Session error or no user:', sessionError, !!session?.user);
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const user = session.user;

    // Fetch liked apps with interaction details
    const { data: likedApps, error: likedAppsError } = await supabase
      .from('swipe_interactions')
      .select(`
        app_bundle_id,
        app_name,
        app_category,
        search_query,
        created_at,
        session_id,
        card_position
      `)
      .eq('user_id', user.id)
      .eq('interaction_type', 'like')
      .order('created_at', { ascending: false });

    if (likedAppsError) {
      console.error('Error fetching liked apps:', likedAppsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch liked apps' },
        { status: 500 }
      );
    }

    // Fetch session statistics
    const { data: sessionStats, error: sessionStatsError } = await supabase
      .from('swipe_sessions')
      .select(`
        id,
        search_query,
        total_apps_shown,
        total_likes,
        total_passes,
        completed,
        session_duration_ms,
        completion_reason,
        started_at
      `)
      .eq('user_id', user.id)
      .order('started_at', { ascending: false });

    if (sessionStatsError) {
      console.error('Error fetching session stats:', sessionStatsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch session stats' },
        { status: 500 }
      );
    }

    // Calculate aggregated statistics
    const totalSessions = sessionStats?.length || 0;
    const completedSessions = sessionStats?.filter(s => s.completed).length || 0;
    const totalLikes = sessionStats?.reduce((sum, s) => sum + (s.total_likes || 0), 0) || 0;
    const totalPasses = sessionStats?.reduce((sum, s) => sum + (s.total_passes || 0), 0) || 0;
    const totalInteractions = totalLikes + totalPasses;
    const avgSessionDuration = sessionStats?.length > 0 
      ? sessionStats.reduce((sum, s) => sum + (s.session_duration_ms || 0), 0) / sessionStats.length 
      : 0;

    // Group liked apps by search category
    const categoriesMap = new Map<string, {
      category: string;
      search_query: string;
      app_count: number;
      last_searched: string;
    }>();

    likedApps?.forEach(app => {
      const key = app.search_query;
      if (categoriesMap.has(key)) {
        const existing = categoriesMap.get(key)!;
        existing.app_count += 1;
        if (new Date(app.created_at) > new Date(existing.last_searched)) {
          existing.last_searched = app.created_at;
        }
      } else {
        categoriesMap.set(key, {
          category: key,
          search_query: key,
          app_count: 1,
          last_searched: app.created_at
        });
      }
    });

    const categories = Array.from(categoriesMap.values())
      .sort((a, b) => new Date(b.last_searched).getTime() - new Date(a.last_searched).getTime());

    // Prepare recent activity from sessions
    const recentActivity = sessionStats?.slice(0, 10).map(session => ({
      date: session.started_at,
      search_query: session.search_query,
      total_apps_shown: session.total_apps_shown || 0,
      likes: session.total_likes || 0,
      passes: session.total_passes || 0,
      completed: session.completed || false,
      completion_reason: session.completion_reason,
      duration_ms: session.session_duration_ms
    })) || [];

    // Format liked apps data
    const formattedLikedApps = likedApps?.map(app => ({
      app_id: app.app_bundle_id,
      app_name: app.app_name,
      app_category: app.app_category || 'Unknown',
      search_query: app.search_query,
      swiped_at: app.created_at,
      session_id: app.session_id,
      card_position: app.card_position
      // Note: We don't have icon URLs in our swipe_interactions table
      // You might want to join with an apps table if you have one
    })) || [];

    const analytics = {
      likedApps: formattedLikedApps,
      categories,
      sessionStats: {
        total_sessions: totalSessions,
        completed_sessions: completedSessions,
        completion_rate: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0,
        total_likes: totalLikes,
        total_passes: totalPasses,
        like_rate: totalInteractions > 0 ? (totalLikes / totalInteractions) * 100 : 0,
        avg_session_duration: Math.round(avgSessionDuration / 1000) // Convert to seconds
      },
      recentActivity
    };

    return NextResponse.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Error fetching swipe analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}