'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Navigation from '@/components/ui/Navigation';
import { supabase } from '@/lib/supabase/client';

interface AppDetails {
  id: string;
  bundle_id: string;
  title: string;
  developer: string;
  developer_id?: string;
  developer_url?: string;
  version?: string;
  price?: number;
  formatted_price?: string;
  currency?: string;
  rating?: number;
  rating_count?: number;
  rating_source?: string;
  icon_url?: string;
  icon_url_hd?: string;
  screenshots?: string[];
  description?: string;
  description_source?: string;
  release_date?: string;
  last_updated?: string;
  age_rating?: string;
  primary_category?: string;
  all_categories?: string[];
  genres?: string[];
  size_bytes?: number;
  supported_languages?: string[];
  supported_devices?: string[];
  minimum_os_version?: string;
  available_in_sources?: string[];
  data_quality_score?: number;
  total_appearances?: number;
  avg_rank?: number;
  best_rank?: number;
}

interface AppFeatures {
  // Actual fields from the database
  app_id?: string;
  primary_use_case?: string;
  target_user?: string;
  key_benefit?: string;
  keywords_tfidf?: any;
  complexity?: string;
  category_classification?: any;
  quality_signals?: number;
  api_used?: string;
  processing_time_ms?: number;
  created_at?: string;
  updated_at?: string;
}

interface KeywordData {
  keyword: string;
  score: number;
  categories?: string[];
}

