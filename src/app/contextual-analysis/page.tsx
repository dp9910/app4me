'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import Navigation from '@/components/ui/Navigation';

interface ProgressStep {
  id: string;
  name: string;
  icon: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  data?: any;
  timestamp?: number;
  description?: string; // Added description field
}

interface ProgressData {
  sessionId: string;
  currentStep: number;
  totalSteps: number;
  steps: ProgressStep[];
  data: {
    query: string;
    query_type?: string;
    user_situation?: string;
    root_cause?: string;
    urgency?: string;
    categories?: Record<string, { weight: number; keywords: string[] }>;
    category_breakdown?: Record<string, { found: number; final: number; weight: number }>;
    final_results?: any[];
  };
  elapsed: number;
}

const stepIcons: Record<string, string> = {
  'query_analysis': '🧠', // More distinct emoji
  'keyword_processing': '🔑', // More distinct emoji
  'diversified_search': '🌐', // More distinct emoji
  'category_filtering': '🗂️', // More distinct emoji
  'semantic_ranking': '✨',
  'final_selection': '✅' // More distinct emoji
};

export default function ContextualAnalysisPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const query = searchParams.get('query');

  const startSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery || isSearching) return;

    setIsSearching(true);
    setSearchError(null);
    setProgressData(null);

    try {
      const response = await fetch('/api/search/intent-driven', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, limit: 20 })
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.contextual_analysis) {
        sessionStorage.setItem('contextualAnalysis', JSON.stringify(result));
        sessionStorage.setItem('useStoredResults', 'true');
        sessionStorage.setItem('searchResults', JSON.stringify({
            query: searchQuery,
            success: result.success,
            results: result.results,
            contextual_analysis: result.contextual_analysis
        }));
        
        const isGeneralQuery = result.contextual_analysis.query_type === 'general';
        const mockProgress: ProgressData = {
          sessionId: 'completed_' + Date.now(),
          currentStep: 5,
          totalSteps: 6,
          elapsed: 6000,
          steps: [
            { 
              id: 'query_analysis', 
              name: isGeneralQuery ? 'Intent Recognition' : 'Query Interpretation', 
              icon: stepIcons['query_analysis'], 
              status: 'completed', 
              description: isGeneralQuery 
                ? 'Analyzing your request to identify desired app categories, features, and user preferences.'
                : 'Understanding your request as a problem or general query, identifying key themes and context.',
              data: { 
                query_type: result.contextual_analysis.query_type,
                user_situation: result.contextual_analysis.user_situation,
                root_cause: result.contextual_analysis.root_cause,
                urgency: result.contextual_analysis.urgency,
                categories: result.contextual_analysis.weighted_keywords 
              } 
            },
            { 
              id: 'keyword_processing', 
              name: isGeneralQuery ? 'Category Mapping' : 'Keyword Extraction', 
              icon: stepIcons['keyword_processing'], 
              status: 'completed',
              description: isGeneralQuery
                ? 'Mapping your interests to relevant app categories and identifying key search terms.'
                : 'Organizing search terms by importance and creating targeted search strategies for each category.'
            },
            { 
              id: 'diversified_search', 
              name: isGeneralQuery ? 'Multi-Category Discovery' : 'Database Query', 
              icon: stepIcons['diversified_search'], 
              status: 'completed',
              description: isGeneralQuery
                ? 'Exploring multiple app categories to discover diverse options that match your interests.'
                : 'Searching across multiple app categories simultaneously to ensure comprehensive coverage.'
            },
            { 
              id: 'category_filtering', 
              name: isGeneralQuery ? 'Quality Filtering' : 'Initial Filtering', 
              icon: stepIcons['category_filtering'], 
              status: 'completed',
              description: isGeneralQuery
                ? 'Filtering apps by ratings, reviews, and relevance to ensure quality recommendations.'
                : 'Removing duplicates and organizing results by relevance across different solution types.'
            },
            { 
              id: 'semantic_ranking', 
              name: isGeneralQuery ? 'Semantic Matching' : 'AI Re-ranking', 
              icon: stepIcons['semantic_ranking'], 
              status: 'completed',
              description: isGeneralQuery
                ? 'Using AI to understand the deeper meaning of your request and find semantically similar apps.'
                : 'Using AI to understand the meaning behind your query and rank apps by true relevance.'
            },
            { 
              id: 'final_selection', 
              name: 'Final Ranking', 
              icon: stepIcons['final_selection'], 
              status: 'completed',
              description: isGeneralQuery
                ? 'Ranking apps by combining semantic relevance, user ratings, and category fit for optimal discovery.'
                : 'Combining all signals to deliver the most helpful app recommendations for your specific need.'
            }
          ],
          data: {
            query: searchQuery,
            query_type: result.contextual_analysis.query_type,
            user_situation: result.contextual_analysis.user_situation,
            root_cause: result.contextual_analysis.root_cause,
            urgency: result.contextual_analysis.urgency,
            categories: result.contextual_analysis.weighted_keywords,
            final_results: result.results
          }
        };
        
        setProgressData(mockProgress);
      } else {
        throw new Error(result.error || 'Search failed');
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchError(error instanceof Error ? error.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [isSearching]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
      return;
    }

    if (!query) {
      router.push('/swipe');
      return;
    }

    const storedData = sessionStorage.getItem('contextualAnalysis');
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        if (parsed.query === query && parsed.contextual_analysis) {
          const isGeneralQueryStored = parsed.contextual_analysis.query_type === 'general';
          const mockProgress: ProgressData = {
            sessionId: 'stored_' + Date.now(),
            currentStep: 5,
            totalSteps: 6,
            elapsed: 0,
            steps: [
              { 
                id: 'query_analysis', 
                name: isGeneralQueryStored ? 'Intent Recognition' : 'Query Interpretation', 
                icon: stepIcons['query_analysis'], 
                status: 'completed', 
                description: isGeneralQueryStored 
                  ? 'Analyzing your request to identify desired app categories, features, and user preferences.'
                  : 'Understanding your request as a problem or general query, identifying key themes and context.',
                data: { 
                  query_type: parsed.contextual_analysis.query_type,
                  user_situation: parsed.contextual_analysis.user_situation,
                  root_cause: parsed.contextual_analysis.root_cause,
                  urgency: parsed.contextual_analysis.urgency,
                  categories: parsed.contextual_analysis.weighted_keywords 
                } 
              },
              { 
                id: 'keyword_processing', 
                name: isGeneralQueryStored ? 'Category Mapping' : 'Keyword Extraction', 
                icon: stepIcons['keyword_processing'], 
                status: 'completed',
                description: isGeneralQueryStored
                  ? 'Mapping your interests to relevant app categories and identifying key search terms.'
                  : 'Organizing search terms by importance and creating targeted search strategies for each category.'
              },
              { 
                id: 'diversified_search', 
                name: isGeneralQueryStored ? 'Multi-Category Discovery' : 'Database Query', 
                icon: stepIcons['diversified_search'], 
                status: 'completed',
                description: isGeneralQueryStored
                  ? 'Exploring multiple app categories to discover diverse options that match your interests.'
                  : 'Searching across multiple app categories simultaneously to ensure comprehensive coverage.'
              },
              { 
                id: 'category_filtering', 
                name: isGeneralQueryStored ? 'Quality Filtering' : 'Initial Filtering', 
                icon: stepIcons['category_filtering'], 
                status: 'completed',
                description: isGeneralQueryStored
                  ? 'Filtering apps by ratings, reviews, and relevance to ensure quality recommendations.'
                  : 'Removing duplicates and organizing results by relevance across different solution types.'
              },
              { 
                id: 'semantic_ranking', 
                name: isGeneralQueryStored ? 'Semantic Matching' : 'AI Re-ranking', 
                icon: stepIcons['semantic_ranking'], 
                status: 'completed',
                description: isGeneralQueryStored
                  ? 'Using AI to understand the deeper meaning of your request and find semantically similar apps.'
                  : 'Using AI to understand the meaning behind your query and rank apps by true relevance.'
              },
              { 
                id: 'final_selection', 
                name: 'Final Ranking', 
                icon: stepIcons['final_selection'], 
                status: 'completed',
                description: isGeneralQueryStored
                  ? 'Ranking apps by combining semantic relevance, user ratings, and category fit for optimal discovery.'
                  : 'Combining all signals to deliver the most helpful app recommendations for your specific need.'
              }
            ],
            data: {
              query: parsed.query,
              query_type: parsed.contextual_analysis.query_type,
              user_situation: parsed.contextual_analysis.user_situation,
              root_cause: parsed.contextual_analysis.root_cause,
              urgency: parsed.contextual_analysis.urgency,
              categories: parsed.contextual_analysis.weighted_keywords,
              final_results: parsed.results
            }
          };
          
          setProgressData(mockProgress);
          sessionStorage.setItem('useStoredResults', 'true'); // Add this line
          sessionStorage.setItem('searchResults', JSON.stringify({
              query: query,
              success: parsed.success,
              results: parsed.results,
              contextual_analysis: parsed.contextual_analysis
          }));
          return;
        }
      } catch (error) {
        console.error('Error parsing stored analysis data:', error);
      }
    }

    startSearch(query);
  }, [loading, user, router, query, startSearch]);

  const proceedToRecommendations = () => {
    if (progressData) {
      sessionStorage.setItem('skipContextualAnalysis', 'true');
      router.push(`/swipe?query=${encodeURIComponent(progressData.data.query)}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <Navigation />
        <div className="flex items-center justify-center min-h-screen pt-20">
          <div className="text-center space-y-6">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-black dark:border-white border-t-transparent mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (searchError) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <Navigation />
        <div className="flex items-center justify-center min-h-screen pt-20">
          <div className="text-center space-y-6">
            <div className="text-red-500 text-4xl">❌</div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Search Failed</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{searchError}</p>
              <button 
                onClick={() => startSearch(query!)}
                className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
              >
                Retry Search
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!progressData) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <Navigation />
        <div className="flex items-center justify-center min-h-screen pt-20">
          <div className="text-center space-y-6">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-black dark:border-white border-t-transparent mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400">Analyzing your query...</p>
          </div>
        </div>
      </div>
    );
  }

  const { data: analysisData } = progressData;

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-gray-800 dark:text-gray-200">
      <Navigation />
      
      <main className="w-full grow px-4 sm:px-6 lg:px-8 py-8 md:py-12 pt-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 xl:gap-12">
            
            {/* Main Content: AI Process Timeline */}
            <div className="lg:col-span-2">
              <div className="flex flex-col gap-10">
                
                {/* Page Heading */}
                <div className="flex flex-wrap justify-between gap-3 px-2">
                  <div className="flex min-w-72 flex-col gap-1.5">
                    <h1 className="text-gray-900 dark:text-white text-4xl font-bold tracking-[-0.03em]">AI Reasoning Trace</h1>
                    <p className="text-gray-600 dark:text-gray-400 text-base font-normal leading-normal">
                      Showing thought process for query: '<span className="font-medium text-gray-800 dark:text-gray-300">{analysisData.query}</span>'
                    </p>
                  </div>
                </div>

                {/* Timeline Steps */}
                <div className="space-y-2">
                  {progressData.steps.map((step, index) => (
                    <div 
                      key={step.id}
                      className="group grid grid-cols-[auto_1fr] gap-x-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <div className="flex flex-col items-center gap-2">
                        {index === 0 ? (
                          <div className="flex items-center justify-center size-10 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 group-hover:bg-primary group-hover:text-white transition-colors">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                            </svg>
                          </div>
                        ) : index === progressData.steps.length - 1 ? (
                          <>
                            <div className="w-px bg-gray-300 dark:bg-gray-600 h-full grow"></div>
                            <div className="flex items-center justify-center size-10 rounded-full bg-primary text-white">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </>
                        ) : (
                          <>
                            {index > 0 && <div className="w-px bg-gray-300 dark:bg-gray-600 h-full grow"></div>}
                            <div className="flex items-center justify-center size-10 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 group-hover:bg-primary group-hover:text-white transition-colors">
                              {step.id === 'keyword_processing' && (
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                </svg>
                              )}
                              {step.id === 'diversified_search' && (
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                </svg>
                              )}
                              {step.id === 'category_filtering' && (
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                                </svg>
                              )}
                              {step.id === 'semantic_ranking' && (
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              )}
                            </div>
                            {index < progressData.steps.length - 1 && <div className="w-px bg-gray-300 dark:bg-gray-600 h-full grow"></div>}
                          </>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col pt-1.5 pb-6">
                        <p className="text-gray-900 dark:text-white text-base font-semibold leading-normal">{step.name}</p>
                        <p className="text-gray-600 dark:text-gray-400 text-base font-normal leading-normal">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Side Panel: Analysis Results */}
            <aside className="lg:col-span-1 lg:sticky top-28 self-start">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Search Analysis</h3>
                  
                  {/* Your Intent/Situation */}
                  <div className="space-y-4">
                    <h4 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                      {analysisData.query_type === 'general' ? 'Your Intent' : 'Your Situation'}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {analysisData.user_situation || 'Analyzing your request to understand what you need.'}
                    </p>
                  </div>

                  {/* Root Cause/Search Focus */}
                  {analysisData.root_cause && (
                    <div className="space-y-4">
                      <h4 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                        {analysisData.query_type === 'general' ? 'Search Focus' : 'Root Cause'}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{analysisData.root_cause}</p>
                    </div>
                  )}
                </div>

                <div className="w-full h-px bg-gray-200 dark:bg-gray-700 my-6"></div>

                {/* Keywords Section */}
                {analysisData.categories && (
                  <div className="space-y-6">
                    {/* Render keyword categories based on query type */}
                    {analysisData.query_type === 'problem' ? (
                      <>
                        {/* Problem Keywords */}
                        <div className="space-y-4">
                          <h4 className="text-base font-semibold text-gray-800 dark:text-gray-100">Problem Keywords</h4>
                          <div className="flex flex-wrap gap-2">
                            {analysisData.categories.problem?.keywords.map((keyword, index) => (
                              <span key={index} className="px-2.5 py-1 text-sm font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200">
                                {keyword}
                              </span>
                            )) || []}
                          </div>
                        </div>

                        {/* Solution Keywords */}
                        <div className="space-y-4">
                          <h4 className="text-base font-semibold text-gray-800 dark:text-gray-100">Solution Keywords</h4>
                          <div className="flex flex-wrap gap-2">
                            {analysisData.categories.solution?.keywords.map((keyword, index) => (
                              <span key={index} className="px-2.5 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200">
                                {keyword}
                              </span>
                            )) || []}
                          </div>
                        </div>

                        {/* Cause Keywords */}
                        {analysisData.categories.cause?.keywords.length > 0 && (
                          <div className="space-y-4">
                            <h4 className="text-base font-semibold text-gray-800 dark:text-gray-100">Cause Keywords</h4>
                            <div className="flex flex-wrap gap-2">
                              {analysisData.categories.cause.keywords.map((keyword, index) => (
                                <span key={index} className="px-2.5 py-1 text-sm font-medium rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Context Keywords */}
                        {analysisData.categories.context?.keywords.length > 0 && (
                          <div className="space-y-4">
                            <h4 className="text-base font-semibold text-gray-800 dark:text-gray-100">Context Keywords</h4>
                            <div className="flex flex-wrap gap-2">
                              {analysisData.categories.context.keywords.map((keyword, index) => (
                                <span key={index} className="px-2.5 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      /* General query - show all categories */
                      <div className="space-y-4">
                        <h4 className="text-base font-semibold text-gray-800 dark:text-gray-100">Discovery Categories</h4>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(analysisData.categories).map(([category, data]) => (
                            <span key={category} className="px-2.5 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                              {category}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Results Summary and CTA */}
                    {analysisData.final_results && (
                      <div className="text-center py-4">
                        <div className="text-3xl font-bold text-gray-700 dark:text-gray-300 mb-2">
                          {analysisData.final_results.length}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                          Apps found for your query
                        </p>
                        <button
                          onClick={proceedToRecommendations}
                          className="w-full px-4 py-2 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
                          disabled={isSearching}
                        >
                          View Recommendations
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}