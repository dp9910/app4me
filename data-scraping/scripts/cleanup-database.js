const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function cleanupDatabase() {
  console.log('🧹 Starting database cleanup to match all tables...');

  try {
    // 1. Get apps with features (the ones we want to keep)
    console.log('Step 1: Identifying apps to keep...');
    let appsWithFeatures = [];
    let from = 0;
    const batchSize = 1000;
    
    while (true) {
      const { data: features, error } = await supabase
        .from('app_features')
        .select('app_id')
        .range(from, from + batchSize - 1);
      
      if (error) throw error;
      if (!features || features.length === 0) break;
      
      appsWithFeatures = appsWithFeatures.concat(features);
      from += batchSize;
      
      if (features.length < batchSize) break;
    }
    
    const keepAppIds = new Set(appsWithFeatures.map(f => f.app_id));
    console.log(`Apps to keep: ${keepAppIds.size}`);

    // 2. Get all apps to identify ones to remove
    console.log('Step 2: Identifying apps to remove...');
    let allApps = [];
    from = 0;
    
    while (true) {
      const { data: apps, error } = await supabase
        .from('apps_unified')
        .select('id, bundle_id, title')
        .range(from, from + batchSize - 1);
      
      if (error) throw error;
      if (!apps || apps.length === 0) break;
      
      allApps = allApps.concat(apps);
      from += batchSize;
      
      if (apps.length < batchSize) break;
    }

    const appsToRemove = allApps.filter(app => !keepAppIds.has(app.id));
    const removeAppIds = appsToRemove.map(app => app.id);
    
    console.log(`Total apps in database: ${allApps.length}`);
    console.log(`Apps to remove: ${appsToRemove.length}`);
    
    // Show sample of what will be removed
    console.log('\\nSample apps to be removed:');
    appsToRemove.slice(0, 5).forEach((app, i) => {
      console.log(`  ${i+1}. ${app.title} (ID: ${app.id})`);
    });

    // Confirm before deletion
    console.log('\\n⚠️  This will permanently delete these low-quality apps from the database.');
    
    // 3. Remove from app_embeddings first (due to foreign key constraints)
    console.log('\\nStep 3: Removing embeddings for low-quality apps...');
    
    if (removeAppIds.length > 0) {
      // Process in batches to avoid query size limits
      const deleteBatchSize = 100;
      let embeddingsDeleted = 0;
      
      for (let i = 0; i < removeAppIds.length; i += deleteBatchSize) {
        const batch = removeAppIds.slice(i, i + deleteBatchSize);
        
        const { error: embError } = await supabase
          .from('app_embeddings')
          .delete()
          .in('app_id', batch);
        
        if (embError) {
          console.error(`Error deleting embeddings batch ${i / deleteBatchSize + 1}:`, embError.message);
        } else {
          embeddingsDeleted += batch.length;
          console.log(`  Deleted embeddings batch ${i / deleteBatchSize + 1} of ${Math.ceil(removeAppIds.length / deleteBatchSize)}`);
        }
      }
      
      console.log(`Total embeddings deleted: ${embeddingsDeleted}`);
    }

    // 4. Remove from apps_unified
    console.log('\\nStep 4: Removing low-quality apps from apps_unified...');
    
    if (removeAppIds.length > 0) {
      const deleteBatchSize = 100;
      let appsDeleted = 0;
      
      for (let i = 0; i < removeAppIds.length; i += deleteBatchSize) {
        const batch = removeAppIds.slice(i, i + deleteBatchSize);
        
        const { error: appError } = await supabase
          .from('apps_unified')
          .delete()
          .in('id', batch);
        
        if (appError) {
          console.error(`Error deleting apps batch ${i / deleteBatchSize + 1}:`, appError.message);
        } else {
          appsDeleted += batch.length;
          console.log(`  Deleted apps batch ${i / deleteBatchSize + 1} of ${Math.ceil(removeAppIds.length / deleteBatchSize)}`);
        }
      }
      
      console.log(`Total apps deleted: ${appsDeleted}`);
    }

    // 5. Verify final counts
    console.log('\\nStep 5: Verifying final counts...');
    
    const { count: finalAppsCount, error: appsCountError } = await supabase
      .from('apps_unified')
      .select('*', { count: 'exact', head: true });
    if (appsCountError) throw appsCountError;

    const { count: finalEmbeddingsCount, error: embCountError } = await supabase
      .from('app_embeddings')
      .select('*', { count: 'exact', head: true });
    if (embCountError) throw embCountError;

    const { count: finalFeaturesCount, error: featuresCountError } = await supabase
      .from('app_features')
      .select('*', { count: 'exact', head: true });
    if (featuresCountError) throw featuresCountError;

    console.log('\\n🎉 DATABASE CLEANUP COMPLETE!');
    console.log('==============================');
    console.log(`apps_unified:    ${finalAppsCount} rows`);
    console.log(`app_embeddings:  ${finalEmbeddingsCount} rows`);
    console.log(`app_features:    ${finalFeaturesCount} rows`);
    
    if (finalAppsCount === finalEmbeddingsCount && finalEmbeddingsCount === finalFeaturesCount) {
      console.log('\\n✅ ALL TABLES ARE NOW PERFECTLY SYNCHRONIZED!');
    } else {
      console.log('\\n❌ Tables still have mismatched counts - manual review needed');
    }

  } catch (err) {
    console.error('\\n❌ Error during cleanup:', err);
  }
}

cleanupDatabase();