export default function AppSpotlightPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const appId = params.id as string;
  
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('query'); // Get the query parameter
  
  const [appDetails, setAppDetails] = useState<AppDetails | null>(null);
  const [appFeatures, setAppFeatures] = useState<AppFeatures | null>(null);
  const [keywords, setKeywords] = useState<KeywordData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
      return;
    }

    if (user && appId) {
      fetchAppDetails();
    }
  }, [user, loading, router, appId]);

  const fetchAppDetails = async () => {
    try {
      setError(null);
      
      // Fetch app details from apps_unified table
      const { data: appData, error: appError } = await supabase
        .from('apps_unified')
        .select(`
          id,
          bundle_id,
          title,
          developer,
          developer_id,
          developer_url,
          version,
          price,
          formatted_price,
          currency,
          rating,
          rating_count,
          rating_source,
          icon_url,
          icon_url_hd,
          screenshots,
          description,
          description_source,
          release_date,
          last_updated,
          age_rating,
          primary_category,
          all_categories,
          genres,
          size_bytes,
          supported_languages,
          supported_devices,
          minimum_os_version,
          available_in_sources,
          data_quality_score,
          total_appearances,
          avg_rank,
          best_rank
        `)
        .eq('id', appId)
        .single();

      if (appError) {
        console.error('Error fetching app details:', appError);
        setError('App not found');
        return;
      }

      setAppDetails(appData);

      // Fetch features data from app_features table
      
      try {
        const { data: featuresData, error: featuresError } = await supabase
          .from('app_features')
          .select(`
            app_id,
            primary_use_case,
            target_user,
            key_benefit,
            keywords_tfidf,
            complexity,
            category_classification,
            quality_signals,
            api_used,
            processing_time_ms,
            created_at,
            updated_at
          `)
          .eq('app_id', appId)
          .single();

        if (!featuresError && featuresData) {
          setAppFeatures(featuresData);
        }
      } catch (e) {
        // Features are optional, continue without them
      }

    } catch (error) {
      console.error('Error fetching app data:', error);
      setError('Unable to load app details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  const renderStars = (rating?: number) => {
    if (!rating) return null;
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<span key={i} className="text-yellow-400">★</span>);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<span key={i} className="text-yellow-400">★</span>);
      } else {
        stars.push(<span key={i} className="text-gray-300 dark:text-gray-600">★</span>);
      }
    }
    return stars;
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
              Unable to Load App
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error}
            </p>
            <button
              onClick={() => router.back()}
              className="bg-primary hover:bg-primary/90 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!appDetails) {
    return (
      <div className="relative flex h-screen w-full flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              App Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The app you're looking for doesn't exist or has been removed.
            </p>
            <button
              onClick={() => router.push('/my-apps')}
              className="bg-primary hover:bg-primary/90 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Back to My Apps
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
        <div className="mx-auto max-w-7xl">
          <button
            onClick={() => {
              if (searchQuery) {
                router.push(`/my-apps?query=${encodeURIComponent(searchQuery)}`);
              } else {
                router.push('/my-apps'); // Fallback if no query is present
              }
            }}
            className="flex items-center gap-2 mb-6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <span className="text-xl">←</span>
            Go back
          </button>

          {/* Breadcrumbs */}
          <div className="flex flex-wrap gap-2 pb-6">
            <button
              onClick={() => router.push('/')}
              className="text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors text-sm font-medium leading-normal"
            >
              Home
            </button>
            <span className="text-gray-500 dark:text-gray-400 text-sm font-medium leading-normal">/</span>
            <button
              onClick={() => router.push('/my-apps')}
              className="text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors text-sm font-medium leading-normal"
            >
              My Apps
            </button>
            <span className="text-gray-500 dark:text-gray-400 text-sm font-medium leading-normal">/</span>
            <span className="text-gray-900 dark:text-white text-sm font-medium leading-normal">
              {appDetails.title}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              {/* App Header */}
              <div className="flex flex-col gap-4 p-6 rounded-xl bg-white dark:bg-gray-800">
                <div className="flex gap-4">
                  <div 
                    className="bg-center bg-no-repeat aspect-square bg-cover rounded-xl w-24 h-24 shrink-0"
                    style={{ 
                      backgroundImage: `url(${appDetails.icon_url_hd || appDetails.icon_url || '/default-app-icon.png'})`,
                      backgroundColor: '#f3f4f6'
                    }}
                  />
                  <div className="flex flex-col justify-center">
                    <h1 className="text-gray-900 dark:text-white text-2xl font-bold leading-tight tracking-[-0.015em]">
                      {appDetails.title}
                    </h1>
                    <p className="text-primary text-base font-medium leading-normal">
                      {appDetails.developer}
                    </p>
                  </div>
                </div>
                
                <button 
                  onClick={() => {
                    if (appDetails.bundle_id) {
                      // Create App Store URL from bundle_id
                      const appStoreUrl = `https://apps.apple.com/app/id${appDetails.bundle_id}`;
                      window.open(appStoreUrl, '_blank');
                    }
                  }}
                  className="flex w-full min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-4 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!appDetails.bundle_id}
                >
                  <span className="truncate">
                    {appDetails.formatted_price || appDetails.price ? 
                      `Get App - ${appDetails.formatted_price || `$${appDetails.price}`}` : 
                      'Get App'
                    }
                  </span>
                </button>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-3 p-4">
                {appDetails.rating && (
                  <div className="flex min-w-[111px] flex-1 basis-[fit-content] flex-col gap-1 rounded-lg bg-white dark:bg-gray-800 p-4 items-start">
                    <div className="flex items-center gap-1.5">
                      <p className="text-gray-900 dark:text-white tracking-light text-2xl font-bold leading-tight">
                        {appDetails.rating.toFixed(1)}
                      </p>
                      <div className="flex">
                        {renderStars(appDetails.rating)}
                      </div>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal">Average Rating</p>
                  </div>
                )}
                
                {appDetails.rating_count && (
                  <div className="flex min-w-[111px] flex-1 basis-[fit-content] flex-col gap-1 rounded-lg bg-white dark:bg-gray-800 p-4 items-start">
                    <p className="text-gray-900 dark:text-white tracking-light text-2xl font-bold leading-tight">
                      {appDetails.rating_count.toLocaleString()}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal">Ratings</p>
                  </div>
                )}
                
                {appDetails.primary_category && (
                  <div className="flex min-w-[111px] flex-1 basis-[fit-content] flex-col gap-1 rounded-lg bg-white dark:bg-gray-800 p-4 items-start">
                    <p className="text-gray-900 dark:text-white tracking-light text-lg font-bold leading-tight">
                      {appDetails.primary_category}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal">Category</p>
                  </div>
                )}
              </div>

              {/* Tags */}
              {appDetails.genres && (
                <div className="flex gap-2 p-4 flex-wrap">
                  {appDetails.genres?.slice(0, 3).map((genre, index) => (
                    <div key={index} className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full bg-primary/20 px-3">
                      <p className="text-primary text-sm font-medium leading-normal">{genre}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Information Section */}
              <div className="flex flex-col gap-4 p-6 rounded-xl bg-white dark:bg-gray-800">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Information</h3>
                <div className="space-y-3 text-sm">
                  {appDetails.version && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Version</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{appDetails.version}</span>
                    </div>
                  )}
                  {appDetails.last_updated && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Updated</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{formatDate(appDetails.last_updated)}</span>
                    </div>
                  )}
                  {appDetails.size_bytes && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Size</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{formatFileSize(appDetails.size_bytes)}</span>
                    </div>
                  )}
                  {appDetails.age_rating && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Age Rating</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{appDetails.age_rating}</span>
                    </div>
                  )}
                  {appDetails.minimum_os_version && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Requires</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">iOS {appDetails.minimum_os_version}+</span>
                    </div>
                  )}
                  {appFeatures?.complexity && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Complexity</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200 capitalize">{appFeatures.complexity}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* Description - Top Priority */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                <h2 className="text-gray-900 dark:text-white text-xl font-bold mb-4">Description</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed line-clamp-4" id="app-description">
                  {appDetails.description || 'No description available.'}
                </p>
                {appDetails.description && appDetails.description.length > 200 && (
                  <button 
                    onClick={() => {
                      const desc = document.getElementById('app-description');
                      if (desc) {
                        desc.classList.toggle('line-clamp-4');
                        const button = desc.nextElementSibling as HTMLButtonElement;
                        button.textContent = desc.classList.contains('line-clamp-4') ? 'Read more' : 'Read less';
                      }
                    }}
                    className="text-primary text-sm mt-2 hover:underline"
                  >
                    Read more
                  </button>
                )}
              </div>

              {/* App Features */}
              {(appFeatures?.primary_use_case || appFeatures?.target_user || appFeatures?.key_benefit || appFeatures?.complexity) && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                  <h2 className="text-gray-900 dark:text-white text-xl font-bold mb-4">App Features</h2>
                  
                  {/* Primary Use Case */}
                  {appFeatures?.primary_use_case && (
                    <div className="mb-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <h3 className="text-primary font-semibold text-sm mb-2">Primary Use Case</h3>
                      <p className="text-gray-700 dark:text-gray-300 text-sm">
                        {appFeatures.primary_use_case}
                      </p>
                    </div>
                  )}

                  {/* Target Users */}
                  {appFeatures?.target_user && (
                    <div className="mb-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
                      <h3 className="text-blue-800 dark:text-blue-200 font-semibold text-sm mb-2">Target Users</h3>
                      <p className="text-blue-700 dark:text-blue-300 text-sm font-medium">{appFeatures.target_user}</p>
                    </div>
                  )}

                  {/* Key Benefit */}
                  {appFeatures?.key_benefit && (
                    <div className="mb-4 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700">
                      <h3 className="text-emerald-800 dark:text-emerald-200 font-semibold text-sm mb-2">Key Benefit</h3>
                      <p className="text-emerald-700 dark:text-emerald-300 text-sm font-medium">{appFeatures.key_benefit}</p>
                    </div>
                  )}

                  {/* Complexity */}
                  {appFeatures?.complexity && (
                    <div className="mb-4 p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700">
                      <h3 className="text-purple-800 dark:text-purple-200 font-semibold text-sm mb-2">Complexity Level</h3>
                      <p className="text-purple-700 dark:text-purple-300 text-sm font-medium capitalize">{appFeatures.complexity}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Screenshots */}
              {appDetails.screenshots && appDetails.screenshots.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                  <h2 className="text-gray-900 dark:text-white text-xl font-bold mb-4">Screenshots</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {appDetails.screenshots.slice(0, 6).map((screenshot, index) => (
                      <div 
                        key={index}
                        className="aspect-[16/10] rounded-lg bg-cover bg-center cursor-pointer hover:opacity-90 transition-opacity border border-gray-200 dark:border-gray-600"
                        style={{ backgroundImage: `url(${screenshot})` }}
                      />
                    ))}
                  </div>
                </div>
              )}








            </div>
          </div>
        </div>
      </main>
    </div>
  );
}