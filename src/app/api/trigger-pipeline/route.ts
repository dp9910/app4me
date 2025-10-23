import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Individual scraper functions
async function fetchItunesData(query: string = 'productivity') {
  console.log(`🍎 Fetching iTunes data for: ${query}`);
  
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&country=US&entity=software&limit=20`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      return { success: false, error: 'No iTunes results found', count: 0 };
    }

    // Process and store iTunes data
    const processedApps = data.results.map((app: any) => ({
      bundle_id: app.bundleId,
      source: 'itunes_api',
      query_term: query,
      title: app.trackName,
      developer: app.artistName,
      developer_id: app.artistId,
      version: app.version,
      price: app.price,
      formatted_price: app.formattedPrice,
      currency: app.currency,
      rating: app.averageUserRating,
      rating_count: app.userRatingCount,
      icon_url: app.artworkUrl100,
      description: app.description,
      release_date: app.releaseDate,
      age_rating: app.trackContentRating,
      genres: app.genres,
      category: app.primaryGenreName,
      size_bytes: app.fileSizeBytes,
      raw_data: app
    }));

    // Store in iTunes table with UPSERT
    const { data: insertedData, error } = await supabase
      .from('itunes_apps')
      .upsert(processedApps, { 
        onConflict: 'bundle_id,source,query_term',
        ignoreDuplicates: false 
      })
      .select('bundle_id');

    if (error) {
      console.error('iTunes storage error:', error);
      return { success: false, error: error.message, count: 0 };
    }

    return { 
      success: true, 
      count: insertedData?.length || 0,
      message: `Stored ${insertedData?.length || 0} iTunes apps`
    };

  } catch (error) {
    console.error('iTunes fetch error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'iTunes fetch failed',
      count: 0 
    };
  }
}

async function fetchAppleRssData() {
  console.log('🍎 Fetching Apple RSS data...');
  
  try {
    // Use the first RSS feed (Top Free iPhone Apps) for the trigger
    const rssUrl = 'https://itunes.apple.com/us/rss/topfreeapplications/limit=25/json';
    
    const response = await fetch(rssUrl);
    if (!response.ok) {
      throw new Error(`Apple RSS returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Extract entries from RSS feed
    let entries = [];
    if (data.feed && data.feed.entry) {
      entries = data.feed.entry;
    } else {
      throw new Error('No entries found in Apple RSS feed');
    }

    // Process Apple RSS data for database storage
    const processedApps = entries.map((app: any, index: number) => ({
      bundle_id: String(app['im:bundleId']?.label || app.id?.attributes?.['im:id'] || `rss.${index}`),
      source: 'apple_rss',
      feed_type: 'top_free_iphone',
      title: String(app['im:name']?.label || app.title?.label || ''),
      developer: String(app['im:artist']?.label || ''),
      icon_url: String(app['im:image']?.[2]?.label || app['im:image']?.[1]?.label || ''),
      category: String(app.category?.attributes?.term || ''),
      release_date: app['im:releaseDate']?.attributes?.label || null,
      age_rating: String(app['im:contentType']?.attributes?.term || ''),
      description: String(app.summary?.label || ''),
      formatted_price: String(app['im:price']?.label || 'Free'),
      rss_rank: index + 1,
      rss_position: index + 1,
      raw_data: app
    }));

    // Store in Apple RSS table with UPSERT
    const { data: insertedData, error } = await supabase
      .from('apple_rss_apps')
      .upsert(processedApps, { 
        onConflict: 'bundle_id,source,feed_type',
        ignoreDuplicates: false 
      })
      .select('bundle_id');

    if (error) {
      console.error('Apple RSS storage error:', error);
      return { success: false, error: error.message, count: 0 };
    }

    return { 
      success: true, 
      count: insertedData?.length || 0,
      message: `Stored ${insertedData?.length || 0} Apple RSS apps (Top Free)`
    };

  } catch (error) {
    console.error('Apple RSS fetch error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Apple RSS fetch failed',
      count: 0 
    };
  }
}

