const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Reconciliation logic functions
function getBestRating(sources) {
  // Prefer source with highest rating count (most reliable)
  let bestSource = null;
  let highestCount = 0;
  
  sources.forEach(source => {
    if (source.rating_count && source.rating_count > highestCount) {
      highestCount = source.rating_count;
      bestSource = source;
    }
  });
  
  return bestSource || sources[0];
}

function getRichestDescription(sources) {
  // Prefer longest, most detailed description
  let bestSource = null;
  let longestLength = 0;
  
  sources.forEach(source => {
    const length = source.description?.length || 0;
    if (length > longestLength) {
      longestLength = length;
      bestSource = source;
    }
  });
  
  return bestSource || sources[0];
}

function getLatestVersion(sources) {
  // Prefer most recent version (simple string comparison for now)
  let latestSource = sources[0];
  
  sources.forEach(source => {
    if (source.version && source.version > latestSource.version) {
      latestSource = source;
    }
  });
  
  return latestSource;
}

function getBestIcon(sources) {
  // Prefer highest resolution icon
  let bestIcon = null;
  
  sources.forEach(source => {
    if (source.icon_url_512) {
      bestIcon = { url: source.icon_url_512, resolution: '512x512' };
    } else if (!bestIcon && source.icon_url) {
      bestIcon = { url: source.icon_url, resolution: '100x100' };
    }
  });
  
  return bestIcon;
}

function mergeCategories(sources) {
  const allCategories = [];
  const uniqueCategories = new Set();
  
  sources.forEach(source => {
    if (source.category && !uniqueCategories.has(source.category)) {
      allCategories.push(source.category);
      uniqueCategories.add(source.category);
    }
    
    // Add genres from SERP data
    if (source.genres && Array.isArray(source.genres)) {
      source.genres.forEach(genre => {
        const genreName = typeof genre === 'object' ? genre.name : genre;
        if (genreName && !uniqueCategories.has(genreName)) {
          allCategories.push(genreName);
          uniqueCategories.add(genreName);
        }
      });
    }
  });
  
  return allCategories;
}

function calculateQualityScore(unifiedApp) {
  let score = 0;
  
  // Basic info (40 points)
  if (unifiedApp.title) score += 10;
  if (unifiedApp.description && unifiedApp.description.length > 50) score += 15;
  if (unifiedApp.developer) score += 10;
  
  // Parse categories if it's a JSON string
  let categories = unifiedApp.all_categories;
  if (typeof categories === 'string') {
    try {
      categories = JSON.parse(categories);
    } catch (e) {
      categories = [];
    }
  }
  if (categories && categories.length > 0) score += 5;
  
  // Rating data (30 points)
  if (unifiedApp.rating && unifiedApp.rating > 0) score += 10;
  if (unifiedApp.rating_count) {
    if (unifiedApp.rating_count > 1000) score += 20;
    else if (unifiedApp.rating_count > 100) score += 15;
    else if (unifiedApp.rating_count > 10) score += 10;
    else score += 5;
  }
  
  // Media assets (30 points)
  if (unifiedApp.icon_url) score += 10;
  if (unifiedApp.icon_url_hd) score += 5;
  if (unifiedApp.screenshots && Object.keys(unifiedApp.screenshots).length > 0) score += 15;
  
  return score;
}

