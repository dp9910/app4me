import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('🔍 Starting iTunes API analysis...')
    
    // Fetch from iTunes API
    const iTunesUrl = 'https://itunes.apple.com/search?term=productivity&country=us&media=software&limit=20'
    console.log('📱 Fetching from iTunes:', iTunesUrl)
    
    const response = await fetch(iTunesUrl)
    console.log('📊 iTunes Response Status:', response.status, response.statusText)
    
    if (!response.ok) {
      throw new Error(`iTunes API returned ${response.status}: ${response.statusText}`)
    }
    
    const itunesData = await response.json()
    console.log('📱 iTunes Response received, result count:', itunesData.resultCount)
    
    if (!itunesData.results || itunesData.results.length === 0) {
      throw new Error('No apps found from iTunes API')
    }

    // Process the data using the same logic as our script
    const processedApps = itunesData.results.map((app: any, index: number) => ({
      index: index + 1,
      trackId: app.trackId,
      trackName: app.trackName,
      artistName: app.artistName,
      description: app.description?.substring(0, 300) + '...' || 'No description',
      price: app.price || 0,
      currency: app.currency || 'USD',
      isFree: (app.price || 0) === 0,
      formattedPrice: app.formattedPrice || 'Free',
      primaryGenreName: app.primaryGenreName,
      genres: app.genres || [],
      averageUserRating: app.averageUserRating || 0,
      userRatingCount: app.userRatingCount || 0,
      artworkUrl100: app.artworkUrl100,
      screenshotUrls: app.screenshotUrls || [],
      trackViewUrl: app.trackViewUrl,
      releaseDate: app.releaseDate,
      version: app.version,
      bundleId: app.bundleId,
      minimumOsVersion: app.minimumOsVersion,
      fileSizeBytes: app.fileSizeBytes,
      fileSize: app.fileSizeBytes ? (app.fileSizeBytes / 1024 / 1024).toFixed(1) + ' MB' : 'Unknown',
      sellerName: app.sellerName,
      contentRating: app.trackContentRating,
      languageCodesISO2A: app.languageCodesISO2A || [],
      supportedDevices: app.supportedDevices || [],
      hasDescription: !!app.description,
      hasScreenshots: !!(app.screenshotUrls && app.screenshotUrls.length > 0)
    }))

    // Generate summary statistics
    const freeApps = processedApps.filter((app: any) => app.isFree)
    const paidApps = processedApps.filter((app: any) => !app.isFree)
    
    // Category distribution
    const categories: { [key: string]: number } = {}
    processedApps.forEach((app: any) => {
      categories[app.primaryGenreName] = (categories[app.primaryGenreName] || 0) + 1
    })
    
    // Rating distribution
    const ratedApps = processedApps.filter((app: any) => app.averageUserRating > 0)
    const avgRating = ratedApps.reduce((sum: number, app: any) => sum + app.averageUserRating, 0) / ratedApps.length
    
    // Price distribution
    const priceRanges = {
      free: freeApps.length,
      under5: paidApps.filter((app: any) => app.price < 5).length,
      under10: paidApps.filter((app: any) => app.price >= 5 && app.price < 10).length,
      over10: paidApps.filter((app: any) => app.price >= 10).length
    }

    // Database-ready format (first 5 apps)
    const dbReadyApps = itunesData.results.slice(0, 5).map((app: any) => ({
      track_id: app.trackId,
      track_name: app.trackName,
      artist_name: app.artistName,
      description: app.description || null,
      price: app.price || 0,
      currency: app.currency || 'USD',
      is_free: (app.price || 0) === 0,
      primary_genre: app.primaryGenreName,
      average_user_rating: app.averageUserRating || null,
      user_rating_count: app.userRatingCount || null,
      artwork_url_100: app.artworkUrl100 || null,
      track_view_url: app.trackViewUrl || null,
      release_date: app.releaseDate || null,
      version: app.version || null,
      bundle_id: app.bundleId || null,
      minimum_os_version: app.minimumOsVersion || null,
      file_size_bytes: app.fileSizeBytes || null,
      seller_name: app.sellerName || null,
      content_rating: app.trackContentRating || null
    }))

    console.log(`✅ Successfully processed ${processedApps.length} apps`)
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      apiUrl: iTunesUrl,
      summary: {
        totalApps: itunesData.resultCount,
        processedApps: processedApps.length,
        freeApps: freeApps.length,
        paidApps: paidApps.length,
        averageRating: avgRating.toFixed(2),
        ratedAppsCount: ratedApps.length,
        categories,
        priceRanges
      },
      rawData: {
        resultCount: itunesData.resultCount,
        firstAppSample: itunesData.results[0] // Complete raw data for first app
      },
      processedApps,
      dbReadyApps
    })
    
  } catch (error: any) {
    console.error('❌ iTunes analysis failed:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'iTunes analysis failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}