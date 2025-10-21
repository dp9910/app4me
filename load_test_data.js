const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function loadItunesData() {
  console.log('📱 Loading iTunes data into database...');
  
  try {
    // Read iTunes data
    const itunesData = require('./database_ready_apps.json');
    console.log(`Found ${itunesData.length} iTunes apps to load`);
    
    // Transform iTunes data for our table structure
    const itunesApps = itunesData.slice(0, 5).map((app, index) => ({
      bundle_id: app.bundle_id,
      source: 'itunes_api',
      query_term: 'productivity', // Default query term for our test
      title: app.track_name,
      developer: app.artist_name,
      developer_id: app.track_id,
      developer_url: app.track_view_url,
      version: app.version,
      price: parseFloat(app.price) || 0,
      formatted_price: app.is_free ? 'Free' : `$${app.price}`,
      currency: app.currency || 'USD',
      rating: parseFloat(app.average_user_rating) || null,
      rating_count: parseInt(app.user_rating_count) || null,
      icon_url: app.artwork_url_100,
      screenshots: [], // iTunes API doesn't provide screenshots in our data
      description: app.description ? app.description.substring(0, 2000) : null, // Truncate long descriptions
      release_date: app.release_date ? new Date(app.release_date).toISOString() : null,
      last_updated: new Date().toISOString(),
      age_rating: app.content_rating || null,
      genres: app.primary_genre ? [app.primary_genre] : [],
      category: app.primary_genre,
      size_bytes: app.file_size_bytes ? parseInt(app.file_size_bytes) : null,
      languages_supported: [],
      rank: index + 1,
      raw_data: app
    }));
    
    console.log('Sample iTunes app being inserted:', JSON.stringify(itunesApps[0], null, 2));
    
    // Insert into itunes_apps table
    const { data, error } = await supabase
      .from('itunes_apps')
      .insert(itunesApps)
      .select();
    
    if (error) {
      console.error('❌ Error inserting iTunes data:', error);
      return false;
    }
    
    console.log(`✅ Successfully inserted ${data.length} iTunes apps`);
    return true;
    
  } catch (err) {
    console.error('❌ Error loading iTunes data:', err);
    return false;
  }
}

async function loadSerpData() {
  console.log('🔍 Loading SERP data into database...');
  
  try {
    // Read SERP data
    const serpResponse = require('./serp_raw_response.json');
    const serpApps = serpResponse.organic_results || [];
    console.log(`Found ${serpApps.length} SERP apps to load`);
    
    if (serpApps.length === 0) {
      console.log('⚠️ No SERP apps found in data file');
      return false;
    }
    
    // Transform SERP data for our table structure
    const transformedSerpApps = serpApps.map((app, index) => ({
      bundle_id: app.bundle_id,
      source: 'serp_api',
      query_term: 'instagram', // The search term used in our test
      title: app.title,
      developer: app.developer?.name || 'Unknown',
      developer_id: String(app.developer?.id || app.id || ''),
      developer_url: app.developer?.link || app.seller_link || '',
      version: app.version,
      price: app.price?.type || 'Free',
      price_value: app.price?.value || 0,
      formatted_price: app.price?.type || 'Free',
      rating: app.rating?.[0]?.rating || null,
      rating_count: app.rating?.[0]?.count || app.rating?.[0]?.rating_count || null,
      rating_type: app.rating?.[0]?.type || '',
      icon_url: app.logos?.find(logo => logo.size === '100x100')?.link || 
                app.logos?.find(logo => logo.size === '60x60')?.link ||
                app.logos?.[0]?.link || '',
      icon_url_60: app.logos?.find(logo => logo.size === '60x60')?.link || '',
      icon_url_512: app.logos?.find(logo => logo.size === '512x512')?.link || '',
      all_logos: app.logos || [],
      screenshots: app.screenshots || {},
      description: app.description ? app.description.substring(0, 2000) : null,
      release_date: app.release_date ? new Date(app.release_date).toISOString() : null,
      latest_version_release_date: app.latest_version_release_date ? new Date(app.latest_version_release_date).toISOString() : null,
      age_rating: app.age_rating,
      release_note: app.release_note,
      minimum_os_version: app.minimum_os_version,
      category: app.genres?.find(g => g.primary)?.name || app.genres?.[0]?.name || '',
      primary_genre: app.genres?.find(g => g.primary)?.name || '',
      genres: app.genres || [],
      size_in_bytes: app.size_in_bytes || null,
      supported_languages: app.supported_languages || [],
      supported_devices: app.supported_devices || [],
      features: app.features || [],
      advisories: app.advisories || [],
      game_center_enabled: app.game_center_enabled || false,
      vpp_license: app.vpp_license || false,
      position: app.position || index + 1,
      rank: app.position || index + 1,
      serp_link: app.link,
      raw_data: app
    }));
    
    console.log('Sample SERP app being inserted:', JSON.stringify(transformedSerpApps[0], null, 2));
    
    // Insert into serp_apps table
    const { data, error } = await supabase
      .from('serp_apps')
      .insert(transformedSerpApps)
      .select();
    
    if (error) {
      console.error('❌ Error inserting SERP data:', error);
      return false;
    }
    
    console.log(`✅ Successfully inserted ${data.length} SERP apps`);
    return true;
    
  } catch (err) {
    console.error('❌ Error loading SERP data:', err);
    return false;
  }
}

