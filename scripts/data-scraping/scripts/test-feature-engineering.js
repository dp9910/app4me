/**
 * Test Feature Engineering Pipeline
 * Process a sample of uploaded apps and save features locally
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Import our feature engineering functions
import('../../src/lib/recommendation/feature-engineering.js').then(async (featureModule) => {
  const { enrichAppData, extractTFIDFKeywords, batchEnrichApps } = featureModule;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  class FeatureEngineeringTester {
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

    async testFeatureEngineering() {
      console.log('🧪 Testing Feature Engineering Pipeline...\n');

      // Step 1: Get sample of uploaded apps
      const sampleApps = await this.getSampleApps();
      
      // Step 2: Test feature extraction on one app
      await this.testSingleApp(sampleApps[0]);
      
      // Step 3: Test batch processing on 100 apps
      await this.testBatchProcessing(sampleApps);
      
      // Step 4: Analyze results
      await this.analyzeResults();
    }

    async getSampleApps() {
      console.log('📱 Fetching sample apps from database...');
      
      // Get 100 iTunes apps with rich descriptions
      const { data: itunesApps, error } = await supabase
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
          price,
          icon_url,
          release_date,
          size_bytes,
          genres
        `)
        .not('description', 'is', null)
        .gte('rating_count', 100) // Apps with decent review count
        .limit(100)
        .order('rating_count', { ascending: false });

      if (error) {
        console.error('❌ Error fetching apps:', error);
        return [];
      }

      console.log(`✅ Fetched ${itunesApps.length} sample apps`);
      console.log(`   Sample: ${itunesApps.slice(0, 3).map(app => app.title).join(', ')}`);
      
      return itunesApps;
    }

    async testSingleApp(app) {
      console.log(`\n🔧 Testing single app: "${app.title}"`);
      console.log(`   Category: ${app.category}`);
      console.log(`   Description: ${(app.description || '').substring(0, 100)}...`);
      
      try {
        const startTime = Date.now();
        
        // Test TF-IDF extraction
        console.log('   📊 Extracting TF-IDF keywords...');
        const keywords = await extractTFIDFKeywords(app.description);
        
        // Test full feature enrichment
        console.log('   🧠 Running LLM feature extraction...');
        const enrichedFeatures = await enrichAppData(app);
        
        const duration = Date.now() - startTime;
        
        console.log(`   ✅ Feature extraction complete (${duration}ms)`);
        console.log(`   Keywords found: ${Object.keys(keywords.keywords).length}`);
        console.log(`   Top keywords: ${Object.keys(keywords.keywords).slice(0, 5).join(', ')}`);
        
        // Save single app result
        const singleAppResult = {
          app: {
            bundle_id: app.bundle_id,
            title: app.title,
            category: app.category
          },
          features: enrichedFeatures,
          processing_time_ms: duration,
          processed_at: new Date().toISOString()
        };
        
        fs.writeFileSync(
          path.join(this.outputDir, 'single-app-test.json'),
          JSON.stringify(singleAppResult, null, 2)
        );
        
        console.log('   💾 Single app test saved to single-app-test.json');
        
      } catch (error) {
        console.error(`   ❌ Single app test failed: ${error.message}`);
      }
    }

    async testBatchProcessing(apps) {
      console.log(`\n📦 Testing batch processing on ${apps.length} apps...`);
      
      try {
        const startTime = Date.now();
        
        // Process in smaller batches to avoid rate limits
        const batchSize = 5; // Small batch for testing
        const results = [];
        
        for (let i = 0; i < Math.min(apps.length, 20); i += batchSize) {
          const batch = apps.slice(i, i + batchSize);
          console.log(`   Processing batch ${Math.floor(i/batchSize) + 1}...`);
          
          const batchResults = await batchEnrichApps(batch, batchSize);
          results.push(...batchResults);
          
          // Save progress
          const progressFile = path.join(this.outputDir, `batch-progress-${i}.json`);
          fs.writeFileSync(progressFile, JSON.stringify(batchResults, null, 2));
        }
        
        const duration = Date.now() - startTime;
        const successful = results.filter(r => r.success).length;
        
        console.log(`   ✅ Batch processing complete (${duration}ms)`);
        console.log(`   Success rate: ${successful}/${results.length} (${(successful/results.length*100).toFixed(1)}%)`);
        
        // Save complete batch results
        const batchSummary = {
          total_processed: results.length,
          successful: successful,
          failed: results.length - successful,
          processing_time_ms: duration,
          avg_time_per_app: duration / results.length,
          processed_at: new Date().toISOString(),
          results: results
        };
        
        fs.writeFileSync(
          path.join(this.outputDir, 'batch-test-results.json'),
          JSON.stringify(batchSummary, null, 2)
        );
        
        console.log('   💾 Batch results saved to batch-test-results.json');
        
      } catch (error) {
        console.error(`   ❌ Batch processing failed: ${error.message}`);
      }
    }

    async analyzeResults() {
      console.log('\n📊 Analyzing feature engineering results...');
      
      try {
        // Load results
        const singleAppFile = path.join(this.outputDir, 'single-app-test.json');
        const batchFile = path.join(this.outputDir, 'batch-test-results.json');
        
        if (fs.existsSync(singleAppFile)) {
          const singleApp = JSON.parse(fs.readFileSync(singleAppFile, 'utf8'));
          console.log('\n📱 Single App Analysis:');
          console.log(`   App: ${singleApp.app.title}`);
          console.log(`   Processing time: ${singleApp.processing_time_ms}ms`);
          
          if (singleApp.features.keywords_tfidf) {
            const keywordCount = Object.keys(singleApp.features.keywords_tfidf.keywords).length;
            console.log(`   Keywords extracted: ${keywordCount}`);
            console.log(`   Top keywords: ${Object.keys(singleApp.features.keywords_tfidf.keywords).slice(0, 5).join(', ')}`);
          }
          
          if (singleApp.features.llm_features) {
            console.log(`   Primary use case: ${singleApp.features.llm_features.primary_use_case}`);
            console.log(`   Complexity level: ${singleApp.features.llm_features.complexity_level}`);
            console.log(`   Emotional tone: ${singleApp.features.llm_features.emotional_tone}`);
          }
        }
        
        if (fs.existsSync(batchFile)) {
          const batchResults = JSON.parse(fs.readFileSync(batchFile, 'utf8'));
          console.log('\n📦 Batch Processing Analysis:');
          console.log(`   Total processed: ${batchResults.total_processed}`);
          console.log(`   Success rate: ${(batchResults.successful/batchResults.total_processed*100).toFixed(1)}%`);
          console.log(`   Average time per app: ${batchResults.avg_time_per_app.toFixed(0)}ms`);
          
          // Analyze feature quality
          const successfulResults = batchResults.results.filter(r => r.success);
          if (successfulResults.length > 0) {
            const avgKeywords = successfulResults.reduce((sum, r) => 
              sum + Object.keys(r.features?.keywords_tfidf?.keywords || {}).length, 0
            ) / successfulResults.length;
            
            console.log(`   Average keywords per app: ${avgKeywords.toFixed(1)}`);
            
            // Category distribution
            const categories = {};
            successfulResults.forEach(r => {
              if (r.features?.metadata?.category_primary) {
                const cat = r.features.metadata.category_primary;
                categories[cat] = (categories[cat] || 0) + 1;
              }
            });
            
            console.log(`   Category distribution:`, categories);
          }
        }
        
        // Generate summary report
        const summary = {
          test_completed_at: new Date().toISOString(),
          pipeline_status: 'operational',
          files_generated: fs.readdirSync(this.outputDir),
          next_steps: [
            'Review feature quality in output files',
            'Adjust LLM prompts if needed',
            'Scale to full dataset when ready',
            'Design database schema for features'
          ]
        };
        
        fs.writeFileSync(
          path.join(this.outputDir, 'test-summary.json'),
          JSON.stringify(summary, null, 2)
        );
        
        console.log('\n🎉 Feature engineering test complete!');
        console.log(`📁 Output saved in: ${this.outputDir}`);
        console.log('📋 Files generated:');
        fs.readdirSync(this.outputDir).forEach(file => {
          console.log(`   - ${file}`);
        });
        
      } catch (error) {
        console.error(`❌ Analysis failed: ${error.message}`);
      }
    }
  }

  // Run the test
  const tester = new FeatureEngineeringTester();
  await tester.testFeatureEngineering();
  
}).catch(error => {
  console.error('❌ Failed to load feature engineering module:', error);
  console.log('Make sure the feature-engineering.js file exists and has no syntax errors');
});