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
    weighted_keywords: Record<string, { keywords: string[]; weight: number }>;
    search_strategy: string;
  };
  results: any[];
}

export default function ContextualAnalysisPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);

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

    const storedData = sessionStorage.getItem('contextualAnalysis');
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        if (parsed.query === query && parsed.contextual_analysis) {
          setAnalysisData(parsed);
          return;
        }
      } catch (error) {
        console.error('Error parsing stored analysis data:', error);
      }
    }

    router.push(`/swipe?query=${encodeURIComponent(query)}`);
  }, [loading, user, router, searchParams]);

  const proceedToRecommendations = () => {
    if (analysisData) {
      sessionStorage.setItem('useStoredResults', 'true');
      sessionStorage.setItem('skipContextualAnalysis', 'true');
      router.push(`/swipe?query=${encodeURIComponent(analysisData.query)}`);
    }
  };

  if (loading || !analysisData) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <Navigation />
        <div className="flex items-center justify-center min-h-screen pt-20">
          <div className="text-center space-y-6">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-black dark:border-white border-t-transparent mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading Analysis...</p>
          </div>
        </div>
      </div>
    );
  }

  const { contextual_analysis, results } = analysisData;

  const KeywordCategory = ({ category, keywords, weight, color }) => (
    <div className={`bg-${color}-50 dark:bg-${color}-900/20 p-4 rounded-lg`}>
      <h4 className={`font-bold text-sm uppercase text-${color}-600 dark:text-${color}-400 mb-2`}>{category} (Weight: {weight})</h4>
      <p className={`text-sm text-${color}-800 dark:text-${color}-200`}>{keywords.join(', ')}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navigation />
      
      <main className="pt-20 pb-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12 p-6 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-3">
              <div className="text-2xl">⚠️</div>
              <p className="text-amber-800 dark:text-amber-200 font-medium">
                <span className="font-bold">Heads up!</span> This is AI-powered guidance • Use your best judgment ✨
              </p>
            </div>
          </div>

          <div className="text-center mb-16">
            <button
              onClick={proceedToRecommendations}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200"
            >
              <span>Proceed to app recommendations</span>
            </button>
          </div>

          <div className="space-y-20">
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

            <div>
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900/20 dark:to-green-900/20 px-6 py-3 rounded-full mb-6">
                  <span className="text-2xl">🧠</span>
                  <span className="text-emerald-800 dark:text-emerald-300 font-semibold">AI Analysis</span>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-3xl p-8 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center"><span className="text-white text-xl">📍</span></div>
                    <h3 className="text-xl font-bold text-green-800 dark:text-green-300">Your Situation</h3>
                  </div>
                  <p className="text-green-700 dark:text-green-200 font-medium">{contextual_analysis.user_situation}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-green-900/15 dark:to-emerald-900/15 rounded-3xl p-8 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center"><span className="text-white text-xl">🎯</span></div>
                    <h3 className="text-xl font-bold text-emerald-800 dark:text-emerald-300">Root Cause</h3>
                  </div>
                  <p className="text-emerald-700 dark:text-emerald-200 font-medium">{contextual_analysis.root_cause}</p>
                </div>
              </div>
            </div>

            <div>
              <div className="text-center mb-12">
                <h2 className="text-3xl font-light text-gray-900 dark:text-white mb-4">Search Strategy Breakdown</h2>
                <p className="text-lg text-gray-600 dark:text-gray-400">How the AI is finding your apps.</p>
              </div>
              <div className="space-y-8 max-w-4xl mx-auto bg-gray-50 dark:bg-gray-800/50 p-8 rounded-2xl border border-gray-200 dark:border-gray-700">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Weighted Keywords</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {contextual_analysis.weighted_keywords && Object.entries(contextual_analysis.weighted_keywords).map(([category, data]) => (
                      <KeywordCategory key={category} category={category} keywords={data.keywords} weight={data.weight} color="slate" />
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Search Strategy</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{contextual_analysis.search_strategy}</p>
                </div>
              </div>
            </div>

            <div className="text-center py-16">
              <h2 className="text-3xl font-light text-gray-900 dark:text-white mb-4">Ready to see your apps?</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
                We found {results?.length || 0} apps that can help with your situation.
              </p>
              <div className="space-y-4">
                <button
                  onClick={proceedToRecommendations}
                  className="inline-block px-8 py-3 bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 rounded-md font-medium transition-colors"
                >
                  View App Recommendations
                </button>
                <div className="text-center">
                  <Link href="/swipe" className="text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium transition-colors">
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