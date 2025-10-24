
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Helper function to fetch all records from a table with pagination
async function fetchAllRecords(tableName, select = '*') {
  const BATCH_SIZE = 1000;
  let allRecords = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select(select)
      .range(from, from + BATCH_SIZE - 1);

    if (error) {
      throw error;
    }

    if (data) {
      allRecords = allRecords.concat(data);
    }

    if (!data || data.length < BATCH_SIZE) {
      break;
    }

    from += BATCH_SIZE;
  }

  return allRecords;
}

// --- Re-using the mappers and merge logic from the previous script ---

// Mapper for itunes_apps table
function mapItunesApp(app) {
  return {
    bundle_id: app.bundle_id,
    title: app.title,
    developer: app.developer,
    version: app.version,
    price: app.price,
    rating: app.rating,
    rating_count: app.rating_count,
    description: app.description,
    primary_category: app.category,
    all_categories: [app.category],
    available_in_sources: ['itunes'],
    rating_source: 'itunes',
    description_source: 'itunes',
  };
}

// Mapper for serp_unique_clean table
function mapSerpApp(app) {
  return {
    bundle_id: app.bundle_id,
    title: app.title,
    developer: app.developer,
    version: null, // Not available in this source
    price: null, // Not available in this source
    rating: app.rating,
    rating_count: app.rating_count,
    description: app.description,
    primary_category: app.category,
    all_categories: [app.category],
    available_in_sources: ['serp'],
    rating_source: 'serp',
    description_source: 'serp',
  };
}

// Merge logic for apps found in both sources
function mergeApps(existingApp, newApp) {
  const merged = { ...existingApp };
  if ((newApp.description || '').length > (existingApp.description || '').length) {
    merged.description = newApp.description;
    merged.description_source = newApp.description_source;
  }
  if ((newApp.rating_count || 0) > (existingApp.rating_count || 0)) {
    merged.rating = newApp.rating;
    merged.rating_count = newApp.rating_count;
    merged.rating_source = newApp.rating_source;
  }
  merged.all_categories = [...new Set([...existingApp.all_categories, ...newApp.all_categories])];
  merged.primary_category = merged.all_categories[0];
  merged.available_in_sources = [...new Set([...existingApp.available_in_sources, ...newApp.available_in_sources])];
  merged.version = existingApp.version || newApp.version;
  merged.price = existingApp.price !== null ? existingApp.price : newApp.price;
  return merged;
}


async function verifyAndRepair() {
  console.log('🚀 Starting verification and repair process...');

  try {
    // 1. Get all source bundle_ids
    console.log('Fetching all source bundle_ids...');
    const itunesBundleIds = (await fetchAllRecords('itunes_apps', 'bundle_id')).map(r => r.bundle_id);
    const serpBundleIds = (await fetchAllRecords('serp_unique_clean', 'bundle_id')).map(r => r.bundle_id);
    const sourceBundleIds = new Set([...itunesBundleIds, ...serpBundleIds]);
    console.log(`  Found ${sourceBundleIds.size} unique bundle_ids in source tables.`);

    // 2. Get all destination bundle_ids
    console.log('Fetching all destination bundle_ids from apps_unified...');
    const unifiedBundleIds = new Set((await fetchAllRecords('apps_unified', 'bundle_id')).map(r => r.bundle_id));
    console.log(`  Found ${unifiedBundleIds.size} bundle_ids in apps_unified.`);

    // 3. Find missing bundle_ids
    const missingBundleIds = [...sourceBundleIds].filter(id => !unifiedBundleIds.has(id));
    console.log(`  Found ${missingBundleIds.length} missing apps.`);

    if (missingBundleIds.length === 0) {
      console.log('\n✅ No missing apps found. The apps_unified table is complete!');
      return;
    }

    // 4. Fetch full data for missing apps
    console.log('Fetching full data for missing apps...');
    const { data: missingItunes, error: miError } = await supabase.from('itunes_apps').select('*').in('bundle_id', missingBundleIds);
    if (miError) throw miError;

    const { data: missingSerp, error: msError } = await supabase.from('serp_unique_clean').select('*').in('bundle_id', missingBundleIds);
    if (msError) throw msError;

    // 5. Unify the missing apps
    const unifiedMissingApps = new Map();
    for (const app of missingItunes) {
        if (app.bundle_id) unifiedMissingApps.set(app.bundle_id, mapItunesApp(app));
    }
    for (const app of missingSerp) {
        if (app.bundle_id) {
            const standardApp = mapSerpApp(app);
            if (unifiedMissingApps.has(app.bundle_id)) {
                const mergedApp = mergeApps(unifiedMissingApps.get(app.bundle_id), standardApp);
                unifiedMissingApps.set(app.bundle_id, mergedApp);
            } else {
                unifiedMissingApps.set(app.bundle_id, standardApp);
            }
        }
    }

    const appsToInsert = Array.from(unifiedMissingApps.values());
    console.log(`  Unified ${appsToInsert.length} missing apps.`);

    // 6. Insert missing apps
    console.log('Inserting missing apps in smaller batches...');
    const BATCH_SIZE = 50;
    for (let i = 0; i < appsToInsert.length; i += BATCH_SIZE) {
      const batch = appsToInsert.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await supabase.from('apps_unified').insert(batch);
      if (insertError) {
        console.error(`Error inserting repair batch ${i / BATCH_SIZE + 1}:`, insertError.message);
      } else {
        console.log(`  Inserted repair batch ${i / BATCH_SIZE + 1} of ${Math.ceil(appsToInsert.length / BATCH_SIZE)}`);
      }
    }

    console.log('\n✅ Repair process complete!');

  } catch (err) {
    console.error('\n❌ An error occurred during the repair process:', err);
  }
}

verifyAndRepair();