async function test51_InstagramReconciliation() {
  console.log('=== Phase 5.1: Instagram Multi-Source Reconciliation ===');
  
  try {
    // Get Instagram data from both sources
    const { data: itunesInstagram } = await supabase
      .from('itunes_apps')
      .select('*')
      .eq('bundle_id', 'com.burbn.instagram')
      .single();
    
    const { data: serpInstagram } = await supabase
      .from('serp_apps')
      .select('*')
      .eq('bundle_id', 'com.burbn.instagram')
      .single();
    
    if (!itunesInstagram || !serpInstagram) {
      console.log('❌ Instagram not found in both sources');
      return false;
    }
    
    console.log('📊 iTunes Instagram:', {
      version: itunesInstagram.version,
      rating: itunesInstagram.rating,
      rating_count: itunesInstagram.rating_count,
      description_length: itunesInstagram.description?.length || 0
    });
    
    console.log('📊 SERP Instagram:', {
      version: serpInstagram.version, 
      rating: serpInstagram.rating,
      rating_count: serpInstagram.rating_count,
      description_length: serpInstagram.description?.length || 0,
      has_512_icon: !!serpInstagram.icon_url_512
    });
    
    // Apply reconciliation logic
    const sources = [itunesInstagram, serpInstagram];
    const bestRating = getBestRating(sources);
    const richestDescription = getRichestDescription(sources);
    const latestVersion = getLatestVersion(sources);
    const bestIcon = getBestIcon(sources);
    const categories = mergeCategories(sources);
    
    // Create unified record
    const unifiedInstagram = {
      bundle_id: 'com.burbn.instagram',
      title: serpInstagram.title || itunesInstagram.title,
      developer: serpInstagram.developer || itunesInstagram.developer,
      developer_id: String(serpInstagram.developer_id || itunesInstagram.developer_id || ''),
      developer_url: serpInstagram.developer_url || itunesInstagram.developer_url,
      version: latestVersion.version,
      
      // Pricing (prefer SERP data structure)
      price: serpInstagram.price_value || itunesInstagram.price || 0,
      formatted_price: serpInstagram.formatted_price || itunesInstagram.formatted_price,
      currency: itunesInstagram.currency || 'USD',
      
      // Best rating data
      rating: bestRating.rating,
      rating_count: bestRating.rating_count,
      rating_source: bestRating === serpInstagram ? 'serp_api' : 'itunes_api',
      
      // Best media assets
      icon_url: bestIcon.url,
      icon_url_hd: serpInstagram.icon_url_512 || serpInstagram.icon_url || itunesInstagram.icon_url,
      screenshots: serpInstagram.screenshots || {},
      
      // Richest description
      description: richestDescription.description,
      description_source: richestDescription === serpInstagram ? 'serp_api' : 'itunes_api',
      
      // Dates
      release_date: serpInstagram.release_date || itunesInstagram.release_date,
      last_updated: serpInstagram.latest_version_release_date || itunesInstagram.last_updated,
      age_rating: serpInstagram.age_rating || itunesInstagram.age_rating,
      
      // Categories
      primary_category: categories[0] || 'Unknown',
      all_categories: JSON.stringify(categories), // Convert to JSON string for JSONB
      genres: serpInstagram.genres || itunesInstagram.genres || [],
      
      // Technical info
      size_bytes: serpInstagram.size_in_bytes || itunesInstagram.size_bytes,
      supported_languages: serpInstagram.supported_languages || itunesInstagram.languages_supported || [],
      supported_devices: serpInstagram.supported_devices || [],
      minimum_os_version: serpInstagram.minimum_os_version || itunesInstagram.minimum_os_version,
      
      // Source tracking
      available_in_sources: JSON.stringify(['itunes', 'serp']), // Convert to JSON string
      
      // Performance tracking
      total_appearances: 2,
      avg_rank: (itunesInstagram.rank + serpInstagram.rank) / 2,
      best_rank: Math.min(itunesInstagram.rank || 999, serpInstagram.rank || 999)
    };
    
    // Calculate quality score
    unifiedInstagram.data_quality_score = calculateQualityScore(unifiedInstagram);
    
    console.log('📊 Unified Instagram:', {
      rating: unifiedInstagram.rating,
      rating_count: unifiedInstagram.rating_count,
      rating_source: unifiedInstagram.rating_source,
      description_source: unifiedInstagram.description_source,
      data_quality_score: unifiedInstagram.data_quality_score,
      categories: unifiedInstagram.all_categories,
      total_appearances: unifiedInstagram.total_appearances
    });
    
    // Insert into unified table
    const { data: insertedData, error } = await supabase
      .from('apps_unified')
      .upsert(unifiedInstagram, {
        onConflict: 'bundle_id',
        ignoreDuplicates: false
      })
      .select()
      .single();
    
    if (error) {
      console.log('❌ Failed to insert unified Instagram:', error);
      return false;
    }
    
    console.log('✅ SUCCESS: Instagram reconciled and inserted into unified table');
    console.log(`   Quality score: ${insertedData.data_quality_score}/100`);
    console.log(`   Sources: ${insertedData.available_in_sources}`);
    
    return true;
    
  } catch (err) {
    console.error('❌ Test failed with exception:', err);
    return false;
  }
}

