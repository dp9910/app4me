'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface AppRecommendation {
  trackId: number
  trackName: string
  artistName: string
  description: string
  price: number
  isFree: boolean
  category: string
  averageUserRating?: number
  userRatingCount?: number
  artworkUrl100?: string
  artworkUrl512?: string
  trackViewUrl: string
  recommendationReason?: string
  relevanceScore?: number
}

export default function RecommendationsPage() {
  const searchParams = useSearchParams()
  const [recommendations, setRecommendations] = useState<AppRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Parse user preferences from URL
  const preferences = {
    lifestyle: searchParams.get('lifestyle')?.split(',') || [],
    goals: searchParams.get('goals')?.split(',') || [],
    interests: searchParams.get('interests')?.split(',') || [],
    budget: searchParams.get('budget') || 'mixed',
    device: searchParams.get('device') || 'ios',
    sessionId: searchParams.get('sessionId') || ''
  }

  useEffect(() => {
    fetchRecommendations()
  }, [])

  const fetchRecommendations = async () => {
    try {
      setLoading(true)
      
      // First approach: Use our Gemini AI service for quick recommendations
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferences: {
            lifestyle: preferences.lifestyle,
            goals: preferences.goals,
            interests: preferences.interests,
            budget: preferences.budget,
            deviceType: preferences.device
          }
        })
      })

      const data = await response.json()

      if (data.success) {
        setRecommendations(data.recommendations)
      } else {
        throw new Error(data.error || 'Failed to get recommendations')
      }

    } catch (error: any) {
      console.error('Error fetching recommendations:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number, isFree: boolean) => {
    if (isFree || price === 0) return 'Free'
    return `$${price.toFixed(2)}`
  }

  const formatRating = (rating?: number, count?: number) => {
    if (!rating) return 'No rating'
    return `${rating.toFixed(1)} ⭐ (${count?.toLocaleString() || 0})`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Finding perfect apps for you...
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Our AI is analyzing your preferences
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error}
          </p>
          <Link 
            href="/questionnaire"
            className="inline-block px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            Try Again
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            🎉 Your Personalized App Recommendations
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
            Based on your preferences, here are the best apps for you
          </p>
          
          {/* User Preferences Summary */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {preferences.lifestyle.map(item => (
              <span key={item} className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                {item}
              </span>
            ))}
            {preferences.goals.map(item => (
              <span key={item} className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm">
                {item}
              </span>
            ))}
            <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-sm">
              {preferences.budget}
            </span>
          </div>
        </div>

        {/* Recommendations Grid */}
        {recommendations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.map((app, index) => (
              <div
                key={app.trackId || index}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
              >
                {/* App Icon */}
                <div className="p-6 text-center">
                  {app.artworkUrl512 || app.artworkUrl100 ? (
                    <img
                      src={app.artworkUrl512 || app.artworkUrl100}
                      alt={app.trackName}
                      className="w-20 h-20 rounded-2xl mx-auto mb-4 shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl mx-auto mb-4 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-2xl">📱</span>
                    </div>
                  )}
                  
                  {/* App Info */}
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    {app.trackName}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    by {app.artistName}
                  </p>
                  
                  {/* Category & Price */}
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
                      {app.category}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      app.isFree 
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                        : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                    }`}>
                      {formatPrice(app.price, app.isFree)}
                    </span>
                  </div>

                  {/* Rating */}
                  {app.averageUserRating && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {formatRating(app.averageUserRating, app.userRatingCount)}
                    </p>
                  )}

                  {/* AI Recommendation Reason */}
                  {app.recommendationReason && (
                    <div className="bg-primary/10 rounded-lg p-3 mb-4">
                      <p className="text-sm text-primary dark:text-primary-light">
                        💡 {app.recommendationReason}
                      </p>
                    </div>
                  )}

                  {/* Description */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                    {app.description.substring(0, 150)}...
                  </p>

                  {/* Action Button */}
                  <a
                    href={app.trackViewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block w-full px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                  >
                    View in App Store
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🤔</div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No recommendations found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              We couldn't find apps matching your preferences. Try adjusting your selections.
            </p>
            <Link 
              href="/questionnaire"
              className="inline-block px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Try Different Preferences
            </Link>
          </div>
        )}

        {/* Footer Actions */}
        <div className="text-center mt-12">
          <Link 
            href="/questionnaire"
            className="inline-block px-6 py-3 border border-primary text-primary rounded-lg font-semibold hover:bg-primary/10 transition-colors mr-4"
          >
            Refine Preferences
          </Link>
          <Link 
            href="/"
            className="inline-block px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Start Over
          </Link>
        </div>
      </div>
    </div>
  )
}