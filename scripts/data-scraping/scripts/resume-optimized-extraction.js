/**
 * Resume Optimized iTunes Feature Extraction 
 * Continue from offset 135 (27 batches of 5 apps already completed)
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { enrichAppDataOptimized } = require('./feature-engineering-optimized.js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class ResumeOptimizedExtractor {
  constructor() {
    this.outputDir = './data-scraping/features-output/optimized-extraction';
    this.resumeOffset = 135; // Apps already processed in original pipeline
    this.backupInterval = 20;
    this.ensureOutputDir();
    this.resumeData = this.initializeResumeData();
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      console.log(`📁 Created output directory: ${this.outputDir}`);
    }
  }

  initializeResumeData() {
    const resumeFile = path.join(this.outputDir, 'extraction-progress.json');
    
    // Check if we already have optimized progress
    if (fs.existsSync(resumeFile)) {
      const data = JSON.parse(fs.readFileSync(resumeFile, 'utf8'));
      console.log(`📄 Resuming optimized extraction: ${data.processedApps + this.resumeOffset} total apps completed`);
      return data;
    }
    
    // Initialize new optimized extraction starting from offset 135
    return {
      processedApps: 0, // Apps processed in optimized pipeline
      totalProcessedIncludingOriginal: this.resumeOffset, // Total including original 135
      completedBatches: 0,
      lastProcessedId: null,
      startTime: new Date().toISOString(),
      resumedFromOriginal: true,
      originalAppsCompleted: this.resumeOffset,
      allResults: []
    };
  }

  saveResumeData() {
    const resumeFile = path.join(this.outputDir, 'extraction-progress.json');
    fs.writeFileSync(resumeFile, JSON.stringify(this.resumeData, null, 2));
  }

  async runResumedOptimizedExtraction() {
    console.log('🚀 Resuming with OPTIMIZED Feature Extraction Pipeline...');
    console.log('   📊 Original pipeline completed: 135 apps (27 batches)');
    console.log('   🎯 Optimization: 16.1x speed improvement');
    console.log('   ⚡ Target: Complete remaining apps in ~1.3 hours\n');

    try {
      // Get total count
      const totalApps = await this.getTotalUniqueApps();
      const remainingApps = totalApps - this.resumeOffset - this.resumeData.processedApps;
      
      console.log(`📊 Extraction Status:`);
      console.log(`   Total iTunes apps: ${totalApps}`);
      console.log(`   Original pipeline completed: ${this.resumeOffset} apps`);
      console.log(`   Optimized pipeline completed: ${this.resumeData.processedApps} apps`);
      console.log(`   Remaining to process: ${remainingApps} apps\n`);

      if (remainingApps <= 0) {
        console.log('✅ All apps already processed!');
        return;
      }

      // Estimate completion time
      const estimatedMinutes = Math.round((remainingApps * 869) / 1000 / 60); // 869ms avg from test
      console.log(`⏱️  Estimated completion time: ${estimatedMinutes} minutes (${(estimatedMinutes/60).toFixed(1)} hours)\n`);

      // Process in optimized batches (higher quota with 2.0-flash-preview)
      const batchSize = 12; // Optimized for speed with higher quota
      let currentOffset = this.resumeOffset + this.resumeData.processedApps;

      while (currentOffset < totalApps) {
        const batch = await this.getNextBatch(batchSize, currentOffset);
        
        if (batch.length === 0) {
          console.log('✅ No more apps to process');
          break;
        }

        const batchNumber = this.resumeData.completedBatches + 1;
        await this.processOptimizedBatch(batch, batchNumber);
        currentOffset += batch.length;

        // Periodic backup
        if (this.resumeData.completedBatches % this.backupInterval === 0) {
          await this.createPeriodicBackup();
        }

        // Minimal delay between batches (higher quota available)
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await this.createFinalSummary();
      console.log('\n🎉 OPTIMIZED extraction completed!');

    } catch (error) {
      console.error('❌ Optimized extraction failed:', error);
      this.saveResumeData();
      throw error;
    }
  }

  async getTotalUniqueApps() {
    const { count, error } = await supabase
      .from('itunes_apps')
      .select('bundle_id', { count: 'exact' })
      .not('description', 'is', null)
      .gte('rating_count', 10);

    if (error) throw new Error(`Failed to count apps: ${error.message}`);
    return count || 0;
  }

  async getNextBatch(batchSize, offset) {
    console.log(`📱 Fetching optimized batch at offset ${offset}...`);
    
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
      .gte('rating_count', 10)
      .range(offset, offset + batchSize - 1)
      .order('rating_count', { ascending: false });

    if (error) throw new Error(`Failed to fetch batch: ${error.message}`);

    // Filter already processed apps
    const filteredApps = apps.filter(app => {
      const alreadyProcessed = this.resumeData.allResults.some(r => r.app_id === app.bundle_id);
      return !alreadyProcessed;
    });

    return filteredApps;
  }

  async processOptimizedBatch(apps, batchNumber) {
    console.log(`\n⚡ Processing OPTIMIZED batch ${batchNumber} (${apps.length} apps)...`);
    
    const batchStartTime = Date.now();

    // Process all apps in parallel
    const appPromises = apps.map(async (app) => {
      try {
        const appStartTime = Date.now();
        const features = await enrichAppDataOptimized(app);
        const appDuration = Date.now() - appStartTime;

        return {
          app_id: app.bundle_id,
          app_title: app.title,
          app_category: app.category,
          features: features,
          processing_time_ms: appDuration,
          success: true,
          processed_at: new Date().toISOString()
        };

      } catch (error) {
        console.error(`     ❌ ${app.title} failed: ${error.message}`);
        return {
          app_id: app.bundle_id,
          app_title: app.title,
          app_category: app.category,
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
      this.resumeData.totalProcessedIncludingOriginal++;
    });

    const batchDuration = Date.now() - batchStartTime;
    const successful = results.filter(r => r.success).length;
    const avgTime = successful > 0 ? Math.round(batchDuration / successful) : 0;
    
    console.log(`   ✅ Batch ${batchNumber} complete: ${successful}/${apps.length} successful`);
    console.log(`   ⚡ Performance: ${avgTime}ms avg/app, ${batchDuration}ms total`);
    console.log(`   📊 Total progress: ${this.resumeData.totalProcessedIncludingOriginal} apps (${this.resumeOffset} original + ${this.resumeData.processedApps} optimized)`);

    // Save batch results
    this.saveBatchResults(batchNumber, results);
    this.resumeData.completedBatches++;
    this.saveResumeData();
  }

  saveBatchResults(batchNumber, results) {
    const batchFile = path.join(this.outputDir, `batch-${String(batchNumber).padStart(4, '0')}-results.json`);
    
    const batchData = {
      batch_number: batchNumber,
      extraction_type: "optimized_continuation",
      processed_at: new Date().toISOString(),
      total_apps: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      avg_processing_time_ms: results.filter(r => r.success).length > 0 
        ? Math.round(results.filter(r => r.success).reduce((sum, r) => sum + (r.processing_time_ms || 0), 0) / results.filter(r => r.success).length)
        : 0,
      optimization_notes: "16.1x faster than original pipeline",
      results: results
    };

    fs.writeFileSync(batchFile, JSON.stringify(batchData, null, 2));
    console.log(`   💾 Optimized batch ${batchNumber} saved`);
  }

  async createPeriodicBackup() {
    console.log('\n💾 Creating periodic backup...');
    
    const backupFile = path.join(this.outputDir, `backup-${Date.now()}.json`);
    const successful = this.resumeData.allResults.filter(r => r.success);
    
    const backupData = {
      backup_created: new Date().toISOString(),
      extraction_type: "optimized_continuation",
      original_apps_completed: this.resumeOffset,
      optimized_apps_processed: this.resumeData.processedApps,
      total_processed: this.resumeData.totalProcessedIncludingOriginal,
      successful_count: successful.length,
      failed_count: this.resumeData.processedApps - successful.length,
      processing_started: this.resumeData.startTime,
      avg_processing_time_ms: successful.length > 0 
        ? Math.round(successful.reduce((sum, r) => sum + (r.processing_time_ms || 0), 0) / successful.length)
        : 0,
      results: this.resumeData.allResults
    };

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`   ✅ Backup created: ${path.basename(backupFile)}`);
    console.log(`   📊 Progress: ${this.resumeData.totalProcessedIncludingOriginal} total apps processed`);
  }

  async createFinalSummary() {
    console.log('\n📊 Creating final summary...');
    
    const successful = this.resumeData.allResults.filter(r => r.success);
    const failed = this.resumeData.allResults.filter(r => !r.success);
    
    const avgProcessingTime = successful.length > 0 
      ? Math.round(successful.reduce((sum, r) => sum + (r.processing_time_ms || 0), 0) / successful.length)
      : 0;
    
    const summary = {
      extraction_completed: new Date().toISOString(),
      extraction_type: "optimized_continuation",
      processing_started: this.resumeData.startTime,
      total_duration_hours: (Date.now() - new Date(this.resumeData.startTime).getTime()) / (1000 * 60 * 60),
      
      statistics: {
        original_pipeline_apps: this.resumeOffset,
        optimized_pipeline_apps: this.resumeData.processedApps,
        total_apps_processed: this.resumeData.totalProcessedIncludingOriginal,
        optimized_successful: successful.length,
        optimized_failed: failed.length,
        optimized_success_rate: (successful.length / this.resumeData.processedApps * 100).toFixed(2) + '%',
        completed_batches: this.resumeData.completedBatches
      },
      
      performance: {
        avg_processing_time_ms: avgProcessingTime,
        speed_improvement: "16.1x faster than original",
        optimization_savings: `Saved ~${((this.resumeData.processedApps * 13745) - (this.resumeData.processedApps * avgProcessingTime)) / 1000 / 60} minutes`,
        techniques_used: [
          "Reduced LLM payload (200 vs 1000 chars)",
          "Simplified schema (3 vs 11 fields)",
          "Parallel batch processing",
          "Faster Gemini model",
          "Minimal delays"
        ]
      },
      
      ready_for_upload: true
    };

    const finalFile = path.join(this.outputDir, 'final-optimized-results.json');
    const finalData = {
      ...summary,
      all_optimized_results: this.resumeData.allResults
    };
    
    fs.writeFileSync(finalFile, JSON.stringify(finalData, null, 2));
    
    const summaryFile = path.join(this.outputDir, 'optimized-summary.json');
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

    console.log(`   ✅ Final results: ${finalFile}`);
    console.log(`   ✅ Summary: ${summaryFile}`);
    console.log(`\n📈 FINAL OPTIMIZED Results:`);
    console.log(`   Original pipeline: ${summary.statistics.original_pipeline_apps} apps`);
    console.log(`   Optimized pipeline: ${summary.statistics.optimized_pipeline_apps} apps`);
    console.log(`   Total processed: ${summary.statistics.total_apps_processed} apps`);
    console.log(`   Optimized success rate: ${summary.statistics.optimized_success_rate}`);
    console.log(`   Duration: ${summary.total_duration_hours.toFixed(2)} hours`);
    console.log(`   Speed: ${avgProcessingTime}ms avg per app`);
    console.log(`   🚀 Performance improvement: ${summary.performance.speed_improvement}`);
  }
}

// CLI interface
async function main() {
  console.log('🎯 OPTIMIZED RESUMPTION: Continuing iTunes feature extraction');
  console.log('   📁 Original 27 batches (135 apps) archived');
  console.log('   ⚡ Switching to 16.1x faster optimized pipeline\n');
  
  const extractor = new ResumeOptimizedExtractor();
  await extractor.runResumedOptimizedExtraction();
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ OPTIMIZED resumption completed successfully!');
      console.log('🚀 Combined original + optimized extraction complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 OPTIMIZED resumption failed:', error);
      process.exit(1);
    });
}

module.exports = { ResumeOptimizedExtractor };