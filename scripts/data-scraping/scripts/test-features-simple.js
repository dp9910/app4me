/**
 * Simple Feature Engineering Test
 * Test on a small batch of uploaded apps and save locally
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { enrichAppData, extractTFIDFKeywords, batchEnrichApps } = require('./feature-engineering-node.js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class SimpleFeatureTester {
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

  async runTest() {
    console.log('🧪 Starting Simple Feature Engineering Test...\n');

    try {
      // Step 1: Get sample of uploaded apps
      const sampleApps = await this.getSampleApps(20); // Small test batch
      
      // Step 2: Test TF-IDF on first app
      await this.testTFIDF(sampleApps[0]);
      
      // Step 3: Test full feature extraction on 5 apps
      await this.testFullFeatures(sampleApps.slice(0, 5));
      
      console.log('\n🎉 Simple test complete!');
      console.log(`📁 Results saved in: ${this.outputDir}`);
      
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  }

  async getSampleApps(limit = 20) {
    console.log(`📱 Fetching ${limit} sample apps...`);
    
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
        icon_url
      `)
      .not('description', 'is', null)
      .gte('rating_count', 100)
      .limit(limit)
      .order('rating_count', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch apps: ${error.message}`);
    }

    console.log(`✅ Fetched ${apps.length} apps`);
    console.log(`   Sample titles: ${apps.slice(0, 3).map(app => app.title).join(', ')}`);
    
    return apps;
  }

  async testTFIDF(app) {
    console.log(`\n📊 Testing TF-IDF on: "${app.title}"`);
    
    try {
      const startTime = Date.now();
      const keywords = await extractTFIDFKeywords(app.description);
      const duration = Date.now() - startTime;
      
      console.log(`   ✅ TF-IDF complete (${duration}ms)`);
      console.log(`   Keywords found: ${Object.keys(keywords.keywords).length}`);
      console.log(`   Top 5 keywords: ${Object.keys(keywords.keywords).slice(0, 5).join(', ')}`);
      
      // Save TF-IDF test result
      const tfidfResult = {
        app: { bundle_id: app.bundle_id, title: app.title, category: app.category },
        keywords: keywords,
        processing_time_ms: duration,
        tested_at: new Date().toISOString()
      };
      
      fs.writeFileSync(
        path.join(this.outputDir, 'tfidf-test.json'),
        JSON.stringify(tfidfResult, null, 2)
      );
      
      console.log('   💾 TF-IDF test saved');
      
    } catch (error) {
      console.error(`   ❌ TF-IDF test failed: ${error.message}`);
    }
  }

  async testFullFeatures(apps) {
    console.log(`\n🔧 Testing full feature extraction on ${apps.length} apps...`);
    
    const results = [];
    
    for (let i = 0; i < apps.length; i++) {
      const app = apps[i];
      console.log(`   Processing ${i + 1}/${apps.length}: ${app.title}`);
      
      try {
        const startTime = Date.now();
        const features = await enrichAppData(app);
        const duration = Date.now() - startTime;
        
        const result = {
          app_id: app.bundle_id,
          app_title: app.title,
          app_category: app.category,
          features: features,
          processing_time_ms: duration,
          success: true
        };
        
        results.push(result);
        console.log(`     ✅ Success (${duration}ms)`);
        
        // Add delay to avoid rate limiting LLM
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`     ❌ Failed: ${error.message}`);
        results.push({
          app_id: app.bundle_id,
          app_title: app.title,
          error: error.message,
          success: false
        });
      }
    }
    
    // Save full results
    const summary = {
      total_processed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results: results,
      test_completed_at: new Date().toISOString()
    };
    
    fs.writeFileSync(
      path.join(this.outputDir, 'full-features-test.json'),
      JSON.stringify(summary, null, 2)
    );
    
    console.log(`   ✅ Full feature test complete`);
    console.log(`   Success rate: ${summary.successful}/${summary.total_processed}`);
    console.log('   💾 Results saved to full-features-test.json');
    
    // Show sample results
    const successful = results.filter(r => r.success);
    if (successful.length > 0) {
      const sample = successful[0];
      console.log(`\n📋 Sample Result for "${sample.app_title}":`);
      console.log(`   Keywords: ${Object.keys(sample.features.keywords_tfidf.keywords).slice(0, 3).join(', ')}`);
      console.log(`   Primary use case: ${sample.features.llm_features.primary_use_case}`);
      console.log(`   Complexity: ${sample.features.llm_features.complexity_level}`);
      console.log(`   Quality score: ${sample.features.quality_signals.toFixed(2)}`);
    }
  }
}

// Run the test
async function main() {
  const tester = new SimpleFeatureTester();
  await tester.runTest();
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Test completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}