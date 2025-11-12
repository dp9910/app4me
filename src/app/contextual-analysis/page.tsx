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
        
        const mockProgress: ProgressData = {
          sessionId: 'completed_' + Date.now(),
          currentStep: 5,
          totalSteps: 6,
          elapsed: 6000,
          steps: [
            { 
              id: 'query_analysis', 
              name: 'Query Interpretation', 
              icon: stepIcons['query_analysis'], 
              status: 'completed', 
              description: 'Understanding your request as a problem or general query, identifying key themes and context.',
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
              name: 'Keyword Extraction', 
              icon: stepIcons['keyword_processing'], 
              status: 'completed',
              description: 'Organizing search terms by importance and creating targeted search strategies for each category.'
            },
            { 
              id: 'diversified_search', 
              name: 'Database Query', 
              icon: stepIcons['diversified_search'], 
              status: 'completed',
              description: 'Searching across multiple app categories simultaneously to ensure comprehensive coverage.'
            },
            { 
              id: 'category_filtering', 
              name: 'Initial Filtering', 
              icon: stepIcons['category_filtering'], 
              status: 'completed',
              description: 'Removing duplicates and organizing results by relevance across different solution types.'
            },
            { 
              id: 'semantic_ranking', 
              name: 'AI Re-ranking', 
              icon: stepIcons['semantic_ranking'], 
              status: 'completed',
              description: 'Using AI to understand the meaning behind your query and rank apps by true relevance.'
            },
            { 
              id: 'final_selection', 
              name: 'Final Selection', 
              icon: stepIcons['final_selection'], 
              status: 'completed',
              description: 'Combining all signals to deliver the most helpful app recommendations for your specific need.'
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
          const mockProgress: ProgressData = {
            sessionId: 'stored_' + Date.now(),
            currentStep: 5,
            totalSteps: 6,
            elapsed: 0,
            steps: [
              { 
                id: 'query_analysis', 
                name: 'Query Interpretation', 
                icon: stepIcons['query_analysis'], 
                status: 'completed', 
                description: 'Understanding your request as a problem or general query, identifying key themes and context.',
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
                name: 'Keyword Extraction', 
                icon: stepIcons['keyword_processing'], 
                status: 'completed',
                description: 'Organizing search terms by importance and creating targeted search strategies for each category.'
              },
              { 
                id: 'diversified_search', 
                name: 'Database Query', 
                icon: stepIcons['diversified_search'], 
                status: 'completed',
                description: 'Searching across multiple app categories simultaneously to ensure comprehensive coverage.'
              },
              { 
                id: 'category_filtering', 
                name: 'Initial Filtering', 
                icon: stepIcons['category_filtering'], 
                status: 'completed',
                description: 'Removing duplicates and organizing results by relevance across different solution types.'
              },
              { 
                id: 'semantic_ranking', 
                name: 'AI Re-ranking', 
                icon: stepIcons['semantic_ranking'], 
                status: 'completed',
                description: 'Using AI to understand the meaning behind your query and rank apps by true relevance.'
              },
              { 
                id: 'final_selection', 
                name: 'Final Selection', 
                icon: stepIcons['final_selection'], 
                status: 'completed',
                description: 'Combining all signals to deliver the most helpful app recommendations for your specific need.'
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-800 dark:text-gray-200">
      <Navigation />
      
      <main className="w-full grow px-4 sm:px-6 lg:px-8 py-8 md:py-12 pt-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 xl:gap-12">
            
            {/* Main Content: AI Process Timeline */}
            <div className="lg:col-span-2">
              <div className="flex flex-col gap-8">
                
                {/* Page Heading */}
                <div className="flex flex-wrap justify-between gap-3 px-4">
                  <div className="flex min-w-72 flex-col gap-2">
                    <p className="text-gray-900 dark:text-white text-4xl font-extrabold leading-tight tracking-[-0.033em]">AI Reasoning Trace</p>
                    <p className="text-gray-600 dark:text-gray-400 text-base font-normal leading-normal">
                      Showing thought process for query: '<span className="font-medium text-gray-800 dark:text-gray-300">{analysisData.query}</span>'
                    </p>
                  </div>
                </div>

                

                {/* Timeline - Modern Card Layout */}
                <div className="space-y-4 px-4">
                  {progressData.steps.map((step, index) => (
                    <div 
                      key={step.id}
                      className={`relative overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-lg ${
                        step.status === 'completed' 
                          ? 'bg-gradient-to-r from-gray-50 to-green-50 dark:from-gray-800/30 dark:to-green-950/30 border-gray-200 dark:border-gray-700 shadow-sm' 
                          : step.status === 'running'
                          ? 'bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/40 dark:to-yellow-950/40 border-orange-300 dark:border-orange-700 shadow-lg ring-2 ring-orange-500 ring-opacity-50 animate-pulse' // Enhanced running state
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm'
                      }`}
                    >
                      {/* Completion indicator */}
                      {step.status === 'completed' && (
                        <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-green-500 to-teal-500"></div>
                      )}
                      
                      <div className="flex items-start gap-4 p-6">
                        {/* Icon */}
                        <div className={`flex items-center justify-center w-12 h-12 rounded-full flex-shrink-0 text-2xl ${
                          step.status === 'completed' 
                            ? 'bg-green-500 text-white shadow-lg' 
                            : step.status === 'running'
                            ? 'bg-orange-500 text-white shadow-lg animate-bounce' // Added bounce animation
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                        }`}>
                          {step.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-grow min-w-0">
                          {/* Step Header */}
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {step.name}
                            </h3>
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                              step.status === 'completed' 
                                ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                                : step.status === 'running'
                                ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}>
                              {step.status === 'completed' ? '✓ Complete' : 
                               step.status === 'running' ? '⏳ Running' : '⭕ Pending'}
                            </div>
                          </div>

                          {/* Step Description */}
                          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4">
                            {step.description}
                          </p>

                          {/* Step Details for Query Analysis */}
                          {step.data && step.id === 'query_analysis' && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                              <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600 shadow-sm">
                                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</span>
                                <p className="text-sm font-medium text-gray-900 dark:text-white capitalize mt-1">{step.data.query_type}</p>
                              </div>
                              <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600 shadow-sm">
                                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Priority</span>
                                <p className="text-sm font-medium text-gray-900 dark:text-white capitalize mt-1">{step.data.urgency}</p>
                              </div>
                              {step.data.categories && (
                                <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600 shadow-sm">
                                  <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Categories</span>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                                    {Object.keys(step.data.categories).length} groups
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Side Panel: Results */}
            <aside className="lg:col-span-1 lg:sticky top-24 self-start">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Search Analysis</h3>
                
                {/* AI Understanding */}
                {analysisData.user_situation && (
                  <div className="space-y-5 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                        <span className="text-xl mr-2">💡</span> Your Situation
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{analysisData.user_situation}</p>
                    </div>
                    {analysisData.root_cause && (
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                          <span className="text-xl mr-2">🌿</span> Root Cause
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{analysisData.root_cause}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Keyword Categories */}
                {analysisData.categories && (
                  <div className="space-y-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold text-gray-900 dark:text-white flex items-center">
                      <span className="text-xl mr-2">🏷️</span> Search Keywords
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(analysisData.categories).map(([category, data]) => (
                        <span key={category} className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 text-xs font-medium px-3 py-1 rounded-full">
                          {category} ({data.keywords.length})
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                      <p className="font-medium mb-2">Detailed Keywords:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {Object.entries(analysisData.categories).map(([category, data]) => (
                          <li key={category}>
                            <span className="font-semibold capitalize">{category}:</span> {data.keywords.join(', ')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Results Summary */}
                {analysisData.final_results && (
                  <div className="text-center py-4">
                    <div className="text-5xl font-extrabold text-gray-700 dark:text-gray-300 mb-2 animate-fade-in">
                      {analysisData.final_results.length}
                    </div>
                    <p className="text-md text-gray-600 dark:text-gray-400 mb-6">
                      Relevant apps found for your query
                    </p>
                    <button
                      onClick={proceedToRecommendations}
                      className="w-full px-6 py-3 bg-gray-700 text-white rounded-lg font-semibold text-lg hover:bg-gray-800 transition-all duration-300 transform hover:scale-105 shadow-lg"
                      disabled={isSearching}
                    >
                      View Recommendations
                    </button>
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