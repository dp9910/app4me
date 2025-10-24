const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function compareBundleIds() {
  console.log('=== COMPARING BUNDLE_IDS BETWEEN TABLES ===');
  
  try {
    // Get all apps from apps_unified
    console.log('Fetching all apps from apps_unified...');
    let allApps = [];
    let from = 0;
    const batchSize = 1000;
    
    while (true) {
      const { data: apps, error } = await supabase
        .from('apps_unified')
        .select('id, bundle_id')
        .range(from, from + batchSize - 1);
      
      if (error) throw error;
      if (!apps || apps.length === 0) break;
      
      allApps = allApps.concat(apps);
      from += batchSize;
      
      if (apps.length < batchSize) break;
    }
    
    console.log(`Total apps in apps_unified: ${allApps.length}`);
    
    // Get all apps with features
    console.log('Fetching all apps from app_features...');
    let allFeatures = [];
    from = 0;
    
    while (true) {
      const { data: features, error } = await supabase
        .from('app_features')
        .select('app_id')
        .range(from, from + batchSize - 1);
      
      if (error) throw error;
      if (!features || features.length === 0) break;
      
      allFeatures = allFeatures.concat(features);
      from += batchSize;
      
      if (features.length < batchSize) break;
    }
    
    console.log(`Total apps in app_features: ${allFeatures.length}`);
    
    // Create sets for comparison
    const featuredAppIds = new Set(allFeatures.map(f => f.app_id));
    
    // Find apps without features
    const appsWithoutFeatures = [];
    for (const app of allApps) {
      if (!featuredAppIds.has(app.id)) {
        appsWithoutFeatures.push(app);
      }
    }
    
    console.log('\nGAP ANALYSIS:');
    console.log(`Apps with features: ${allFeatures.length}`);
    console.log(`Apps without features: ${appsWithoutFeatures.length}`);
    console.log(`Coverage: ${((allFeatures.length / allApps.length) * 100).toFixed(1)}%`);
    
    // Sample some apps without features
    console.log('\nFirst 15 apps WITHOUT features:');
    appsWithoutFeatures.slice(0, 15).forEach((app, i) => {
      console.log(`${i+1}. ID: ${app.id}, Bundle: ${app.bundle_id}`);
    });
    
    // Check if these apps have embeddings
    console.log('\nChecking if apps without features have embeddings...');
    const sampleWithoutFeatures = appsWithoutFeatures.slice(0, 5).map(app => app.id);
    
    const { data: embeddingsCheck, error: embError } = await supabase
      .from('app_embeddings')
      .select('app_id')
      .in('app_id', sampleWithoutFeatures);
    
    if (embError) throw embError;
    
    console.log(`Sample apps without features that DO have embeddings: ${embeddingsCheck.length}/5`);
    
    // Analyze the sources of apps without features
    console.log('\nAnalyzing bundle_id patterns for apps without features...');
    const bundlePatterns = {};
    appsWithoutFeatures.slice(0, 50).forEach(app => {
      const prefix = app.bundle_id.split('.')[0];
      bundlePatterns[prefix] = (bundlePatterns[prefix] || 0) + 1;
    });
    
    console.log('Bundle ID prefixes for apps without features:');
    Object.entries(bundlePatterns).sort((a, b) => b[1] - a[1]).forEach(([prefix, count]) => {
      console.log(`  ${prefix}: ${count} apps`);
    });
    
  } catch (err) {
    console.error('Error:', err);
  }
}

compareBundleIds();