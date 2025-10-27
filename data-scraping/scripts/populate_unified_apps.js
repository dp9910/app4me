const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Helper function to fetch all records from a table with pagination
async function fetchAllRecords(tableName) {
  const BATCH_SIZE = 1000;
  let allRecords = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
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
    icon_url: app.icon_url,
    icon_url_hd: app.icon_url, // Use same URL for HD
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
    icon_url: app.icon_url,
    icon_url_hd: app.icon_url_512 || app.icon_url, // Prefer 512px for HD
  };
}

// Merge logic for apps found in both sources
function mergeApps(existingApp, newApp) {
  const merged = { ...existingApp };

  // Merge descriptions (take the longest)
  if ((newApp.description || '').length > (existingApp.description || '').length) {
    merged.description = newApp.description;
    merged.description_source = newApp.description_source;
  }

  // Merge ratings (take the one with more reviews)
  if ((newApp.rating_count || 0) > (existingApp.rating_count || 0)) {
    merged.rating = newApp.rating;
    merged.rating_count = newApp.rating_count;
    merged.rating_source = newApp.rating_source;
  }

  // Merge categories (combine unique)
  merged.all_categories = [...new Set([...existingApp.all_categories, ...newApp.all_categories])];
  merged.primary_category = merged.all_categories[0]; // Simple strategy: take the first

  // Combine sources
  merged.available_in_sources = [...new Set([...existingApp.available_in_sources, ...newApp.available_in_sources])];

  // Take non-null values for version and price
  merged.version = existingApp.version || newApp.version;
  merged.price = existingApp.price !== null ? existingApp.price : newApp.price;

  // Merge icon URLs (prefer higher quality when available)
  merged.icon_url = existingApp.icon_url || newApp.icon_url;
  merged.icon_url_hd = existingApp.icon_url_hd || newApp.icon_url_hd;

  return merged;
}

async function populateUnifiedApps() {
  console.log('🚀 Starting real data unification process...');

  try {
    // 1. Fetch all data
    console.log('Fetching all data from itunes_apps...');
    const itunesApps = await fetchAllRecords('itunes_apps');
    console.log(`  Found ${itunesApps.length} apps in itunes_apps.`);

    console.log('Fetching all data from serp_unique_clean...');
    const serpApps = await fetchAllRecords('serp_unique_clean');
    console.log(`  Found ${serpApps.length} apps in serp_unique_clean.`);

    // 2. Unify data
    const unifiedApps = new Map();

    console.log('Processing iTunes apps...');
    for (const app of itunesApps) {
      if (app.bundle_id) {
        unifiedApps.set(app.bundle_id, mapItunesApp(app));
      }
    }

    console.log('Processing and merging SERP apps...');
    for (const app of serpApps) {
      if (app.bundle_id) {
        const standardApp = mapSerpApp(app);
        if (unifiedApps.has(app.bundle_id)) {
          const existingApp = unifiedApps.get(app.bundle_id);
          const mergedApp = mergeApps(existingApp, standardApp);
          unifiedApps.set(app.bundle_id, mergedApp);
        } else {
          unifiedApps.set(app.bundle_id, standardApp);
        }
      }
    }

    const unifiedAppsArray = Array.from(unifiedApps.values());
    console.log(`  Total unique apps to insert: ${unifiedAppsArray.length}`);

    // 3. Clear and insert into apps_unified
    console.log('Clearing apps_unified table...');
    const { error: deleteError } = await supabase.from('apps_unified').delete().neq('id', 0);
    if (deleteError) throw deleteError;

    console.log('Inserting unified data in batches...');
    const BATCH_SIZE = 100;
    for (let i = 0; i < unifiedAppsArray.length; i += BATCH_SIZE) {
      const batch = unifiedAppsArray.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await supabase.from('apps_unified').insert(batch);
      if (insertError) {
        console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, insertError.message);
      } else {
        console.log(`  Inserted batch ${i / BATCH_SIZE + 1} of ${Math.ceil(unifiedAppsArray.length / BATCH_SIZE)}`);
      }
    }

    console.log('\n✅ Data unification complete!');

  } catch (err) {
    console.error('\n❌ An error occurred during the unification process:', err);
  }
}

populateUnifiedApps();