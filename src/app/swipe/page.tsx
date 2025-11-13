'use client';

import { useEffect, useState, useRef } from 'react';
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
  rating_count?: number;
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
  // Add fields for the back of the card
  primary_use_case?: string;
  target_user?: string;
  key_benefit?: string;
  matched_keywords?: string[];
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
  const [isCompleting, setIsCompleting] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [appsCount, setAppsCount] = useState<string>('9020'); // Default fallback count
  const isRedirectingRef = useRef<boolean>(false); // Track if we're redirecting to contextual analysis

  // Load apps count from session storage and fetch fresh count
  useEffect(() => {
    const cachedCount = sessionStorage.getItem('appsCount');
    if (cachedCount) {
      setAppsCount(cachedCount);
    }

    // Fetch fresh app count from API
    const fetchAppsCount = async () => {
      try {
        const response = await fetch('/api/apps-count');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.count) {
            const countStr = data.count.toString();
            setAppsCount(countStr);
            sessionStorage.setItem('appsCount', countStr);
          }
        } else {
          // API failed, use fallback
          console.warn('Apps count API failed, using fallback count');
        }
      } catch (error) {
        console.error('Error fetching apps count:', error);
        // Keep existing fallback value
      }
    };

    fetchAppsCount();
  }, []);

  useEffect(() => {
    const queryParam = searchParams.get('query');
    const swipeInitialSearchDone = sessionStorage.getItem('swipeInitialSearchDone');
    console.log('SwipePage useEffect - queryParam:', queryParam);
    console.log('SwipePage useEffect - loading:', loading);
    console.log('SwipePage useEffect - user:', user);
    console.log('SwipePage useEffect - swipeInitialSearchDone:', swipeInitialSearchDone);
    
    if (queryParam && swipeInitialSearchDone !== queryParam) { // Check if search done for THIS query
      sessionStorage.setItem('swipeInitialSearchDone', queryParam); // Mark as done for this query
      setSearchQuery(decodeURIComponent(queryParam));
      console.log('SwipePage useEffect - Calling handleSearchWithQuery with:', decodeURIComponent(queryParam));
      handleSearchWithQuery(decodeURIComponent(queryParam));
    } else if (!loading && !user) {
      console.log('SwipePage useEffect - Redirecting to signin');
      router.push('/auth/signin');
    }
  }, [searchParams, user, loading, router]); // Removed hasInitialSearchRun from dependencies

  // Cleanup effect to handle session completion when leaving the page
  // Cleanup effect to handle session completion when leaving the page
  useEffect(() => {
    return () => {
      // Complete session when component unmounts (navigation to other pages)
      if (sessionId && currentApp) {
        console.log('SwipePage cleanup - Completing incomplete swipe session');
        completeSwipeSessionIncomplete('user_stopped');
      }
      // Session storage is NOT cleared here to allow contextual analysis flow
    };
  }, []); // Empty dependency array - only run on unmount

  const startSwipeSession = async (query: string, totalApps: number) => {
    if (!user) return null;
    console.log('startSwipeSession - Starting new swipe session for query:', query);
    
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
      console.log('startSwipeSession - Session started with ID:', data.id);
      return data.id;
    } catch (error) {
      console.error('Error starting swipe session:', error);
      return null;
    }
  };

  const logSwipeInteraction = async (app: App, action: 'like' | 'pass', cardPosition: number) => {
    if (!user || !sessionId) return;
    console.log('logSwipeInteraction - Logging swipe:', app.name, action, cardPosition);
    
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
    console.log('completeSwipeSession - Completing swipe session with reason:', reason);
    
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
    console.log('completeSwipeSessionIncomplete - Completing incomplete swipe session with reason:', reason);
    
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

  const endSession = async () => {
    if (!sessionId || !user || isEndingSession) return;
    
    console.log('endSession - User ended session early, completing with current interactions only');
    setIsEndingSession(true);
    
    try {
      // Complete the session with only the apps the user has already interacted with
      const totalDuration = Date.now() - (sessionStartTime || Date.now());
      
      const { error: sessionError } = await supabase
        .from('swipe_sessions')
        .update({
          total_likes: swipedRightCards.length,
          total_passes: swipedLeftCards.length,
          session_duration_ms: totalDuration,
          completed: true,
          completion_reason: 'user_stopped',
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (sessionError) {
        console.error('❌ Error updating session:', sessionError);
        console.error('Session update error details:', JSON.stringify(sessionError, null, 2));
      } else {
        console.log('✅ Session updated successfully');
      }

      console.log(`✅ Successfully ended session early. User interacted with ${swipedRightCards.length + swipedLeftCards.length} apps (${swipedRightCards.length} liked, ${swipedLeftCards.length} passed).`);

      // Clean up session storage
      sessionStorage.removeItem('contextualAnalysis');
      sessionStorage.removeItem('searchResults');
      sessionStorage.removeItem('useStoredResults');
      sessionStorage.removeItem('skipContextualAnalysis');
      sessionStorage.removeItem('swipeInitialSearchDone');
      
      console.log('🚀 Redirecting to my-apps dashboard...');
      // Redirect to my-apps dashboard
      router.replace('/my-apps');
      
    } catch (error) {
      console.error('Error ending session:', error);
      // Even if there's an error, try to redirect to my-apps dashboard
      console.log('🚀 Attempting redirect despite error...');
      router.replace('/my-apps');
    } finally {
      setIsEndingSession(false);
    }
  };

  const handleSearchWithQuery = async (query: string) => {
    // Count how many times this function is called
    const callCount = parseInt(sessionStorage.getItem('searchCallCount') || '0') + 1;
    sessionStorage.setItem('searchCallCount', callCount.toString());
    console.log(`🔢 handleSearchWithQuery - CALL #${callCount} with query:`, query);
    
    if (!query.trim()) {
      console.log('handleSearchWithQuery - Query is empty, returning.');
      return;
    }
    
    const trimmedQuery = query.trim();
    
    // Clear skip flag for any new search to ensure contextual analysis can trigger
    sessionStorage.removeItem('skipContextualAnalysis');
    
    // Update the search query state to match the actual query being used
    setSearchQuery(trimmedQuery);
    setIsSearching(true);
    setSearchError(null);
    setHasSearched(true);
    
    // Check if we should use stored results instead of making a new API call
    const useStored = sessionStorage.getItem('useStoredResults');
    const storedResults = sessionStorage.getItem('searchResults');
    console.log('handleSearchWithQuery - useStored:', useStored, 'storedResults:', storedResults ? 'present' : 'absent');
    
    if (useStored && storedResults) {
      try {
        const parsed = JSON.parse(storedResults);
        console.log('handleSearchWithQuery - Parsed stored results:', parsed);
        if (parsed.query === trimmedQuery && parsed.success && parsed.results) {
          console.log('handleSearchWithQuery - Using stored results!');
          // Use stored results
          sessionStorage.removeItem('useStoredResults');
          sessionStorage.removeItem('searchResults');
          
          const normalizedResults = parsed.results.map((result: any) => ({
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
            rating_count: result.app_data.rating_count || 0,
            description: result.app_data.description || 'No description available',
            short_description: result.app_data.description,
            full_description: result.app_data.description,
            price: result.app_data.price || 'Free',
            similarity_score: result.relevance_score / 10,
            match_quality: result.search_method,
            relevance_score: result.relevance_score,
            personalized_one_liner: result.match_reason,
            match_reason: result.match_reason,
            matched_keywords: result.matched_keywords,
            // Add the features data from the API response
            primary_use_case: result.primary_use_case,
            target_user: result.target_user,
            key_benefit: result.key_benefit
          }));

          setSearchResults(normalizedResults);
          setTotalCards(normalizedResults.length);
          
          if (normalizedResults.length > 0) {
            setCurrentApp(normalizedResults[0]);
            setAppStack(normalizedResults);
            setCardIndex(1);
            await startSwipeSession(query, normalizedResults.length);
          } else {
            setSearchError('No apps found matching your search.');
          }
          
          setIsSearching(false);
          console.log('handleSearchWithQuery - Successfully used stored results, returning.');
          return;
        } else {
          console.log('handleSearchWithQuery - Stored results condition not met:', {
            queryMatch: parsed.query === trimmedQuery,
            success: parsed.success,
            resultsPresent: !!parsed.results
          });
        }
      } catch (error) {
        console.error('handleSearchWithQuery - Error parsing stored results:', error);
      }
    }
    
    console.log('handleSearchWithQuery - Making new API call to /api/search/intent-driven');
    try {
      const response = await fetch('/api/search/intent-driven', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: trimmedQuery,
          limit: 20
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      // Check if this query should show contextual analysis (both problem and general queries)
      // BUT skip if user already went through contextual analysis for this session
      const skipContextual = sessionStorage.getItem('skipContextualAnalysis');
      const queryType = data.contextual_analysis?.query_type;
      const shouldShowContextual = queryType === 'problem' || queryType === 'general';
      
      console.log('handleSearchWithQuery - API call result:');
      console.log('- skipContextual:', skipContextual);
      console.log('- queryType:', queryType);
      console.log('- shouldShowContextual:', shouldShowContextual);
      console.log('- data.success:', data.success);
      console.log('- data.contextual_analysis:', data.contextual_analysis);
      console.log('- results length:', data.results?.length);
      
      if (data.success && data.contextual_analysis && shouldShowContextual && !skipContextual) {
        const currentCallCount = sessionStorage.getItem('searchCallCount') || '0';
        console.log(`✅ REDIRECTING TO CONTEXTUAL ANALYSIS after ${currentCallCount} calls`);
        console.log('handleSearchWithQuery - Redirecting to contextual analysis page.');
        // Mark that we're redirecting to prevent useEffect from re-triggering
        isRedirectingRef.current = true;
        
        // Store the analysis data in session storage for the contextual analysis page
        const essentialSearchData = {
          query: data.query,
          success: data.success,
          results: data.results,
          contextual_analysis: data.contextual_analysis
        };
        
        try {
          sessionStorage.setItem('contextualAnalysis', JSON.stringify(essentialSearchData));
          sessionStorage.setItem('searchResults', JSON.stringify(essentialSearchData));
          
          // Verify the data was stored
          const verifyAnalysis = sessionStorage.getItem('contextualAnalysis');
          const verifyResults = sessionStorage.getItem('searchResults');
          console.log('handleSearchWithQuery - Stored contextualAnalysis:', verifyAnalysis ? 'present' : 'absent', 'searchResults:', verifyResults ? 'present' : 'absent');
          
          // Data stored successfully
        } catch (error) {
          console.error('❌ Failed to store session data:', error);
          // Fallback: proceed without contextual analysis
          isRedirectingRef.current = false;
          return;
        }
        
        // Add a small delay to ensure session storage is written before navigation
        setTimeout(() => {
          // Final verification before navigation
          const finalCheck = sessionStorage.getItem('contextualAnalysis');
          
          if (finalCheck) {
            router.push(`/contextual-analysis?query=${encodeURIComponent(trimmedQuery)}`);
          } else {
            isRedirectingRef.current = false;
          }
        }, 100);
        
        return;
      }

      if (data.success && data.results) {
        console.log('handleSearchWithQuery - Processing API results for swipe cards.');
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
          rating_count: result.app_data.rating_count || 0,
          description: result.app_data.description || 'No description available',
          short_description: result.app_data.description,
          full_description: result.app_data.description,
          price: result.app_data.price || 'Free',
          similarity_score: result.relevance_score / 10, // Normalize to 0-1
          match_quality: result.search_method,
          relevance_score: result.relevance_score,
          personalized_one_liner: result.match_reason,
          match_reason: result.match_reason,
          matched_keywords: result.matched_keywords,
          // Add the features data from the API response
          primary_use_case: result.primary_use_case,
          target_user: result.target_user,
          key_benefit: result.key_benefit
        }));

        setSearchResults(normalizedResults);
        setTotalCards(normalizedResults.length);
        
        if (normalizedResults.length > 0) {
          setCurrentApp(normalizedResults[0]);
          setAppStack(normalizedResults);
          setCardIndex(1);
          
          // Start a new swipe session
          await startSwipeSession(trimmedQuery, normalizedResults.length);
        } else {
          setSearchError('No apps found matching your search. Try different keywords or be more specific.');
        }
      } else {
        setSearchError(data.error || 'No results found');
      }
    } catch (error) {
      console.error('handleSearchWithQuery - Search error:', error);
      setSearchError(error instanceof Error ? error.message : 'Search failed. Please try again.');
    } finally {
      setIsSearching(false);
      console.log('handleSearchWithQuery - Finished search process.');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    // Reset call counter for new user-initiated search
    sessionStorage.removeItem('searchCallCount');
    console.log('🆕 Starting new user search - reset call counter');
    sessionStorage.removeItem('skipContextualAnalysis'); // Clear before new search
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
      setIsCompleting(true);
      await completeSwipeSession('finished_all');
      setCurrentApp(null);
      
      // Clean up session storage to prevent re-triggering contextual analysis
      sessionStorage.removeItem('contextualAnalysis');
      sessionStorage.removeItem('searchResults');
      sessionStorage.removeItem('useStoredResults');
      sessionStorage.removeItem('skipContextualAnalysis');
      sessionStorage.removeItem('swipeInitialSearchDone'); // Clear initial search flag
      
      // Show completion message then redirect
      setTimeout(() => {
        router.replace('/my-apps');
      }, 1500);
    }
  };

  const resetSearch = async () => {
    // Complete current session as incomplete if it exists
    if (sessionId) {
      await completeSwipeSessionIncomplete('start_over');
    }
    
    // Clean up session storage
    sessionStorage.removeItem('contextualAnalysis');
    sessionStorage.removeItem('searchResults');
    sessionStorage.removeItem('useStoredResults');
    sessionStorage.removeItem('skipContextualAnalysis'); // Ensure this is cleared on reset
    sessionStorage.removeItem('skipContextualAnalysis');
    
    // Clear search tracking
    isRedirectingRef.current = false;
    sessionStorage.removeItem('swipeInitialSearchDone'); // Clear initial search flag
    
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
    setIsCompleting(false);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-gray-800 dark:text-gray-200 antialiased">
      {/* Navigation Header */}
      <Navigation />

      {/* Main Content */}
      <main className="relative flex flex-1 flex-col items-center justify-center px-4 py-16 sm:py-24 overflow-auto" 
            style={{
              backgroundColor: '#f7f9fc',
              backgroundImage: 'radial-gradient(circle at 1px 1px, #dde2f1 1px, transparent 0)',
              backgroundSize: '2rem 2rem'
            }}>
        <div className="absolute inset-0 bg-gradient-to-t from-[#f7f9fc] from-0% via-[#f7f9fc]/80 via-30% to-transparent"></div>
        
        {/* Action Buttons - Top Right */}
        {(currentApp || hasSearched) && (
          <div className="absolute top-20 right-4 z-30 flex flex-col gap-3">
            {/* End Session Button */}
            {currentApp && (
              <button
                onClick={() => endSession()}
                disabled={isEndingSession}
                className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium transition-all duration-200 shadow-lg ${
                  isEndingSession 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-green-500 hover:bg-green-600 hover:shadow-xl transform hover:scale-105'
                }`}
              >
                {isEndingSession ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Finishing...</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm">✓</span>
                    <span>Done</span>
                  </>
                )}
              </button>
            )}
            
            {/* Start Over Button */}
            <button
              onClick={async () => {
                await resetSearch();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <span className="text-sm">🔄</span>
              <span>Start Over</span>
            </button>
          </div>
        )}
        
        {/* Search Section */}
        {!currentApp && !isSearching && !hasSearched && !isCompleting && (
          <div className="relative w-full max-w-4xl text-center z-10">
            <h1 className="text-gray-900 dark:text-white text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tighter mb-4">
              Find your next favorite app.
            </h1>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-12 text-lg md:text-xl">
              Describe what you need. Our AI powered search engine will find the right ones from {appsCount.toLocaleString()} apps.
            </p>

            {/* Search Input - Exactly like reference */}
            <div className="relative flex w-full max-w-3xl mx-auto items-center mb-12">
              <div className="absolute inset-0 bg-white/50 dark:bg-black/20 rounded-full blur-xl"></div>
              <div className="relative w-full bg-white/60 dark:bg-white/5 backdrop-blur-md border border-gray-300 dark:border-gray-700 rounded-3xl transition-all shadow-lg shadow-gray-200/50 dark:shadow-black/20 focus-within:ring-4 focus-within:ring-blue-500/20 focus-within:border-blue-500 dark:focus-within:border-blue-500 min-h-[6rem] sm:min-h-[8rem]">
                <textarea
                  className="w-full h-full text-lg bg-transparent border-none focus:ring-0 rounded-3xl py-4 pl-6 pr-32 sm:pr-40 text-gray-900 dark:text-white transition-all outline-none resize-none leading-relaxed"
                  style={{ textAlign: 'left' }}
                  placeholder="Describe what you're looking for..."
                  value={searchQuery}
                  rows={4}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim() && !isSearching) {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                />
                <button 
                  onClick={handleSearch}
                  disabled={!searchQuery.trim() || isSearching}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 flex-shrink-0 flex items-center justify-center gap-2 h-12 sm:h-16 px-6 sm:px-8 bg-gray-800 hover:bg-gray-900 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-gray-900 rounded-full font-semibold text-base transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="hidden sm:inline">Search</span>
                  <svg className="w-5 h-5 sm:hidden" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>

              {/* Try these examples - styled like reference design */}
              <div className="text-center mb-16">
                <div className="flex flex-wrap items-center justify-center gap-4 max-w-5xl mx-auto">
                  <div className="group relative">
                    <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 blur-lg opacity-50 group-hover:opacity-75 transition-all"></div>
                    <button
                      onClick={() => handleSearchWithQuery('I struggle to stay focused while working from home and need apps that help with productivity and time management')}
                      className="relative flex items-center justify-center px-6 py-3 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 transition-all text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      I struggle to stay focused while working from home and need productivity apps
                    </button>
                  </div>

                  <div className="group relative">
                    <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 blur-lg opacity-50 group-hover:opacity-75 transition-all"></div>
                    <button
                      onClick={() => handleSearchWithQuery('I want to track my daily water intake and eating habits but keep forgetting to log everything consistently')}
                      className="relative flex items-center justify-center px-6 py-3 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 transition-all text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      I want to track my water intake and eating habits but keep forgetting
                    </button>
                  </div>

                  <div className="group relative">
                    <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-green-400 to-emerald-400 blur-lg opacity-50 group-hover:opacity-75 transition-all"></div>
                    <button
                      onClick={() => handleSearchWithQuery('My photos and videos are scattered across multiple devices and cloud services, I need better organization')}
                      className="relative flex items-center justify-center px-6 py-3 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 transition-all text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      My photos are scattered everywhere and I need better organization
                    </button>
                  </div>

                  <div className="group relative">
                    <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 blur-lg opacity-50 group-hover:opacity-75 transition-all"></div>
                    <button
                      onClick={() => handleSearchWithQuery('I want to learn piano as a complete beginner but don\'t know where to start or what apps would help')}
                      className="relative flex items-center justify-center px-6 py-3 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 transition-all text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      I want to learn piano as a beginner but don't know where to start
                    </button>
                  </div>

                  <div className="group relative">
                    <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-rose-400 to-red-400 blur-lg opacity-50 group-hover:opacity-75 transition-all"></div>
                    <button
                      onClick={() => handleSearchWithQuery('I need help managing my budget and tracking expenses because my finances are a complete mess right now')}
                      className="relative flex items-center justify-center px-6 py-3 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 transition-all text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      I need help managing my budget because my finances are a mess
                    </button>
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
        {!isSearching && hasSearched && searchError && !isCompleting && (
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

        {/* Completion Screen */}
        {isCompleting && (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
            <div className="text-center space-y-6 max-w-md">
              <div className="text-6xl">🎉</div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                Great Job!
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                You've completed your app discovery session. Taking you to your results...
              </p>
              <div className="flex justify-center gap-8 mt-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">{swipedRightCards.length}</div>
                  <div className="text-sm text-gray-500">Apps Liked</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-500">{swipedLeftCards.length}</div>
                  <div className="text-sm text-gray-500">Apps Passed</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fallback for completed session (should not happen but prevents blank screen) */}
        {!currentApp && !isSearching && hasSearched && !searchError && !isCompleting && (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
            <div className="text-center space-y-6 max-w-md">
              <div className="text-6xl">✅</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Session Complete!
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Redirecting to your results...
              </p>
              <button
                onClick={() => router.replace('/my-apps')}
                className="bg-primary hover:bg-primary/90 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                View My Apps
              </button>
            </div>
          </div>
        )}

        {/* App Cards Section - Persistent Swipe Interface */}
        {currentApp && !isCompleting && (
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
                  className="w-64 h-96 rounded-xl bg-white/75 dark:bg-gray-800/75 border border-gray-200 dark:border-gray-700 shadow-lg pointer-events-none"
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
                  className="w-64 h-96 rounded-xl bg-white/75 dark:bg-gray-800/75 border border-gray-200 dark:border-gray-700 shadow-lg pointer-events-none"
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
            <div className="relative w-full max-w-md h-[600px]">
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