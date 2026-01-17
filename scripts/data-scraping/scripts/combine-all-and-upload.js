
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function combineAndUpload() {
  console.log('🚀 Starting feature combination and upload process...');

  try {
    // 1. Read the feature files
    console.log('Reading feature files...');
    const serpFeatures = JSON.parse(fs.readFileSync('data-scraping/features-output/serp-features.json', 'utf-8'));
    const itunesFeatures = JSON.parse(fs.readFileSync('data-scraping/features-output/itunes-features.json', 'utf-8'));
    const generatedFeatures = fs.readFileSync('data-scraping/features-output/generated-features.jsonl', 'utf-8').split('\n').filter(Boolean).map(line => JSON.parse(line));

    // 2. Combine features
    console.log('Combining features...');
    const allFeatures = new Map();

    for (const [app_id, features] of Object.entries(serpFeatures)) {
      allFeatures.set(app_id, features);
    }

    for (const [app_id, features] of Object.entries(itunesFeatures)) {
      allFeatures.set(app_id, features);
    }

    for (const { app_id, features } of generatedFeatures) {
      allFeatures.set(app_id.toString(), features);
    }

    console.log(`\n📊 Found ${allFeatures.size} unique apps with features.`);

    // 3. Fetch all app IDs from apps_unified
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

    // 4. Prepare data for upload with better matching
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

    // 5. Upload to Supabase in batches
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

    // 6. Verify upload
    const { count: finalCount, error: countError } = await supabase.from('app_features').select('*', { count: 'exact', head: true });
    if (countError) throw countError;

    console.log('\n🎉 UPLOAD COMPLETE!');
    console.log('================');
    console.log(`Total features processed: ${allFeatures.size}`);
    console.log(`Features uploaded: ${finalCount}`);
    console.log(`Successful batches: ${successCount}`);
    console.log(`Failed batches: ${errorCount}`);

  } catch (err) {
    console.error('\n❌ An error occurred during the feature upload process:', err);
  }
}

combineAndUpload();
