'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
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
          query: searchQuery.trim(),
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

  const handleAction = (action: 'pass' | 'star' | 'like') => {
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
    <div className="relative flex h-screen w-full flex-col overflow-hidden">
      {/* Top Nav Bar */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-gray-200 dark:border-gray-700 px-6 lg:px-10 py-3 z-20 bg-background-light dark:bg-background-dark">
        <div className="flex items-center gap-4 text-gray-800 dark:text-white">
          <div className="size-6 text-primary">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M44 11.2727C44 14.0109 39.8386 16.3957 33.69 17.6364C39.8386 18.877 44 21.2618 44 24C44 26.7382 39.8386 29.123 33.69 30.3636C39.8386 31.6043 44 33.9891 44 36.7273C44 40.7439 35.0457 44 24 44C12.9543 44 4 40.7439 4 36.7273C4 33.9891 8.16144 31.6043 14.31 30.3636C8.16144 29.123 4 26.7382 4 24C4 21.2618 8.16144 18.877 14.31 17.6364C8.16144 16.3957 4 14.0109 4 11.2727C4 7.25611 12.9543 4 24 4C35.0457 4 44 7.25611 44 11.2727Z" fill="currentColor"></path>
            </svg>
          </div>
          <h2 className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">AppFinder</h2>
        </div>
        <div className="hidden md:flex flex-1 justify-end gap-8">
          <div className="flex items-center gap-9">
            <Link href="/home" className="text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal">Home</Link>
            <Link href="/swipe" className="text-primary text-sm font-medium leading-normal">Swipe</Link>
            <a className="text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" href="#">Liked Apps</a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/profile">
              <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em]">
                <span className="truncate">My Profile</span>
              </button>
            </Link>
            <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 bg-gradient-to-br from-purple-400 to-pink-400"></div>
          </div>
        </div>
        <button className="md:hidden text-gray-800 dark:text-white">
          <span className="text-2xl">☰</span>
        </button>
      </header>

      {/* Main Content - Full Width */}
      <main className="flex-1 flex flex-col bg-gray-100/50 dark:bg-gray-900/50 overflow-y-auto">
        
        {/* Search Section */}
        {!currentApp && !isSearching && !hasSearched && (
          <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
            <div className="w-full max-w-4xl mx-auto text-center space-y-8">
              <div className="space-y-4">
                <div className="text-7xl sm:text-8xl">🔍</div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white">
                  Discover Your Perfect Apps
                </h1>
                <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                  Describe what you're looking for in plain English, and we'll find apps that match your needs perfectly.
                </p>
              </div>

              {/* Big Search Bar */}
              <div className="w-full max-w-3xl mx-auto space-y-6">
                <div className="relative">
                  <textarea
                    className="w-full h-32 sm:h-40 resize-none rounded-2xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-6 py-6 text-lg sm:text-xl text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary shadow-lg transition-all duration-200"
                    placeholder="Tell us what you're looking for...

Examples:
• I need an app to manage my small business finances and track expenses
• Looking for meditation apps that work offline and have guided sessions
• Want something to help me learn guitar with interactive lessons"
                    value={searchQuery}
                    onChange={(e) => {
                      if (e.target.value.length <= 500) {
                        setSearchQuery(e.target.value);
                      }
                    }}
                    maxLength={500}
                  />
                  <div className="absolute bottom-4 right-4 text-sm text-gray-400">
                    {searchQuery.length}/500
                  </div>
                </div>
                
                <button
                  onClick={handleSearch}
                  disabled={!searchQuery.trim() || isSearching}
                  className="w-full sm:w-auto mx-auto bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-bold py-6 px-12 rounded-2xl text-xl transition-all duration-200 transform hover:scale-105 shadow-xl hover:shadow-2xl flex items-center justify-center gap-3"
                >
                  <span className="text-2xl">✨</span>
                  {isSearching ? 'Searching...' : 'Find My Perfect Apps'}
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                </button>
              </div>

              {/* Search Tips */}
              <div className="w-full max-w-2xl mx-auto">
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="text-2xl">💡</span>
                    Search Tips for Better Results
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Be specific about your needs and goals</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Mention your platform (iOS, macOS, Windows)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Include your experience level (beginner, advanced)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Describe your specific use case or workflow</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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

        {/* Search Results List (when no current app but have results) */}
        {!isSearching && !currentApp && searchResults.length > 0 && !searchError && (
          <div className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  🎉 Search Complete!
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Found {searchResults.length} apps matching your search. 
                  {cardIndex > searchResults.length ? ' You\'ve seen all the results!' : ` You've seen ${cardIndex - 1} so far.`}
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={resetSearch}
                    className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    New Search
                  </button>
                  {cardIndex <= searchResults.length && (
                    <button
                      onClick={() => {
                        setCurrentApp(searchResults[cardIndex - 1]);
                      }}
                      className="bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      Continue Swiping
                    </button>
                  )}
                </div>
              </div>

              {/* Results List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResults.map((app, index) => (
                  <div 
                    key={app.id}
                    className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg transition-all hover:shadow-xl ${
                      index < cardIndex - 1 ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div 
                        className="w-16 h-16 rounded-xl bg-cover bg-center flex-shrink-0"
                        style={{ backgroundImage: `url("${app.icon}")` }}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1 truncate">
                          {app.name}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                          {app.category || app.primary_category}
                        </p>
                        <p className="text-gray-700 dark:text-gray-300 text-sm line-clamp-3">
                          {app.personalized_one_liner || app.description}
                        </p>
                        {app.similarity_score && (
                          <div className="mt-3 flex items-center gap-2">
                            <div className="text-xs font-medium text-primary">
                              {Math.round(app.similarity_score * 100)}% match
                            </div>
                            {app.rating > 0 && (
                              <div className="text-xs text-gray-500">
                                ⭐ {app.rating.toFixed(1)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {index < cardIndex - 1 && (
                      <div className="mt-3 text-xs text-green-600 font-medium">
                        ✓ Already seen
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* App Cards Section */}
        {currentApp && (
          <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-4">
            <div className="w-full max-w-sm mx-auto space-y-4">
              {/* Progress Indicator */}
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium text-center">
                Card {cardIndex} of {totalCards}
              </p>

              {/* App Card - Reduced Size */}
              <div className="relative w-full h-[480px] group cursor-pointer transition-transform duration-300 ease-in-out hover:-translate-y-2 hover:shadow-2xl">
                {/* Background Cards */}
                <div className="absolute top-0 left-0 w-full h-full rounded-xl bg-white/50 dark:bg-white/10 transform rotate-[-4deg] -z-20"></div>
                <div className="absolute top-0 left-0 w-full h-full rounded-xl bg-white/30 dark:bg-white/5 transform rotate-[-8deg] -z-30"></div>
                
                {/* Main Card Content - Compact Reference Design */}
                <div className="relative w-full h-full bg-white dark:bg-gray-800 border border-gray-800 dark:border-gray-200 rounded-xl shadow-xl overflow-hidden flex flex-col justify-center items-center p-6 text-center">
                  <div className="flex-1 flex flex-col justify-center items-center">
                    {/* App Logo - Sized to fit nicely */}
                    <div 
                      className="size-32 rounded-[2rem] bg-cover bg-center shadow-2xl mb-6"
                      style={{ backgroundImage: `url("${currentApp.icon}")` }}
                    ></div>
                    
                    {/* App Name */}
                    <h3 className="text-gray-900 dark:text-white text-2xl font-bold mb-2">
                      {currentApp.name}
                    </h3>
                  </div>
                  
                  {/* Bottom section - Price/Category and Rating like reference */}
                  <div className="flex items-center justify-center gap-6 w-full pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col items-center">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 dark:bg-green-900/20 px-3 py-1 text-sm font-bold text-green-700 dark:text-green-400">
                        {currentApp.price || 'Free'}
                      </span>
                    </div>
                    <div className="w-px h-6 bg-gray-200 dark:bg-gray-700"></div>
                    <div className="flex flex-col items-center">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                        {currentApp.category || currentApp.primary_category}
                      </span>
                    </div>
                    {currentApp.rating > 0 && (
                      <>
                        <div className="w-px h-6 bg-gray-200 dark:border-gray-700"></div>
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-1 text-amber-500">
                            <span className="font-bold text-sm">{currentApp.rating.toFixed(1)}</span>
                            <span className="text-amber-400 text-lg">⭐</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons - Reference Design */}
              <div className="flex items-center justify-center gap-4 pt-4">
                <button 
                  onClick={() => handleAction('pass')}
                  className="flex items-center justify-center size-16 bg-white border border-gray-800 dark:border-gray-200 rounded-full shadow-lg text-red-500 hover:bg-red-500/10 transition-all duration-200 ease-in-out transform hover:scale-110"
                >
                  <span className="text-4xl">✕</span>
                </button>
                <button 
                  onClick={() => handleAction('like')}
                  className="flex items-center justify-center size-20 bg-primary border border-gray-800 dark:border-gray-200 rounded-full shadow-xl text-white hover:bg-primary/90 transition-all duration-200 ease-in-out transform hover:scale-110"
                >
                  <span className="text-5xl">♥</span>
                </button>
                <button 
                  onClick={() => handleAction('star')}
                  className="flex items-center justify-center size-16 bg-white border border-gray-800 dark:border-gray-200 rounded-full shadow-lg text-blue-500 hover:bg-blue-500/10 transition-all duration-200 ease-in-out transform hover:scale-110"
                >
                  <span className="text-3xl">ℹ</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}