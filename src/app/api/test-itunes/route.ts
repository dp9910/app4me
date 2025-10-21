import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('🔍 Starting iTunes API test...')
    
    // Test iTunes API directly
    const iTunesUrl = 'https://itunes.apple.com/search?term=productivity&country=us&media=software&limit=10'
    console.log('📱 Fetching from iTunes:', iTunesUrl)
    
    const response = await fetch(iTunesUrl)
    console.log('📊 iTunes Response Status:', response.status, response.statusText)
    
    if (!response.ok) {
      throw new Error(`iTunes API returned ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log('📱 iTunes Response received, result count:', data.resultCount)
    
    if (!data.results || data.results.length === 0) {
      throw new Error('No apps found from iTunes API')
    }
    
    // Log first app details
    console.log('📱 Sample app data:', {
      trackId: data.results[0].trackId,
      trackName: data.results[0].trackName,
      artistName: data.results[0].artistName,
      price: data.results[0].price,
      primaryGenreName: data.results[0].primaryGenreName
    })
    
    // Transform data for easier viewing
    const transformedApps = data.results.map((app: any, index: number) => ({
      index: index + 1,
      trackId: app.trackId,
      trackName: app.trackName,
      artistName: app.artistName,
      description: app.description?.substring(0, 200) + '...' || 'No description',
      price: app.price || 0,
      currency: app.currency || 'USD',
      isFree: (app.price || 0) === 0,
      primaryGenreName: app.primaryGenreName,
      averageUserRating: app.averageUserRating || null,
      userRatingCount: app.userRatingCount || null,
      artworkUrl100: app.artworkUrl100,
      trackViewUrl: app.trackViewUrl,
      releaseDate: app.releaseDate,
      version: app.version,
      bundleId: app.bundleId,
      minimumOsVersion: app.minimumOsVersion,
      fileSizeBytes: app.fileSizeBytes
    }))
    
    console.log(`✅ Successfully transformed ${transformedApps.length} apps`)
    
    return NextResponse.json({
      success: true,
      message: 'iTunes API test successful!',
      rawData: {
        resultCount: data.resultCount,
        firstAppRaw: data.results[0] // Show complete raw data for first app
      },
      transformedApps,
      apiUrl: iTunesUrl,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('❌ iTunes API test failed:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'iTunes API test failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}