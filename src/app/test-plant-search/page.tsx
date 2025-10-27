'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button';

interface AppResult {
  id: number;
  name: string;
  description: string;
  category: string;
  rating: number;
  icon_url: string;
  one_liner: string;
  relevance_score?: number;
  match_reason?: string;
  matched_keywords?: string[];
}

interface TestResults {
  success: boolean;
  query: string;
  top_10_results: AppResult[];
  all_plant_apps: AppResult[];
  metadata: {
    total_plant_apps: number;
    algorithm_selected: number;
    search_method: string;
  };
}

export default function TestPlantSearchPage() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('help me take care of plants');
  const [results, setResults] = useState<TestResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/test-plant-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Search failed');
      }
      
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const urlQuery = searchParams.get('query');
    if (urlQuery) {
      setQuery(urlQuery);
      // Auto-trigger search if query comes from URL
      setTimeout(() => {
        handleSearch();
      }, 100);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🌱 Plant Search Algorithm Test
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Test our search algorithm: Top 10 vs All 374 Plant Apps
          </p>
          
          <div className="max-w-2xl mx-auto">
            <div className="flex gap-4">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your plant-related query..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <Button 
                onClick={handleSearch}
                disabled={isLoading || !query.trim()}
                className="px-6 py-3"
              >
                {isLoading ? 'Testing...' : 'Test Search'}
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            Error: {error}
          </div>
        )}

        {results && (
          <div className="space-y-8">
            {/* Metadata */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Search Results Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Query:</span> "{results.query}"
                </div>
                <div>
                  <span className="font-medium">Total Plant Apps:</span> {results.metadata.total_plant_apps}
                </div>
                <div>
                  <span className="font-medium">Algorithm Selected:</span> {results.metadata.algorithm_selected}
                </div>
              </div>
            </div>

            {/* Top 10 Results */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-green-600 text-white px-6 py-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  🏆 Top 10 Results from Algorithm
                  <span className="text-sm font-normal opacity-90">
                    (What our search picked as most relevant)
                  </span>
                </h2>
              </div>
              
              <div className="divide-y divide-gray-200">
                {results.top_10_results.map((app, index) => (
                  <div key={app.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600 font-bold">
                          #{index + 1}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                              {app.name}
                            </h3>
                            <p className="text-green-600 text-sm font-medium mb-1">
                              {app.one_liner}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span className="bg-gray-100 px-2 py-1 rounded">
                                {app.category}
                              </span>
                              {app.rating > 0 && (
                                <span className="flex items-center gap-1">
                                  ⭐ {app.rating.toFixed(1)}
                                </span>
                              )}
                              {app.relevance_score && (
                                <span className="text-green-600 font-medium">
                                  Score: {app.relevance_score.toFixed(2)}
                                </span>
                              )}
                            </div>
                            {app.match_reason && (
                              <p className="text-xs text-blue-600 mt-1">
                                Match: {app.match_reason}
                              </p>
                            )}
                            {app.matched_keywords && app.matched_keywords.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {app.matched_keywords.map(keyword => (
                                  <span key={keyword} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* All Plant Apps */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-600 text-white px-6 py-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  📱 All {results.metadata.total_plant_apps} Plant-Related Apps
                  <span className="text-sm font-normal opacity-90">
                    (Complete database for comparison)
                  </span>
                </h2>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                <div className="divide-y divide-gray-200">
                  {results.all_plant_apps.map((app, index) => {
                    const isInTop10 = results.top_10_results.some(topApp => topApp.id === app.id);
                    
                    return (
                      <div 
                        key={app.id} 
                        className={`p-3 hover:bg-gray-50 ${isInTop10 ? 'bg-green-50 border-l-4 border-l-green-500' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 text-center text-sm text-gray-400">
                            {index + 1}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className={`font-medium truncate ${isInTop10 ? 'text-green-900' : 'text-gray-900'}`}>
                                  {app.name}
                                  {isInTop10 && (
                                    <span className="ml-2 text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                                      IN TOP 10
                                    </span>
                                  )}
                                </h4>
                                <p className={`text-sm mb-1 ${isInTop10 ? 'text-green-700' : 'text-gray-600'}`}>
                                  {app.one_liner}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                  <span className="bg-gray-100 px-2 py-1 rounded">
                                    {app.category}
                                  </span>
                                  {app.rating > 0 && (
                                    <span>⭐ {app.rating.toFixed(1)}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}