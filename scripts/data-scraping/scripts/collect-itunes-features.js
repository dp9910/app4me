const fs = require('fs');
const path = require('path');
const glob = require('glob');

async function collectItunesFeatures() {
  console.log('🚀 Starting iTunes feature consolidation process...');

  try {
    // 1. Consolidate all features from iTunes sources
    console.log('Consolidating features from iTunes sources...');
    const allFeatures = new Map();

    const processFiles = (files, label) => {
      console.log(`\n${label}:`);
      let totalApps = 0;
      for (const file of files) {
        try {
          const content = JSON.parse(fs.readFileSync(file, 'utf-8'));
          const results = content.results || content.all_hybrid_results || content.all_serp_results || [];
          totalApps += results.length;
          let featuresInFile = 0;
          for (const result of results) {
            if (result.app_id && result.features) {
              allFeatures.set(result.app_id, {
                ...result.features,
                source_file: path.basename(file)
              });
              featuresInFile++;
            }
          }
          console.log(`  - ${file}: ${featuresInFile} features`);
        } catch (err) {
          console.log(`  Error reading ${file}: ${err.message}`);
        }
      }
      console.log(`  Processed ${files.length} files, ${totalApps} total apps`);
    };

    // Process all extraction sources
    processFiles(glob.sync('data-scraping/features-output/full-extraction-archive/batch-*.json'), 'Full extraction archive');
    processFiles(glob.sync('data-scraping/features-output/optimized-extraction/batch-*.json'), 'Optimized extraction');
    processFiles(glob.sync('data-scraping/features-output/hybrid-extraction/batch-*.json'), 'Hybrid extraction batches');


    // Process final consolidated files
    const hybridFinalFile = 'data-scraping/features-output/hybrid-extraction/final-hybrid-results.json';
    if (fs.existsSync(hybridFinalFile)) {
      processFiles([hybridFinalFile], 'Hybrid final results');
    }

    console.log(`\n📊 Found ${allFeatures.size} unique apps with iTunes features.`);

    // Save the consolidated features to a local file
    const output_path = 'data-scraping/features-output/itunes-features.json';
    fs.writeFileSync(output_path, JSON.stringify(Object.fromEntries(allFeatures), null, 2));
    console.log(`✅ iTunes features saved to ${output_path}`);

  } catch (err) {
    console.error('An error occurred during the feature consolidation process:', err);
  }
}

collectItunesFeatures();