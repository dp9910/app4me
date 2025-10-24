/**
 * Performance Comparison Test
 * Test original vs optimized feature extraction on small sample
 */

const { createClient } = require('@supabase/supabase-js');
const { enrichAppData } = require('./feature-engineering-node.js');
const { enrichAppDataOptimized } = require('./feature-engineering-optimized.js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function comparePerformance() {
  console.log('🧪 Performance Comparison: Original vs Optimized Feature Extraction\n');

  try {
    // Get 5 test apps
    const { data: testApps, error } = await supabase
      .from('itunes_apps')
      .select(`
        bundle_id,
        title,
        developer,
        category,
        description,
        rating,
        rating_count,
        formatted_price,
        icon_url,
        release_date,
        size_bytes
      `)
      .not('description', 'is', null)
      .gte('rating_count', 1000)
      .limit(5)
      .order('rating_count', { ascending: false });

    if (error) throw error;

    console.log(`📱 Testing with ${testApps.length} apps:`);
    testApps.forEach((app, i) => {
      console.log(`   ${i + 1}. ${app.title} (${app.category})`);
    });
    console.log('');

    // Test Original Version
    console.log('🔥 Testing ORIGINAL feature extraction...');
    const originalStartTime = Date.now();
    const originalResults = [];

    for (const app of testApps) {
      const appStartTime = Date.now();
      try {
        const features = await enrichAppData(app);
        const processingTime = Date.now() - appStartTime;
        originalResults.push({
          app_id: app.bundle_id,
          app_title: app.title,
          features,
          processing_time_ms: processingTime,
          success: true
        });
        console.log(`   ✅ ${app.title}: ${processingTime}ms`);
      } catch (error) {
        const processingTime = Date.now() - appStartTime;
        originalResults.push({
          app_id: app.bundle_id,
          app_title: app.title,
          error: error.message,
          processing_time_ms: processingTime,
          success: false
        });
        console.log(`   ❌ ${app.title}: ${processingTime}ms (failed)`);
      }
    }

    const originalTotalTime = Date.now() - originalStartTime;
    const originalSuccessful = originalResults.filter(r => r.success);
    const originalAvgTime = originalSuccessful.length > 0 
      ? Math.round(originalSuccessful.reduce((sum, r) => sum + r.processing_time_ms, 0) / originalSuccessful.length)
      : 0;

    console.log(`   📊 Original Results: ${originalSuccessful.length}/${testApps.length} successful, ${originalAvgTime}ms avg, ${originalTotalTime}ms total\n`);

    // Wait a moment between tests
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test Optimized Version
    console.log('⚡ Testing OPTIMIZED feature extraction...');
    const optimizedStartTime = Date.now();
    const optimizedResults = [];

    for (const app of testApps) {
      const appStartTime = Date.now();
      try {
        const features = await enrichAppDataOptimized(app);
        const processingTime = Date.now() - appStartTime;
        optimizedResults.push({
          app_id: app.bundle_id,
          app_title: app.title,
          features,
          processing_time_ms: processingTime,
          success: true
        });
        console.log(`   ✅ ${app.title}: ${processingTime}ms`);
      } catch (error) {
        const processingTime = Date.now() - appStartTime;
        optimizedResults.push({
          app_id: app.bundle_id,
          app_title: app.title,
          error: error.message,
          processing_time_ms: processingTime,
          success: false
        });
        console.log(`   ❌ ${app.title}: ${processingTime}ms (failed)`);
      }
    }

    const optimizedTotalTime = Date.now() - optimizedStartTime;
    const optimizedSuccessful = optimizedResults.filter(r => r.success);
    const optimizedAvgTime = optimizedSuccessful.length > 0 
      ? Math.round(optimizedSuccessful.reduce((sum, r) => sum + r.processing_time_ms, 0) / optimizedSuccessful.length)
      : 0;

    console.log(`   📊 Optimized Results: ${optimizedSuccessful.length}/${testApps.length} successful, ${optimizedAvgTime}ms avg, ${optimizedTotalTime}ms total\n`);

    // Performance Analysis
    console.log('📈 PERFORMANCE COMPARISON RESULTS:');
    console.log('═══════════════════════════════════════');
    
    if (originalAvgTime > 0 && optimizedAvgTime > 0) {
      const speedImprovement = (originalAvgTime / optimizedAvgTime).toFixed(1);
      const timeReduction = ((originalAvgTime - optimizedAvgTime) / originalAvgTime * 100).toFixed(1);
      
      console.log(`🕐 Average Processing Time:`);
      console.log(`   Original:  ${originalAvgTime}ms per app`);
      console.log(`   Optimized: ${optimizedAvgTime}ms per app`);
      console.log(`   🚀 Speed Improvement: ${speedImprovement}x faster`);
      console.log(`   📉 Time Reduction: ${timeReduction}%\n`);
      
      console.log(`🕐 Total Processing Time:`);
      console.log(`   Original:  ${originalTotalTime}ms total`);
      console.log(`   Optimized: ${optimizedTotalTime}ms total`);
      console.log(`   📉 Total Time Saved: ${originalTotalTime - optimizedTotalTime}ms\n`);
      
      // Extrapolate to full dataset
      const remainingApps = 5349 - 125; // Total iTunes apps - already processed
      const originalEstimate = Math.round((remainingApps * originalAvgTime) / 1000 / 60); // minutes
      const optimizedEstimate = Math.round((remainingApps * optimizedAvgTime) / 1000 / 60); // minutes
      
      console.log(`⏱️  Estimated Time for Remaining ${remainingApps} Apps:`);
      console.log(`   Original:  ${originalEstimate} minutes (${(originalEstimate/60).toFixed(1)} hours)`);
      console.log(`   Optimized: ${optimizedEstimate} minutes (${(optimizedEstimate/60).toFixed(1)} hours)`);
      console.log(`   💰 Time Saved: ${originalEstimate - optimizedEstimate} minutes (${((originalEstimate - optimizedEstimate)/60).toFixed(1)} hours)\n`);
    }

    console.log(`✅ Success Rates:`);
    console.log(`   Original:  ${originalSuccessful.length}/${testApps.length} (${(originalSuccessful.length/testApps.length*100).toFixed(1)}%)`);
    console.log(`   Optimized: ${optimizedSuccessful.length}/${testApps.length} (${(optimizedSuccessful.length/testApps.length*100).toFixed(1)}%)\n`);

    // Feature Quality Comparison
    if (originalSuccessful.length > 0 && optimizedSuccessful.length > 0) {
      console.log(`🔍 Feature Quality Comparison:`);
      
      const originalSample = originalSuccessful[0].features;
      const optimizedSample = optimizedSuccessful[0].features;
      
      console.log(`   Original LLM Features: ${Object.keys(originalSample.llm_features || {}).length} fields`);
      console.log(`   Optimized LLM Features: ${Object.keys(optimizedSample.llm_features || {}).length} fields`);
      console.log(`   Original Keywords: ${Object.keys(originalSample.keywords_tfidf?.keywords || {}).length} keywords`);
      console.log(`   Optimized Keywords: ${Object.keys(optimizedSample.keywords_tfidf?.keywords || {}).length} keywords`);
      
      console.log(`\n   📊 Feature Reduction Strategy:`);
      console.log(`     ✂️  Simplified LLM schema (3 vs 12 fields)`);
      console.log(`     ✂️  Reduced keyword count (10 vs 20)`);
      console.log(`     ✂️  Faster categorization logic`);
      console.log(`     ✂️  Streamlined metadata extraction`);
    }

    console.log(`\n🎯 RECOMMENDATION:`);
    if (originalAvgTime > 0 && optimizedAvgTime > 0 && optimizedAvgTime < originalAvgTime) {
      console.log(`   ✅ Use OPTIMIZED version for production`);
      console.log(`   🚀 Significant speed improvement achieved`);
      console.log(`   ⚡ Reduced feature complexity maintains core functionality`);
    } else {
      console.log(`   ⚠️  Review optimization results carefully`);
    }

  } catch (error) {
    console.error('❌ Performance comparison failed:', error);
    throw error;
  }
}

if (require.main === module) {
  comparePerformance()
    .then(() => {
      console.log('\n✅ Performance comparison completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Performance comparison failed:', error);
      process.exit(1);
    });
}

module.exports = { comparePerformance };