import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting daily apps fetch...')
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Fetch from iTunes API
    const iTunesUrl = 'https://itunes.apple.com/search?term=productivity&country=us&media=software&limit=10'
    console.log('📱 Fetching from iTunes:', iTunesUrl)
    
    const response = await fetch(iTunesUrl)
    const data = await response.json()
    
    if (!data.results || data.results.length === 0) {
      throw new Error('No apps found from iTunes API')
    }
    
    console.log(`✅ Found ${data.results.length} apps from iTunes`)
    
    // Transform and insert apps
    const apps = data.results.map((app: any) => ({
      track_id: app.trackId,
      track_name: app.trackName,
      artist_name: app.artistName,
      description: app.description || '',
      price: app.price || 0,
      currency: app.currency || 'USD',
      is_free: (app.price || 0) === 0,
      primary_genre: app.primaryGenreName,
      average_user_rating: app.averageUserRating || null,
      user_rating_count: app.userRatingCount || null,
      artwork_url_100: app.artworkUrl100,
      track_view_url: app.trackViewUrl,
      release_date: app.releaseDate,
      version: app.version
    }))
    
    console.log('📊 Sample app data:', apps[0])
    
    // Insert into Supabase
    const { data: insertedApps, error } = await supabase
      .from('apps')
      .upsert(apps, {
        onConflict: 'track_id',
        ignoreDuplicates: false
      })
      .select()
    
    if (error) {
      console.error('❌ Supabase error:', error)
      throw new Error(`Database error: ${error.message}`)
    }
    
    console.log(`✅ Successfully stored ${apps.length} apps in database`)
    
    // Get total count in database
    const { count: totalApps } = await supabase
      .from('apps')
      .select('*', { count: 'exact', head: true })
    
    return NextResponse.json({
      success: true,
      message: 'Daily apps fetched successfully!',
      stats: {
        fetchedFromiTunes: data.results.length,
        storedInDatabase: apps.length,
        totalAppsInDatabase: totalApps
      },
      apps: apps.map(app => ({
        trackName: app.track_name,
        artistName: app.artist_name,
        price: app.price,
        isFree: app.is_free,
        primaryGenre: app.primary_genre,
        rating: app.average_user_rating
      }))
    })
    
  } catch (error: any) {
    console.error('❌ Error fetching daily apps:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to fetch daily apps'
      },
      { status: 500 }
    )
  }
}

// GET method to check current status
export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get app counts and latest apps
    const { count: totalApps } = await supabase
      .from('apps')
      .select('*', { count: 'exact', head: true })
    
    const { data: latestApps } = await supabase
      .from('apps')
      .select('track_name, artist_name, primary_genre, is_free, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
    
    return NextResponse.json({
      success: true,
      totalApps,
      latestApps
    })
    
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}