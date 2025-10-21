'use client'

import { useState, useEffect } from 'react'

export default function SerpAnalysisPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔍 Fetching SERP API analysis data...')
      const response = await fetch('/api/serp-analysis')
      const result = await response.json()
      
      console.log('📊 SERP Analysis Response:', result)
      setData(result)
      
      if (!result.success) {
        setError(result.error)
      }
    } catch (err: any) {
      console.error('❌ Error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🔍 SERP API App Store Analysis
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Live data from SERP API Apple App Store search analyzed and processed
          </p>
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? '🔄 Fetching...' : '🔄 Refresh Data'}
          </button>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Fetching and analyzing SERP API data...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-red-800 mb-2">❌ Error</h2>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {data && data.success && (
          <div className="space-y-8">
            {/* Summary Stats */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">📊 Overall Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-blue-600">{data.summary.totalSearches}</div>
                  <div className="text-sm text-gray-600">Search Queries</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-green-600">{data.summary.totalApps}</div>
                  <div className="text-sm text-gray-600">Total Apps</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-purple-600">{data.summary.uniqueApps}</div>
                  <div className="text-sm text-gray-600">Unique Apps</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-yellow-600">{Object.keys(data.summary.allCategories).length}</div>
                  <div className="text-sm text-gray-600">Categories</div>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Categories */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📁 Categories</h3>
                  <div className="space-y-2">
                    {Object.entries(data.summary.allCategories).map(([category, count]: [string, any]) => (
                      <div key={category} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-gray-700">{category}</span>
                        <span className="font-semibold text-gray-900">{count} apps</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Developers */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">👨‍💻 Top Developers</h3>
                  <div className="space-y-2">
                    {data.summary.topDevelopers.map(([developer, count]: [string, any]) => (
                      <div key={developer} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-gray-700 truncate">{developer}</span>
                        <span className="font-semibold text-gray-900">{count} apps</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Search Breakdown */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">🔍 Search Results Breakdown</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {data.summary.searchSummaries.map((search: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">{search.queryName}</h3>
                    <div className="text-sm text-gray-600 mb-3">Query: "{search.queryTerm}"</div>
                    
                    {search.error ? (
                      <div className="text-red-600 text-sm">{search.error}</div>
                    ) : (
                      <>
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between">
                            <span>Apps Found:</span>
                            <span className="font-medium">{search.totalApps}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Free Apps:</span>
                            <span className="font-medium">{search.priceDistribution?.free || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Paid Apps:</span>
                            <span className="font-medium">{search.priceDistribution?.paid || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>With Ratings:</span>
                            <span className="font-medium">{search.hasRatings}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>With Screenshots:</span>
                            <span className="font-medium">{search.hasScreenshots}</span>
                          </div>
                        </div>
                        
                        {search.categories && Object.keys(search.categories).length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Top Categories:</h4>
                            <div className="space-y-1">
                              {Object.entries(search.categories).slice(0, 3).map(([category, count]: [string, any]) => (
                                <div key={category} className="flex justify-between text-xs">
                                  <span className="text-gray-600">{category}</span>
                                  <span className="font-medium">{count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Search Metadata */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">🔍 Search Metadata</h2>
              <div className="space-y-4">
                {data.searches.map((search: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">{search.queryInfo.name}</h3>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <div><strong>Search Term:</strong> {search.queryInfo.term}</div>
                        <div><strong>Search ID:</strong> {String(search.searchMetadata?.searchId || 'N/A')}</div>
                        <div><strong>Status:</strong> {String(search.searchMetadata?.status || 'N/A')}</div>
                        <div><strong>Results:</strong> {search.resultCount}</div>
                      </div>
                      <div>
                        <div><strong>Created:</strong> {String(search.searchMetadata?.createdAt || 'N/A')}</div>
                        <div><strong>Processed:</strong> {String(search.searchMetadata?.processedAt || 'N/A')}</div>
                        <div><strong>Time Taken:</strong> {String(search.searchMetadata?.totalTimeTaken || 'N/A')}s</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Apps Grid */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">📱 All Apps</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {data.allApps.filter((app: any) => app && app.title).map((app: any, index: number) => (
                  <div key={`${app.queryTerm}-${app.bundleId}`} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3 mb-3">
                      {app.icon && String(app.icon) !== '' && (
                        <img 
                          src={String(app.icon)} 
                          alt={String(app.title || 'App')}
                          className="w-12 h-12 rounded-lg flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1 truncate">
                          {app.title || 'Unknown App'}
                        </h3>
                        <p className="text-xs text-gray-600 mb-1">by {app.developer || 'Unknown Developer'}</p>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2 py-1 rounded bg-blue-100 text-blue-800">
                            {app.queryTerm}
                          </span>
                          <span className="text-gray-500">{app.category || 'Unknown'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Rank:</span>
                        <span className="font-medium">#{app.rank}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Price:</span>
                        <span className="font-medium">{String(app.formattedPrice || 'Free')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Rating:</span>
                        <span className="font-medium">{app.rating ? `${app.rating} ⭐` : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Reviews:</span>
                        <span className="font-medium">{app.ratingCount ? app.ratingCount.toLocaleString() : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Version:</span>
                        <span className="font-medium">{String(app.version || 'N/A')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Bundle ID:</span>
                        <span className="font-medium text-xs">{String(app.bundleId || 'N/A')}</span>
                      </div>
                    </div>

                    {app.description && String(app.description) !== '' && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500 line-clamp-3">{String(app.description)}</p>
                      </div>
                    )}

                    {app.appStoreUrl && String(app.appStoreUrl) !== '' && (
                      <div className="mt-3">
                        <a 
                          href={String(app.appStoreUrl)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-block text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View in App Store →
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Raw Data Sample */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">🔍 Raw SERP Data (First App)</h2>
              <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                  {JSON.stringify(data.rawSample, null, 2)}
                </pre>
              </div>
            </div>

            {/* Database Ready Format */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">🗄️ Database-Ready Format (First 10 Apps)</h2>
              <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                  {JSON.stringify(data.dbReadyApps, null, 2)}
                </pre>
              </div>
              <p className="text-sm text-gray-600 mt-3">
                ↑ This is the exact format we'll use to store SERP API data in our database.
              </p>
            </div>

            {/* API Info */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">🔗 SERP API Information</h2>
              <div className="space-y-2 text-sm">
                <div><strong>Timestamp:</strong> {data.timestamp}</div>
                <div><strong>Successful Searches:</strong> {data.summary.successfulSearches}/{data.summary.totalSearches}</div>
                <div><strong>Total Apps Collected:</strong> {data.summary.totalApps}</div>
                <div><strong>Unique Apps:</strong> {data.summary.uniqueApps}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}