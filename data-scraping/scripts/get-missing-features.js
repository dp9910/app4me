const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function getMissingFeatures() {
  console.log('🚀 Starting to find missing features...');

  try {
    // 1. Read the feature files
    console.log('Reading feature files...');
    const serpFeatures = JSON.parse(fs.readFileSync('data-scraping/features-output/serp-features.json', 'utf-8'));
    const itunesFeatures = JSON.parse(fs.readFileSync('data-scraping/features-output/itunes-features.json', 'utf-8'));

    // 2. Combine features
    console.log('Combining features...');
    const allFeatures = new Map();

    for (const [app_id, features] of Object.entries(serpFeatures)) {
      allFeatures.set(app_id, features);
    }

    for (const [app_id, features] of Object.entries(itunesFeatures)) {
      allFeatures.set(app_id, features);
    }

    console.log(`Found ${allFeatures.size} unique apps with features.`);

    // 3. Fetch all app IDs from apps_unified
    console.log('Fetching app IDs from apps_unified...');
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

    // 4. Find missing features
    console.log('Finding missing features...');
    const missingAppIds = [];
    for (const [bundle_id, app_id] of appIdMap.entries()) {
      if (!allFeatures.has(bundle_id)) {
        missingAppIds.push(app_id);
      }
    }

    console.log(`  Found ${missingAppIds.length} apps with missing features.`);

    // 5. Save the list of missing app_ids to a file
    const outputPath = 'data-scraping/features-output/missing-features.json';
    fs.writeFileSync(outputPath, JSON.stringify(missingAppIds, null, 2));
    console.log(`✅ Missing features saved to ${outputPath}`);

  } catch (err) {
    console.error('An error occurred during the process:', err);
  }
}

getMissingFeatures();