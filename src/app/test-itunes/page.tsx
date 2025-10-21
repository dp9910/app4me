'use client'

import { useState, useEffect } from 'react'

export default function TestiTunesPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔍 Fetching iTunes data...')
      const response = await fetch('/api/test-itunes')
      const result = await response.json()
      
      console.log('📱 iTunes API Response:', result)
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
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            iTunes API Test Results
          </h1>
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? '🔄 Testing...' : '🔄 Refresh Test'}
          </button>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Fetching data from iTunes API...</p>
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
              <h2 className="text-xl font-semibold text-gray-900 mb-4">📊 Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{data.rawData?.resultCount}</div>
                  <div className="text-sm text-gray-600">Total Results</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{data.transformedApps?.length}</div>
                  <div className="text-sm text-gray-600">Apps Processed</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {data.transformedApps?.filter((app: any) => app.isFree).length}
                  </div>
                  <div className="text-sm text-gray-600">Free Apps</div>
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-600">
                <p><strong>API URL:</strong> {data.apiUrl}</p>
                <p><strong>Timestamp:</strong> {data.timestamp}</p>
              </div>
            </div>

            {/* Raw Data Sample */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">🔍 Raw iTunes Data (First App)</h2>
              <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                  {JSON.stringify(data.rawData?.firstAppRaw, null, 2)}
                </pre>
              </div>
            </div>

            {/* Transformed Apps List */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">📱 Processed Apps Data</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {data.transformedApps?.map((app: any) => (
                  <div key={app.trackId} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      {app.artworkUrl100 && (
                        <img 
                          src={app.artworkUrl100} 
                          alt={app.trackName}
                          className="w-16 h-16 rounded-lg"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{app.trackName}</h3>
                        <p className="text-sm text-gray-600 mb-2">by {app.artistName}</p>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="font-medium">Price:</span> 
                            <span className={`ml-1 px-2 py-1 rounded ${app.isFree ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                              {app.isFree ? 'Free' : `$${app.price}`}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Category:</span> {app.primaryGenreName}
                          </div>
                          <div>
                            <span className="font-medium">Rating:</span> {app.averageUserRating || 'N/A'} ⭐
                          </div>
                          <div>
                            <span className="font-medium">Reviews:</span> {app.userRatingCount?.toLocaleString() || 'N/A'}
                          </div>
                          <div className="col-span-2">
                            <span className="font-medium">Track ID:</span> {app.trackId}
                          </div>
                        </div>

                        <div className="mt-2">
                          <p className="text-xs text-gray-500">{app.description}</p>
                        </div>

                        {app.trackViewUrl && (
                          <a 
                            href={app.trackViewUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-block mt-2 text-xs text-blue-600 hover:text-blue-800"
                          >
                            View in App Store →
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Data for Database */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">🗄️ Database-Ready Format</h2>
              <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                  {JSON.stringify(data.transformedApps?.slice(0, 3), null, 2)}
                </pre>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                ↑ Showing first 3 apps in database format. This is the data we'll store in Supabase.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}