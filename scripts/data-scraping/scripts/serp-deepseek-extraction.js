/**
 * SERP Feature Extraction Pipeline - DeepSeek Only
 * Process 1,773 unique SERP apps using reliable DeepSeek API
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const { createClient } = require('@supabase/supabase-js');
const { enrichAppDataWithDeepSeek } = require('./feature-engineering-deepseek.js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class SerpDeepSeekExtractor {
  constructor() {
    this.outputDir = './data-scraping/features-output/serp-deepseek-extraction';
    this.backupInterval = 20; // Save backup every 20 batches
    this.ensureOutputDir();
    this.resumeData = this.loadResumeData();
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      console.log(`📁 Created output directory: ${this.outputDir}`);
    }
  }

  loadResumeData() {
    const resumeFile = path.join(this.outputDir, 'serp-extraction-progress.json');
    if (fs.existsSync(resumeFile)) {
      const data = JSON.parse(fs.readFileSync(resumeFile, 'utf8'));
      console.log(`📄 Resuming SERP extraction: ${data.processedApps} apps completed`);
      return data;
    }
    return {
      processedApps: 0,
      completedBatches: 0,
      lastProcessedId: null,
      startTime: new Date().toISOString(),
      strategy: 'deepseek_only_serp',
      target_table: 'serp_unique_clean',
      allResults: []
    };
  }

  saveResumeData() {
    const resumeFile = path.join(this.outputDir, 'serp-extraction-progress.json');
    fs.writeFileSync(resumeFile, JSON.stringify(this.resumeData, null, 2));
  }

  async runSerpDeepSeekExtraction() {
    console.log('🚀 Starting SERP Feature Extraction with DeepSeek...');
    console.log('   📊 Target: 1,773 unique SERP apps from serp_unique_clean table');
    console.log('   🤖 API: DeepSeek only (reliable, no quota issues)');
    console.log('   💰 Estimated cost: ~$0.30 total');
    console.log('   ⚡ Estimated time: ~2.5 hours at 2,643ms per app\n');

    try {
      // Get total count and apps to process
      const totalApps = await this.getTotalSerpApps();
      const remainingApps = totalApps - this.resumeData.processedApps;
      
      console.log(`📊 SERP Extraction Status:`);
      console.log(`   Total unique SERP apps: ${totalApps}`);
      console.log(`   Already processed: ${this.resumeData.processedApps} apps`);
      console.log(`   Remaining: ${remainingApps} apps\n`);

      if (remainingApps <= 0) {
        console.log('✅ All SERP apps already processed!');
        return;
      }

      // Estimate completion time
      const estimatedMinutes = Math.round((remainingApps * 2643) / 1000 / 60); // DeepSeek avg time
      console.log(`⏱️  Estimated completion: ${estimatedMinutes} minutes (${(estimatedMinutes/60).toFixed(1)} hours)\n`);

      // Process in batches
      const batchSize = 12; // Good balance for DeepSeek
      let currentOffset = this.resumeData.processedApps;

      while (currentOffset < totalApps) {
        const batch = await this.getNextSerpBatch(batchSize, currentOffset);
        
        if (batch.length === 0) {
          console.log('✅ No more SERP apps to process');
          break;
        }

        const batchNumber = this.resumeData.completedBatches + 1;
        await this.processSerpBatch(batch, batchNumber);
        currentOffset += batch.length;

        // Periodic backup
        if (this.resumeData.completedBatches % this.backupInterval === 0) {
          await this.createPeriodicBackup();
        }

        // Rate limiting for DeepSeek
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      await this.createFinalSummary();
      console.log('\n🎉 SERP DeepSeek extraction completed!');

    } catch (error) {
      console.error('❌ SERP extraction failed:', error);
      this.saveResumeData();
      throw error;
    }
  }

  async getTotalSerpApps() {
    console.log('📊 Counting unique SERP apps...');
    
    const { count, error } = await supabase
      .from('serp_unique_clean')
      .select('id', { count: 'exact' })
      .not('description', 'is', null);

    if (error) {
      throw new Error(`Failed to count SERP apps: ${error.message}`);
    }

    return count || 0;
  }

  async getNextSerpBatch(batchSize, offset) {
    console.log(`📱 Fetching SERP batch at offset ${offset}...`);
    
    const { data: apps, error } = await supabase
      .from('serp_unique_clean')
      .select(`
        id,
        bundle_id,
        title,
        developer,
        category,
        description,
        rating,
        rating_count,
        formatted_price,
        icon_url,
        version,
        primary_genre
      `)
      .not('description', 'is', null)
      .range(offset, offset + batchSize - 1)
      .order('rating', { ascending: false, nullsLast: true });

    if (error) {
      throw new Error(`Failed to fetch SERP batch: ${error.message}`);
    }

    // Filter already processed apps
    const filteredApps = apps.filter(app => {
      const alreadyProcessed = this.resumeData.allResults.some(r => r.app_id === app.bundle_id);
      return !alreadyProcessed;
    });

    return filteredApps;
  }

  async processSerpBatch(apps, batchNumber) {
    console.log(`\n🤖 Processing SERP batch ${batchNumber} with DeepSeek (${apps.length} apps)...`);
    
    const batchStartTime = Date.now();

    // Process all apps in parallel
    const appPromises = apps.map(async (app) => {
      try {
        const appStartTime = Date.now();
        
        // Adapt SERP app structure for feature extraction
        const adaptedApp = {
          bundle_id: app.bundle_id,
          title: app.title,
          name: app.title, // fallback
          developer: app.developer,
          developer_name: app.developer, // fallback
          category: app.category || app.primary_genre,
          primary_category: app.category || app.primary_genre,
          description: app.description,
          rating: app.rating,
          rating_average: app.rating, // fallback
          rating_count: app.rating_count,
          formatted_price: app.formatted_price || 'Free',
          price: app.formatted_price || 'Free',
          icon_url: app.icon_url,
          icon_url_512: app.icon_url, // fallback
          version: app.version
        };

        const features = await enrichAppDataWithDeepSeek(adaptedApp);
        const appDuration = Date.now() - appStartTime;

        return {
          app_id: app.bundle_id,
          serp_id: app.id,
          app_title: app.title,
          app_category: app.category || app.primary_genre,
          app_developer: app.developer,
          features: features,
          processing_time_ms: appDuration,
          api_used: 'deepseek',
          success: true,
          processed_at: new Date().toISOString()
        };

      } catch (error) {
        console.error(`     ❌ ${app.title} failed: ${error.message}`);
        return {
          app_id: app.bundle_id,
          serp_id: app.id,
          app_title: app.title,
          app_category: app.category || app.primary_genre,
          error: error.message,
          success: false,
          processed_at: new Date().toISOString()
        };
      }
    });

    const results = await Promise.all(appPromises);
    
    results.forEach(result => {
      this.resumeData.allResults.push(result);
      this.resumeData.processedApps++;
    });

    const batchDuration = Date.now() - batchStartTime;
    const successful = results.filter(r => r.success).length;
    const avgTime = successful > 0 ? Math.round(batchDuration / successful) : 0;
    
    console.log(`   ✅ SERP batch ${batchNumber} complete: ${successful}/${apps.length} successful`);
    console.log(`   🤖 DeepSeek performance: ${avgTime}ms avg/app, ${batchDuration}ms total`);
    console.log(`   📊 Total SERP progress: ${this.resumeData.processedApps} apps processed`);

    // Save batch results
    this.saveSerpBatchResults(batchNumber, results);
    this.resumeData.completedBatches++;
    this.saveResumeData();
  }

  saveSerpBatchResults(batchNumber, results) {
    const batchFile = path.join(this.outputDir, `serp-batch-${String(batchNumber).padStart(4, '0')}-results.json`);
    
    const successful = results.filter(r => r.success);
    const avgTime = successful.length > 0 
      ? Math.round(successful.reduce((sum, r) => sum + (r.processing_time_ms || 0), 0) / successful.length)
      : 0;

    const batchData = {
      batch_number: batchNumber,
      extraction_type: "serp_deepseek_only",
      processed_at: new Date().toISOString(),
      total_apps: results.length,
      successful: successful.length,
      failed: results.filter(r => !r.success).length,
      avg_processing_time_ms: avgTime,
      api_used: "deepseek",
      source_table: "serp_unique_clean",
      results: results
    };

    fs.writeFileSync(batchFile, JSON.stringify(batchData, null, 2));
    console.log(`   💾 SERP batch ${batchNumber} saved to serp-batch-${String(batchNumber).padStart(4, '0')}-results.json`);
  }

  async createPeriodicBackup() {
    console.log('\n💾 Creating SERP periodic backup...');
    
    const backupFile = path.join(this.outputDir, `serp-backup-${Date.now()}.json`);
    const successful = this.resumeData.allResults.filter(r => r.success);
    
    const backupData = {
      backup_created: new Date().toISOString(),
      extraction_type: "serp_deepseek_only",
      serp_apps_processed: this.resumeData.processedApps,
      successful_count: successful.length,
      failed_count: this.resumeData.processedApps - successful.length,
      processing_started: this.resumeData.startTime,
      source_table: "serp_unique_clean",
      avg_processing_time_ms: successful.length > 0 
        ? Math.round(successful.reduce((sum, r) => sum + (r.processing_time_ms || 0), 0) / successful.length)
        : 0,
      results: this.resumeData.allResults
    };

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`   ✅ SERP backup created: ${path.basename(backupFile)}`);
    console.log(`   📊 Progress: ${this.resumeData.processedApps} SERP apps processed`);
    
    if (successful.length > 0) {
      const avgTime = backupData.avg_processing_time_ms;
      console.log(`   🤖 DeepSeek performance: ${avgTime}ms avg/app`);
    }
  }

  async createFinalSummary() {
    console.log('\n📊 Creating final SERP summary...');
    
    const successful = this.resumeData.allResults.filter(r => r.success);
    const failed = this.resumeData.allResults.filter(r => !r.success);
    
    const avgProcessingTime = successful.length > 0 
      ? Math.round(successful.reduce((sum, r) => sum + (r.processing_time_ms || 0), 0) / successful.length)
      : 0;
    
    // Estimate actual cost based on processing
    const estimatedTokensPerApp = 260; // From our analysis
    const totalTokens = this.resumeData.processedApps * estimatedTokensPerApp;
    const estimatedCost = (totalTokens / 1000000) * 0.70; // DeepSeek pricing
    
    const summary = {
      extraction_completed: new Date().toISOString(),
      extraction_type: "serp_deepseek_only",
      processing_started: this.resumeData.startTime,
      total_duration_hours: (Date.now() - new Date(this.resumeData.startTime).getTime()) / (1000 * 60 * 60),
      source_table: "serp_unique_clean",
      
      statistics: {
        total_serp_apps_processed: this.resumeData.processedApps,
        successful: successful.length,
        failed: failed.length,
        success_rate: (successful.length / this.resumeData.processedApps * 100).toFixed(2) + '%',
        completed_batches: this.resumeData.completedBatches
      },
      
      performance: {
        avg_processing_time_ms: avgProcessingTime,
        api_used: "deepseek",
        total_features_extracted: successful.length,
        estimated_cost: `$${estimatedCost.toFixed(2)}`,
        cost_per_app: `$${(estimatedCost / this.resumeData.processedApps).toFixed(4)}`
      },
      
      data_quality: {
        apps_with_icons: successful.filter(r => r.features?.metadata?.developer).length,
        apps_with_categories: successful.filter(r => r.features?.category_classification && Object.keys(r.features.category_classification).length > 0).length,
        apps_with_keywords: successful.filter(r => r.features?.keywords_tfidf?.keywords && Object.keys(r.features.keywords_tfidf.keywords).length > 0).length
      },
      
      ready_for_upload: true
    };

    // Save final results
    const finalFile = path.join(this.outputDir, 'final-serp-deepseek-results.json');
    const finalData = {
      ...summary,
      all_serp_results: this.resumeData.allResults
    };
    
    fs.writeFileSync(finalFile, JSON.stringify(finalData, null, 2));
    
    // Save summary only
    const summaryFile = path.join(this.outputDir, 'serp-deepseek-summary.json');
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

    console.log(`   ✅ Final SERP results: ${finalFile}`);
    console.log(`   ✅ SERP summary: ${summaryFile}`);
    console.log(`\n📈 FINAL SERP Results:`);
    console.log(`   Total SERP apps processed: ${summary.statistics.total_serp_apps_processed}`);
    console.log(`   Success rate: ${summary.statistics.success_rate}`);
    console.log(`   Duration: ${summary.total_duration_hours.toFixed(2)} hours`);
    console.log(`   Average speed: ${avgProcessingTime}ms per app`);
    console.log(`   🤖 DeepSeek performance: Reliable, no quota issues`);
    console.log(`   💰 Estimated cost: ${summary.performance.estimated_cost}`);
    console.log(`   📊 Data quality: ${summary.data_quality.apps_with_keywords} apps with keywords`);
    console.log(`   ✅ Ready for recommendation engine: ${summary.ready_for_upload}`);
  }
}

// CLI interface
async function main() {
  console.log('🎯 SERP DEEPSEEK EXTRACTION: Process 1,773 unique SERP apps');
  console.log('   📊 Source: serp_unique_clean table (deduplicated)');
  console.log('   🤖 API: DeepSeek only (reliable, predictable costs)');
  console.log('   🎨 Rich data: Icons, versions, categories preserved\n');
  
  const extractor = new SerpDeepSeekExtractor();
  await extractor.runSerpDeepSeekExtraction();
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ SERP DeepSeek extraction completed successfully!');
      console.log('🤖 DeepSeek proved reliable for SERP app processing');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 SERP DeepSeek extraction failed:', error);
      process.exit(1);
    });
}

module.exports = { SerpDeepSeekExtractor };