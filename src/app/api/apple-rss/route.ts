import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('🍎 Starting Apple RSS analysis...')
    
    // Apple RSS feed endpoints to test - trying different approaches
    const rssFeeds = [
      {
        name: 'Top Free iPhone Apps - US',
        url: 'https://itunes.apple.com/us/rss/topfreeapplications/limit=25/json',
        type: 'top-free-iphone'
      },
      {
        name: 'Top Paid iPhone Apps - US', 
        url: 'https://itunes.apple.com/us/rss/toppaidapplications/limit=25/json',
        type: 'top-paid-iphone'
      },
      {
        name: 'New iPhone Apps - US',
        url: 'https://itunes.apple.com/us/rss/newapplications/limit=25/json',
        type: 'new-iphone-apps'
      },
      {
        name: 'Top Grossing iPhone Apps - US',
        url: 'https://itunes.apple.com/us/rss/topgrossingapplications/limit=25/json',
        type: 'top-grossing-iphone'
      }
    ]

    const allFeedData = []
    const feedSummaries = []

    for (const feed of rssFeeds) {
      try {
        console.log(`📱 Fetching ${feed.name}:`, feed.url)
        
        const response = await fetch(feed.url)
        console.log(`📊 ${feed.name} Response Status:`, response.status, response.statusText)
        
        if (!response.ok) {
          throw new Error(`Apple RSS returned ${response.status}: ${response.statusText}`)
        }
        
        const data = await response.json()
        console.log(`📱 ${feed.name} received, structure:`, Object.keys(data))
        
        // Handle different RSS structures
        let entries = []
        if (data.feed && data.feed.entry) {
          entries = data.feed.entry
        } else if (data.feed && data.feed.results) {
          entries = data.feed.results
        } else {
          throw new Error(`No entries found in ${feed.name}`)
        }
        
        console.log(`📱 ${feed.name} entries count:`, entries.length)

        // Process RSS feed data - handle iTunes RSS structure
        const processedApps = entries.map((app: any, index: number) => ({
          feedType: feed.type,
          feedName: feed.name,
          index: index + 1,
          // iTunes RSS structure - safely extract values
          id: String(app.id?.attributes?.['im:id'] || app.id || ''),
          name: String(app['im:name']?.label || app.title?.label || app.name || ''),
          artistName: String(app['im:artist']?.label || app.artist?.label || app.artistName || ''),
          artworkUrl100: String(app['im:image']?.[2]?.label || app['im:image']?.[1]?.label || app['im:image']?.[0]?.label || app.artworkUrl100 || ''),
          summary: String(app.summary?.label || app.description || ''),
          category: String(app.category?.attributes?.term || app.category?.label || ''),
          releaseDate: String(app['im:releaseDate']?.attributes?.label || app.releaseDate || ''),
          url: String(app.link?.attributes?.href || app.url || ''),
          // Additional fields
          contentRating: String(app['im:contentType']?.attributes?.term || ''),
          rights: String(app.rights?.label || ''),
          price: String(app['im:price']?.label || app.price || ''),
          bundleId: String(app['im:bundleId']?.label || app.bundleId || ''),
          // Raw data for debugging
          rawEntry: app
        }))

        allFeedData.push({
          feedInfo: feed,
          data: data,
          processedApps: processedApps
        })

        // Create summary for this feed
        const categories = {}
        processedApps.forEach((app: any) => {
          if (app.category) {
            categories[app.category] = (categories[app.category] || 0) + 1
          }
        })

        feedSummaries.push({
          feedName: feed.name,
          feedType: feed.type,
          totalApps: processedApps.length,
          categories: categories,
          hasPrice: processedApps.filter((app: any) => app.price !== undefined).length,
          hasSummary: processedApps.filter((app: any) => app.summary).length,
          hasArtwork: processedApps.filter((app: any) => app.artworkUrl100).length
        })

      } catch (feedError: any) {
        console.error(`❌ Error fetching ${feed.name}:`, feedError)
        feedSummaries.push({
          feedName: feed.name,
          feedType: feed.type,
          error: feedError.message,
          totalApps: 0
        })
      }
    }

    // Combine all apps from all feeds
    const allApps = allFeedData.flatMap(feed => feed.processedApps)
    
    // Overall statistics
    const totalApps = allApps.length
    const uniqueApps = new Set(allApps.map(app => app.id)).size
    const allCategories = {}
    
    allApps.forEach(app => {
      if (app.category) {
        allCategories[app.category] = (allCategories[app.category] || 0) + 1
      }
    })

    // Database-ready format (first 10 apps across all feeds)
    const dbReadyApps = allApps.slice(0, 10).map((app: any) => ({
      source: 'apple_rss',
      feed_type: app.feedType,
      app_id: app.id,
      app_name: app.name,
      artist_name: app.artistName,
      artwork_url_100: app.artworkUrl100,
      category: app.category,
      release_date: app.releaseDate,
      store_url: app.url,
      content_rating: app.contentRating,
      rights: app.rights,
      summary: app.summary,
      price: app.price,
      bundle_id: app.bundleId,
      rank: app.index
    }))

    console.log(`✅ Successfully processed ${allFeedData.length} RSS feeds with ${totalApps} total apps`)
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalFeeds: rssFeeds.length,
        successfulFeeds: allFeedData.length,
        totalApps: totalApps,
        uniqueApps: uniqueApps,
        allCategories: allCategories,
        feedSummaries: feedSummaries
      },
      feeds: allFeedData.map(feed => ({
        feedInfo: feed.feedInfo,
        feedMetadata: {
          title: String(feed.data.feed?.title?.label || feed.data.feed?.title || 'N/A'),
          author: String(feed.data.feed?.author?.name?.label || feed.data.feed?.author?.label || feed.data.feed?.author || 'N/A'),
          copyright: String(feed.data.feed?.copyright?.label || feed.data.feed?.copyright || 'N/A'),
          country: String(feed.data.feed?.country?.label || feed.data.feed?.country || 'N/A'),
          icon: String(feed.data.feed?.icon?.label || feed.data.feed?.icon || 'N/A'),
          id: String(feed.data.feed?.id?.label || feed.data.feed?.id || 'N/A'),
          links: feed.data.feed?.links || [],
          updated: String(feed.data.feed?.updated?.label || feed.data.feed?.updated || 'N/A')
        },
        resultCount: feed.data.feed?.entry?.length || feed.data.feed?.results?.length || 0,
        sampleApp: feed.processedApps[0] || null // First app as sample
      })),
      allApps: allApps,
      dbReadyApps: dbReadyApps,
      rawSample: allFeedData[0]?.data?.feed?.entry?.[0] || allFeedData[0]?.data?.feed?.results?.[0] || null // Raw sample from first feed
    })
    
  } catch (error: any) {
    console.error('❌ Apple RSS analysis failed:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Apple RSS analysis failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}