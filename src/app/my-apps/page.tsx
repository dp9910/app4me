'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/ui/Navigation';

interface SwipeAnalytics {
  allApps: SwipedApp[];
  queries: QueryStats[];
  sessionStats: SessionStats;
  recentActivity: RecentActivity[];
}

interface SwipedApp {
  app_id: string;
  app_name: string;
  app_category: string;
  icon_url?: string;
  search_query: string;
  swiped_at: string;
  session_id: string;
  card_position?: number;
  rating?: number;
  description?: string;
  interaction_type: 'like' | 'pass';
  
  // Rich data from apps_unified
  developer?: string;
  price?: number;
  formatted_price?: string;
  rating_count?: number;
  icon_url_hd?: string;
  screenshots?: string[];
  primary_category?: string;
  genres?: string[];
  size_bytes?: number;
  version?: string;
  age_rating?: string;
  data_quality_score?: number;
  
  // Rich data from app_features (disabled until table exists)
  // metadata_category_primary?: string;
  // llm_primary_use_case?: string;
  // llm_complexity_level?: string;
  quality_signals?: number;
  // category_scores?: {
  //   productivity?: number;
  //   finance?: number;
  //   health?: number;
  //   entertainment?: number;
  //   education?: number;
  // };
  llm_primary_use_case?: string;
  llm_emotional_tone?: string;
  llm_best_for_keywords?: string[];
  llm_target_personas?: string[];
  llm_key_features?: string[];
}

interface QueryStats {
  search_query: string;
  liked_count: number;
  disliked_count: number;
  total_count: number;
  last_searched: string;
}

interface SessionStats {
  total_sessions: number;
  completed_sessions: number;
  completion_rate: number;
  total_likes: number;
  total_passes: number;
  like_rate: number;
  avg_session_duration: number;
}

interface RecentActivity {
  date: string;
  search_query: string;
  total_apps_shown: number;
  likes: number;
  passes: number;
  completed: boolean;
}

