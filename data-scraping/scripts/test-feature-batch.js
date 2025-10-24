/**
 * Larger Batch Feature Engineering Test
 * Process 50-100 apps and save results locally
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { enrichAppData, batchEnrichApps } = require('./feature-engineering-node.js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class BatchFeatureTester {
  constructor() {
    this.outputDir = './data-scraping/features-output';
    this.ensureOutputDir();
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      console.log(`📁 Created output directory: ${this.outputDir}`);
    }
  }

  async runBatchTest(batchSize = 50) {
    console.log(`🧪 Starting Batch Feature Engineering Test (${batchSize} apps)...\n`);

    try {
      // Step 1: Get diverse sample of uploaded apps
      const sampleApps = await this.getDiverseSampleApps(batchSize);
      
      if (sampleApps.length === 0) {
        console.log('❌ No apps found to process');
        return;
      }
      
      // Step 2: Process in smaller batches to avoid rate limits
      const processingBatchSize = 5; // 5 apps at a time
      await this.processBatches(sampleApps, processingBatchSize);
      
      // Step 3: Analyze results
      await this.analyzeResults();
      
      console.log('\n🎉 Batch feature engineering test complete!');
      console.log(`📁 Results saved in: ${this.outputDir}`);
      
    } catch (error) {
      console.error('❌ Batch test failed:', error);
    }
  }

  async getDiverseSampleApps(limit = 50) {
    console.log(`📱 Fetching ${limit} diverse sample apps...`);
    
    const { data: apps, error } = await supabase
      .from('itunes_apps')
      .select(`
        bundle_id,
        title,
        developer,
        category,
        description,
        rating,
        rating_count,
        formatted_price,
        icon_url,
        release_date,
        size_bytes
      `)
      .not('description', 'is', null)
      .gte('rating_count', 50) // Apps with some reviews
      .limit(limit * 2) // Get more to ensure diversity
      .order('rating_count', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch apps: ${error.message}`);
    }

    // Filter for diversity - different categories
    const categoryMap = new Map();
    const diverseApps = [];
    
    for (const app of apps) {
      const category = app.category || 'unknown';
      const currentCount = categoryMap.get(category) || 0;
      
      // Limit apps per category for diversity
      if (currentCount < Math.ceil(limit / 10) && diverseApps.length < limit) {
        diverseApps.push(app);
        categoryMap.set(category, currentCount + 1);
      }
    }
    
    // Fill remaining slots if needed
    if (diverseApps.length < limit) {
      for (const app of apps) {
        if (diverseApps.length >= limit) break;
        if (!diverseApps.find(existing => existing.bundle_id === app.bundle_id)) {
          diverseApps.push(app);
        }
      }
    }

    console.log(`✅ Selected ${diverseApps.length} diverse apps`);
    
    // Show category distribution
    const categories = {};
    diverseApps.forEach(app => {
      const cat = app.category || 'unknown';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    console.log(`   Category distribution:`, categories);
    
    return diverseApps.slice(0, limit);
  }

  async processBatches(apps, batchSize = 5) {
    console.log(`\n🔧 Processing ${apps.length} apps in batches of ${batchSize}...`);
    
    const allResults = [];
    const totalBatches = Math.ceil(apps.length / batchSize);
    
    for (let i = 0; i < apps.length; i += batchSize) {
      const batch = apps.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      
      console.log(`\n📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} apps)...`);
      
      const startTime = Date.now();
      const batchResults = [];
      
      for (let j = 0; j < batch.length; j++) {
        const app = batch[j];
        console.log(`   ${j + 1}/${batch.length}: ${app.title} (${app.category})`);
        
        try {
          const appStartTime = Date.now();
          const features = await enrichAppData(app);
          const appDuration = Date.now() - appStartTime;
          
          const result = {
            app_id: app.bundle_id,
            app_title: app.title,
            app_category: app.category,
            features: features,
            processing_time_ms: appDuration,
            success: true
          };
          
          batchResults.push(result);
          console.log(`     ✅ Success (${appDuration}ms)`);
          
          // Rate limiting delay
          await new Promise(resolve => setTimeout(resolve, 3000)); // 3 seconds between apps
          
        } catch (error) {
          console.error(`     ❌ Failed: ${error.message}`);
          batchResults.push({
            app_id: app.bundle_id,
            app_title: app.title,
            app_category: app.category,
            error: error.message,
            success: false
          });
        }
      }
      
      const batchDuration = Date.now() - startTime;
      const successful = batchResults.filter(r => r.success).length;
      
      console.log(`   ✅ Batch ${batchNum} complete: ${successful}/${batch.length} successful (${batchDuration}ms)`);
      
      allResults.push(...batchResults);
      
      // Save progressive results
      const progressFile = path.join(this.outputDir, `batch-${batchNum}-results.json`);
      fs.writeFileSync(progressFile, JSON.stringify({
        batch_number: batchNum,
        total_batches: totalBatches,
        results: batchResults,
        summary: {
          total: batch.length,
          successful: successful,
          failed: batch.length - successful,
          processing_time_ms: batchDuration
        }
      }, null, 2));
      
      console.log(`   💾 Batch ${batchNum} saved to batch-${batchNum}-results.json`);
    }
    
    // Save complete results
    const summary = {
      total_processed: allResults.length,
      successful: allResults.filter(r => r.success).length,
      failed: allResults.filter(r => !r.success).length,
      processing_started: new Date().toISOString(),
      results: allResults
    };
    
    fs.writeFileSync(
      path.join(this.outputDir, 'batch-complete-results.json'),
      JSON.stringify(summary, null, 2)
    );
    
    console.log(`\n🎉 All batches complete!`);
    console.log(`   Total success rate: ${summary.successful}/${summary.total_processed} (${(summary.successful/summary.total_processed*100).toFixed(1)}%)`);
    console.log(`   💾 Complete results saved to batch-complete-results.json`);
  }

  async analyzeResults() {
    console.log('\n📊 Analyzing batch feature engineering results...');
    
    try {
      const completeFile = path.join(this.outputDir, 'batch-complete-results.json');
      
      if (!fs.existsSync(completeFile)) {
        console.log('❌ Complete results file not found');
        return;
      }
      
      const results = JSON.parse(fs.readFileSync(completeFile, 'utf8'));
      const successful = results.results.filter(r => r.success);
      
      console.log(`\n📈 Results Summary:`);
      console.log(`   Total apps processed: ${results.total_processed}`);
      console.log(`   Success rate: ${(results.successful/results.total_processed*100).toFixed(1)}%`);
      
      if (successful.length > 0) {
        // Analyze features
        const avgKeywords = successful.reduce((sum, r) => 
          sum + Object.keys(r.features?.keywords_tfidf?.keywords || {}).length, 0
        ) / successful.length;
        
        const avgProcessingTime = successful.reduce((sum, r) => 
          sum + (r.processing_time_ms || 0), 0
        ) / successful.length;
        
        console.log(`   Average keywords per app: ${avgKeywords.toFixed(1)}`);
        console.log(`   Average processing time: ${avgProcessingTime.toFixed(0)}ms`);
        
        // Category distribution
        const categories = {};
        successful.forEach(r => {
          const cat = r.app_category || 'unknown';
          categories[cat] = (categories[cat] || 0) + 1;
        });
        
        console.log(`   Categories processed:`, Object.keys(categories).length);
        
        // Sample insights
        const sampleApp = successful[0];
        console.log(`\n📋 Sample App Analysis: "${sampleApp.app_title}"`);
        console.log(`   Primary use case: ${sampleApp.features.llm_features.primary_use_case}`);
        console.log(`   Top keywords: ${Object.keys(sampleApp.features.keywords_tfidf.keywords).slice(0, 3).join(', ')}`);
        console.log(`   Quality score: ${sampleApp.features.quality_signals.toFixed(2)}`);
      }
      
    } catch (error) {
      console.error(`❌ Analysis failed: ${error.message}`);
    }
  }
}

// Run the batch test
async function main() {
  const tester = new BatchFeatureTester();
  
  // Get batch size from command line or default to 50
  const batchSize = parseInt(process.argv[2]) || 50;
  console.log(`🚀 Starting with batch size: ${batchSize}`);
  
  await tester.runBatchTest(batchSize);
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Batch test completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Batch test failed:', error);
      process.exit(1);
    });
}