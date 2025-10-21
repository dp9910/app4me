import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('🔍 Starting SERP API analysis...')
    
    const serpApiKey = process.env.SERPAPI_KEY
    if (!serpApiKey) {
      throw new Error('SERPAPI_KEY not found in environment variables')
    }

    // Different search queries to test SERP API capabilities
    const searchQueries = [
      {
        name: 'Productivity Apps Search',
        term: 'productivity',
        type: 'keyword'
      },
      {
        name: 'Social Media Apps Search',
        term: 'social media',
        type: 'keyword'
      },
      {
        name: 'Photo Apps Search',
        term: 'photo editor',
        type: 'keyword'
      }
    ]

    const allSearchData = []
    const searchSummaries = []

    for (const query of searchQueries) {
      try {
        // Build SERP API URL
        const serpUrl = new URL('https://serpapi.com/search')
        serpUrl.searchParams.append('engine', 'apple_app_store')
        serpUrl.searchParams.append('term', query.term)
        serpUrl.searchParams.append('country', 'us')
        serpUrl.searchParams.append('lang', 'en-us')
        serpUrl.searchParams.append('num', '20')
        serpUrl.searchParams.append('api_key', serpApiKey)

        console.log(`📱 Fetching ${query.name}:`, serpUrl.toString().replace(serpApiKey, 'HIDDEN_KEY'))
        
        const response = await fetch(serpUrl.toString())
        console.log(`📊 ${query.name} Response Status:`, response.status, response.statusText)
        
        if (!response.ok) {
          throw new Error(`SERP API returned ${response.status}: ${response.statusText}`)
        }
        
        const data = await response.json()
        console.log(`📱 ${query.name} received, apps found:`, data.organic_results?.length || 0)
        
        if (!data.organic_results || data.organic_results.length === 0) {
          console.log(`⚠️ No apps found for ${query.name}`)
          continue
        }

        // Process SERP API data
        const processedApps = data.organic_results.map((app: any, index: number) => ({
          queryName: query.name,
          queryTerm: query.term,
          queryType: query.type,
          rank: index + 1,
          position: app.position || index + 1,
          // SERP API app fields (based on actual response structure)
          id: String(app.id || ''),
          title: String(app.title || ''),
          bundleId: String(app.bundle_id || ''),
          version: String(app.version || ''),
          description: String(app.description || '').substring(0, 500) + (app.description?.length > 500 ? '...' : ''),
          price: app.price?.type || 'Free',
          priceValue: app.price?.value || null,
          formattedPrice: String(app.price?.type || 'Free'),
          ageRating: String(app.age_rating || ''),
          releaseNote: String(app.release_note || ''),
          sellerLink: String(app.seller_link || ''),
          minimumOsVersion: String(app.minimum_os_version || ''),
          gameCenterEnabled: app.game_center_enabled || false,
          vppLicense: app.vpp_license || false,
          link: String(app.link || ''),
          releaseDate: String(app.release_date || ''),
          latestVersionReleaseDate: String(app.latest_version_release_date || ''),
          // Rating information (array format in SERP)
          rating: app.rating?.[0]?.rating || null,
          ratingCount: app.rating?.[0]?.rating_count || app.rating?.[0]?.count || null,
          ratingType: String(app.rating?.[0]?.type || ''),
          // Developer information (object format in SERP)
          developer: String(app.developer?.name || ''),
          developerId: String(app.developer?.id || ''),
          developerUrl: String(app.developer?.link || app.seller_link || ''),
          // Category and genre information
          category: String(app.genres?.[0]?.name || ''),
          primaryGenre: String(app.genres?.find((g: any) => g.primary)?.name || ''),
          genres: app.genres || [],
          // Size and languages
          sizeInBytes: app.size_in_bytes || null,
          supportedLanguages: app.supported_languages || [],
          // App icons (logos array with different sizes)
          iconUrl: app.logos?.find((logo: any) => logo.size === '100x100')?.link || 
                   app.logos?.find((logo: any) => logo.size === '60x60')?.link ||
                   app.logos?.[0]?.link || '',
          iconUrl512: app.logos?.find((logo: any) => logo.size === '512x512')?.link || '',
          iconUrl60: app.logos?.find((logo: any) => logo.size === '60x60')?.link || '',
          allLogos: app.logos || [],
          // Screenshots
          screenshots: app.screenshots || [],
          // Device compatibility and features
          supportedDevices: app.supported_devices || [],
          features: app.features || [],
          advisories: app.advisories || [],
          // Raw data for debugging
          rawData: app
        }))

        allSearchData.push({
          queryInfo: query,
          searchMetadata: {
            searchId: data.search_metadata?.id,
            status: data.search_metadata?.status,
            jsonEndpoint: data.search_metadata?.json_endpoint,
            createdAt: data.search_metadata?.created_at,
            processedAt: data.search_metadata?.processed_at,
            totalTimeTaken: data.search_metadata?.total_time_taken
          },
          searchParameters: data.search_parameters,
          processedApps: processedApps
        })

        // Create summary for this search
        const categories = {}
        const developers = {}
        const prices = { free: 0, paid: 0 }
        
        processedApps.forEach((app: any) => {
          if (app.category) {
            categories[app.category] = (categories[app.category] || 0) + 1
          }
          if (app.developer) {
            developers[app.developer] = (developers[app.developer] || 0) + 1
          }
          if (app.price === null || app.price === 0) {
            prices.free++
          } else {
            prices.paid++
          }
        })

        searchSummaries.push({
          queryName: query.name,
          queryTerm: query.term,
          totalApps: processedApps.length,
          categories: categories,
          topDevelopers: Object.entries(developers)
            .sort(([,a], [,b]) => (b as number) - (a as number))
            .slice(0, 5),
          priceDistribution: prices,
          hasRatings: processedApps.filter((app: any) => app.rating !== null).length,
          hasScreenshots: processedApps.filter((app: any) => app.screenshots?.length > 0).length,
          hasDescriptions: processedApps.filter((app: any) => app.description && app.description !== '').length
        })

      } catch (searchError: any) {
        console.error(`❌ Error fetching ${query.name}:`, searchError)
        searchSummaries.push({
          queryName: query.name,
          queryTerm: query.term,
          error: searchError.message,
          totalApps: 0
        })
      }
    }

    // Combine all apps from all searches
    const allApps = allSearchData.flatMap(search => search.processedApps)
    
    // Overall statistics
    const totalApps = allApps.length
    const uniqueApps = new Set(allApps.map(app => app.bundleId)).size
    const allCategories = {}
    const allDevelopers = {}
    
    allApps.forEach(app => {
      if (app.category) {
        allCategories[app.category] = (allCategories[app.category] || 0) + 1
      }
      if (app.developer) {
        allDevelopers[app.developer] = (allDevelopers[app.developer] || 0) + 1
      }
    })

    // Database-ready format (first 10 apps across all searches)
    const dbReadyApps = allApps.slice(0, 10).map((app: any) => ({
      source: 'serp_api',
      query_term: app.queryTerm,
      rank: app.rank,
      title: app.title,
      bundle_id: app.bundleId,
      version: app.version,
      description: app.description,
      price: app.price,
      formatted_price: app.formattedPrice,
      currency: app.currency,
      developer: app.developer,
      developer_url: app.developerUrl,
      rating: app.rating,
      rating_count: app.ratingCount,
      icon_url: app.icon,
      screenshots: app.screenshots,
      age_rating: app.ageRating,
      genres: app.genres,
      languages_supported: app.languagesSupported,
      device_compatibility: app.deviceCompatibility,
      size: app.size,
      release_date: app.releaseDate,
      last_updated: app.lastUpdated,
      category_id: app.categoryId,
      category: app.category,
      app_store_url: app.appStoreUrl,
      in_app_purchases: app.inAppPurchases,
      content_advisory: app.contentAdvisory,
      what_is_new: app.whatIsNew,
      minimum_os_version: app.minimumOsVersion
    }))

    console.log(`✅ Successfully processed ${allSearchData.length} SERP searches with ${totalApps} total apps`)
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalSearches: searchQueries.length,
        successfulSearches: allSearchData.length,
        totalApps: totalApps,
        uniqueApps: uniqueApps,
        allCategories: allCategories,
        topDevelopers: Object.entries(allDevelopers)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 10),
        searchSummaries: searchSummaries
      },
      searches: allSearchData.map(search => ({
        queryInfo: search.queryInfo,
        searchMetadata: search.searchMetadata,
        searchParameters: search.searchParameters,
        resultCount: search.processedApps.length,
        sampleApp: search.processedApps[0] || null
      })),
      allApps: allApps,
      dbReadyApps: dbReadyApps,
      rawSample: allSearchData[0]?.processedApps?.[0]?.rawData || null
    })
    
  } catch (error: any) {
    console.error('❌ SERP API analysis failed:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'SERP API analysis failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}