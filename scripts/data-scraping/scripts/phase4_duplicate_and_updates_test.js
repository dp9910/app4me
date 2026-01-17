const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function test41_DuplicatePrevention() {
  console.log('=== Phase 4.1: Duplicate Prevention Test ===');
  
  try {
    // Try to insert exact duplicate of existing Flora app
    const duplicateFlora = {
      bundle_id: 'com.appfinca.flora.ios',
      source: 'itunes_api',
      query_term: 'productivity', // Same composite key
      title: 'Flora - Green Focus DUPLICATE',
      developer: 'AppFinca Inc.',
      version: '3.7.27',
      rating: 4.758
    };
    
    console.log('📱 Attempting to insert duplicate Flora app...');
    const { data, error } = await supabase
      .from('itunes_apps')
      .insert(duplicateFlora);
    
    if (error && error.code === '23505') { // Unique constraint violation
      console.log('✅ SUCCESS: Duplicate prevented by unique constraint');
      console.log('   Error:', error.message);
      return true;
    } else if (error) {
      console.log('❌ UNEXPECTED ERROR:', error);
      return false;
    } else {
      console.log('❌ FAILURE: Duplicate was inserted (should have been prevented)');
      return false;
    }
    
  } catch (err) {
    console.error('❌ Test failed with exception:', err);
    return false;
  }
}

async function test42_SmartUpdateLogic() {
  console.log('\n=== Phase 4.2: Smart Update Logic Test ===');
  
  try {
    // Get current Flora data
    const { data: originalData } = await supabase
      .from('itunes_apps')
      .select('bundle_id, version, rating, rating_count, scrape_count, last_scraped')
      .eq('bundle_id', 'com.appfinca.flora.ios')
      .single();
    
    if (!originalData) {
      console.log('❌ No Flora app found for testing');
      return false;
    }
    
    console.log('📊 Original Flora data:', originalData);
    
    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update with new version and rating
    console.log('📱 Updating Flora with new version and rating...');
    const { data: updatedData, error } = await supabase
      .from('itunes_apps')
      .update({
        version: '3.8.0', // New version
        rating: 4.80,     // Improved rating
        rating_count: 85000 // More reviews
      })
      .eq('bundle_id', 'com.appfinca.flora.ios')
      .eq('source', 'itunes_api')
      .eq('query_term', 'productivity')
      .select()
      .single();
    
    if (error) {
      console.log('❌ Update failed:', error);
      return false;
    }
    
    console.log('📊 Updated Flora data:', {
      bundle_id: updatedData.bundle_id,
      version: updatedData.version,
      rating: updatedData.rating,
      rating_count: updatedData.rating_count,
      scrape_count: updatedData.scrape_count,
      last_scraped: updatedData.last_scraped
    });
    
    // Verify triggers worked
    const scrapeDiff = updatedData.scrape_count - originalData.scrape_count;
    const timeUpdated = new Date(updatedData.last_scraped) > new Date(originalData.last_scraped);
    
    if (scrapeDiff === 1 && timeUpdated) {
      console.log('✅ SUCCESS: Triggers working correctly');
      console.log(`   Scrape count incremented: ${originalData.scrape_count} → ${updatedData.scrape_count}`);
      console.log(`   Last scraped updated: ${originalData.last_scraped} → ${updatedData.last_scraped}`);
      return true;
    } else {
      console.log('❌ FAILURE: Triggers not working correctly');
      console.log(`   Scrape count change: ${scrapeDiff} (expected: 1)`);
      console.log(`   Time updated: ${timeUpdated} (expected: true)`);
      return false;
    }
    
  } catch (err) {
    console.error('❌ Test failed with exception:', err);
    return false;
  }
}

