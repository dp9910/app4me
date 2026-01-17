/**
 * Extract Features for Unique SERP Apps
 * Process only the 814 unique apps from SERP that aren't in iTunes
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { enrichAppData } = require('./feature-engineering-node.js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class SerpUniqueFeatureExtractor {
  constructor() {
    this.outputDir = './data-scraping/features-output/serp-unique';
    this.backupInterval = 25; // Backup every 25 batches for smaller dataset
    this.ensureOutputDir();
    this.loadUniqueApps();
    this.resumeData = this.loadResumeData();
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      console.log(`📁 Created output directory: ${this.outputDir}`);
    }
  }

  loadUniqueApps() {
    const listFile = './data-scraping/features-output/serp-unique-apps-for-extraction.json';
    if (!fs.existsSync(listFile)) {
      throw new Error('❌ Unique apps list not found. Run compare-serp-itunes.js first.');
    }
    
    const data = JSON.parse(fs.readFileSync(listFile, 'utf8'));
    this.uniqueApps = data.apps;
    console.log(`📋 Loaded ${this.uniqueApps.length} unique SERP apps for extraction`);
  }

  loadResumeData() {
    const resumeFile = path.join(this.outputDir, 'serp-extraction-progress.json');
    if (fs.existsSync(resumeFile)) {
      const data = JSON.parse(fs.readFileSync(resumeFile, 'utf8'));
      console.log(`📄 Loaded resume data: ${data.processedApps} apps completed`);
      return data;
    }
    return {
      processedApps: 0,
      completedBatches: 0,
      lastProcessedId: null,
      startTime: new Date().toISOString(),
      allResults: []
    };
  }

  saveResumeData() {
    const resumeFile = path.join(this.outputDir, 'serp-extraction-progress.json');
    fs.writeFileSync(resumeFile, JSON.stringify(this.resumeData, null, 2));
  }

  async runSerpExtraction() {
    console.log('🚀 Starting SERP Unique Apps Feature Extraction...\n');

    try {
      const totalApps = this.uniqueApps.length;
      console.log(`📊 Total unique SERP apps: ${totalApps}`);
      console.log(`📊 Already processed: ${this.resumeData.processedApps}`);
      console.log(`📊 Remaining: ${totalApps - this.resumeData.processedApps}\n`);

      if (this.resumeData.processedApps >= totalApps) {
        console.log('✅ All SERP apps already processed!');
        return;
      }

      // Get remaining apps to process
      const remainingApps = this.uniqueApps.slice(this.resumeData.processedApps);
      
      // Process in batches
      const batchSize = 5; // Apps per batch
      let currentIndex = 0;

      while (currentIndex < remainingApps.length) {
        const batch = remainingApps.slice(currentIndex, currentIndex + batchSize);
        const batchNumber = Math.floor(this.resumeData.processedApps / batchSize) + Math.floor(currentIndex / batchSize) + 1;
        
        await this.processBatch(batch, batchNumber);
        currentIndex += batch.length;

        // Periodic backup
        if (batchNumber % this.backupInterval === 0) {
          await this.createPeriodicBackup();
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Final processing
      await this.createFinalSummary();
      console.log('\n🎉 SERP unique apps feature extraction completed!');

    } catch (error) {
      console.error('❌ SERP extraction failed:', error);
      this.saveResumeData();
      throw error;
    }
  }

  async processBatch(apps, batchNumber) {
    console.log(`\n🔧 Processing SERP batch ${batchNumber} (${apps.length} apps)...`);
    
    const batchResults = [];
    const batchStartTime = Date.now();

    for (let i = 0; i < apps.length; i++) {
      const app = apps[i];
      console.log(`   ${i + 1}/${apps.length}: ${app.title} (${app.category})`);

      try {
        const appStartTime = Date.now();
        
        // Convert SERP app format to expected format
        const appForExtraction = {
          bundle_id: app.bundle_id,
          title: app.title,
          developer: app.developer,
          category: app.category,
          description: app.description,
          rating: app.rating,
          rating_count: app.rating_count,
          formatted_price: 'Free', // Most SERP apps don't have price data
          icon_url: null,
          release_date: null,
          size_bytes: null
        };

        const features = await enrichAppData(appForExtraction);
        const appDuration = Date.now() - appStartTime;

        const result = {
          app_id: app.bundle_id,
          app_title: app.title,
          app_category: app.category,
          app_source: 'serp_apps',
          features: features,
          processing_time_ms: appDuration,
          success: true,
          processed_at: new Date().toISOString()
        };

        batchResults.push(result);
        this.resumeData.allResults.push(result);
        this.resumeData.processedApps++;
        
        console.log(`     ✅ Success (${appDuration}ms)`);

        // Rate limiting between apps
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (error) {
        console.error(`     ❌ Failed: ${error.message}`);
        const failedResult = {
          app_id: app.bundle_id,
          app_title: app.title,
          app_category: app.category,
          app_source: 'serp_apps',
          error: error.message,
          success: false,
          processed_at: new Date().toISOString()
        };
        
        batchResults.push(failedResult);
        this.resumeData.allResults.push(failedResult);
        this.resumeData.processedApps++;
      }
    }

    const batchDuration = Date.now() - batchStartTime;
    const successful = batchResults.filter(r => r.success).length;
    
    console.log(`   ✅ Batch ${batchNumber} complete: ${successful}/${apps.length} successful (${batchDuration}ms)`);

    // Save batch results
    this.saveBatchResults(batchNumber, batchResults);
    this.resumeData.completedBatches++;
    this.saveResumeData();
  }

  saveBatchResults(batchNumber, results) {
    const batchFile = path.join(this.outputDir, `serp-batch-${String(batchNumber).padStart(3, '0')}-results.json`);
    
    const batchData = {
      batch_number: batchNumber,
      source: 'serp_apps',
      processed_at: new Date().toISOString(),
      total_apps: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results: results
    };

    fs.writeFileSync(batchFile, JSON.stringify(batchData, null, 2));
    console.log(`   💾 SERP batch ${batchNumber} saved to serp-batch-${String(batchNumber).padStart(3, '0')}-results.json`);
  }

  async createPeriodicBackup() {
    console.log('\n💾 Creating SERP periodic backup...');
    
    const backupFile = path.join(this.outputDir, `serp-backup-${Date.now()}.json`);
    const successful = this.resumeData.allResults.filter(r => r.success);
    
    const backupData = {
      backup_created: new Date().toISOString(),
      source: 'serp_apps_unique',
      total_processed: this.resumeData.processedApps,
      successful_count: successful.length,
      failed_count: this.resumeData.processedApps - successful.length,
      processing_started: this.resumeData.startTime,
      progress_percentage: (this.resumeData.processedApps / this.uniqueApps.length * 100).toFixed(1),
      results: this.resumeData.allResults
    };

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`   ✅ SERP backup created: ${path.basename(backupFile)}`);
    console.log(`   📊 Progress: ${backupData.progress_percentage}% (${this.resumeData.processedApps}/${this.uniqueApps.length})`);
  }

  async createFinalSummary() {
    console.log('\n📊 Creating SERP final summary...');
    
    const successful = this.resumeData.allResults.filter(r => r.success);
    const failed = this.resumeData.allResults.filter(r => !r.success);
    
    const summary = {
      extraction_completed: new Date().toISOString(),
      processing_started: this.resumeData.startTime,
      source: 'serp_apps_unique',
      total_duration_hours: (Date.now() - new Date(this.resumeData.startTime).getTime()) / (1000 * 60 * 60),
      statistics: {
        total_unique_serp_apps: this.uniqueApps.length,
        total_processed: this.resumeData.processedApps,
        successful: successful.length,
        failed: failed.length,
        success_rate: (successful.length / this.resumeData.processedApps * 100).toFixed(2) + '%',
        completed_batches: this.resumeData.completedBatches
      },
      performance: {
        avg_processing_time_ms: successful.length > 0 ? 
          successful.reduce((sum, r) => sum + (r.processing_time_ms || 0), 0) / successful.length : 0,
        total_features_extracted: successful.length,
        total_keywords_extracted: successful.reduce((sum, r) => {
          return sum + Object.keys(r.features?.keywords_tfidf?.keywords || {}).length;
        }, 0)
      },
      ready_for_upload: true
    };

    // Save final results
    const finalFile = path.join(this.outputDir, 'serp-final-extraction-results.json');
    const finalData = {
      ...summary,
      all_results: this.resumeData.allResults
    };
    
    fs.writeFileSync(finalFile, JSON.stringify(finalData, null, 2));
    
    // Save summary only
    const summaryFile = path.join(this.outputDir, 'serp-extraction-summary.json');
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

    console.log(`   ✅ SERP final results: ${finalFile}`);
    console.log(`   ✅ SERP summary: ${summaryFile}`);
    console.log(`\n📈 SERP Final Statistics:`);
    console.log(`   Total processed: ${summary.statistics.total_processed}`);
    console.log(`   Success rate: ${summary.statistics.success_rate}`);
    console.log(`   Total duration: ${summary.total_duration_hours.toFixed(2)} hours`);
    console.log(`   Ready for cloud upload: ${summary.ready_for_upload}`);
  }
}

// CLI interface
async function main() {
  const extractor = new SerpUniqueFeatureExtractor();
  
  // Check for resume flag
  const shouldResume = process.argv.includes('--resume');
  
  if (shouldResume && extractor.resumeData.processedApps > 0) {
    console.log('🔄 Resuming SERP extraction from previous run...');
  } else if (shouldResume) {
    console.log('ℹ️  No previous SERP extraction found, starting fresh...');
  }
  
  await extractor.runSerpExtraction();
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ SERP unique feature extraction completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 SERP extraction failed:', error);
      process.exit(1);
    });
}

module.exports = { SerpUniqueFeatureExtractor };