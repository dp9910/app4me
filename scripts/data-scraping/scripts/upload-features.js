
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

const FEATURES_DIR = 'data-scraping/features-output';

async function uploadFeatures() {
  console.log('🚀 Starting feature upload process...');

  try {
    // 1. Consolidate all features
    console.log('Consolidating features from all sources...');
    const allFeatures = new Map();

    const processFiles = (files) => {
      for (const file of files) {
        const content = JSON.parse(fs.readFileSync(file, 'utf-8'));
        const results = content.results || content.all_hybrid_results || [];
        for (const result of results) {
          if (result.app_id) {
            allFeatures.set(result.app_id, result.features);
          }
        }
      }
    };

    // Process in order of priority (newest last)
    processFiles(glob.sync(`${FEATURES_DIR}/full-extraction-archive/batch-*.json`));
    processFiles(glob.sync(`${FEATURES_DIR}/optimized-extraction/batch-*.json`));
    // For hybrid, the final file is the most important
    const hybridFinalFile = `${FEATURES_DIR}/hybrid-extraction/final-hybrid-results.json`;
    if (fs.existsSync(hybridFinalFile)) {
        processFiles([hybridFinalFile]);
    }

    console.log(`  Found ${allFeatures.size} unique apps with features.`);

    // 2. Fetch all app IDs from apps_unified
    console.log('Fetching app IDs from apps_unified...');
    const { data: apps, error: appsError } = await supabase.from('apps_unified').select('id, bundle_id');
    if (appsError) throw appsError;

    const appIdMap = new Map(apps.map(app => [app.bundle_id, app.id]));

    // 3. Prepare data for upload
    const featuresToUpload = [];
    for (const [bundle_id, features] of allFeatures.entries()) {
      if (appIdMap.has(bundle_id)) {
        featuresToUpload.push({
          app_id: appIdMap.get(bundle_id),
          keywords_tfidf: features.keywords_tfidf,
          primary_use_case: features.llm_features.primary_use,
          target_user: features.llm_features.target_user,
          key_benefit: features.llm_features.key_benefit,
          complexity: features.llm_features.complexity,
          category_classification: features.category_classification,
          quality_signals: features.quality_signals,
          api_used: features.llm_features.api_used,
          processing_time_ms: features.processing_time_ms,
        });
      }
    }

    console.log(`  Prepared ${featuresToUpload.length} feature sets for upload.`);

    // 4. Upload to Supabase in batches
    console.log('Uploading features to app_features table...');
    const BATCH_SIZE = 100;
    for (let i = 0; i < featuresToUpload.length; i += BATCH_SIZE) {
      const batch = featuresToUpload.slice(i, i + BATCH_SIZE);
      const { error: upsertError } = await supabase.from('app_features').upsert(batch, { onConflict: 'app_id' });

      if (upsertError) {
        console.error(`Error uploading batch ${i / BATCH_SIZE + 1}:`, upsertError.message);
      } else {
        console.log(`  Uploaded batch ${i / BATCH_SIZE + 1} of ${Math.ceil(featuresToUpload.length / BATCH_SIZE)}`);
      }
    }

    console.log('\n✅ Feature upload complete!');

  } catch (err) {
    console.error('\n❌ An error occurred during the feature upload process:', err);
  }
}

uploadFeatures();
