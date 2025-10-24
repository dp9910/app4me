const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function analyzeMissingFeatures() {
  console.log('=== ANALYZING APPS WITHOUT FEATURES ===');
  
  try {
    // Get apps with features
    let appsWithFeatures = [];
    let from = 0;
    const batchSize = 1000;
    
    while (true) {
      const { data: features, error } = await supabase
        .from('app_features')
        .select('app_id')
        .range(from, from + batchSize - 1);
      
      if (error) throw error;
      if (!features || features.length === 0) break;
      
      appsWithFeatures = appsWithFeatures.concat(features);
      from += batchSize;
      
      if (features.length < batchSize) break;
    }
    
    const featuredAppIds = new Set(appsWithFeatures.map(f => f.app_id));
    
    // Get all apps
    let allApps = [];
    from = 0;
    
    while (true) {
      const { data: apps, error } = await supabase
        .from('apps_unified')
        .select('id, bundle_id, title, developer, available_in_sources, data_quality_score')
        .range(from, from + batchSize - 1);
      
      if (error) throw error;
      if (!apps || apps.length === 0) break;
      
      allApps = allApps.concat(apps);
      from += batchSize;
      
      if (apps.length < batchSize) break;
    }
    
    const appsWithoutFeatures = allApps.filter(app => !featuredAppIds.has(app.id));
    
    console.log(`Found ${appsWithoutFeatures.length} apps without features`);
    
    // Analyze by data sources
    const sourceBreakdown = {};
    appsWithoutFeatures.forEach(app => {
      const sources = app.available_in_sources || ['unknown'];
      sources.forEach(source => {
        sourceBreakdown[source] = (sourceBreakdown[source] || 0) + 1;
      });
    });
    
    console.log('\nBreakdown by data sources:');
    Object.entries(sourceBreakdown).sort((a, b) => b[1] - a[1]).forEach(([source, count]) => {
      console.log(`  ${source}: ${count} apps`);
    });
    
    // Sample apps without features
    console.log('\nFirst 10 apps without features:');
    appsWithoutFeatures.slice(0, 10).forEach((app, i) => {
      console.log(`  ${i+1}. ${app.title || 'No title'} (${app.bundle_id}) - Sources: ${(app.available_in_sources || []).join(', ')}`);
    });
    
    // Analyze data quality scores
    const qualityScores = appsWithoutFeatures.map(app => app.data_quality_score || 0);
    const avgQuality = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;
    console.log(`\nAverage data quality score for apps without features: ${avgQuality.toFixed(2)}`);
    
    // Check if these apps were in our extraction data but failed to process
    console.log('\n=== CHECKING EXTRACTION FILES FOR MISSING APPS ===');
    const fs = require('fs');
    const glob = require('glob');
    
    // Sample some bundle_ids to check
    const sampleMissingBundles = appsWithoutFeatures.slice(0, 10).map(app => app.bundle_id);
    console.log('Checking if these bundle_ids exist in extraction files:');
    sampleMissingBundles.forEach((bundle, i) => {
      console.log(`  ${i+1}. ${bundle}`);
    });
    
    // Check in hybrid results
    const hybridFile = 'data-scraping/features-output/hybrid-extraction/final-hybrid-results.json';
    if (fs.existsSync(hybridFile)) {
      const content = JSON.parse(fs.readFileSync(hybridFile, 'utf-8'));
      const hybridBundles = new Set((content.all_hybrid_results || []).map(r => r.app_id));
      
      const foundInHybrid = sampleMissingBundles.filter(bundle => hybridBundles.has(bundle));
      console.log(`\nFound ${foundInHybrid.length}/10 in hybrid extraction results`);
      if (foundInHybrid.length > 0) {
        console.log('These were found in hybrid but somehow not uploaded:', foundInHybrid);
      }
    }
    
    // Check in SERP results
    const serpFile = 'data-scraping/scripts/data-scraping/features-output/serp-deepseek-extraction/final-serp-deepseek-results.json';
    if (fs.existsSync(serpFile)) {
      const content = JSON.parse(fs.readFileSync(serpFile, 'utf-8'));
      const serpBundles = new Set((content.all_serp_results || []).map(r => r.app_id));
      
      const foundInSerp = sampleMissingBundles.filter(bundle => serpBundles.has(bundle));
      console.log(`Found ${foundInSerp.length}/10 in SERP extraction results`);
      if (foundInSerp.length > 0) {
        console.log('These were found in SERP but somehow not uploaded:', foundInSerp);
      }
    }
    
  } catch (err) {
    console.error('Error:', err);
  }
}

analyzeMissingFeatures();