async function test52_SingleSourceReconciliation() {
  console.log('\n=== Phase 5.2: Single Source App Reconciliation ===');
  
  try {
    // Reconcile Flora (only in iTunes)
    const { data: floraData } = await supabase
      .from('itunes_apps')
      .select('*')
      .eq('bundle_id', 'com.appfinca.flora.ios')
      .single();
    
    if (!floraData) {
      console.log('❌ Flora not found');
      return false;
    }
    
    console.log('📊 Flora iTunes data:', {
      rating: floraData.rating,
      rating_count: floraData.rating_count,
      description_length: floraData.description?.length || 0
    });
    
    // Create unified record from single source
    const unifiedFlora = {
      bundle_id: floraData.bundle_id,
      title: floraData.title,
      developer: floraData.developer,
      developer_id: String(floraData.developer_id || ''),
      developer_url: floraData.developer_url,
      version: floraData.version,
      price: floraData.price,
      formatted_price: floraData.formatted_price,
      currency: floraData.currency,
      rating: floraData.rating,
      rating_count: floraData.rating_count,
      rating_source: 'itunes_api',
      icon_url: floraData.icon_url,
      screenshots: floraData.screenshots || {},
      description: floraData.description,
      description_source: 'itunes_api',
      release_date: floraData.release_date,
      last_updated: floraData.last_updated,
      age_rating: floraData.age_rating,
      primary_category: floraData.category,
      all_categories: JSON.stringify([floraData.category]), // Convert to JSON string
      genres: floraData.genres || [],
      size_bytes: floraData.size_bytes,
      supported_languages: floraData.languages_supported || [],
      available_in_sources: JSON.stringify(['itunes']), // Convert to JSON string
      total_appearances: 1,
      best_rank: floraData.rank
    };
    
    unifiedFlora.data_quality_score = calculateQualityScore(unifiedFlora);
    
    console.log('📊 Unified Flora quality score:', unifiedFlora.data_quality_score);
    
    // Insert into unified table
    const { error } = await supabase
      .from('apps_unified')
      .upsert(unifiedFlora, {
        onConflict: 'bundle_id',
        ignoreDuplicates: false
      });
    
    if (error) {
      console.log('❌ Failed to insert unified Flora:', error);
      return false;
    }
    
    console.log('✅ SUCCESS: Flora reconciled from single source');
    return true;
    
  } catch (err) {
    console.error('❌ Test failed with exception:', err);
    return false;
  }
}

async function test53_BulkReconciliation() {
  console.log('\n=== Phase 5.3: Bulk Reconciliation Test ===');
  
  try {
    // Get all unique bundle_ids across sources
    const { data: allApps } = await supabase
      .from('v_all_apps')
      .select('bundle_id, source_type')
      .order('bundle_id');
    
    if (!allApps) {
      console.log('❌ No apps found for bulk reconciliation');
      return false;
    }
    
    // Group by bundle_id
    const appGroups = {};
    allApps.forEach(app => {
      if (!appGroups[app.bundle_id]) {
        appGroups[app.bundle_id] = [];
      }
      appGroups[app.bundle_id].push(app.source_type);
    });
    
    console.log('📊 Apps to reconcile:', Object.keys(appGroups).length);
    console.log('📊 Multi-source apps:', Object.values(appGroups).filter(sources => sources.length > 1).length);
    
    let reconciledCount = 0;
    
    for (const [bundleId, sources] of Object.entries(appGroups)) {
      try {
        // Skip if already reconciled
        const { data: existing } = await supabase
          .from('apps_unified')
          .select('bundle_id')
          .eq('bundle_id', bundleId)
          .single();
        
        if (existing) {
          console.log(`⏭️ Skipping ${bundleId} (already reconciled)`);
          continue;
        }
        
        // Get data from all sources for this app
        const sourceData = [];
        
        if (sources.includes('itunes')) {
          const { data } = await supabase
            .from('itunes_apps')
            .select('*')
            .eq('bundle_id', bundleId)
            .limit(1)
            .single();
          if (data) sourceData.push({ ...data, source_type: 'itunes' });
        }
        
        if (sources.includes('serp')) {
          const { data } = await supabase
            .from('serp_apps')
            .select('*')
            .eq('bundle_id', bundleId)
            .limit(1)
            .single();
          if (data) sourceData.push({ ...data, source_type: 'serp' });
        }
        
        if (sourceData.length === 0) continue;
        
        // Apply reconciliation logic
        const bestRating = getBestRating(sourceData);
        const richestDescription = getRichestDescription(sourceData);
        const latestVersion = getLatestVersion(sourceData);
        const bestIcon = getBestIcon(sourceData);
        const categories = mergeCategories(sourceData);
        
        const unified = {
          bundle_id: bundleId,
          title: sourceData[0].title,
          developer: sourceData[0].developer || sourceData[0].artist_name,
          version: latestVersion.version,
          rating: bestRating.rating,
          rating_count: bestRating.rating_count,
          rating_source: bestRating.source_type === 'serp' ? 'serp_api' : 'itunes_api',
          icon_url: bestIcon?.url || sourceData[0].icon_url,
          description: richestDescription.description,
          description_source: richestDescription.source_type === 'serp' ? 'serp_api' : 'itunes_api',
          primary_category: categories[0] || 'Unknown',
          all_categories: JSON.stringify(categories), // Convert to JSON string
          available_in_sources: JSON.stringify(sources), // Convert to JSON string
          total_appearances: sources.length
        };
        
        unified.data_quality_score = calculateQualityScore(unified);
        
        // Insert unified record
        const { error } = await supabase
          .from('apps_unified')
          .insert(unified);
        
        if (!error) {
          reconciledCount++;
          console.log(`✅ Reconciled ${bundleId} (${sources.join(', ')})`);
        }
        
      } catch (err) {
        console.log(`❌ Failed to reconcile ${bundleId}:`, err.message);
      }
    }
    
    console.log(`✅ SUCCESS: Reconciled ${reconciledCount} apps`);
    return reconciledCount > 0;
    
  } catch (err) {
    console.error('❌ Test failed with exception:', err);
    return false;
  }
}

