const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function findMissingData() {
  console.log('🔍 Finding missing features and embeddings...\n');

  try {
    // Function to get all data with pagination
    async function getAllData(table, selectFields) {
      let allData = [];
      let start = 0;
      const batchSize = 1000;
      
      while (true) {
        const { data, error, count } = await supabase
          .from(table)
          .select(selectFields, { count: 'exact' })
          .range(start, start + batchSize - 1);

        if (error) throw error;
        
        if (data.length === 0) break;
        allData = [...allData, ...data];
        start += batchSize;
        
        console.log(`  Fetched ${allData.length} records from ${table}...`);
        
        if (data.length < batchSize) break;
      }
      
      return allData;
    }

    console.log('📋 Fetching all apps from apps_unified...');
    const allApps = await getAllData('apps_unified', 'id, title, bundle_id');

    console.log('🔧 Fetching apps with features...');
    const appsWithFeatures = await getAllData('app_features', 'app_id');

    console.log('🔢 Fetching apps with embeddings...');
    const appsWithEmbeddings = await getAllData('app_embeddings', 'app_id');

    // Create sets for faster lookup
    const featuresSet = new Set(appsWithFeatures.map(app => app.app_id));
    const embeddingsSet = new Set(appsWithEmbeddings.map(app => app.app_id));

    // Find missing features and embeddings
    const missingFeatures = [];
    const missingEmbeddings = [];
    const missingBoth = [];

    allApps.forEach(app => {
      const hasFeatures = featuresSet.has(app.id);
      const hasEmbeddings = embeddingsSet.has(app.id);

      if (!hasFeatures && !hasEmbeddings) {
        missingBoth.push(app);
      } else if (!hasFeatures) {
        missingFeatures.push(app);
      } else if (!hasEmbeddings) {
        missingEmbeddings.push(app);
      }
    });

    // Display results
    console.log('📊 ANALYSIS RESULTS:');
    console.log('==================');
    console.log(`Total apps in apps_unified: ${allApps.length}`);
    console.log(`Apps with features: ${appsWithFeatures.length}`);
    console.log(`Apps with embeddings: ${appsWithEmbeddings.length}`);
    console.log();
    console.log(`❌ Missing features only: ${missingFeatures.length}`);
    console.log(`❌ Missing embeddings only: ${missingEmbeddings.length}`);
    console.log(`❌ Missing both: ${missingBoth.length}`);
    console.log();

    // Show sample of each category
    if (missingBoth.length > 0) {
      console.log('🚫 Apps missing BOTH features and embeddings (first 10):');
      missingBoth.slice(0, 10).forEach((app, index) => {
        console.log(`  ${index + 1}. ${app.title} (ID: ${app.id})`);
      });
      console.log(`  ... and ${Math.max(0, missingBoth.length - 10)} more\n`);
    }

    if (missingFeatures.length > 0) {
      console.log('📋 Apps missing FEATURES only (first 10):');
      missingFeatures.slice(0, 10).forEach((app, index) => {
        console.log(`  ${index + 1}. ${app.title} (ID: ${app.id})`);
      });
      console.log(`  ... and ${Math.max(0, missingFeatures.length - 10)} more\n`);
    }

    if (missingEmbeddings.length > 0) {
      console.log('🔢 Apps missing EMBEDDINGS only (first 10):');
      missingEmbeddings.slice(0, 10).forEach((app, index) => {
        console.log(`  ${index + 1}. ${app.title} (ID: ${app.id})`);
      });
      console.log(`  ... and ${Math.max(0, missingEmbeddings.length - 10)} more\n`);
    }

    // Save detailed results to files
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fs = require('fs');
    const path = require('path');

    // Create output directory
    const outputDir = path.join(__dirname, '../analysis-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save missing data reports
    if (missingBoth.length > 0) {
      fs.writeFileSync(
        path.join(outputDir, `missing-both-${timestamp}.json`),
        JSON.stringify(missingBoth, null, 2)
      );
      console.log(`💾 Saved ${missingBoth.length} apps missing both to: analysis-output/missing-both-${timestamp}.json`);
    }

    if (missingFeatures.length > 0) {
      fs.writeFileSync(
        path.join(outputDir, `missing-features-${timestamp}.json`),
        JSON.stringify(missingFeatures, null, 2)
      );
      console.log(`💾 Saved ${missingFeatures.length} apps missing features to: analysis-output/missing-features-${timestamp}.json`);
    }

    if (missingEmbeddings.length > 0) {
      fs.writeFileSync(
        path.join(outputDir, `missing-embeddings-${timestamp}.json`),
        JSON.stringify(missingEmbeddings, null, 2)
      );
      console.log(`💾 Saved ${missingEmbeddings.length} apps missing embeddings to: analysis-output/missing-embeddings-${timestamp}.json`);
    }

    console.log('\n✅ Analysis complete!');

    return {
      total: allApps.length,
      withFeatures: appsWithFeatures.length,
      withEmbeddings: appsWithEmbeddings.length,
      missingFeatures: missingFeatures.length,
      missingEmbeddings: missingEmbeddings.length,
      missingBoth: missingBoth.length,
      missingFeaturesApps: missingFeatures,
      missingEmbeddingsApps: missingEmbeddings,
      missingBothApps: missingBoth
    };

  } catch (err) {
    console.error('\n❌ Error analyzing missing data:', err.message);
    throw err;
  }
}

// If this script is run directly
if (require.main === module) {
  findMissingData().catch(console.error);
}

module.exports = { findMissingData };