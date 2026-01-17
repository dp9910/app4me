const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const glob = require('glob');

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function retryFailedFeatures() {
  console.log('🔄 Retrying failed feature uploads...');

  try {
    // 1. Get all features that should be uploaded
    console.log('Rebuilding feature list...');
    const allFeatures = new Map();

    const processFiles = (files, label) => {
      console.log(`Processing ${label}...`);
      for (const file of files) {
        try {
          const content = JSON.parse(fs.readFileSync(file, 'utf-8'));
          const results = content.results || content.all_hybrid_results || content.all_serp_results || [];
          
          for (const result of results) {
            if (result.app_id && result.features) {
              allFeatures.set(result.app_id, result.features);
            }
          }
        } catch (err) {
          console.log(`Error reading ${file}: ${err.message}`);
        }
      }
    };

    // Process all sources
    processFiles(glob.sync('data-scraping/features-output/full-extraction-archive/batch-*.json'), 'Full extraction archive');
    processFiles(glob.sync('data-scraping/features-output/optimized-extraction/batch-*.json'), 'Optimized extraction');
    processFiles([`data-scraping/features-output/hybrid-extraction/final-hybrid-results.json`], 'Hybrid final results');
    processFiles([`data-scraping/scripts/data-scraping/features-output/serp-deepseek-extraction/final-serp-deepseek-results.json`], 'SERP final results');

    console.log(`Total features found: ${allFeatures.size}`);

    // 2. Get all apps from database
    console.log('Fetching all apps from database...');
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

    const appIdMap = new Map(allApps.map(app => [app.bundle_id, app.id]));

    // 3. Get existing features to find missing ones
    console.log('Checking which features are missing...');
    let existingFeatures = [];
    from = 0;
    
    while (true) {
      const { data: features, error } = await supabase
        .from('app_features')
        .select('app_id')
        .range(from, from + batchSize - 1);
      
      if (error) throw error;
      if (!features || features.length === 0) break;
      
      existingFeatures = existingFeatures.concat(features);
      from += batchSize;
      
      if (features.length < batchSize) break;
    }

    const existingAppIds = new Set(existingFeatures.map(f => f.app_id));
    console.log(`Found ${existingAppIds.size} existing features in database`);

    // 4. Prepare missing features for upload
    const missingFeatures = [];
    for (const [bundle_id, features] of allFeatures.entries()) {
      if (appIdMap.has(bundle_id)) {
        const app_id = appIdMap.get(bundle_id);
        if (!existingAppIds.has(app_id)) {
          missingFeatures.push({
            app_id: app_id,
            keywords_tfidf: features.keywords_tfidf || {},
            primary_use_case: features.llm_features?.primary_use || features.primary_use || null,
            target_user: features.llm_features?.target_user || features.target_user || null,
            key_benefit: features.llm_features?.key_benefit || features.key_benefit || null,
            complexity: features.llm_features?.complexity || features.complexity || null,
            category_classification: features.category_classification || {},
            quality_signals: features.quality_signals || {},
            api_used: features.llm_features?.api_used || features.api_used || null,
            processing_time_ms: features.processing_time_ms || null
          });
        }
      }
    }

    console.log(`Found ${missingFeatures.length} missing features to upload`);

    if (missingFeatures.length === 0) {
      console.log('✅ No missing features found!');
      return;
    }

    // 5. Upload missing features
    console.log('Uploading missing features...');
    const BATCH_SIZE = 50; // Smaller batches to avoid timeouts
    let successCount = 0;

    for (let i = 0; i < missingFeatures.length; i += BATCH_SIZE) {
      const batch = missingFeatures.slice(i, i + BATCH_SIZE);
      
      try {
        const { error } = await supabase.from('app_features').upsert(batch, { onConflict: 'app_id' });
        
        if (error) {
          console.error(`❌ Error uploading batch ${i / BATCH_SIZE + 1}:`, error.message);
        } else {
          console.log(`✅ Uploaded batch ${i / BATCH_SIZE + 1} of ${Math.ceil(missingFeatures.length / BATCH_SIZE)} (${batch.length} features)`);
          successCount += batch.length;
        }
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (err) {
        console.error(`❌ Network error uploading batch ${i / BATCH_SIZE + 1}:`, err.message);
      }
    }

    // 6. Final verification
    const { count: finalCount, error: countError } = await supabase.from('app_features').select('*', { count: 'exact', head: true });
    if (countError) throw countError;

    console.log('\\n🎉 RETRY COMPLETE!');
    console.log('==================');
    console.log(`Previous count: 6086`);
    console.log(`Missing features found: ${missingFeatures.length}`);
    console.log(`Successfully uploaded: ${successCount}`);
    console.log(`New total count: ${finalCount}`);
    console.log(`Target was: ${allFeatures.size}`);

  } catch (err) {
    console.error('❌ Error during retry:', err);
  }
}

retryFailedFeatures();