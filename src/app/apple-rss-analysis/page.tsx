'use client'

import { useState, useEffect } from 'react'

export default function AppleRSSAnalysisPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('🍎 Fetching Apple RSS analysis data...')
      const response = await fetch('/api/apple-rss')
      const result = await response.json()
      
      console.log('📊 Apple RSS Analysis Response:', result)
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
            🍎 Apple RSS Feed Data Analysis
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Live data from Apple RSS Marketing Tools analyzed and processed
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
            <p className="text-gray-600">Fetching and analyzing Apple RSS data...</p>
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
                  <div className="text-3xl font-bold text-blue-600">{data.summary.totalFeeds}</div>
                  <div className="text-sm text-gray-600">RSS Feeds</div>
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
              
              {/* All Genres */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📁 All Categories (Combined)</h3>
                <div className="grid md:grid-cols-3 gap-2">
                  {Object.entries(data.summary.allCategories).map(([category, count]: [string, any]) => (
                    <div key={category} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                      <span className="text-gray-700">{category}</span>
                      <span className="font-semibold text-gray-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Feed Breakdown */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">📡 Feed Breakdown</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {data.summary.feedSummaries.map((feed: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">{feed.feedName}</h3>
                    <div className="text-sm text-gray-600 mb-3">Type: {feed.feedType}</div>
                    
                    {feed.error ? (
                      <div className="text-red-600 text-sm">{feed.error}</div>
                    ) : (
                      <>
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between">
                            <span>Apps:</span>
                            <span className="font-medium">{feed.totalApps}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Has Price:</span>
                            <span className="font-medium">{feed.hasPrice}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Has Summary:</span>
                            <span className="font-medium">{feed.hasSummary}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Has Artwork:</span>
                            <span className="font-medium">{feed.hasArtwork}</span>
                          </div>
                        </div>
                        
                        {feed.categories && Object.keys(feed.categories).length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Top Categories:</h4>
                            <div className="space-y-1">
                              {Object.entries(feed.categories).slice(0, 3).map(([category, count]: [string, any]) => (
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

            {/* Feed Metadata */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">📡 Feed Metadata</h2>
              <div className="space-y-4">
                {data.feeds.map((feed: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">{feed.feedInfo.name}</h3>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <div><strong>Title:</strong> {String(feed.feedMetadata?.title || 'N/A')}</div>
                        <div><strong>Author:</strong> {String(feed.feedMetadata?.author || 'N/A')}</div>
                        <div><strong>Country:</strong> {String(feed.feedMetadata?.country || 'N/A')}</div>
                        <div><strong>Results:</strong> {Number(feed.resultCount || 0)}</div>
                      </div>
                      <div>
                        <div><strong>Updated:</strong> {String(feed.feedMetadata?.updated || 'N/A')}</div>
                        <div><strong>Copyright:</strong> {String(feed.feedMetadata?.copyright || 'N/A')}</div>
                        <div><strong>Feed ID:</strong> {String(feed.feedMetadata?.id || 'N/A')}</div>
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
                {data.allApps.filter((app: any) => app && app.name).map((app: any, index: number) => (
                  <div key={`${app.feedType}-${app.id}`} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3 mb-3">
                      {app.artworkUrl100 && String(app.artworkUrl100) !== '' && (
                        <img 
                          src={String(app.artworkUrl100)} 
                          alt={String(app.name || 'App')}
                          className="w-12 h-12 rounded-lg flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1 truncate">
                          {app.name || 'Unknown App'}
                        </h3>
                        <p className="text-xs text-gray-600 mb-1">by {app.artistName || 'Unknown Artist'}</p>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2 py-1 rounded bg-blue-100 text-blue-800">
                            {app.feedType}
                          </span>
                          <span className="text-gray-500">{app.category || 'Unknown'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Rank:</span>
                        <span className="font-medium">#{app.index}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Release:</span>
                        <span className="font-medium">{app.releaseDate && app.releaseDate !== '' ? new Date(String(app.releaseDate)).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Price:</span>
                        <span className="font-medium">{String(app.price && app.price !== '' ? app.price : 'Free')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Rating:</span>
                        <span className="font-medium">{String(app.contentRating || 'N/A')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">ID:</span>
                        <span className="font-medium text-xs">{String(app.id || 'N/A')}</span>
                      </div>
                    </div>

                    {app.summary && String(app.summary) !== '' && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500 line-clamp-3">{String(app.summary)}</p>
                      </div>
                    )}

                    {app.url && String(app.url) !== '' && (
                      <div className="mt-3">
                        <a 
                          href={String(app.url)} 
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
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">🔍 Raw RSS Data (First App)</h2>
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
                ↑ This is the exact format we'll use to store Apple RSS data in our database.
              </p>
            </div>

            {/* API Info */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">🔗 RSS Feed Information</h2>
              <div className="space-y-2 text-sm">
                <div><strong>Timestamp:</strong> {data.timestamp}</div>
                <div><strong>Successful Feeds:</strong> {data.summary.successfulFeeds}/{data.summary.totalFeeds}</div>
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