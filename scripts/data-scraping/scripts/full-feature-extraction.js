/**
 * Full Feature Extraction Pipeline
 * Process ALL unique apps from itunes_apps table with periodic backups
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

class FullFeatureExtractor {
  constructor() {
    this.outputDir = './data-scraping/features-output/full-extraction';
    this.backupInterval = 50; // Save backup every 50 batches
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
    const resumeFile = path.join(this.outputDir, 'extraction-progress.json');
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
    const resumeFile = path.join(this.outputDir, 'extraction-progress.json');
    fs.writeFileSync(resumeFile, JSON.stringify(this.resumeData, null, 2));
  }

  async runFullExtraction() {
    console.log('🚀 Starting Full Feature Extraction Pipeline...\n');

    try {
      // Step 1: Get total count and unique apps
      const totalApps = await this.getTotalUniqueApps();
      console.log(`📊 Total unique apps to process: ${totalApps}`);
      console.log(`📊 Already processed: ${this.resumeData.processedApps}`);
      console.log(`📊 Remaining: ${totalApps - this.resumeData.processedApps}\n`);

      if (this.resumeData.processedApps >= totalApps) {
        console.log('✅ All apps already processed!');
        return;
      }

      // Step 2: Process in batches
      const batchSize = 5; // Apps per batch for rate limiting
      let currentOffset = this.resumeData.processedApps;

      while (currentOffset < totalApps) {
        const batch = await this.getNextBatch(batchSize, currentOffset);
        
        if (batch.length === 0) {
          console.log('✅ No more apps to process');
          break;
        }

        await this.processBatch(batch, currentOffset / batchSize + 1);
        currentOffset += batch.length;

        // Periodic backup every 50 batches
        if ((Math.floor(currentOffset / batchSize)) % this.backupInterval === 0) {
          await this.createPeriodicBackup();
        }

        // Rate limiting between batches
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Final processing
      await this.createFinalSummary();
      console.log('\n🎉 Full feature extraction completed!');

    } catch (error) {
      console.error('❌ Full extraction failed:', error);
      this.saveResumeData(); // Save progress before exit
      throw error;
    }
  }

  async getTotalUniqueApps() {
    console.log('📊 Counting unique apps...');
    
    const { count, error } = await supabase
      .from('itunes_apps')
      .select('bundle_id', { count: 'exact' })
      .not('description', 'is', null)
      .gte('rating_count', 10); // Only apps with some activity

    if (error) {
      throw new Error(`Failed to count apps: ${error.message}`);
    }

    return count || 0;
  }

  async getNextBatch(batchSize, offset) {
    console.log(`📱 Fetching batch at offset ${offset}...`);
    
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
      .gte('rating_count', 10)
      .range(offset, offset + batchSize - 1)
      .order('rating_count', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch batch: ${error.message}`);
    }

    // Filter out already processed apps if resuming
    const filteredApps = apps.filter(app => {
      const alreadyProcessed = this.resumeData.allResults.some(r => r.app_id === app.bundle_id);
      return !alreadyProcessed;
    });

    return filteredApps;
  }

  async processBatch(apps, batchNumber) {
    console.log(`\n🔧 Processing batch ${batchNumber} (${apps.length} apps)...`);
    
    const batchResults = [];
    const batchStartTime = Date.now();

    for (let i = 0; i < apps.length; i++) {
      const app = apps[i];
      console.log(`   ${i + 1}/${apps.length}: ${app.title} (${app.category})`);

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
    const batchFile = path.join(this.outputDir, `batch-${String(batchNumber).padStart(4, '0')}-results.json`);
    
    const batchData = {
      batch_number: batchNumber,
      processed_at: new Date().toISOString(),
      total_apps: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results: results
    };

    fs.writeFileSync(batchFile, JSON.stringify(batchData, null, 2));
    console.log(`   💾 Batch ${batchNumber} saved to batch-${String(batchNumber).padStart(4, '0')}-results.json`);
  }

  async createPeriodicBackup() {
    console.log('\n💾 Creating periodic backup...');
    
    const backupFile = path.join(this.outputDir, `backup-${Date.now()}.json`);
    const successful = this.resumeData.allResults.filter(r => r.success);
    
    const backupData = {
      backup_created: new Date().toISOString(),
      total_processed: this.resumeData.processedApps,
      successful_count: successful.length,
      failed_count: this.resumeData.processedApps - successful.length,
      processing_started: this.resumeData.startTime,
      results: this.resumeData.allResults
    };

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`   ✅ Backup created: ${path.basename(backupFile)}`);
    console.log(`   📊 Progress: ${this.resumeData.processedApps} apps processed`);
  }

  async createFinalSummary() {
    console.log('\n📊 Creating final summary...');
    
    const successful = this.resumeData.allResults.filter(r => r.success);
    const failed = this.resumeData.allResults.filter(r => !r.success);
    
    const summary = {
      extraction_completed: new Date().toISOString(),
      processing_started: this.resumeData.startTime,
      total_duration_hours: (Date.now() - new Date(this.resumeData.startTime).getTime()) / (1000 * 60 * 60),
      statistics: {
        total_processed: this.resumeData.processedApps,
        successful: successful.length,
        failed: failed.length,
        success_rate: (successful.length / this.resumeData.processedApps * 100).toFixed(2) + '%',
        completed_batches: this.resumeData.completedBatches
      },
      performance: {
        avg_processing_time_ms: successful.reduce((sum, r) => sum + (r.processing_time_ms || 0), 0) / successful.length,
        total_features_extracted: successful.length,
        total_keywords_extracted: successful.reduce((sum, r) => {
          return sum + Object.keys(r.features?.keywords_tfidf?.keywords || {}).length;
        }, 0)
      },
      ready_for_upload: true
    };

    // Save final results
    const finalFile = path.join(this.outputDir, 'final-extraction-results.json');
    const finalData = {
      ...summary,
      all_results: this.resumeData.allResults
    };
    
    fs.writeFileSync(finalFile, JSON.stringify(finalData, null, 2));
    
    // Save summary only
    const summaryFile = path.join(this.outputDir, 'extraction-summary.json');
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

    console.log(`   ✅ Final results: ${finalFile}`);
    console.log(`   ✅ Summary: ${summaryFile}`);
    console.log(`\n📈 Final Statistics:`);
    console.log(`   Total processed: ${summary.statistics.total_processed}`);
    console.log(`   Success rate: ${summary.statistics.success_rate}`);
    console.log(`   Total duration: ${summary.total_duration_hours.toFixed(2)} hours`);
    console.log(`   Ready for cloud upload: ${summary.ready_for_upload}`);
  }
}

// CLI interface
async function main() {
  const extractor = new FullFeatureExtractor();
  
  // Check for resume flag
  const shouldResume = process.argv.includes('--resume');
  
  if (shouldResume && extractor.resumeData.processedApps > 0) {
    console.log('🔄 Resuming from previous extraction...');
  } else if (shouldResume) {
    console.log('ℹ️  No previous extraction found, starting fresh...');
  }
  
  await extractor.runFullExtraction();
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Full extraction completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Full extraction failed:', error);
      process.exit(1);
    });
}

module.exports = { FullFeatureExtractor };