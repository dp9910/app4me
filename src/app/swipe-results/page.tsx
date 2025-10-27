'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AppSwipeInterface from '@/components/ui/AppSwipeInterface';

interface RecommendedApp {
  app_id: string;
  app_data: {
    name: string;
    category: string;
    rating: number;
    icon_url: string;
    description: string;
  };
  final_score: number;
  personalized_oneliner: string;
  match_explanation: string;
  llm_confidence: number;
  matched_concepts: string[];
  rank: number;
}

interface UserProfile {
  query: string;
  lifestyle_tags?: string[];
  preferred_use_cases?: string[];
  preferred_complexity?: 'beginner' | 'intermediate' | 'advanced';
  current_context?: string;
}

export default function SwipeResultsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [apps, setApps] = useState<RecommendedApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Build user profile from URL params
        const lifestyle = searchParams.get('lifestyle')?.split(',') || [];
        const intent = searchParams.get('intent') || '';
        const query = searchParams.get('query') || '';

        if (!query && !intent && lifestyle.length === 0) {
          setError('Please provide search criteria');
          setIsLoading(false);
          return;
        }

        const profile: UserProfile = {
          query: query || `Looking for ${intent} apps`,
          lifestyle_tags: lifestyle,
          preferred_use_cases: intent ? [intent.toLowerCase()] : [],
          preferred_complexity: 'intermediate',
          current_context: 'general'
        };

        setUserProfile(profile);

        // Call our recommendation API to get top 10 results
        const response = await fetch('/api/recommendations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(profile),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch recommendations: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.success && data.recommendations) {
          // Limit to top 10 apps for swipe interface
          setApps(data.recommendations.slice(0, 10));
        } else {
          throw new Error(data.error || 'Failed to get recommendations');
        }

      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [searchParams]);

  const handleSwipeComplete = (likedApps: RecommendedApp[], rejectedApps: RecommendedApp[]) => {
    console.log('Liked apps:', likedApps);
    console.log('Rejected apps:', rejectedApps);
    
    // Here you could save the preferences to a database
    // or use them to refine future recommendations
  };

  const handleNewSearch = () => {
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-6"></div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Finding your perfect apps...
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Analyzing thousands of apps to find your matches
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Oops! Something went wrong
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={handleNewSearch}
            className="px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-colors"
          >
            Try New Search
          </button>
        </div>
      </div>
    );
  }

  if (apps.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-gray-400 text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No apps found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We couldn't find any apps matching your criteria. Try adjusting your search terms.
          </p>
          <button
            onClick={handleNewSearch}
            className="px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-colors"
          >
            Try New Search
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header with back button */}
      <div className="absolute top-4 left-4 z-50">
        <Link 
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-lg"
        >
          <span>←</span>
          <span>Back</span>
        </Link>
      </div>

      {/* Main Swipe Interface */}
      <AppSwipeInterface
        apps={apps}
        onSwipeComplete={handleSwipeComplete}
        userQuery={userProfile?.query || 'apps'}
      />
    </>
  );
}