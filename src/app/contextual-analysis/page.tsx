'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import Navigation from '@/components/ui/Navigation';
import Link from 'next/link';

interface AnalysisData {
  query: string;
  contextual_analysis: {
    query_type: string;
    user_situation: string;
    root_cause: string;
    urgency: string;
    solution_steps: Array<{
      step_number: number;
      step_name: string;
      focus: string;
      app_count: number;
    }>;
  };
}

interface LoadingState {
  query: boolean;
  analysis: boolean;
  steps: boolean;
  complete: boolean;
}

export default function ContextualAnalysisPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    query: true,
    analysis: true,
    steps: true,
    complete: false
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
      return;
    }

    const query = searchParams.get('query');
    if (!query) {
      router.push('/swipe');
      return;
    }

    // Try to get stored analysis data first
    const storedData = sessionStorage.getItem('contextualAnalysis');
    
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        
        if (parsed.query === query && parsed.contextual_analysis) {
          setAnalysisData(parsed);
          setLoadingState({
            query: false,
            analysis: false,
            steps: false,
            complete: true
          });
          return;
        }
      } catch (error) {
        console.error('Error parsing stored analysis data:', error);
      }
    }

    // If no stored data, redirect back to search (shouldn't happen in normal flow)
    router.push(`/swipe?query=${encodeURIComponent(query)}`);
  }, [loading, user, router, searchParams]);

  const proceedToRecommendations = () => {
    if (analysisData) {
      // Mark that we should use stored results instead of searching again
      sessionStorage.setItem('useStoredResults', 'true');
      // Prevent re-triggering contextual analysis if user comes back
      sessionStorage.setItem('skipContextualAnalysis', 'true');
      router.push(`/swipe?query=${encodeURIComponent(analysisData.query)}`);
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

  if (!analysisData) {
    return null;
  }

  const { contextual_analysis } = analysisData;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navigation />
      
      <main className="pt-20 pb-12 px-6">
        <div className="max-w-4xl mx-auto">
          {/* AI Disclaimer */}
          <div className="mb-12 p-6 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-3">
              <div className="text-2xl">⚠️</div>
              <p className="text-amber-800 dark:text-amber-200 font-medium">
                <span className="font-bold">Heads up!</span> This is AI-powered guidance • Use your best judgment ✨
              </p>
            </div>
          </div>

          {/* Proceed Button - Top */}
          <div className="text-center mb-16">
            <button
              onClick={proceedToRecommendations}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200"
            >
              <span>Proceed to app recommendations</span>
            </button>
          </div>

          {/* Story Content */}
          <div className="space-y-20">
            {/* Your Query Section */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/20 px-4 py-2 rounded-full mb-6">
                <span className="text-2xl">💬</span>
                <span className="text-green-800 dark:text-green-300 font-medium">You asked</span>
              </div>
              <div className="max-w-3xl mx-auto">
                <div className="text-3xl font-bold text-gray-900 dark:text-white bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-2xl p-8 border-l-4 border-green-500">
                  "{analysisData.query}"
                </div>
              </div>
            </div>

            {/* AI Analysis Section */}
            <div>
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900/20 dark:to-green-900/20 px-6 py-3 rounded-full mb-6">
                  <span className="text-2xl">🧠</span>
                  <span className="text-emerald-800 dark:text-emerald-300 font-semibold">AI Analysis</span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                {/* Situation Card */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-3xl p-8 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xl">📍</span>
                    </div>
                    <h3 className="text-xl font-bold text-green-800 dark:text-green-300">Your Situation</h3>
                  </div>
                  <div className="space-y-3">
                    {contextual_analysis.user_situation.split('. ').filter(s => s.length > 10).map((sentence, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-3 flex-shrink-0"></div>
                        <p className="text-green-700 dark:text-green-200 font-medium">{sentence.trim()}.</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Root Cause Card */}
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-green-900/15 dark:to-emerald-900/15 rounded-3xl p-8 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xl">🎯</span>
                    </div>
                    <h3 className="text-xl font-bold text-emerald-800 dark:text-emerald-300">Root Cause</h3>
                  </div>
                  <div className="space-y-3">
                    {contextual_analysis.root_cause.split('. ').filter(s => s.length > 10).map((sentence, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full mt-3 flex-shrink-0"></div>
                        <p className="text-emerald-700 dark:text-emerald-200 font-medium">{sentence.trim()}.</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 4-Step Solution Plan */}
            <div>
              <div className="text-center mb-12">
                <h2 className="text-3xl font-light text-gray-900 dark:text-white mb-4">
                  Your Action Plan
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-400">Simple, actionable steps designed just for you</p>
              </div>

              <div className="space-y-6 max-w-4xl mx-auto">
                {contextual_analysis.solution_steps.map((step, index) => {
                  const stepColors = [
                    { 
                      bg: 'bg-gray-50 dark:bg-gray-800/50',
                      border: 'border-gray-200 dark:border-gray-700',
                      icon: 'bg-slate-600',
                      text: 'text-slate-700 dark:text-slate-300'
                    },
                    { 
                      bg: 'bg-stone-50 dark:bg-stone-800/50',
                      border: 'border-stone-200 dark:border-stone-700',
                      icon: 'bg-stone-600',
                      text: 'text-stone-700 dark:text-stone-300'
                    },
                    { 
                      bg: 'bg-neutral-50 dark:bg-neutral-800/50',
                      border: 'border-neutral-200 dark:border-neutral-700',
                      icon: 'bg-neutral-600',
                      text: 'text-neutral-700 dark:text-neutral-300'
                    },
                    { 
                      bg: 'bg-zinc-50 dark:bg-zinc-800/50',
                      border: 'border-zinc-200 dark:border-zinc-700',
                      icon: 'bg-zinc-600',
                      text: 'text-zinc-700 dark:text-zinc-300'
                    }
                  ];
                  
                  const color = stepColors[index];

                  return (
                    <div
                      key={step.step_number}
                      className={`${color.bg} ${color.border} border rounded-lg p-6 transition-all duration-200 hover:shadow-md`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`flex-shrink-0 w-10 h-10 ${color.icon} rounded-lg flex items-center justify-center`}>
                          <span className="text-white font-semibold">{step.step_number}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className={`text-xl font-semibold ${color.text}`}>
                              {step.step_name}
                            </h3>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {step.app_count} apps
                            </span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                            {step.focus}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Final CTA Section */}
            <div className="text-center py-16">
              <h2 className="text-3xl font-light text-gray-900 dark:text-white mb-4">
                Ready to see your apps?
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
                We found {contextual_analysis.solution_steps.reduce((total, step) => total + step.app_count, 0)} apps that can help with your situation.
              </p>
              
              <div className="space-y-4">
                <button
                  onClick={proceedToRecommendations}
                  className="inline-block px-8 py-3 bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 rounded-md font-medium transition-colors"
                >
                  View App Recommendations
                </button>
                
                <div className="text-center">
                  <Link 
                    href="/swipe"
                    className="text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium transition-colors"
                  >
                    Try different search
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}