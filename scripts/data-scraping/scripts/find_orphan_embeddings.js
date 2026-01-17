const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Helper function to fetch all values from a column
async function fetchAllColumnValues(tableName, columnName) {
  const BATCH_SIZE = 1000;
  let allValues = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select(columnName)
      .range(from, from + BATCH_SIZE - 1);

    if (error) throw error;
    if (data) allValues = allValues.concat(data.map(row => row[columnName]));
    if (!data || data.length < BATCH_SIZE) break;

    from += BATCH_SIZE;
  }
  return allValues;
}

async function findAndFixOrphanEmbeddings() {
  console.log('🚀 Starting to find and fix orphan embeddings...');
  try {
    // 1. Delete embeddings with null app_id
    console.log('Deleting embeddings with null app_id...');
    const { count, error: deleteNullError } = await supabase
      .from('app_embeddings')
      .delete({ count: 'exact' })
      .is('app_id', null);

    if (deleteNullError) {
      console.error('\n❌ Error deleting embeddings with null app_id:', deleteNullError.message);
    } else {
      console.log(`✅ Successfully deleted ${count} embeddings with null app_id.`);
    }

    // 2. Get all app IDs from apps_unified
    console.log('Fetching all app IDs from apps_unified...');
    const unifiedIds = new Set(await fetchAllColumnValues('apps_unified', 'id'));
    console.log(`  Found ${unifiedIds.size} unique apps in apps_unified.`);

    // 3. Get all app_ids from app_embeddings
    console.log('Fetching all app_ids from app_embeddings...');
    const embeddingAppIds = await fetchAllColumnValues('app_embeddings', 'app_id');
    console.log(`  Found ${embeddingAppIds.length} embeddings.`);

    // 4. Find orphan app_ids
    const orphanAppIds = embeddingAppIds
      .filter(appId => appId !== null) // Should not be necessary after deleting nulls, but good practice
      .filter(appId => !unifiedIds.has(appId));

    if (orphanAppIds.length === 0) {
      console.log('\n✅ No orphan embeddings found. All embeddings are linked to a valid app.');
      return;
    }

    console.log(`\n🔴 Found ${orphanAppIds.length} orphan embeddings. Preparing to delete...`);

    // 5. Delete the orphan embeddings
    const { count: deleteOrphanCount, error: deleteOrphanError } = await supabase
      .from('app_embeddings')
      .delete({ count: 'exact' })
      .in('app_id', orphanAppIds);

    if (deleteOrphanError) {
      console.error('\n❌ Error deleting orphan embeddings:', deleteOrphanError.message);
      return;
    }

    console.log(`\n✅ Successfully deleted ${deleteOrphanCount} orphan embeddings.`);

  } catch (err) {
    console.error('\n❌ An error occurred during the process:', err);
  }
}

findAndFixOrphanEmbeddings();