async function fetchSerpData(query: string = 'social media') {
  console.log(`🔍 Fetching SERP data for: ${query}`);
  
  try {
    const serpApiKey = process.env.SERPAPI_KEY;
    if (!serpApiKey) {
      return { success: false, error: 'SERP API key not configured', count: 0 };
    }

    const url = `https://serpapi.com/search.json?engine=apple_app_store&term=${encodeURIComponent(query)}&api_key=${serpApiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.organic_results || data.organic_results.length === 0) {
      return { success: false, error: 'No SERP results found', count: 0 };
    }

    // Process SERP data
    const processedApps = data.organic_results.map((app: any, index: number) => ({
      bundle_id: app.product_id || `serp.${query}.${index}`,
      source: 'serp_api',
      query_term: query,
      title: String(app.title || ''),
      developer: String(app.developer?.name || ''),
      version: String(app.version || ''),
      price_value: app.price?.value || 0,
      price: String(app.price?.extracted_value || app.price?.value || '0'),
      formatted_price: String(app.price?.currency ? `${app.price.currency} ${app.price.value || 0}` : ''),
      rating: app.rating?.[0]?.rating || null,
      rating_count: app.rating?.[0]?.count || null,
      icon_url: app.logos?.find((logo: any) => logo.size === '100x100')?.link || '',
      icon_url_60: app.logos?.find((logo: any) => logo.size === '60x60')?.link || '',
      icon_url_512: app.logos?.find((logo: any) => logo.size === '512x512')?.link || '',
      all_logos: app.logos || [],
      description: String(app.description || ''),
      category: String(app.genre || ''),
      position: app.position || index + 1,
      raw_data: app
    }));

    // Store in SERP table with UPSERT
    const { data: insertedData, error } = await supabase
      .from('serp_apps')
      .upsert(processedApps, { 
        onConflict: 'bundle_id,source,query_term',
        ignoreDuplicates: false 
      })
      .select('bundle_id');

    if (error) {
      console.error('SERP storage error:', error);
      return { success: false, error: error.message, count: 0 };
    }

    return { 
      success: true, 
      count: insertedData?.length || 0,
      message: `Stored ${insertedData?.length || 0} SERP apps`
    };

  } catch (error) {
    console.error('SERP fetch error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'SERP fetch failed',
      count: 0 
    };
  }
}

async function runReconciliation() {
  console.log('🔄 Running data reconciliation...');
  
  try {
    // Get all apps from source tables for reconciliation
    const { data: itunesApps } = await supabase
      .from('itunes_apps')
      .select('*')
      .limit(50);

    const { data: serpApps } = await supabase
      .from('serp_apps')
      .select('*')
      .limit(50);

    const { data: rssApps } = await supabase
      .from('apple_rss_apps')
      .select('*')
      .limit(50);

    const allApps = [...(itunesApps || []), ...(serpApps || []), ...(rssApps || [])];
    
    if (allApps.length === 0) {
      return { 
        success: false, 
        error: 'No source data found for reconciliation',
        reconciledCount: 0 
      };
    }

    // Group apps by bundle_id for reconciliation
    const appGroups = allApps.reduce((groups: any, app) => {
      const bundleId = app.bundle_id;
      if (!groups[bundleId]) {
        groups[bundleId] = [];
      }
      groups[bundleId].push(app);
      return groups;
    }, {});

    const reconciledApps = [];

    for (const [bundleId, sources] of Object.entries(appGroups) as [string, any[]][]) {
      // Simple reconciliation logic - pick best data from available sources
      const bestTitle = sources.find(s => s.title)?.title || bundleId;
      const bestDeveloper = sources.find(s => s.developer)?.developer || '';
      const bestRating = sources.reduce((best, s) => 
        (s.rating_count || 0) > (best.rating_count || 0) ? s : best, sources[0]);
      const bestIcon = sources.find(s => s.icon_url)?.icon_url || '';
      const bestDescription = sources.reduce((best, s) => 
        (s.description?.length || 0) > (best.description?.length || 0) ? s : best, sources[0]);

      // Calculate quality score manually
      let qualityScore = 0;
      if (bestTitle) qualityScore += 15;
      if (bestDeveloper) qualityScore += 15;
      if (bestDescription?.description && bestDescription.description.length > 50) qualityScore += 20;
      if (bestRating?.rating && bestRating.rating > 0) qualityScore += 15;
      if (bestRating?.rating_count && bestRating.rating_count > 1000) qualityScore += 20;
      if (bestIcon) qualityScore += 15;

      const reconciledApp = {
        bundle_id: bundleId,
        title: bestTitle,
        developer: bestDeveloper,
        version: sources[0]?.version || '',
        rating: bestRating?.rating || null,
        rating_count: bestRating?.rating_count || null,
        rating_source: bestRating?.source || '',
        icon_url: bestIcon,
        icon_url_hd: bestIcon,
        description: bestDescription?.description || '',
        description_source: bestDescription?.source || '',
        primary_category: sources[0]?.category || '',
        all_categories: [sources[0]?.category || ''].filter(Boolean),
        available_in_sources: sources.map(s => s.source.replace('_api', '')),
        total_appearances: sources.length,
        data_quality_score: qualityScore,
        best_rank: Math.min(...sources.map(s => s.position || s.rank || 999))
      };

      reconciledApps.push(reconciledApp);
    }

    // Clear existing unified data and insert new reconciled data
    await supabase.from('apps_unified').delete().neq('id', 0);

    const { data: insertedData, error } = await supabase
      .from('apps_unified')
      .insert(reconciledApps)
      .select('data_quality_score, available_in_sources');

    if (error) {
      console.error('Reconciliation storage error:', error);
      return { 
        success: false, 
        error: error.message,
        reconciledCount: 0 
      };
    }

    // Calculate stats
    const avgQuality = insertedData?.reduce((sum, app) => sum + (app.data_quality_score || 0), 0) / (insertedData?.length || 1);
    const multiSourceCount = insertedData?.filter(app => {
      const sources = Array.isArray(app.available_in_sources) ? 
        app.available_in_sources : JSON.parse(app.available_in_sources || '[]');
      return sources.length > 1;
    }).length || 0;

    return { 
      success: true, 
      reconciledCount: insertedData?.length || 0,
      avgQuality: Math.round(avgQuality),
      multiSourceCount,
      message: `Reconciled ${insertedData?.length || 0} apps with ${Math.round(avgQuality)}/100 avg quality`
    };

  } catch (error) {
    console.error('Reconciliation error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Reconciliation failed',
      reconciledCount: 0 
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { step, query } = await request.json();

    console.log(`📡 Pipeline step: ${step}`);

    switch (step) {
      case 'itunes':
        return NextResponse.json(await fetchItunesData(query));
        
      case 'rss':
        return NextResponse.json(await fetchAppleRssData());
        
      case 'serp':
        return NextResponse.json(await fetchSerpData(query));
        
      case 'reconcile':
        return NextResponse.json(await runReconciliation());
        
      default:
        return NextResponse.json({ 
          success: false, 
          error: `Unknown pipeline step: ${step}` 
        });
    }

  } catch (error) {
    console.error('Pipeline API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Pipeline execution failed' 
    });
  }
}