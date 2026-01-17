
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

async function fetchAllRecords(tableName, select = '*') {
    const BATCH_SIZE = 1000;
    let allRecords = [];
    let from = 0;
  
    while (true) {
      const { data, error } = await supabase
        .from(tableName)
        .select(select)
        .range(from, from + BATCH_SIZE - 1);
  
      if (error) throw error;
      if (data) allRecords = allRecords.concat(data);
      if (!data || data.length < BATCH_SIZE) break;
  
      from += BATCH_SIZE;
    }
    return allRecords;
}

async function debugFeatureUpload() {
  console.log('🚀 Starting feature upload debug process...');

  try {
    // 1. Consolidate all feature bundle_ids
    console.log('Consolidating bundle_ids from all feature files...');
    const featureBundleIds = new Set();

    const processFiles = (files) => {
      for (const file of files) {
        const content = JSON.parse(fs.readFileSync(file, 'utf-8'));
        const results = content.results || content.all_hybrid_results || [];
        for (const result of results) {
          if (result.app_id) {
            featureBundleIds.add(result.app_id);
          }
        }
      }
    };

    processFiles(glob.sync(`${FEATURES_DIR}/full-extraction-archive/batch-*.json`));
    processFiles(glob.sync(`${FEATURES_DIR}/optimized-extraction/batch-*.json`));
    const hybridFinalFile = `${FEATURES_DIR}/hybrid-extraction/final-hybrid-results.json`;
    if (fs.existsSync(hybridFinalFile)) {
        processFiles([hybridFinalFile]);
    }

    console.log(`  Found ${featureBundleIds.size} unique bundle_ids in feature files.`);

    // 2. Fetch all bundle_ids from apps_unified
    console.log('Fetching all bundle_ids from apps_unified...');
    const unifiedApps = await fetchAllRecords('apps_unified', 'bundle_id');
    const unifiedBundleIds = new Set(unifiedApps.map(app => app.bundle_id));
    console.log(`  Found ${unifiedBundleIds.size} unique bundle_ids in apps_unified.`);

    // 3. Find the difference
    const missingInUnified = [...featureBundleIds].filter(id => !unifiedBundleIds.has(id));
    
    console.log('\n--- Debug Results ---');
    console.log(`Total bundle_ids in feature files: ${featureBundleIds.size}`);
    console.log(`Total bundle_ids in apps_unified:  ${unifiedBundleIds.size}`);
    console.log(`Difference (in features but not DB): ${missingInUnified.length}`);
    console.log('---------------------\n');

    if (missingInUnified.length > 0) {
      console.log('Examples of bundle_ids found in feature files but NOT in the apps_unified table:');
      missingInUnified.slice(0, 20).forEach(id => console.log(`  - ${id}`))
    }

  } catch (err) {
    console.error('\n❌ An error occurred during the debug process:', err);
  }
}

debugFeatureUpload();