async function testDataRetrieval() {
  console.log('📊 Testing data retrieval...');
  
  try {
    // Test iTunes data retrieval
    const { data: itunesData, error: itunesError } = await supabase
      .from('itunes_apps')
      .select('bundle_id, title, developer, rating, category')
      .limit(3);
    
    if (itunesError) {
      console.error('❌ Error retrieving iTunes data:', itunesError);
      return false;
    }
    
    console.log('✅ iTunes apps retrieved:', itunesData.length);
    console.log('Sample iTunes apps:', itunesData);
    
    // Test SERP data retrieval
    const { data: serpData, error: serpError } = await supabase
      .from('serp_apps')
      .select('bundle_id, title, developer, rating, position')
      .limit(3);
    
    if (serpError) {
      console.error('❌ Error retrieving SERP data:', serpError);
      return false;
    }
    
    console.log('✅ SERP apps retrieved:', serpData.length);
    console.log('Sample SERP apps:', serpData);
    
    // Test views
    const { data: allAppsData, error: viewError } = await supabase
      .from('v_all_apps')
      .select('*')
      .limit(5);
    
    if (viewError) {
      console.error('❌ Error testing view:', viewError);
    } else {
      console.log('✅ View v_all_apps works:', allAppsData.length, 'total apps');
    }
    
    return true;
    
  } catch (err) {
    console.error('❌ Error testing data retrieval:', err);
    return false;
  }
}

async function getDataCounts() {
  console.log('📈 Getting final data counts...');
  
  try {
    const tables = ['itunes_apps', 'apple_rss_apps', 'serp_apps', 'apps_unified'];
    
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error(`❌ Error counting ${table}:`, error);
      } else {
        console.log(`📊 ${table}: ${count} records`);
      }
    }
    
  } catch (err) {
    console.error('❌ Error getting counts:', err);
  }
}

async function main() {
  console.log('🚀 Starting Phase 3: Basic Data Operations\n');
  
  // Phase 3.1: Data Insertion Test
  console.log('=== Phase 3.1: Data Insertion Test ===');
  const itunesSuccess = await loadItunesData();
  const serpSuccess = await loadSerpData();
  
  if (!itunesSuccess || !serpSuccess) {
    console.log('❌ Phase 3.1 FAILED: Data insertion errors');
    return;
  }
  
  console.log('✅ Phase 3.1 PASSED: Data insertion successful\n');
  
  // Phase 3.2: Data Retrieval Test
  console.log('=== Phase 3.2: Data Retrieval Test ===');
  const retrievalSuccess = await testDataRetrieval();
  
  if (!retrievalSuccess) {
    console.log('❌ Phase 3.2 FAILED: Data retrieval errors');
    return;
  }
  
  console.log('✅ Phase 3.2 PASSED: Data retrieval successful\n');
  
  // Final summary
  console.log('=== Final Summary ===');
  await getDataCounts();
  
  console.log('\n🎉 Phase 3: Basic Data Operations COMPLETED SUCCESSFULLY!');
  console.log('Ready for Phase 4: Duplicate Detection & Smart Updates');
}

// Run the test
main().catch(console.error);