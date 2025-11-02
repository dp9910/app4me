'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/ui/Navigation';
import SwipeCard from '@/components/ui/SwipeCard';
import { supabase } from '@/lib/supabase/client';

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
  const [swipedLeftCards, setSwipedLeftCards] = useState<App[]>([]);
  const [swipedRightCards, setSwipedRightCards] = useState<App[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  useEffect(() => {
    const queryParam = searchParams.get('query');
    if (queryParam) {
      setSearchQuery(decodeURIComponent(queryParam));
      handleSearchWithQuery(decodeURIComponent(queryParam));
    } else if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [searchParams, user, loading, router]);

  // Cleanup effect to handle session completion when leaving the page
  useEffect(() => {
    return () => {
      // Complete session when component unmounts (navigation to other pages)
      if (sessionId && currentApp) {
        completeSwipeSessionIncomplete('user_stopped');
      }
    };
  }, [sessionId, currentApp, swipedRightCards.length, swipedLeftCards.length, sessionStartTime]);

  const startSwipeSession = async (query: string, totalApps: number) => {
    if (!user) return null;
    
    try {
      const startTime = Date.now();
      setSessionStartTime(startTime);
      
      const { data, error } = await supabase
        .from('swipe_sessions')
        .insert({
          user_id: user.id,
          search_query: query,
          total_apps_shown: totalApps,
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating swipe session:', error);
        return null;
      }

      setSessionId(data.id);
      return data.id;
    } catch (error) {
      console.error('Error starting swipe session:', error);
      return null;
    }
  };

  const logSwipeInteraction = async (app: App, action: 'like' | 'pass', cardPosition: number) => {
    if (!user || !sessionId) return;
    
    try {
      const swipeStartTime = sessionStartTime || Date.now();
      const swipeDuration = Date.now() - swipeStartTime;
      
      await supabase
        .from('swipe_interactions')
        .insert({
          user_id: user.id,
          session_id: sessionId,
          search_query: searchQuery,
          app_bundle_id: app.app_id,
          app_name: app.name,
          app_category: app.category,
          interaction_type: action,
          card_position: cardPosition,
          swipe_duration_ms: swipeDuration
        });
    } catch (error) {
      console.error('Error logging swipe interaction:', error);
    }
  };

  const completeSwipeSession = async (reason: 'finished_all' | 'user_stopped' | 'start_over') => {
    if (!sessionId || !sessionStartTime) return;
    
    try {
      const totalDuration = Date.now() - sessionStartTime;
      
      await supabase
        .from('swipe_sessions')
        .update({
          total_likes: swipedRightCards.length,
          total_passes: swipedLeftCards.length,
          session_duration_ms: totalDuration,
          completed: reason === 'finished_all', // Only mark as completed if user finished all apps
          completion_reason: reason,
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId);
    } catch (error) {
      console.error('Error completing swipe session:', error);
    }
  };

  const completeSwipeSessionIncomplete = async (reason: 'user_stopped' | 'start_over') => {
    if (!sessionId || !sessionStartTime) return;
    
    try {
      const totalDuration = Date.now() - sessionStartTime;
      
      await supabase
        .from('swipe_sessions')
        .update({
          total_likes: swipedRightCards.length,
          total_passes: swipedLeftCards.length,
          session_duration_ms: totalDuration,
          completed: false, // Always mark as incomplete
          completion_reason: reason,
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId);
    } catch (error) {
      console.error('Error marking swipe session as incomplete:', error);
    }
  };

  const handleSearchWithQuery = async (query: string) => {
    if (!query.trim()) return;
    
    // Update the search query state to match the actual query being used
    setSearchQuery(query.trim());
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
          
          // Start a new swipe session
          await startSwipeSession(query, normalizedResults.length);
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

  const handleAction = async (action: 'pass' | 'like') => {
    if (!currentApp) return;
    
    // Log the swipe interaction to database
    await logSwipeInteraction(currentApp, action, cardIndex);
    
    // Add card to appropriate side stack
    if (action === 'pass') {
      setSwipedLeftCards(prev => [...prev, currentApp]);
    } else {
      setSwipedRightCards(prev => [...prev, currentApp]);
    }
    
    const nextIndex = cardIndex + 1;
    setCardIndex(nextIndex);
    
    if (nextIndex <= appStack.length) {
      setCurrentApp(appStack[nextIndex - 1]);
    } else {
      // No more apps - session completed
      setCurrentApp(null);
      await completeSwipeSession('finished_all');
    }
  };

  const resetSearch = async () => {
    // Complete current session as incomplete if it exists
    if (sessionId) {
      await completeSwipeSessionIncomplete('start_over');
    }
    
    setCurrentApp(null);
    setAppStack([]);
    setSearchResults([]);
    setCardIndex(1);
    setTotalCards(0);
    setSearchError(null);
    setHasSearched(false);
    setSearchQuery('');
    setSwipedLeftCards([]);
    setSwipedRightCards([]);
    setSessionId(null);
    setSessionStartTime(null);
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
        
        {/* Start Over Button - Top Right */}
        {(currentApp || hasSearched) && (
          <div className="absolute top-4 right-4 z-30">
            <button
              onClick={async () => {
                await resetSearch();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors shadow-lg"
            >
              <span className="text-sm">🔄</span>
              <span>Start Over</span>
            </button>
          </div>
        )}
        
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
                onClick={async () => await resetSearch()}
                className="bg-primary hover:bg-primary/90 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Try Another Search
              </button>
            </div>
          </div>
        )}

        {/* App Cards Section - Persistent Swipe Interface */}
        {currentApp && (
          <div className="relative w-full max-w-6xl h-[600px] flex items-center justify-center group/card-container mx-auto">
            {/* Progress Indicator */}
            <div className="absolute top-[-40px] left-1/2 transform -translate-x-1/2 z-20">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                {cardIndex} of {totalCards}
              </p>
            </div>

            {/* Left Side - Most Recent Swiped Left Card (Passed) */}
            {swipedLeftCards.length > 0 && (
              <div className="absolute left-12 top-1/3 transform -translate-y-1/2 z-1">
                <div 
                  className="w-72 h-96 rounded-xl bg-white/75 dark:bg-gray-800/75 border border-gray-200 dark:border-gray-700 shadow-lg pointer-events-none"
                  style={{
                    transform: 'scale(0.8) rotate(-8deg)',
                    filter: 'blur(1px)',
                    opacity: 0.7
                  }}
                >
                  <div className="flex flex-col justify-center items-center h-full p-6 text-center">
                    <div 
                      className="size-24 rounded-3xl bg-cover bg-center shadow-lg mb-4"
                      style={{ backgroundImage: `url(${swipedLeftCards[swipedLeftCards.length - 1].icon})` }}
                    ></div>
                    <h4 className="text-gray-900 dark:text-white text-lg font-bold truncate w-full mb-2">
                      {swipedLeftCards[swipedLeftCards.length - 1].name}
                    </h4>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="text-gray-500 text-xs">{swipedLeftCards[swipedLeftCards.length - 1].category}</span>
                      {swipedLeftCards[swipedLeftCards.length - 1].price && (
                        <>
                          <span className="text-gray-400 text-xs">•</span>
                          <span className="text-primary font-semibold text-xs">{swipedLeftCards[swipedLeftCards.length - 1].price}</span>
                        </>
                      )}
                    </div>
                    {swipedLeftCards[swipedLeftCards.length - 1].description && 
                     swipedLeftCards[swipedLeftCards.length - 1].description !== 'app_name_match' && 
                     swipedLeftCards[swipedLeftCards.length - 1].description !== 'No description available' && (
                      <p className="text-gray-600 dark:text-gray-400 text-xs leading-relaxed px-2 line-clamp-1">
                        {swipedLeftCards[swipedLeftCards.length - 1].description.split('\n')[0].trim()}
                      </p>
                    )}
                    <div className="absolute top-4 right-4 bg-red-500 text-white rounded-full p-2">
                      <span className="text-base">✕</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Right Side - Most Recent Swiped Right Card (Liked) */}
            {swipedRightCards.length > 0 && (
              <div className="absolute right-12 top-1/3 transform -translate-y-1/2 z-1">
                <div 
                  className="w-72 h-96 rounded-xl bg-white/75 dark:bg-gray-800/75 border border-gray-200 dark:border-gray-700 shadow-lg pointer-events-none"
                  style={{
                    transform: 'scale(0.8) rotate(8deg)',
                    filter: 'blur(1px)',
                    opacity: 0.7
                  }}
                >
                  <div className="flex flex-col justify-center items-center h-full p-6 text-center">
                    <div 
                      className="size-24 rounded-3xl bg-cover bg-center shadow-lg mb-4"
                      style={{ backgroundImage: `url(${swipedRightCards[swipedRightCards.length - 1].icon})` }}
                    ></div>
                    <h4 className="text-gray-900 dark:text-white text-lg font-bold truncate w-full mb-2">
                      {swipedRightCards[swipedRightCards.length - 1].name}
                    </h4>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="text-gray-500 text-xs">{swipedRightCards[swipedRightCards.length - 1].category}</span>
                      {swipedRightCards[swipedRightCards.length - 1].price && (
                        <>
                          <span className="text-gray-400 text-xs">•</span>
                          <span className="text-primary font-semibold text-xs">{swipedRightCards[swipedRightCards.length - 1].price}</span>
                        </>
                      )}
                    </div>
                    {swipedRightCards[swipedRightCards.length - 1].description && 
                     swipedRightCards[swipedRightCards.length - 1].description !== 'app_name_match' && 
                     swipedRightCards[swipedRightCards.length - 1].description !== 'No description available' && (
                      <p className="text-gray-600 dark:text-gray-400 text-xs leading-relaxed px-2 line-clamp-1">
                        {swipedRightCards[swipedRightCards.length - 1].description.split('\n')[0].trim()}
                      </p>
                    )}
                    <div className="absolute top-4 right-4 bg-green-500 text-white rounded-full p-2">
                      <span className="text-base">♥</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Center Active Card */}
            <div className="relative w-80 h-[600px]">
              <SwipeCard 
                app={currentApp} 
                onLike={() => handleAction('like')} 
                onPass={() => handleAction('pass')}
                isActive={true}
                zIndex={10}
              />
              
              {/* Action Buttons Outside Card - Left and Right */}
              <div className="absolute bottom-6 left-[-80px]">
                <button
                  onClick={() => handleAction('pass')}
                  className="flex items-center justify-center size-16 bg-red-500 rounded-full text-white shadow-lg hover:bg-red-600 transition-all duration-200 ease-in-out transform hover:scale-110"
                >
                  <span className="text-4xl">✕</span>
                </button>
              </div>
              <div className="absolute bottom-6 right-[-80px]">
                <button
                  onClick={() => handleAction('like')}
                  className="flex items-center justify-center size-16 bg-green-500 rounded-full text-white shadow-lg hover:bg-green-600 transition-all duration-200 ease-in-out transform hover:scale-110"
                >
                  <span className="text-4xl">♥</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}