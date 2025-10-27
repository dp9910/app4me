'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';

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

export default function SearchResultsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [apps, setApps] = useState<RecommendedApp[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isPlantQuery, setIsPlantQuery] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

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
        
        // Check if this is a plant-related query
        const queryLower = (query || '').toLowerCase();
        const isPlantRelated = queryLower.includes('plant') || queryLower.includes('garden') || 
                              queryLower.includes('flower') || queryLower.includes('botanical') ||
                              queryLower.includes('nature') || queryLower.includes('care');
        setIsPlantQuery(isPlantRelated);

        // Call our recommendation API
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
          setApps(data.recommendations);
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

  const handleNext = () => {
    if (currentIndex < apps.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNewSearch = () => {
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Finding your perfect apps...</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">This may take a moment</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Oops! Something went wrong</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <Button onClick={handleNewSearch}>
            Try New Search
          </Button>
        </div>
      </div>
    );
  }

  if (apps.length === 0) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-gray-400 text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No apps found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We couldn't find any apps matching your criteria. Try adjusting your search terms.
          </p>
          <Button onClick={handleNewSearch}>
            Try New Search
          </Button>
        </div>
      </div>
    );
  }

  const currentApp = apps[currentIndex];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3 text-gray-800 dark:text-white">
              <div className="size-6 text-primary">
                <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path d="M44 11.2727C44 14.0109 39.8386 16.3957 33.69 17.6364C39.8386 18.877 44 21.2618 44 24C44 26.7382 39.8386 29.123 33.69 30.3636C39.8386 31.6043 44 33.9891 44 36.7273C44 40.7439 35.0457 44 24 44C12.9543 44 4 40.7439 4 36.7273C4 33.9891 8.16144 31.6043 14.31 30.3636C8.16144 29.123 4 26.7382 4 24C4 21.2618 8.16144 18.877 14.31 17.6364C8.16144 16.3957 4 14.0109 4 11.2727C4 7.25611 12.9543 4 24 4C35.0457 4 44 7.25611 44 11.2727Z" fill="currentColor"></path>
                </svg>
              </div>
              <h1 className="text-xl font-bold">App4Me</h1>
            </Link>
            
            <Button onClick={handleNewSearch} variant="outline">
              New Search
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Search Summary */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Your App Recommendations
          </h2>
          {userProfile && (
            <p className="text-gray-600 dark:text-gray-400">
              Based on: "{userProfile.query}"
              {userProfile.lifestyle_tags && userProfile.lifestyle_tags.length > 0 && (
                <span> • Lifestyle: {userProfile.lifestyle_tags.join(', ')}</span>
              )}
            </p>
          )}
          <div className="mt-4 text-sm text-gray-500">
            Showing {currentIndex + 1} of {apps.length} recommendations
          </div>
          
          {/* Plant Query Special Button */}
          {isPlantQuery && (
            <div className="mt-6">
              <button
                onClick={() => router.push(`/test-plant-search?query=${encodeURIComponent(userProfile?.query || '')}`)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                🌱 See How Algorithm Picked These from 374 Plant Apps
              </button>
              <p className="text-xs text-gray-500 mt-2">
                Compare our top picks vs all plant-related apps in database
              </p>
            </div>
          )}
        </div>

        {/* App Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
          {/* App Header */}
          <div className="p-8 text-center border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-center mb-4">
              {currentApp.app_data.icon_url ? (
                <img 
                  src={currentApp.app_data.icon_url} 
                  alt={currentApp.app_data.name}
                  className="w-20 h-20 rounded-2xl shadow-lg"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">
                    {currentApp.app_data.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {currentApp.app_data.name}
            </h3>
            
            <div className="flex items-center justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span className="bg-primary/10 text-primary px-3 py-1 rounded-full">
                {currentApp.app_data.category}
              </span>
              {currentApp.app_data.rating > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-yellow-500">⭐</span>
                  <span>{currentApp.app_data.rating.toFixed(1)}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <span className="text-green-500">🎯</span>
                <span>{Math.round(currentApp.final_score * 100)}% match</span>
              </div>
            </div>
          </div>

          {/* App Details */}
          <div className="p-8">
            {/* Personalized Message */}
            <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-xl p-6 mb-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <span className="text-primary">✨</span>
                Why this app is perfect for you
              </h4>
              <p className="text-gray-700 dark:text-gray-300 text-lg">
                {currentApp.personalized_oneliner}
              </p>
            </div>

            {/* Match Explanation */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Match Details
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                {currentApp.match_explanation}
              </p>
              
              {currentApp.matched_concepts && currentApp.matched_concepts.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-gray-500 mb-2">Matched concepts:</p>
                  <div className="flex flex-wrap gap-2">
                    {currentApp.matched_concepts.map((concept, index) => (
                      <span key={index} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full text-xs">
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                About this app
              </h4>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {currentApp.app_data.description || 'No description available.'}
              </p>
            </div>

            {/* Confidence Score */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  AI Confidence Score
                </span>
                <span className="text-sm font-bold text-primary">
                  {Math.round(currentApp.llm_confidence * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${currentApp.llm_confidence * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <Button 
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            variant="outline"
            className="flex items-center gap-2"
          >
            ← Previous App
          </Button>
          
          <div className="flex gap-2">
            {apps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentIndex 
                    ? 'bg-primary' 
                    : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                }`}
              />
            ))}
          </div>
          
          <Button 
            onClick={handleNext}
            disabled={currentIndex === apps.length - 1}
            className="flex items-center gap-2"
          >
            Next App →
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="text-center mt-8 space-y-4">
          <div className="flex flex-wrap gap-4 justify-center">
            <Button className="flex items-center gap-2">
              <span>📱</span>
              View in App Store
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <span>💾</span>
              Save to Favorites
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <span>📤</span>
              Share App
            </Button>
          </div>
          
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button onClick={handleNewSearch} variant="outline">
              Search for Different Apps
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}