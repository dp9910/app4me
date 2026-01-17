const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function investigateFeatureDiscrepancy() {
  console.log('🔍 Investigating app_features vs apps_unified discrepancy...\n');
  
  // Get exact counts
  const { count: unifiedCount } = await supabase
    .from('apps_unified')
    .select('*', { count: 'exact', head: true });

  const { count: featuresCount } = await supabase
    .from('app_features')
    .select('*', { count: 'exact', head: true });

  console.log('📊 EXACT COUNTS:');
  console.log('apps_unified:', unifiedCount);
  console.log('app_features:', featuresCount);
  console.log('Difference:', featuresCount - unifiedCount);
  console.log();

  // Get all app_ids from both tables with pagination
  async function getAllData(table, selectFields) {
    let allData = [];
    let start = 0;
    const batchSize = 1000;
    
    while (true) {
      const { data, error } = await supabase
        .from(table)
        .select(selectFields)
        .range(start, start + batchSize - 1);

      if (error) throw error;
      
      if (data.length === 0) break;
      allData = [...allData, ...data];
      start += batchSize;
      
      if (data.length < batchSize) break;
    }
    
    return allData;
  }

  console.log('📋 Fetching all app IDs from apps_unified...');
  const unifiedApps = await getAllData('apps_unified', 'id');
  
  console.log('🔧 Fetching all app IDs from app_features...');
  const featureApps = await getAllData('app_features', 'app_id');

  console.log();
  console.log('📊 ACTUAL DATA COUNTS:');
  console.log('apps_unified IDs:', unifiedApps.length);
  console.log('app_features app_ids:', featureApps.length);
  console.log();

  // Check for duplicates in app_features
  const featureAppIds = featureApps.map(f => f.app_id);
  const uniqueFeatureIds = [...new Set(featureAppIds)];
  const duplicates = featureAppIds.length - uniqueFeatureIds.length;

  console.log('🔍 DUPLICATE ANALYSIS:');
  console.log('Total app_features records:', featureAppIds.length);
  console.log('Unique app_ids in app_features:', uniqueFeatureIds.length);
  console.log('Duplicate records:', duplicates);
  console.log();

  if (duplicates > 0) {
    console.log('❌ FOUND DUPLICATES! Finding which app_ids are duplicated...');
    const idCounts = {};
    featureAppIds.forEach(id => {
      idCounts[id] = (idCounts[id] || 0) + 1;
    });
    
    const duplicatedIds = Object.entries(idCounts)
      .filter(([id, count]) => count > 1)
      .sort((a, b) => b[1] - a[1]);

    console.log('Top 10 duplicated app_ids:');
    duplicatedIds.slice(0, 10).forEach(([id, count]) => {
      console.log(`  App ID ${id} - appears ${count} times`);
    });
    console.log();

    // Show details for most duplicated app
    if (duplicatedIds.length > 0) {
      const mostDuplicatedId = duplicatedIds[0][0];
      console.log(`🔍 Details for most duplicated app (ID: ${mostDuplicatedId}):`);
      
      const { data: duplicateRecords } = await supabase
        .from('app_features')
        .select('*')
        .eq('app_id', mostDuplicatedId);

      duplicateRecords.forEach((record, index) => {
        console.log(`  Record ${index + 1}: Created ${record.created_at}, API: ${record.api_used}`);
      });
      console.log();
    }
  }

  // Check for orphaned features (app_ids not in apps_unified)
  const unifiedIdSet = new Set(unifiedApps.map(app => app.id));
  const orphanedFeatures = uniqueFeatureIds.filter(id => !unifiedIdSet.has(id));

  console.log('🔍 ORPHANED FEATURES ANALYSIS:');
  console.log('Features with app_ids not in apps_unified:', orphanedFeatures.length);
  
  if (orphanedFeatures.length > 0) {
    console.log('Sample orphaned app_ids:', orphanedFeatures.slice(0, 10));
    
    // Get ID ranges
    const orphanedSorted = orphanedFeatures.sort((a, b) => a - b);
    console.log('Orphaned ID range:', orphanedSorted[0], 'to', orphanedSorted[orphanedSorted.length - 1]);

    // Try to find these apps in the database to see if they exist elsewhere
    console.log('\n🔍 Checking if orphaned IDs exist in apps_unified...');
    const sampleOrphaned = orphanedFeatures.slice(0, 5);
    for (const id of sampleOrphaned) {
      const { data: appData } = await supabase
        .from('apps_unified')
        .select('id, title')
        .eq('id', id);
      
      if (appData && appData.length > 0) {
        console.log(`  ID ${id}: Found - ${appData[0].title}`);
      } else {
        console.log(`  ID ${id}: NOT FOUND in apps_unified`);
      }
    }
  }

  // Check apps_unified ID range
  const unifiedIds = unifiedApps.map(app => app.id).sort((a, b) => a - b);
  console.log('\n📊 ID RANGES:');
  console.log('apps_unified ID range:', unifiedIds[0], 'to', unifiedIds[unifiedIds.length - 1]);
  
  if (orphanedFeatures.length > 0) {
    const orphanedSorted = orphanedFeatures.sort((a, b) => a - b);
    console.log('Orphaned features ID range:', orphanedSorted[0], 'to', orphanedSorted[orphanedSorted.length - 1]);
  }

  // Summary and recommendations
  console.log('\n🎯 SUMMARY:');
  if (duplicates > 0) {
    console.log(`❌ Found ${duplicates} duplicate records in app_features`);
  }
  if (orphanedFeatures.length > 0) {
    console.log(`❌ Found ${orphanedFeatures.length} orphaned features (no corresponding app in apps_unified)`);
  }
  
  console.log('\n💡 RECOMMENDATIONS:');
  if (duplicates > 0) {
    console.log('1. Remove duplicate records from app_features table');
    console.log('2. Add unique constraint on app_id column to prevent future duplicates');
  }
  if (orphanedFeatures.length > 0) {
    console.log('3. Remove orphaned features that reference non-existent apps');
    console.log('4. Add foreign key constraint to ensure referential integrity');
  }
}

// If this script is run directly
if (require.main === module) {
  investigateFeatureDiscrepancy().catch(console.error);
}

module.exports = { investigateFeatureDiscrepancy };