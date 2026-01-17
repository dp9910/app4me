import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase/admin'
import { appFetcher, AppData } from '@/lib/services/app-fetcher'

export async function POST(request: NextRequest) {
  try {
    // Check for admin authorization (strict security)
    const authHeader = request.headers.get('authorization')
    if (!process.env.ADMIN_SECRET || authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
      console.warn('Unauthorized attempt to populate apps');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Client is already initialized as supabase imported from admin code

    console.log('🚀 Starting app data population...')

    // Fetch apps from different categories
    const categories = [
      'productivity',
      'health fitness',
      'entertainment',
      'social networking',
      'finance',
      'education',
      'lifestyle',
      'business'
    ]

    let allApps: AppData[] = []
    let totalFetched = 0

    for (const category of categories) {
      try {
        console.log(`📱 Fetching ${category} apps...`)

        const apps = await appFetcher.searchApps(category, {
          limit: 25,
          minRating: 3.0,
          country: 'us'
        })

        console.log(`  ✅ Found ${apps.length} apps for ${category}`)
        allApps.push(...apps)
        totalFetched += apps.length

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`  ❌ Error fetching ${category}:`, error)
      }
    }

    // Remove duplicates by trackId
    const uniqueApps = Array.from(
      new Map(allApps.map(app => [app.trackId, app])).values()
    )

    console.log(`📊 Total unique apps: ${uniqueApps.length}`)

    // Insert apps into database
    let insertedCount = 0
    let updatedCount = 0
    const batchSize = 50

    for (let i = 0; i < uniqueApps.length; i += batchSize) {
      const batch = uniqueApps.slice(i, i + batchSize)

      try {
        const appRecords = batch.map(app => ({
          track_id: app.trackId,
          track_name: app.trackName,
          artist_name: app.artistName,
          description: app.description,
          bundle_id: app.bundleId,
          price: app.price,
          currency: app.currency,
          is_free: app.isFree,
          primary_genre: app.primaryGenreName,
          category: app.category,
          subcategory: app.subcategory,
          genres: app.genres,
          keywords: app.keywords,
          average_user_rating: app.averageUserRating,
          user_rating_count: app.userRatingCount,
          artwork_url_60: app.artworkUrl60,
          artwork_url_100: app.artworkUrl100,
          artwork_url_512: app.artworkUrl512,
          screenshot_urls: app.screenshotUrls || [],
          release_date: app.releaseDate,
          version: app.version,
          track_view_url: app.trackViewUrl,
          content_advisory_rating: app.contentAdvisoryRating,
          minimum_os_version: app.minimumOsVersion,
          file_size_bytes: app.fileSizeBytes,
          last_fetched_at: new Date().toISOString()
        }))

        // Use upsert to handle duplicates
        const { data, error } = await supabase
          .from('apps')
          .upsert(appRecords, {
            onConflict: 'track_id',
            ignoreDuplicates: false
          })

        if (error) {
          console.error('Database insert error:', error)
        } else {
          insertedCount += batch.length
          console.log(`  ✅ Batch ${Math.ceil((i + 1) / batchSize)} inserted`)
        }

      } catch (error) {
        console.error(`  ❌ Error inserting batch:`, error)
      }
    }

    // Get final counts
    const { count: totalInDb } = await supabase
      .from('apps')
      .select('*', { count: 'exact', head: true })

    console.log('🎉 Population complete!')

    return NextResponse.json({
      success: true,
      stats: {
        categoriesFetched: categories.length,
        totalFetched,
        uniqueApps: uniqueApps.length,
        insertedCount,
        totalInDatabase: totalInDb,
        categories: categories
      }
    })

  } catch (error: any) {
    console.error('❌ Population error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to populate apps' },
      { status: 500 }
    )
  }
}

// Get current app statistics
export async function GET() {
  try {
    // supabase is already imported from @/lib/supabase/admin

    // Get total counts
    const { count: totalApps } = await supabase
      .from('apps')
      .select('*', { count: 'exact', head: true })

    // Get counts by category
    const { data: categoryStats } = await supabase
      .from('apps')
      .select('category')
      .then(res => {
        const stats: { [key: string]: number } = {}
        res.data?.forEach(app => {
          stats[app.category] = (stats[app.category] || 0) + 1
        })
        return { data: stats }
      })

    // Get free vs paid stats
    const { count: freeApps } = await supabase
      .from('apps')
      .select('*', { count: 'exact', head: true })
      .eq('is_free', true)

    const { count: paidApps } = await supabase
      .from('apps')
      .select('*', { count: 'exact', head: true })
      .eq('is_free', false)

    return NextResponse.json({
      totalApps,
      freeApps,
      paidApps,
      categoryStats,
      lastUpdated: new Date().toISOString()
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}