export default function MyAppsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<SwipeAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuery, setSelectedQuery] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
      return;
    }

    if (user) {
      fetchAnalytics();
    }
  }, [user, loading, router]);

  const fetchAnalytics = async () => {
    if (!user) return;
    
    try {
      setError(null);
      
      // For now, let's fetch data directly from the client
      const { supabase } = await import('@/lib/supabase/client');
      
      // Fetch all swipe interactions (both likes and passes)
      const { data: allApps, error: allAppsError } = await supabase
        .from('swipe_interactions')
        .select(`
          app_bundle_id,
          app_name,
          app_category,
          search_query,
          created_at,
          session_id,
          card_position,
          interaction_type
        `)
        .eq('user_id', user.id)
        .in('interaction_type', ['like', 'pass'])
        .order('created_at', { ascending: false });

      if (allAppsError) {
        console.error('Error fetching apps:', allAppsError);
        setError('Failed to fetch app data');
        return;
      }

      // Get unique app bundle IDs to fetch app details
      const appBundleIds = [...new Set(allApps?.map(app => app.app_bundle_id) || [])];
      
      console.log('App bundle IDs from swipe_interactions:', appBundleIds);
      console.log('Sample bundle ID:', appBundleIds[0], 'type:', typeof appBundleIds[0]);
      
      // Fetch app details from apps_unified table
      let appDetailsMap = new Map();
      if (appBundleIds.length > 0) {
        // Fetch comprehensive app details from apps_unified table
        const { data: appDetails, error: appDetailsError } = await supabase
          .from('apps_unified')
          .select(`
            id,
            title,
            developer,
            price,
            formatted_price,
            rating,
            rating_count,
            icon_url,
            icon_url_hd,
            screenshots,
            description,
            primary_category,
            all_categories,
            genres,
            size_bytes,
            version,
            age_rating,
            data_quality_score,
            total_appearances,
            avg_rank,
            best_rank
          `)
          .in('id', appBundleIds);

        console.log('App details from apps_unified (by id):', appDetails);
        console.log('Sample app detail structure:', appDetails?.[0]);

        if (appDetailsError) {
          console.error('Error fetching app details by id:', appDetailsError);
        } else if (appDetails && appDetails.length > 0) {
          appDetails.forEach(app => {
            // Store with both string and number versions to handle type mismatches
            appDetailsMap.set(app.id, app);
            appDetailsMap.set(String(app.id), app);
            appDetailsMap.set(Number(app.id), app);
            console.log(`Mapped app: id=${app.id}, title=${app.title}`);
          });
        }

        // If no matches by id, try title matching as fallback
        if (appDetailsMap.size === 0 && allApps) {
          const appNames = [...new Set(allApps.map(app => app.app_name).filter(name => name))];
          if (appNames.length > 0) {
            const titleConditions = appNames
              .map(name => `title.ilike.%${name}%`)
              .join(',');
            
            const { data: titleMatches, error: titleError } = await supabase
              .from('apps_unified')
              .select(`
                id,
                title,
                developer,
                price,
                formatted_price,
                rating,
                rating_count,
                icon_url,
                icon_url_hd,
                screenshots,
                description,
                primary_category,
                all_categories,
                genres,
                size_bytes,
                version,
                age_rating,
                data_quality_score
              `)
              .or(titleConditions)
              .limit(50);

            console.log('App details from title matching:', titleMatches);

            if (!titleError && titleMatches) {
              // Match by app name similarity
              allApps.forEach(swipeApp => {
                const match = titleMatches.find(unifiedApp => 
                  unifiedApp.title.toLowerCase().includes(swipeApp.app_name.toLowerCase()) ||
                  swipeApp.app_name.toLowerCase().includes(unifiedApp.title.toLowerCase())
                );
                if (match) {
                  appDetailsMap.set(swipeApp.app_bundle_id, match);
                }
              });
            }
          }
        }
      }
      
      console.log('Final app details map size:', appDetailsMap.size);

      // Skip features for now since table doesn't exist
      let appFeaturesMap = new Map();
      console.log('Skipping app_features table (not available yet)');

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
        setError('Failed to fetch session stats');
        return;
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

      // Group apps by search query and count likes/dislikes
      const queriesMap = new Map<string, {
        search_query: string;
        liked_count: number;
        disliked_count: number;
        total_count: number;
        last_searched: string;
      }>();

      allApps?.forEach(app => {
        const key = app.search_query;
        if (queriesMap.has(key)) {
          const existing = queriesMap.get(key)!;
          if (app.interaction_type === 'like') {
            existing.liked_count += 1;
          } else {
            existing.disliked_count += 1;
          }
          existing.total_count += 1;
          if (new Date(app.created_at) > new Date(existing.last_searched)) {
            existing.last_searched = app.created_at;
          }
        } else {
          queriesMap.set(key, {
            search_query: key,
            liked_count: app.interaction_type === 'like' ? 1 : 0,
            disliked_count: app.interaction_type === 'pass' ? 1 : 0,
            total_count: 1,
            last_searched: app.created_at
          });
        }
      });

      const queries = Array.from(queriesMap.values())
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

      // Format all apps data with rich details from both apps_unified and app_features
      const formattedAllApps = allApps?.map(app => {
        const appDetails = appDetailsMap.get(app.app_bundle_id);
        const appFeatures = appFeaturesMap.get(app.app_bundle_id);
        console.log(`Formatting app ${app.app_name} (${app.app_bundle_id}):`, {
          hasAppDetails: !!appDetails,
          hasAppFeatures: !!appFeatures,
          icon_url: appDetails?.icon_url,
          title: appDetails?.title,
          primary_use_case: appFeatures?.primary_use_case
        });
        
        return {
          app_id: app.app_bundle_id,
          app_name: app.app_name || appDetails?.title || 'Unknown App',
          app_category: app.app_category || appDetails?.primary_category || 'Unknown',
          search_query: app.search_query,
          swiped_at: app.created_at,
          session_id: app.session_id,
          card_position: app.card_position,
          interaction_type: app.interaction_type,
          
          // Rich data from apps_unified
          developer: appDetails?.developer,
          price: appDetails?.price,
          formatted_price: appDetails?.formatted_price,
          rating: appDetails?.rating,
          rating_count: appDetails?.rating_count,
          icon_url: appDetails?.icon_url,
          icon_url_hd: appDetails?.icon_url_hd,
          screenshots: appDetails?.screenshots,
          description: appDetails?.description,
          primary_category: appDetails?.primary_category,
          genres: appDetails?.genres,
          size_bytes: appDetails?.size_bytes,
          version: appDetails?.version,
          age_rating: appDetails?.age_rating,
          data_quality_score: appDetails?.data_quality_score,
          
          // Rich data from app_features (disabled until table exists)
          // metadata_category_primary: appFeatures?.metadata_category_primary,
          // llm_primary_use_case: appFeatures?.llm_primary_use_case,
          // llm_complexity_level: appFeatures?.llm_complexity_level,
        };
      }) || [];
      
      console.log('Formatted all apps with rich data:', formattedAllApps.map(app => ({
        name: app.app_name,
        has_icon: !!app.icon_url,
        has_description: !!app.description,
        developer: app.developer,
        rating: app.rating,
        primary_use_case: app.primary_use_case,
        interaction: app.interaction_type
      })));

      const analyticsData = {
        allApps: formattedAllApps,
        queries,
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

      setAnalytics(analyticsData);
      
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Unable to load your app data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const removeApp = async (sessionId: string, appId: string) => {
    if (!analytics) return;
    
    try {
      // Optimistically update UI
      const updatedAllApps = analytics.allApps.filter(
        app => !(app.session_id === sessionId && app.app_id === appId)
      );
      
      setAnalytics({
        ...analytics,
        allApps: updatedAllApps
      });

      // You could add an API call here to actually remove from database
      // For now, this is just a local state update
      
    } catch (error) {
      console.error('Error removing app:', error);
      // Revert the optimistic update
      fetchAnalytics();
    }
  };

  if (loading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative flex h-screen w-full flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">😞</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Unable to Load Your Apps
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error}
            </p>
            <button
              onClick={() => {
                setError(null);
                setIsLoading(true);
                fetchAnalytics();
              }}
              className="bg-primary hover:bg-primary/90 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getAppsForQuery = (searchQuery: string) => {
    return analytics?.allApps.filter(app => app.search_query === searchQuery) || [];
  };

  return (
    <div className="relative flex h-screen w-full flex-col group/design-root overflow-hidden">
      <Navigation />
      
      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
          <div className="flex flex-wrap justify-between gap-3 items-center mb-8">
            <h1 className="text-gray-900 dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">
              My Apps
            </h1>
            
            {/* Enhanced Quick Stats */}
            {analytics?.sessionStats && analytics?.allApps && (
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {analytics.sessionStats.total_likes}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Liked Apps</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">
                    {Math.round(analytics.sessionStats.completion_rate)}%
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Completion Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-500">
                    {Math.round(analytics.sessionStats.like_rate)}%
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Like Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-500">
                    {(() => {
                      const appsWithRating = analytics.allApps.filter(app => app.rating && app.rating > 0);
                      const avgRating = appsWithRating.length > 0 ? 
                        appsWithRating.reduce((sum, app) => sum + (app.rating || 0), 0) / appsWithRating.length : 0;
                      return avgRating > 0 ? avgRating.toFixed(1) : 'N/A';
                    })()}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Avg Rating</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-500">
                    {analytics.allApps.filter(app => app.developer).length}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">With Developer</div>
                </div>
              </div>
            )}
          </div>

          {/* Empty State */}
          {!analytics?.allApps.length ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
              <div className="p-4 bg-primary/10 rounded-full mb-4">
                <span className="text-5xl">🔍</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Your App Collection is Empty</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md text-center">
                Start discovering new apps! As you 'like' apps during swipe sessions, they'll appear here, organized by your search queries.
              </p>
              <button
                onClick={() => router.push('/swipe')}
                className="mt-6 flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 bg-primary text-white gap-2 text-base font-bold leading-normal tracking-[0.015em] min-w-0 px-6 hover:bg-primary/90 transition-colors"
              >
                Start Discovering
              </button>
            </div>
          ) : selectedQuery ? (
            /* Selected Query View */
            <div>
              <button
                onClick={() => setSelectedQuery(null)}
                className="flex items-center gap-2 mb-6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <span className="text-xl">←</span>
                Back to queries
              </button>
              
              <h2 className="text-gray-900 dark:text-white text-3xl font-bold mb-6">
                "{formatCategoryName(selectedQuery)}" Apps
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {getAppsForQuery(selectedQuery).map((app) => (
                  <AppCard 
                    key={`${app.session_id}-${app.app_id}`} 
                    app={app} 
                    onRemove={removeApp}
                  />
                ))}
              </div>
            </div>
          ) : (
            /* Queries Grid View */
            <div>
              <h2 className="text-gray-900 dark:text-white text-2xl font-bold mb-6">
                Your Search Queries
              </h2>
              
              <div className="space-y-4">
                {analytics?.queries.map((query) => (
                  <QueryCard 
                    key={query.search_query} 
                    query={query} 
                    onSelect={() => setSelectedQuery(query.search_query)}
                    analytics={analytics}
                  />
                ))}
              </div>
            </div>
          )}
        </main>
    </div>
  );
}

