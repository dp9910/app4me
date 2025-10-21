'use client'

import { useState, useEffect } from 'react'

export default function DataAnalysisPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔍 Fetching iTunes analysis data...')
      const response = await fetch('/api/itunes-analysis')
      const result = await response.json()
      
      console.log('📊 iTunes Analysis Response:', result)
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
            📊 iTunes API Data Analysis
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Live data from iTunes Search API processed and analyzed
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
            <p className="text-gray-600">Fetching and analyzing iTunes data...</p>
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
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">📊 Data Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-blue-600">{data.summary.totalApps}</div>
                  <div className="text-sm text-gray-600">Total Results</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-green-600">{data.summary.freeApps}</div>
                  <div className="text-sm text-gray-600">Free Apps</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-purple-600">{data.summary.paidApps}</div>
                  <div className="text-sm text-gray-600">Paid Apps</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-yellow-600">{data.summary.averageRating}</div>
                  <div className="text-sm text-gray-600">Avg Rating</div>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Categories */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📁 Categories</h3>
                  <div className="space-y-2">
                    {Object.entries(data.summary.categories).map(([category, count]: [string, any]) => (
                      <div key={category} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-gray-700">{category}</span>
                        <span className="font-semibold text-gray-900">{count} apps</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price Ranges */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">💰 Price Distribution</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-gray-700">Free</span>
                      <span className="font-semibold text-gray-900">{data.summary.priceRanges.free} apps</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-gray-700">Under $5</span>
                      <span className="font-semibold text-gray-900">{data.summary.priceRanges.under5} apps</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-gray-700">$5 - $10</span>
                      <span className="font-semibold text-gray-900">{data.summary.priceRanges.under10} apps</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-gray-700">Over $10</span>
                      <span className="font-semibold text-gray-900">{data.summary.priceRanges.over10} apps</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Raw Data Sample */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">🔍 Raw iTunes Data (First App)</h2>
              <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                  {JSON.stringify(data.rawData.firstAppSample, null, 2)}
                </pre>
              </div>
            </div>

            {/* Processed Apps Grid */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">📱 Processed Apps Data</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {data.processedApps.map((app: any) => (
                  <div key={app.trackId} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3 mb-3">
                      {app.artworkUrl100 && (
                        <img 
                          src={app.artworkUrl100} 
                          alt={app.trackName}
                          className="w-12 h-12 rounded-lg flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1 truncate">
                          {app.trackName}
                        </h3>
                        <p className="text-xs text-gray-600 mb-1">by {app.artistName}</p>
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`px-2 py-1 rounded ${app.isFree ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                            {app.formattedPrice}
                          </span>
                          <span className="text-gray-500">{app.primaryGenreName}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Rating:</span>
                        <span className="font-medium">{app.averageUserRating || 'N/A'} ⭐</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Reviews:</span>
                        <span className="font-medium">{app.userRatingCount?.toLocaleString() || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Size:</span>
                        <span className="font-medium">{app.fileSize}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Version:</span>
                        <span className="font-medium">{app.version || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Min iOS:</span>
                        <span className="font-medium">{app.minimumOsVersion || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Track ID:</span>
                        <span className="font-medium text-xs">{app.trackId}</span>
                      </div>
                    </div>

                    {app.description && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500 line-clamp-3">{app.description}</p>
                      </div>
                    )}

                    {app.trackViewUrl && (
                      <div className="mt-3">
                        <a 
                          href={app.trackViewUrl} 
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

            {/* Database Ready Format */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">🗄️ Database-Ready Format (First 5 Apps)</h2>
              <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                  {JSON.stringify(data.dbReadyApps, null, 2)}
                </pre>
              </div>
              <p className="text-sm text-gray-600 mt-3">
                ↑ This is the exact format we'll use to store data in Supabase database.
              </p>
            </div>

            {/* API Info */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">🔗 API Information</h2>
              <div className="space-y-2 text-sm">
                <div><strong>API URL:</strong> {data.apiUrl}</div>
                <div><strong>Timestamp:</strong> {data.timestamp}</div>
                <div><strong>Total Results:</strong> {data.rawData.resultCount}</div>
                <div><strong>Processed Apps:</strong> {data.processedApps.length}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}