async function test43_UpsertOperations() {
  console.log('\n=== Phase 4.3: UPSERT Operations Test ===');
  
  try {
    // Test UPSERT with existing app (should update)
    console.log('📱 Testing UPSERT with existing Instagram app...');
    
    const upsertData = {
      bundle_id: 'com.burbn.instagram',
      source: 'serp_api',
      query_term: 'instagram',
      title: 'Instagram',
      developer: 'Instagram, Inc.',
      version: '404.0.0', // New version
      rating: 4.75,       // New rating
      rating_count: 29000000, // More reviews
      description: 'Updated description for Instagram with new features!'
    };
    
    // Get original data first
    const { data: originalInstagram } = await supabase
      .from('serp_apps')
      .select('version, rating, rating_count, scrape_count')
      .eq('bundle_id', 'com.burbn.instagram')
      .eq('source', 'serp_api')
      .eq('query_term', 'instagram')
      .single();
    
    console.log('📊 Original Instagram data:', originalInstagram);
    
    // Perform UPSERT using INSERT ... ON CONFLICT
    const { data: upsertResult, error } = await supabase
      .from('serp_apps')
      .upsert(upsertData, {
        onConflict: 'bundle_id,source,query_term',
        ignoreDuplicates: false
      })
      .select()
      .single();
    
    if (error) {
      console.log('❌ UPSERT failed:', error);
      return false;
    }
    
    console.log('📊 UPSERT result:', {
      version: upsertResult.version,
      rating: upsertResult.rating,
      rating_count: upsertResult.rating_count,
      scrape_count: upsertResult.scrape_count
    });
    
    // Verify update occurred
    const versionUpdated = upsertResult.version === '404.0.0';
    const ratingUpdated = upsertResult.rating === 4.75;
    const countIncremented = upsertResult.scrape_count === (originalInstagram.scrape_count + 1);
    
    if (versionUpdated && ratingUpdated && countIncremented) {
      console.log('✅ SUCCESS: UPSERT updated existing record correctly');
      return true;
    } else {
      console.log('❌ FAILURE: UPSERT did not work as expected');
      console.log(`   Version updated: ${versionUpdated} (${upsertResult.version})`);
      console.log(`   Rating updated: ${ratingUpdated} (${upsertResult.rating})`);
      console.log(`   Count incremented: ${countIncremented} (${upsertResult.scrape_count})`);
      return false;
    }
    
  } catch (err) {
    console.error('❌ Test failed with exception:', err);
    return false;
  }
}

async function test44_NewAppUpsert() {
  console.log('\n=== Phase 4.4: New App UPSERT Test ===');
  
  try {
    // Test UPSERT with completely new app
    console.log('📱 Testing UPSERT with new app (WhatsApp)...');
    
    const newAppData = {
      bundle_id: 'net.whatsapp.WhatsApp',
      source: 'serp_api',
      query_term: 'messaging',
      title: 'WhatsApp Messenger',
      developer: 'WhatsApp Inc.',
      version: '23.20.78',
      rating: 4.65,
      rating_count: 15000000,
      description: 'Simple. Reliable. Secure messaging and calling.',
      icon_url: 'https://is1-ssl.mzstatic.com/image/thumb/Purple/whatsapp-icon.jpg',
      category: 'Social Networking',
      rank: 1
    };
    
    // Check if app exists (should not)
    const { data: existingApp } = await supabase
      .from('serp_apps')
      .select('bundle_id')
      .eq('bundle_id', 'net.whatsapp.WhatsApp')
      .eq('source', 'serp_api')
      .eq('query_term', 'messaging');
    
    console.log('📊 Existing WhatsApp records:', existingApp?.length || 0);
    
    // Perform UPSERT (should insert new)
    const { data: upsertResult, error } = await supabase
      .from('serp_apps')
      .upsert(newAppData, {
        onConflict: 'bundle_id,source,query_term',
        ignoreDuplicates: false
      })
      .select()
      .single();
    
    if (error) {
      console.log('❌ UPSERT failed:', error);
      return false;
    }
    
    console.log('📊 New WhatsApp app inserted:', {
      bundle_id: upsertResult.bundle_id,
      title: upsertResult.title,
      rating: upsertResult.rating,
      scrape_count: upsertResult.scrape_count
    });
    
    // Verify new record
    const correctData = upsertResult.bundle_id === 'net.whatsapp.WhatsApp' &&
                       upsertResult.title === 'WhatsApp Messenger' &&
                       upsertResult.scrape_count === 1;
    
    if (correctData) {
      console.log('✅ SUCCESS: UPSERT inserted new app correctly');
      return true;
    } else {
      console.log('❌ FAILURE: UPSERT did not insert correctly');
      return false;
    }
    
  } catch (err) {
    console.error('❌ Test failed with exception:', err);
    return false;
  }
}