// Helper Components
function QueryCard({ query, onSelect, analytics }: { query: QueryStats; onSelect: () => void; analytics: SwipeAnalytics | null }) {
  const queryApps = analytics?.allApps.filter(app => app.search_query === query.search_query) || [];
  
  // Calculate insights from the apps in this query
  const avgRating = queryApps.length > 0 ? 
    queryApps.reduce((sum, app) => sum + (app.rating || 0), 0) / queryApps.filter(app => app.rating).length : 0;
  
  // Simplified without features data
  const topCategories = {};
  
  const topCategory = Object.entries(topCategories)
    .sort(([,a], [,b]) => b - a)[0];
  
  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      productivity: '⚡',
      finance: '💰',
      health: '🏃',
      entertainment: '🎮',
      education: '📚'
    };
    return icons[category] || '📱';
  };
  
  const qualityApps = 0; // Disabled until features table exists
  
  return (
    <div 
      onClick={onSelect}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] hover:border-primary/50"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-4xl">{getCategoryIcon(query.search_query)}</span>
          <div>
            <h3 className="text-gray-900 dark:text-white text-2xl font-bold">
              {formatCategoryName(query.search_query)}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Last searched {new Date(query.last_searched).toLocaleDateString()}
            </p>
            
            {/* Query Insights */}
            <div className="flex items-center gap-4 mt-2">
              {avgRating > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-amber-500 text-sm">⭐</span>
                  <span className="text-gray-600 dark:text-gray-400 text-sm">
                    {avgRating.toFixed(1)} avg
                  </span>
                </div>
              )}
              
              {topCategory && (
                <div className="flex items-center gap-1">
                  <span className="text-sm">{getCategoryIcon(topCategory[0])}</span>
                  <span className="text-gray-600 dark:text-gray-400 text-sm">
                    {topCategory[0]}
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-1">
                <span className="text-blue-500 text-sm">📱</span>
                <span className="text-gray-600 dark:text-gray-400 text-sm">
                  {query.total_count} apps total
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-green-500 text-2xl">👍</span>
              <span className="text-green-500 font-bold text-2xl">{query.liked_count}</span>
            </div>
            <span className="text-gray-500 dark:text-gray-400 text-sm">Liked</span>
          </div>
          
          <div className="text-center">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-red-500 text-2xl">👎</span>
              <span className="text-red-500 font-bold text-2xl">{query.disliked_count}</span>
            </div>
            <span className="text-gray-500 dark:text-gray-400 text-sm">Passed</span>
          </div>
          
          <div className="text-center">
            <div className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-1">
              {query.total_count}
            </div>
            <span className="text-gray-500 dark:text-gray-400 text-sm">Total</span>
          </div>
          
          <div className="text-gray-400 dark:text-gray-500">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppCard({ app, onRemove }: { app: SwipedApp; onRemove: (sessionId: string, appId: string) => void }) {
  const router = useRouter();
  const isLiked = app.interaction_type === 'like';
  
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return null;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 10) / 10 + ' ' + sizes[i];
  };
  
  // Simplified without features data
  const topCategory = null;
  
  return (
    <div className={`flex h-full w-full flex-col gap-4 rounded-xl shadow-sm border group transition-transform duration-300 hover:scale-105 ${
      isLiked 
        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' 
        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
    }`}>
      <div 
        className="w-full bg-center bg-no-repeat aspect-video bg-cover rounded-t-xl flex items-center justify-center relative"
        style={{ 
          backgroundColor: '#f3f4f6'
        }}
      >
        {app.icon_url_hd || app.icon_url ? (
          <img 
            src={app.icon_url_hd || app.icon_url} 
            alt={app.app_name}
            className="w-24 h-24 rounded-2xl shadow-lg"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = app.icon_url || '/default-app-icon.png';
            }}
          />
        ) : (
          <div className="w-24 h-24 rounded-2xl bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
            <span className="text-3xl">📱</span>
          </div>
        )}
        
        {/* Price Badge */}
        {app.formatted_price && (
          <div className="absolute top-2 right-2 bg-primary text-white text-xs font-bold px-2 py-1 rounded-full">
            {app.formatted_price}
          </div>
        )}
        
        {/* Quality Score Badge */}
        {app.quality_signals && app.quality_signals > 0.7 && (
          <div className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            ⭐ {Math.round(app.quality_signals * 100)}%
          </div>
        )}
      </div>
      
      <div className="flex flex-col flex-1 justify-between p-4 pt-0 gap-3">
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-900 dark:text-white text-base font-medium leading-normal">
              {app.app_name}
            </p>
            <span className={`text-xl ${isLiked ? 'text-green-500' : 'text-red-500'}`}>
              {isLiked ? '👍' : '👎'}
            </span>
          </div>
          
          {/* Developer */}
          {app.developer && (
            <p className="text-primary text-sm font-medium">
              {app.developer}
            </p>
          )}
          
          {/* Description fallback */}
          {app.description && (
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1 line-clamp-2">
              {app.description.substring(0, 100)}...
            </p>
          )}
          
          {/* Category & Rating Row */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              {topCategory && (
                <div className="flex items-center gap-1">
                  <span className="text-sm">{topCategory.icon}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {topCategory.value?.toFixed(1)}
                  </span>
                </div>
              )}
              {app.version && (
                <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                  v{app.version}
                </span>
              )}
            </div>
            
            {/* Rating */}
            {app.rating && app.rating > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-amber-500 text-sm">⭐</span>
                <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                  {app.rating.toFixed(1)}
                </span>
                {app.rating_count && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({app.rating_count > 1000 ? `${(app.rating_count/1000).toFixed(1)}k` : app.rating_count})
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Keywords/Tags */}
          {app.llm_best_for_keywords && app.llm_best_for_keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {app.llm_best_for_keywords.slice(0, 3).map((keyword, index) => (
                <span key={index} className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                  {keyword}
                </span>
              ))}
            </div>
          )}
          
          {/* Additional Info Row */}
          <div className="flex items-center justify-between mt-2 text-xs text-gray-400 dark:text-gray-500">
            <span>
              {isLiked ? 'Liked' : 'Passed'} {new Date(app.swiped_at).toLocaleDateString()}
            </span>
            {formatFileSize(app.size_bytes) && (
              <span>{formatFileSize(app.size_bytes)}</span>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => router.push(`/app/${app.app_id}`)}
            className="flex flex-1 min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <span className="truncate">View Details</span>
          </button>
          <button 
            onClick={() => onRemove(app.session_id, app.app_id)}
            className="flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-lg text-gray-500 dark:text-gray-400 hover:bg-red-500/10 hover:text-red-500 transition-colors"
          >
            <span className="text-xl">🗑️</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ activity }: { activity: RecentActivity }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-full ${activity.completed ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-600'}`}>
          <span className="text-xl">
            {activity.completed ? '✅' : '⏸️'}
          </span>
        </div>
        <div>
          <p className="text-gray-900 dark:text-white font-medium">
            "{formatCategoryName(activity.search_query)}"
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {new Date(activity.date).toLocaleDateString()} • {activity.total_apps_shown} apps shown
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-green-500">👍 {activity.likes}</span>
        <span className="text-red-500">👎 {activity.passes}</span>
        <span className={`px-2 py-1 rounded-full text-xs ${
          activity.completed 
            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
            : 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
        }`}>
          {activity.completed ? 'Completed' : 'Incomplete'}
        </span>
      </div>
    </div>
  );
}