async function test54_QualityScoreValidation() {
  console.log('\n=== Phase 5.4: Quality Score Validation ===');
  
  try {
    // Get all unified apps with their quality scores
    const { data: unifiedApps } = await supabase
      .from('apps_unified')
      .select('bundle_id, title, rating_count, data_quality_score, available_in_sources')
      .order('data_quality_score', { ascending: false });
    
    if (!unifiedApps || unifiedApps.length === 0) {
      console.log('❌ No unified apps found');
      return false;
    }
    
    console.log('📊 Quality Score Rankings:');
    unifiedApps.forEach((app, index) => {
      console.log(`   ${index + 1}. ${app.title}: ${app.data_quality_score}/100 (${app.available_in_sources.length} sources, ${app.rating_count || 0} reviews)`);
    });
    
    // Validate scoring logic
    const instagramScore = unifiedApps.find(app => app.bundle_id === 'com.burbn.instagram')?.data_quality_score;
    const expectedHighScore = instagramScore >= 80; // Should be high due to millions of reviews
    
    const avgScore = unifiedApps.reduce((sum, app) => sum + app.data_quality_score, 0) / unifiedApps.length;
    console.log(`📊 Average quality score: ${avgScore.toFixed(1)}/100`);
    
    if (expectedHighScore && avgScore > 50) {
      console.log('✅ SUCCESS: Quality scoring working correctly');
      return true;
    } else {
      console.log('❌ FAILURE: Quality scoring needs adjustment');
      return false;
    }
    
  } catch (err) {
    console.error('❌ Test failed with exception:', err);
    return false;
  }
}

async function getFinalSummary() {
  console.log('\n=== Final Reconciliation Summary ===');
  
  try {
    // Count unified apps
    const { count: unifiedCount } = await supabase
      .from('apps_unified')
      .select('*', { count: 'exact', head: true });
    
    // Get source distribution
    const { data: sourceData } = await supabase
      .from('apps_unified')
      .select('available_in_sources');
    
    if (sourceData) {
      const singleSource = sourceData.filter(app => app.available_in_sources.length === 1).length;
      const multiSource = sourceData.filter(app => app.available_in_sources.length > 1).length;
      
      console.log(`📊 Total unified apps: ${unifiedCount}`);
      console.log(`📊 Single-source apps: ${singleSource}`);
      console.log(`📊 Multi-source apps: ${multiSource}`);
    }
    
    // Test final view
    const { data: viewTest } = await supabase
      .from('v_multi_source_apps')
      .select('*');
    
    console.log(`📊 Multi-source view: ${viewTest?.length || 0} apps`);
    
  } catch (err) {
    console.error('❌ Error getting summary:', err);
  }
}

async function main() {
  console.log('🚀 Starting Phase 5: Data Reconciliation\n');
  
  const results = {
    instagramReconciliation: await test51_InstagramReconciliation(),
    singleSourceReconciliation: await test52_SingleSourceReconciliation(),
    bulkReconciliation: await test53_BulkReconciliation(),
    qualityScoreValidation: await test54_QualityScoreValidation()
  };
  
  await getFinalSummary();
  
  // Overall results
  const passedTests = Object.values(results).filter(r => r === true).length;
  const totalTests = Object.keys(results).length;
  
  console.log('\n=== Phase 5 Results ===');
  console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`   ${passed ? '✅' : '❌'} ${test}`);
  });
  
  if (passedTests === totalTests) {
    console.log('\n🎉 Phase 5: Data Reconciliation COMPLETED SUCCESSFULLY!');
    console.log('Ready for Phase 6: Performance & Edge Functions');
  } else {
    console.log('\n❌ Phase 5: Some tests failed - review and fix before proceeding');
  }
}

// Run the test
main().catch(console.error);