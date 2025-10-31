
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const glob = require('glob');

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function uploadAllFeaturesSafe() {
  console.log('🚀 Starting comprehensive and safe feature upload process...');

  try {
    // 1. Consolidate all features from ALL sources
    console.log('Consolidating features from all sources...');
    const allFeatures = new Map();

    const processFiles = (files, label) => {
      console.log(`\n${label}:`);
      let totalApps = 0;
      for (const file of files) {
        try {
          const content = JSON.parse(fs.readFileSync(file, 'utf-8'));
          const results = content.results || content.all_hybrid_results || content.all_serp_results || [];
          totalApps += results.length;
          
          for (const result of results) {
            if (result.app_id && result.features) {
              allFeatures.set(result.app_id, {
                ...result.features,
                source_file: path.basename(file)
              });
            }
          }
        } catch (err) {
          console.log(`  Error reading ${file}: ${err.message}`);
        }
      }
      console.log(`  Processed ${files.length} files, ${totalApps} total apps`);
    };

    // Process all extraction sources
    processFiles(glob.sync('data-scraping/features-output/full-extraction-archive/batch-*.json'), 'Full extraction archive');
    processFiles(glob.sync('data-scraping/features-output/optimized-extraction/batch-*.json'), 'Optimized extraction');
    processFiles(glob.sync('data-scraping/features-output/hybrid-extraction/batch-*.json'), 'Hybrid extraction batches');
    processFiles(glob.sync('data-scraping/features-output/serp-deepseek-extraction/serp-batch-*.json'), 'SERP extraction batches');


    // Process final consolidated files
    const hybridFinalFile = 'data-scraping/features-output/hybrid-extraction/final-hybrid-results.json';
    if (fs.existsSync(hybridFinalFile)) {
      processFiles([hybridFinalFile], 'Hybrid final results');
    }

    // Process SERP extraction data  
    const serpFinalFile = 'data-scraping/features-output/serp-deepseek-extraction/final-serp-deepseek-results.json';
    if (fs.existsSync(serpFinalFile)) {
      processFiles([serpFinalFile], 'SERP final results');
    }

    console.log(`\n📊 Found ${allFeatures.size} unique apps with features.`);

    // 2. Fetch all app IDs from apps_unified
    console.log('\nFetching app IDs from apps_unified...');
    let allApps = [];
    let from = 0;
    const batchSize = 1000;
    
    while (true) {
      const { data: apps, error: appsError } = await supabase
        .from('apps_unified')
        .select('id, bundle_id')
        .range(from, from + batchSize - 1);
      
      if (appsError) throw appsError;
      
      if (!apps || apps.length === 0) break;
      
      allApps = allApps.concat(apps);
      from += batchSize;
      
      console.log(`  Fetched ${allApps.length} apps so far...`);
      
      if (apps.length < batchSize) break;
    }

    const appIdMap = new Map(allApps.map(app => [app.bundle_id, app.id]));
    console.log(`Found ${allApps.length} apps in database`);

    // 3. Prepare data for upload with better matching
    console.log('\nMatching features with database apps...');
    const featuresToUpload = [];
    const unmatchedFeatures = [];
    
    for (const [bundle_id, features] of allFeatures.entries()) {
      if (appIdMap.has(bundle_id)) {
        featuresToUpload.push({
          app_id: appIdMap.get(bundle_id),
          keywords_tfidf: features.keywords_tfidf || {},
          primary_use_case: features.llm_features?.primary_use || features.primary_use || null,
          target_user: features.llm_features?.target_user || features.target_user || null,
          key_benefit: features.llm_features?.key_benefit || features.key_benefit || null,
          complexity: features.llm_features?.complexity || features.complexity || null,
          category_classification: features.category_classification || {},
          quality_signals: features.quality_signals || {},
          api_used: features.llm_features?.api_used || features.api_used || null,
          processing_time_ms: features.processing_time_ms || null,
        });
      } else {
        unmatchedFeatures.push(bundle_id);
      }
    }

    console.log(`  ✅ Matched: ${featuresToUpload.length} apps`);
    console.log(`  ❌ Unmatched: ${unmatchedFeatures.length} apps`);
    
    if (unmatchedFeatures.length > 0) {
      console.log('\nFirst 10 unmatched bundle_ids:');
      unmatchedFeatures.slice(0, 10).forEach(id => console.log(`  ${id}`));
    }

    // 4. Upload to Supabase in batches
    console.log('\nUploading features to app_features table...');
    const BATCH_SIZE = 100;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < featuresToUpload.length; i += BATCH_SIZE) {
      const batch = featuresToUpload.slice(i, i + BATCH_SIZE);
      const { error: upsertError } = await supabase.from('app_features').upsert(batch, { onConflict: 'app_id' });

      if (upsertError) {
        console.error(`  ❌ Error uploading batch ${i / BATCH_SIZE + 1}:`, upsertError.message);
        errorCount++;
      } else {
        console.log(`  ✅ Uploaded batch ${i / BATCH_SIZE + 1} of ${Math.ceil(featuresToUpload.length / BATCH_SIZE)}`);
        successCount++;
      }
    }

    // 5. Verify upload
    const { count: finalCount, error: countError } = await supabase.from('app_features').select('*', { count: 'exact', head: true });
    if (countError) throw countError;

    console.log('\n🎉 UPLOAD COMPLETE!');
    console.log('================');
    console.log(`Total features processed: ${allFeatures.size}`);
    console.log(`Features uploaded: ${finalCount}`);
    console.log(`Success rate: ${((finalCount / allFeatures.size) * 100).toFixed(1)}%`);
    console.log(`Successful batches: ${successCount}`);
    console.log(`Failed batches: ${errorCount}`);

  } catch (err) {
    console.error('\n❌ An error occurred during the feature upload process:', err);
  }
}

uploadAllFeaturesSafe();
