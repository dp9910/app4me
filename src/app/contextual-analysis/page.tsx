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

const stepIcons = {
  'query_analysis': '🔍',
  'keyword_processing': '🏷️',
  'diversified_search': '🎯',
  'category_filtering': '🔧',
  'semantic_ranking': '✨',
  'final_selection': '🏆'
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
        
        const mockProgress: ProgressData = {
          sessionId: 'completed_' + Date.now(),
          currentStep: 5,
          totalSteps: 6,
          elapsed: 6000,
          steps: [
            { id: 'query_analysis', name: 'Query Interpretation', icon: 'search', status: 'completed', 
              data: { 
                query_type: result.contextual_analysis.query_type,
                user_situation: result.contextual_analysis.user_situation,
                root_cause: result.contextual_analysis.root_cause,
                urgency: result.contextual_analysis.urgency,
                categories: result.contextual_analysis.weighted_keywords 
              } 
            },
            { id: 'keyword_processing', name: 'Keyword Extraction', icon: 'label', status: 'completed' },
            { id: 'diversified_search', name: 'Database Query', icon: 'hub', status: 'completed' },
            { id: 'category_filtering', name: 'Initial Filtering', icon: 'filter_alt', status: 'completed' },
            { id: 'semantic_ranking', name: 'AI Re-ranking', icon: 'auto_awesome', status: 'completed' },
            { id: 'final_selection', name: 'Final Selection', icon: 'verified', status: 'completed' }
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
              { id: 'query_analysis', name: 'Query Interpretation', icon: 'search', status: 'completed', 
                data: { 
                  query_type: parsed.contextual_analysis.query_type,
                  user_situation: parsed.contextual_analysis.user_situation,
                  root_cause: parsed.contextual_analysis.root_cause,
                  urgency: parsed.contextual_analysis.urgency,
                  categories: parsed.contextual_analysis.weighted_keywords 
                } 
              },
              { id: 'keyword_processing', name: 'Keyword Extraction', icon: 'label', status: 'completed' },
              { id: 'diversified_search', name: 'Database Query', icon: 'hub', status: 'completed' },
              { id: 'category_filtering', name: 'Initial Filtering', icon: 'filter_alt', status: 'completed' },
              { id: 'semantic_ranking', name: 'AI Re-ranking', icon: 'auto_awesome', status: 'completed' },
              { id: 'final_selection', name: 'Final Selection', icon: 'verified', status: 'completed' }
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
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-[#343A40] dark:text-white">
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
                    <p className="text-gray-900 dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">AI Reasoning Trace</p>
                    <p className="text-gray-500 dark:text-gray-400 text-base font-normal leading-normal">
                      Showing thought process for query: '{analysisData.query}'
                    </p>
                  </div>
                </div>

                {/* Toolbar */}
                <div className="flex justify-between items-center gap-4 px-4 py-3 border border-gray-200 dark:border-white/10 rounded-xl bg-white/50 dark:bg-black/20">
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg">
                      <span className="text-xl">⚙️</span>
                    </button>
                    <div className="w-px h-6 bg-gray-200 dark:bg-white/10"></div>
                    <button className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg">
                      <span className="text-xl">🔍</span>
                    </button>
                    <button className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg">
                      <span className="text-xl">📊</span>
                    </button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <div className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full bg-blue-500/10 dark:bg-blue-500/20 pl-3 pr-3">
                      <p className="text-blue-600 dark:text-blue-300 text-sm font-medium leading-normal">INFO</p>
                    </div>
                    <div className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full bg-purple-500/10 dark:bg-purple-500/20 pl-3 pr-3">
                      <p className="text-purple-600 dark:text-purple-300 text-sm font-medium leading-normal">DEBUG</p>
                    </div>
                    <div className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full bg-amber-500/10 dark:bg-amber-500/20 pl-3 pr-3">
                      <p className="text-amber-600 dark:text-amber-300 text-sm font-medium leading-normal">WARN</p>
                    </div>
                  </div>
                </div>

                {/* Timeline - Modern Card Layout */}
                <div className="space-y-4 px-4">
                  {progressData.steps.map((step, index) => (
                    <div 
                      key={step.id}
                      className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
                        step.status === 'completed' 
                          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800/50 shadow-sm' 
                          : step.status === 'running'
                          ? 'bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border-purple-200 dark:border-purple-800/50 shadow-md'
                          : 'bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {/* Completion indicator */}
                      {step.status === 'completed' && (
                        <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                      )}
                      
                      <div className="flex items-start gap-4 p-6">
                        {/* Icon */}
                        <div className={`flex items-center justify-center w-12 h-12 rounded-full flex-shrink-0 ${
                          step.status === 'completed' 
                            ? 'bg-blue-500 text-white shadow-lg' 
                            : step.status === 'running'
                            ? 'bg-purple-500 text-white shadow-lg animate-pulse'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                        }`}>
                          <span className="text-xl">{stepIcons[step.id]}</span>
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
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                : step.status === 'running'
                                ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}>
                              {step.status === 'completed' ? '✓ Complete' : 
                               step.status === 'running' ? '⏳ Running' : '⭕ Pending'}
                            </div>
                          </div>

                          {/* Step Description */}
                          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4">
                            {step.id === 'query_analysis' && step.data ? 
                              `Understanding your request as a ${step.data.query_type} with ${step.data.urgency} priority, identifying key themes and context.` :
                              step.id === 'keyword_processing' ? 
                              'Organizing search terms by importance and creating targeted search strategies for each category.' :
                              step.id === 'diversified_search' ? 
                              'Searching across multiple app categories simultaneously to ensure comprehensive coverage.' :
                              step.id === 'category_filtering' ? 
                              'Removing duplicates and organizing results by relevance across different solution types.' :
                              step.id === 'semantic_ranking' ? 
                              'Using AI to understand the meaning behind your query and rank apps by true relevance.' :
                              'Combining all signals to deliver the most helpful app recommendations for your specific need.'
                            }
                          </p>

                          {/* Step Details for Query Analysis */}
                          {step.data && step.id === 'query_analysis' && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-3 border border-gray-200/50 dark:border-gray-600/50">
                                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</span>
                                <p className="text-sm font-medium text-gray-900 dark:text-white capitalize mt-1">{step.data.query_type}</p>
                              </div>
                              <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-3 border border-gray-200/50 dark:border-gray-600/50">
                                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Priority</span>
                                <p className="text-sm font-medium text-gray-900 dark:text-white capitalize mt-1">{step.data.urgency}</p>
                              </div>
                              {step.data.categories && (
                                <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-3 border border-gray-200/50 dark:border-gray-600/50">
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
              <div className="bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Search Analysis</h3>
                
                {/* AI Understanding */}
                {analysisData.user_situation && (
                  <div className="space-y-4 mb-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Your Situation</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{analysisData.user_situation}</p>
                    </div>
                    {analysisData.root_cause && (
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Root Cause</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{analysisData.root_cause}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Keyword Categories */}
                {analysisData.categories && (
                  <div className="space-y-4 mb-6">
                    <h4 className="font-semibold text-gray-900 dark:text-white">Search Keywords</h4>
                    <div className="space-y-3">
                      {Object.entries(analysisData.categories).map(([category, data]) => (
                        <div key={category} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                          <h5 className="text-sm font-medium text-gray-900 dark:text-white capitalize mb-1">
                            {category}
                          </h5>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {data.keywords.slice(0, 4).join(', ')}
                            {data.keywords.length > 4 && ` +${data.keywords.length - 4} more`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Results Summary */}
                {analysisData.final_results && (
                  <div className="text-center py-4 border-t border-gray-200 dark:border-white/10">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                      {analysisData.final_results.length}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Apps found using diversified search
                    </p>
                    <button
                      onClick={proceedToRecommendations}
                      className="w-full px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
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