async function test45_MultiSourceDetection() {
  console.log('\n=== Phase 4.5: Multi-Source Detection Test ===');
  
  try {
    // Add Instagram to iTunes source to create multi-source scenario
    console.log('📱 Adding Instagram to iTunes source...');
    
    const itunesInstagram = {
      bundle_id: 'com.burbn.instagram',
      source: 'itunes_api',
      query_term: 'social media',
      title: 'Instagram',
      developer: 'Instagram, Inc.',
      version: '403.0.0',
      rating: 4.69,
      rating_count: 28282046,
      category: 'Photo & Video',
      rank: 1
    };
    
    const { error: insertError } = await supabase
      .from('itunes_apps')
      .insert(itunesInstagram);
    
    if (insertError) {
      console.log('❌ Failed to insert Instagram into iTunes:', insertError);
      return false;
    }
    
    // Test multi-source view
    console.log('📊 Testing multi-source view...');
    const { data: multiSourceApps, error: viewError } = await supabase
      .from('v_multi_source_apps')
      .select('*')
      .eq('bundle_id', 'com.burbn.instagram');
    
    if (viewError) {
      console.log('❌ Multi-source view error:', viewError);
      return false;
    }
    
    console.log('📊 Multi-source Instagram data:', multiSourceApps);
    
    if (multiSourceApps.length > 0 && multiSourceApps[0].source_count >= 2) {
      console.log('✅ SUCCESS: Multi-source detection working');
      console.log(`   Instagram found in ${multiSourceApps[0].source_count} sources`);
      console.log(`   Sources: ${multiSourceApps[0].sources}`);
      return true;
    } else {
      console.log('❌ FAILURE: Multi-source detection not working');
      return false;
    }
    
  } catch (err) {
    console.error('❌ Test failed with exception:', err);
    return false;
  }
}

async function getFinalSummary() {
  console.log('\n=== Final Database State ===');
  
  try {
    // Get counts from all tables
    const tables = ['itunes_apps', 'serp_apps', 'apple_rss_apps', 'apps_unified'];
    
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
    
    // Test views
    const { data: allAppsData, error: allAppsError } = await supabase
      .from('v_all_apps')
      .select('source_type, count(*)', { count: 'exact' });
    
    if (!allAppsError) {
      console.log('📊 v_all_apps working:', allAppsData?.length || 0, 'total apps across sources');
    }
    
    const { data: multiSourceData, error: multiError } = await supabase
      .from('v_multi_source_apps')
      .select('*');
    
    if (!multiError) {
      console.log('📊 v_multi_source_apps:', multiSourceData?.length || 0, 'apps in multiple sources');
    }
    
  } catch (err) {
    console.error('❌ Error getting summary:', err);
  }
}

async function main() {
  console.log('🚀 Starting Phase 4: Duplicate Detection & Smart Updates\n');
  
  const results = {
    duplicatePrevention: await test41_DuplicatePrevention(),
    smartUpdates: await test42_SmartUpdateLogic(),
    upsertExisting: await test43_UpsertOperations(),
    upsertNew: await test44_NewAppUpsert(),
    multiSource: await test45_MultiSourceDetection()
  };
  
  await getFinalSummary();
  
  // Overall results
  const passedTests = Object.values(results).filter(r => r === true).length;
  const totalTests = Object.keys(results).length;
  
  console.log('\n=== Phase 4 Results ===');
  console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`   ${passed ? '✅' : '❌'} ${test}`);
  });
  
  if (passedTests === totalTests) {
    console.log('\n🎉 Phase 4: Duplicate Detection & Smart Updates COMPLETED SUCCESSFULLY!');
    console.log('Ready for Phase 5: Database Functions & Triggers');
  } else {
    console.log('\n❌ Phase 4: Some tests failed - review and fix before proceeding');
  }
}

// Run the test
main().catch(console.error);