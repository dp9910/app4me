'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/ui/Navigation';
import SwipeCard from '@/components/ui/SwipeCard';

interface App {
  id: string;
  app_id: string;
  name: string;
  artist?: string;
  category?: string;
  primary_category?: string;
  icon: string;
  icon_url?: string;
  icon_url_512?: string;
  url?: string;
  rating: number;
  rating_average?: number;
  description: string;
  short_description?: string;
  full_description?: string;
  rank?: number;
  price?: string;
  similarity_score?: number;
  match_quality?: string;
  relevance_score?: number;
  personalized_one_liner?: string;
  match_reason?: string;
}

export default function SwipePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentApp, setCurrentApp] = useState<App | null>(null);
  const [appStack, setAppStack] = useState<App[]>([]);
  const [cardIndex, setCardIndex] = useState(1);
  const [totalCards, setTotalCards] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<App[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const queryParam = searchParams.get('query');
    if (queryParam) {
      setSearchQuery(decodeURIComponent(queryParam));
      handleSearchWithQuery(decodeURIComponent(queryParam));
    } else if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [searchParams, user, loading, router]);


  const handleSearchWithQuery = async (query: string) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setSearchError(null);
    setHasSearched(true);
    
    try {
      const response = await fetch('/api/search/intent-driven', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          limit: 20
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      if (data.success && data.results) {
        const normalizedResults = data.results.map((result: any) => ({
          id: result.app_id,
          app_id: result.app_id,
          name: result.app_data.name,
          artist: result.app_data.developer || 'Unknown Developer',
          category: result.app_data.category,
          primary_category: result.app_data.category,
          icon: result.app_data.icon_url || '/default-app-icon.png',
          icon_url: result.app_data.icon_url,
          icon_url_512: result.app_data.icon_url,
          url: result.app_data.url,
          rating: result.app_data.rating || 0,
          rating_average: result.app_data.rating,
          description: result.app_data.description || 'No description available',
          short_description: result.app_data.description,
          full_description: result.app_data.description,
          price: result.app_data.price || 'Free',
          similarity_score: result.relevance_score / 10, // Normalize to 0-1
          match_quality: result.search_method,
          relevance_score: result.relevance_score,
          personalized_one_liner: result.match_reason,
          match_reason: result.match_reason,
          matched_keywords: result.matched_keywords
        }));

        setSearchResults(normalizedResults);
        setTotalCards(normalizedResults.length);
        
        if (normalizedResults.length > 0) {
          setCurrentApp(normalizedResults[0]);
          setAppStack(normalizedResults);
          setCardIndex(1);
        } else {
          setSearchError('No apps found matching your search. Try different keywords or be more specific.');
        }
      } else {
        setSearchError(data.error || 'No results found');
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchError(error instanceof Error ? error.message : 'Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    await handleSearchWithQuery(searchQuery);
  };

  const handleAction = (action: 'pass' | 'like') => {
    // TODO: Save user action to user-app-interactions
    console.log(`Action: ${action} on app: ${currentApp?.name}`);
    
    const nextIndex = cardIndex + 1;
    setCardIndex(nextIndex);
    
    if (nextIndex <= appStack.length) {
      setCurrentApp(appStack[nextIndex - 1]);
    } else {
      // No more apps
      setCurrentApp(null);
    }
  };

  const resetSearch = () => {
    setCurrentApp(null);
    setAppStack([]);
    setSearchResults([]);
    setCardIndex(1);
    setTotalCards(0);
    setSearchError(null);
    setHasSearched(false);
    setSearchQuery('');
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen w-full flex-col group/design-root overflow-hidden">
      <Navigation />

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 lg:p-12 bg-background-light overflow-hidden">
        
        {/* Search Section */}
        {!currentApp && !isSearching && !hasSearched && (
          <main className="flex flex-1 flex-col items-center justify-center px-4 pb-12 sm:pb-20">
            <div className="w-full max-w-3xl text-center">
              {/* HeadlineText */}
              <h1 className="text-gray-900 dark:text-white text-4xl sm:text-5xl font-bold leading-tight tracking-tight mb-4">Explore over 9020 iOS apps powered by our AI recommendation system</h1>
              <p className="text-gray-500 dark:text-gray-400 max-w-3xl mx-auto mb-10 text-lg">Find the perfect app for any task by simply describing what you need.</p>
              {/* Search Input and Button */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8 w-full max-w-3xl mx-auto">
                {/* TextField */}
                <label className="flex flex-col w-full flex-1">
                  <input 
                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-gray-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:border-primary dark:focus:border-primary h-14 placeholder:text-gray-400 dark:placeholder:text-gray-500 p-[15px] text-base font-normal leading-normal transition-all"
                    placeholder="e.g., apps to help me take care of plants, or a simple budget tracker"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </label>
                {/* SingleButton */}
                <button 
                  onClick={handleSearch}
                  disabled={!searchQuery.trim() || isSearching}
                  className="flex w-full sm:w-48 cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-5 bg-primary text-white gap-2 text-base font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors"
                >
                  <span className="truncate">Search</span>
                </button>
              </div>
              {/* Chips */}
              <div className="flex flex-wrap items-center justify-center gap-3 p-3">
                <div 
                  onClick={() => handleSearchWithQuery('productivity apps')}
                  className="flex h-9 shrink-0 cursor-pointer items-center justify-center gap-x-2 rounded-lg bg-blue-100 dark:bg-blue-500/20 px-4 transition-transform hover:scale-105"
                >
                  <p className="text-blue-800 dark:text-blue-300 text-sm font-medium leading-normal">Productivity</p>
                </div>
                <div 
                  onClick={() => handleSearchWithQuery('health and fitness apps')}
                  className="flex h-9 shrink-0 cursor-pointer items-center justify-center gap-x-2 rounded-lg bg-green-100 dark:bg-green-500/20 px-4 transition-transform hover:scale-105"
                >
                  <p className="text-green-800 dark:text-green-300 text-sm font-medium leading-normal">Health & Fitness</p>
                </div>
                <div 
                  onClick={() => handleSearchWithQuery('finance and budgeting apps')}
                  className="flex h-9 shrink-0 cursor-pointer items-center justify-center gap-x-2 rounded-lg bg-yellow-100 dark:bg-yellow-500/20 px-4 transition-transform hover:scale-105"
                >
                  <p className="text-yellow-800 dark:text-yellow-300 text-sm font-medium leading-normal">Finance</p>
                </div>
                <div 
                  onClick={() => handleSearchWithQuery('education and learning apps')}
                  className="flex h-9 shrink-0 cursor-pointer items-center justify-center gap-x-2 rounded-lg bg-purple-100 dark:bg-purple-500/20 px-4 transition-transform hover:scale-105"
                >
                  <p className="text-purple-800 dark:text-purple-300 text-sm font-medium leading-normal">Education</p>
                </div>
                <div 
                  onClick={() => handleSearchWithQuery('entertainment and media apps')}
                  className="flex h-9 shrink-0 cursor-pointer items-center justify-center gap-x-2 rounded-lg bg-red-100 dark:bg-red-500/20 px-4 transition-transform hover:scale-105"
                >
                  <p className="text-red-800 dark:text-red-300 text-sm font-medium leading-normal">Entertainment</p>
                </div>
                <div 
                  onClick={() => handleSearchWithQuery('social networking apps')}
                  className="flex h-9 shrink-0 cursor-pointer items-center justify-center gap-x-2 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 px-4 transition-transform hover:scale-105"
                >
                  <p className="text-indigo-800 dark:text-indigo-300 text-sm font-medium leading-normal">Social</p>
                </div>
                <div 
                  onClick={() => handleSearchWithQuery('photo and video editing apps')}
                  className="flex h-9 shrink-0 cursor-pointer items-center justify-center gap-x-2 rounded-lg bg-pink-100 dark:bg-pink-500/20 px-4 transition-transform hover:scale-105"
                >
                  <p className="text-pink-800 dark:text-pink-300 text-sm font-medium leading-normal">Photo & Video</p>
                </div>
                <div 
                  onClick={() => handleSearchWithQuery('developer tools and coding apps')}
                  className="flex h-9 shrink-0 cursor-pointer items-center justify-center gap-x-2 rounded-lg bg-gray-200 dark:bg-gray-500/20 px-4 transition-transform hover:scale-105"
                >
                  <p className="text-gray-800 dark:text-gray-300 text-sm font-medium leading-normal">Developer Tools</p>
                </div>
                <div 
                  onClick={() => handleSearchWithQuery('business and productivity apps')}
                  className="flex h-9 shrink-0 cursor-pointer items-center justify-center gap-x-2 rounded-lg bg-teal-100 dark:bg-teal-500/20 px-4 transition-transform hover:scale-105"
                >
                  <p className="text-teal-800 dark:text-teal-300 text-sm font-medium leading-normal">Business</p>
                </div>
                <div 
                  onClick={() => handleSearchWithQuery('lifestyle and daily life apps')}
                  className="flex h-9 shrink-0 cursor-pointer items-center justify-center gap-x-2 rounded-lg bg-cyan-100 dark:bg-cyan-500/20 px-4 transition-transform hover:scale-105"
                >
                  <p className="text-cyan-800 dark:text-cyan-300 text-sm font-medium leading-normal">Lifestyle</p>
                </div>
                <div 
                  onClick={() => handleSearchWithQuery('travel and navigation apps')}
                  className="flex h-9 shrink-0 cursor-pointer items-center justify-center gap-x-2 rounded-lg bg-lime-100 dark:bg-lime-500/20 px-4 transition-transform hover:scale-105"
                >
                  <p className="text-lime-800 dark:text-lime-300 text-sm font-medium leading-normal">Travel</p>
                </div>
                <div 
                  onClick={() => handleSearchWithQuery('shopping and e-commerce apps')}
                  className="flex h-9 shrink-0 cursor-pointer items-center justify-center gap-x-2 rounded-lg bg-amber-100 dark:bg-amber-500/20 px-4 transition-transform hover:scale-105"
                >
                  <p className="text-amber-800 dark:text-amber-300 text-sm font-medium leading-normal">Shopping</p>
                </div>
                <div 
                  onClick={() => handleSearchWithQuery('medical and healthcare apps')}
                  className="flex h-9 shrink-0 cursor-pointer items-center justify-center gap-x-2 rounded-lg bg-orange-100 dark:bg-orange-500/20 px-4 transition-transform hover:scale-105"
                >
                  <p className="text-orange-800 dark:text-orange-300 text-sm font-medium leading-normal">Medical</p>
                </div>
                <div 
                  onClick={() => handleSearchWithQuery('news and information apps')}
                  className="flex h-9 shrink-0 cursor-pointer items-center justify-center gap-x-2 rounded-lg bg-stone-200 dark:bg-stone-500/20 px-4 transition-transform hover:scale-105"
                >
                  <p className="text-stone-800 dark:text-stone-300 text-sm font-medium leading-normal">News</p>
                </div>
                <div 
                  onClick={() => handleSearchWithQuery('games and entertainment apps')}
                  className="flex h-9 shrink-0 cursor-pointer items-center justify-center gap-x-2 rounded-lg bg-rose-100 dark:bg-rose-500/20 px-4 transition-transform hover:scale-105"
                >
                  <p className="text-rose-800 dark:text-rose-300 text-sm font-medium leading-normal">Games</p>
                </div>
              </div>
            </div>
          </main>
        )}

        {/* Loading State */}
        {isSearching && (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
            <div className="text-center space-y-6">
              <div className="animate-spin rounded-full h-20 w-20 border-4 border-primary border-t-transparent mx-auto"></div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Finding perfect matches...
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                Our AI is analyzing thousands of apps based on your description
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {!isSearching && hasSearched && searchError && (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
            <div className="text-center space-y-6 max-w-md">
              <div className="text-6xl">😞</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Search Failed
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {searchError}
              </p>
              <button
                onClick={resetSearch}
                className="bg-primary hover:bg-primary/90 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Try Another Search
              </button>
            </div>
          </div>
        )}

        {/* App Cards Section - Swipe Interface */}
        {currentApp && (
          <div className="relative w-full max-w-4xl h-[600px] flex items-center justify-center group/card-container">
            {/* Progress Indicator */}
            <div className="absolute top-[-40px] left-1/2 transform -translate-x-1/2 z-20">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                {cardIndex} of {totalCards}
              </p>
            </div>

            {/* Left Side Card (previous/swiped left) */}
            {appStack[cardIndex] && (
              <div 
                className="absolute left-0 top-1/2 transform -translate-y-1/2 w-64 h-96 rounded-xl bg-white/70 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 shadow-lg transition-all duration-300 ease-in-out pointer-events-none"
                style={{
                  transform: 'translateY(-50%) translateX(-50%) scale(0.8) rotate(-10deg)',
                  filter: 'blur(2px)',
                  opacity: 0.6,
                  zIndex: 1
                }}
              >
                <div className="flex flex-col justify-center items-center h-full p-6 text-center">
                  <div 
                    className="size-24 rounded-2xl bg-cover bg-center shadow-lg mb-4"
                    style={{ backgroundImage: `url(${appStack[cardIndex].icon})` }}
                  ></div>
                  <h4 className="text-gray-900 dark:text-white text-lg font-bold truncate w-full">
                    {appStack[cardIndex].name}
                  </h4>
                </div>
              </div>
            )}
            
            {/* Right Side Card (next in stack) */}
            {appStack[cardIndex + 1] && (
              <div 
                className="absolute right-0 top-1/2 transform -translate-y-1/2 w-64 h-96 rounded-xl bg-white/70 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 shadow-lg transition-all duration-300 ease-in-out pointer-events-none"
                style={{
                  transform: 'translateY(-50%) translateX(50%) scale(0.8) rotate(10deg)',
                  filter: 'blur(2px)',
                  opacity: 0.6,
                  zIndex: 1
                }}
              >
                <div className="flex flex-col justify-center items-center h-full p-6 text-center">
                  <div 
                    className="size-24 rounded-2xl bg-cover bg-center shadow-lg mb-4"
                    style={{ backgroundImage: `url(${appStack[cardIndex + 1].icon})` }}
                  ></div>
                  <h4 className="text-gray-900 dark:text-white text-lg font-bold truncate w-full">
                    {appStack[cardIndex + 1].name}
                  </h4>
                </div>
              </div>
            )}

            {/* Center Container for Main Active Card */}
            <div className="relative w-80 h-[600px]">
              <SwipeCard 
                app={currentApp} 
                onLike={() => handleAction('like')} 
                onPass={() => handleAction('pass')}
                isActive={true}
                zIndex={10}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}