const fs = require('fs');
const path = require('path');
const { findMissingData } = require('./find-missing-data');

async function checkExistingFeatures() {
  console.log('🔍 Checking for existing features in new_features directory...\n');

  try {
    // Get missing data analysis
    const analysis = await findMissingData();
    const missingBothApps = analysis.missingBothApps;
    const missingEmbeddingsApps = analysis.missingEmbeddingsApps;

    console.log(`\n📋 Found ${missingBothApps.length} apps missing both features and embeddings`);
    console.log(`📋 Found ${missingEmbeddingsApps.length} apps missing embeddings only`);

    // Read all feature files from new_features directory
    const newFeaturesDir = path.join(__dirname, '../new-features');
    
    if (!fs.existsSync(newFeaturesDir)) {
      console.log('❌ new_features directory not found!');
      return;
    }

    const featureFiles = fs.readdirSync(newFeaturesDir)
      .filter(file => file.startsWith('features-') && file.endsWith('.json'));

    console.log(`\n📁 Found ${featureFiles.length} feature files in new_features directory`);

    // First, create a map of bundle_id to app id from the missing apps
    const bundleIdToAppId = new Map();
    [...missingBothApps, ...missingEmbeddingsApps].forEach(app => {
      if (app.bundle_id) {
        bundleIdToAppId.set(app.bundle_id, app);
      }
    });

    // Create a map of all app IDs that have generated features
    const availableFeatures = new Map();
    let totalAvailableApps = 0;

    for (const file of featureFiles) {
      try {
        const filePath = path.join(newFeaturesDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);

        // Handle different structures
        let features = [];
        if (data.features && Array.isArray(data.features)) {
          features = data.features;
        } else if (Array.isArray(data)) {
          features = data;
        }

        features.forEach(feature => {
          // Use bundle_id to look up the app
          if (feature.bundle_id && bundleIdToAppId.has(feature.bundle_id)) {
            const app = bundleIdToAppId.get(feature.bundle_id);
            availableFeatures.set(app.id, {
              file: file,
              feature: feature,
              bundle_id: feature.bundle_id
            });
            totalAvailableApps++;
          }
        });
      } catch (err) {
        console.log(`⚠️  Error reading ${file}: ${err.message}`);
      }
    }

    console.log(`📊 Total apps with generated features available: ${totalAvailableApps}`);

    // Check which missing apps have features available
    const missingWithAvailableFeatures = [];
    const missingWithoutFeatures = [];

    missingBothApps.forEach(app => {
      if (availableFeatures.has(app.id)) {
        missingWithAvailableFeatures.push({
          ...app,
          featureFile: availableFeatures.get(app.id).file
        });
      } else {
        missingWithoutFeatures.push(app);
      }
    });

    // Check missing embeddings apps that have features available
    const missingEmbeddingsWithFeatures = [];
    missingEmbeddingsApps.forEach(app => {
      if (availableFeatures.has(app.id)) {
        missingEmbeddingsWithFeatures.push({
          ...app,
          featureFile: availableFeatures.get(app.id).file
        });
      }
    });

    console.log('\n🎯 RESULTS:');
    console.log('============');
    console.log(`✅ Apps missing both BUT have generated features: ${missingWithAvailableFeatures.length}`);
    console.log(`❌ Apps missing both AND no generated features: ${missingWithoutFeatures.length}`);
    console.log(`🔢 Apps missing embeddings but have generated features: ${missingEmbeddingsWithFeatures.length}`);

    if (missingWithAvailableFeatures.length > 0) {
      console.log('\n📋 Apps that can be immediately uploaded (have generated features):');
      missingWithAvailableFeatures.slice(0, 10).forEach((app, index) => {
        console.log(`  ${index + 1}. ${app.title} (ID: ${app.id}) - from ${app.featureFile}`);
      });
      if (missingWithAvailableFeatures.length > 10) {
        console.log(`  ... and ${missingWithAvailableFeatures.length - 10} more`);
      }
    }

    if (missingWithoutFeatures.length > 0) {
      console.log(`\n❌ Apps that need new feature generation (${missingWithoutFeatures.length}):`);
      missingWithoutFeatures.slice(0, 10).forEach((app, index) => {
        console.log(`  ${index + 1}. ${app.title} (ID: ${app.id})`);
      });
      if (missingWithoutFeatures.length > 10) {
        console.log(`  ... and ${missingWithoutFeatures.length - 10} more`);
      }
    }

    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(__dirname, '../analysis-output');

    if (missingWithAvailableFeatures.length > 0) {
      fs.writeFileSync(
        path.join(outputDir, `ready-to-upload-${timestamp}.json`),
        JSON.stringify(missingWithAvailableFeatures, null, 2)
      );
      console.log(`\n💾 Saved ${missingWithAvailableFeatures.length} apps ready for upload to: analysis-output/ready-to-upload-${timestamp}.json`);
    }

    if (missingWithoutFeatures.length > 0) {
      fs.writeFileSync(
        path.join(outputDir, `need-generation-${timestamp}.json`),
        JSON.stringify(missingWithoutFeatures, null, 2)
      );
      console.log(`💾 Saved ${missingWithoutFeatures.length} apps needing generation to: analysis-output/need-generation-${timestamp}.json`);
    }

    console.log('\n✅ Analysis complete!');

    return {
      totalMissingBoth: missingBothApps.length,
      totalMissingEmbeddings: missingEmbeddingsApps.length,
      readyToUpload: missingWithAvailableFeatures.length,
      needGeneration: missingWithoutFeatures.length,
      readyToUploadApps: missingWithAvailableFeatures,
      needGenerationApps: missingWithoutFeatures
    };

  } catch (error) {
    console.error('❌ Error checking existing features:', error);
    throw error;
  }
}

// If this script is run directly
if (require.main === module) {
  checkExistingFeatures().catch(console.error);
}

module.exports = { checkExistingFeatures };