// Helper Functions
function getCategoryIcon(searchQuery: string): string {
  const query = searchQuery.toLowerCase();
  if (query.includes('productivity')) return '⚡';
  if (query.includes('health') || query.includes('fitness')) return '🏃';
  if (query.includes('finance') || query.includes('budget')) return '💰';
  if (query.includes('education') || query.includes('learning')) return '📚';
  if (query.includes('game')) return '🎮';
  if (query.includes('photo') || query.includes('camera')) return '📸';
  if (query.includes('social')) return '👥';
  if (query.includes('music')) return '🎵';
  if (query.includes('travel')) return '✈️';
  if (query.includes('food')) return '🍔';
  if (query.includes('plant')) return '🌱';
  return '📱';
}

function formatCategoryName(searchQuery: string): string {
  // Convert search queries like "productivity apps" to "Productivity Apps"
  return searchQuery
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function extractKeyword(searchQuery: string): string {
  // Extract the main keyword from search queries like "productivity apps" -> "Productivity"
  const words = searchQuery.toLowerCase().split(' ');
  
  // Remove common app-related words
  const filteredWords = words.filter(word => 
    !['app', 'apps', 'application', 'applications', 'software', 'tool', 'tools'].includes(word)
  );
  
  // Take the first meaningful word and capitalize it
  const keyword = filteredWords.length > 0 ? filteredWords[0] : words[0];
  return keyword.charAt(0).toUpperCase() + keyword.slice(1);
}