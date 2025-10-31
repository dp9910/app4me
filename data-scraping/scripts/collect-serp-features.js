const fs = require('fs');
const path = require('path');
const glob = require('glob');

async function collectSerpFeatures() {
  console.log('🚀 Starting SERP feature consolidation process...');

  try {
    // 1. Consolidate all features from SERP sources
    console.log('Consolidating features from SERP sources...');
    const allFeatures = new Map();

    const processFiles = (files, label) => {
      console.log(`\n${label}:`);
      let totalApps = 0;
      for (const file of files) {
        try {
          const content = JSON.parse(fs.readFileSync(file, 'utf-8'));
          const results = content.results || content.all_hybrid_results || content.all_serp_results || [];
          totalApps += results.length;
          
          for (const result of results) {
            if (result.app_id && result.features) {
              allFeatures.set(result.app_id, {
                ...result.features,
                source_file: path.basename(file)
              });
            }
          }
        } catch (err) {
          console.log(`  Error reading ${file}: ${err.message}`);
        }
      }
      console.log(`  Processed ${files.length} files, ${totalApps} total apps`);
    };

    // Process SERP extraction data  
    const serpFinalFile = 'data-scraping/scripts/data-scraping/features-output/serp-deepseek-extraction/final-serp-deepseek-results.json';
    if (fs.existsSync(serpFinalFile)) {
      processFiles([serpFinalFile], 'SERP final results');
    }
    processFiles(glob.sync('data-scraping/scripts/data-scraping/features-output/serp-deepseek-extraction/serp-batch-*.json'), 'SERP extraction batches');

    console.log(`\n📊 Found ${allFeatures.size} unique apps with SERP features.`);

    // Save the consolidated features to a local file
    const output_path = 'data-scraping/features-output/serp-features.json';
    fs.writeFileSync(output_path, JSON.stringify(Object.fromEntries(allFeatures), null, 2));
    console.log(`✅ SERP features saved to ${output_path}`);

  } catch (err) {
    console.error('An error occurred during the feature consolidation process:', err);
  }
}

collectSerpFeatures();
