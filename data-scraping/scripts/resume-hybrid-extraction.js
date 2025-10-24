/**
 * Resume Hybrid iTunes Feature Extraction 
 * Strategy: Try Gemini 2.0-flash-exp first, fallback to DeepSeek on quota limits
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { enrichAppDataHybrid, getAPIStats, resetAPIStats } = require('./feature-engineering-hybrid.js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class HybridFeatureExtractor {
  constructor() {
    this.outputDir = './data-scraping/features-output/hybrid-extraction';
    this.resumeOffset = 135; // Apps already processed
    this.backupInterval = 15; // More frequent backups
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
    
    if (fs.existsSync(resumeFile)) {
      const data = JSON.parse(fs.readFileSync(resumeFile, 'utf8'));
      console.log(`📄 Resuming hybrid extraction: ${data.processedApps + this.resumeOffset} total apps completed`);
      return data;
    }
    
    return {
      processedApps: 0,
      totalProcessedIncludingOriginal: this.resumeOffset,
      completedBatches: 0,
      lastProcessedId: null,
      startTime: new Date().toISOString(),
      strategy: 'hybrid_gemini_deepseek_fallback',
      originalAppsCompleted: this.resumeOffset,
      allResults: []
    };
  }

  saveResumeData() {
    const resumeFile = path.join(this.outputDir, 'extraction-progress.json');
    const dataWithStats = {
      ...this.resumeData,
      api_stats: getAPIStats()
    };
    fs.writeFileSync(resumeFile, JSON.stringify(dataWithStats, null, 2));
  }

  async runHybridExtraction() {
    console.log('🚀 Starting HYBRID Feature Extraction Pipeline...');
    console.log('   📊 Original pipeline completed: 135 apps (27 batches)');
    console.log('   💡 Strategy: Gemini 2.0-flash-exp → DeepSeek fallback');
    console.log('   💰 Cost: ~$0.18 (Gemini) or ~$0.53 (if fallback needed)');
    console.log('   ⚡ Speed: 869ms (Gemini) or 2,643ms (DeepSeek)\n');

    resetAPIStats(); // Start fresh API tracking

    try {
      const totalApps = await this.getTotalUniqueApps();
      const remainingApps = totalApps - this.resumeOffset - this.resumeData.processedApps;
      
      console.log(`📊 Extraction Status:`);
      console.log(`   Total iTunes apps: ${totalApps}`);
      console.log(`   Original pipeline: ${this.resumeOffset} apps`);
      console.log(`   Hybrid pipeline: ${this.resumeData.processedApps} apps`);
      console.log(`   Remaining: ${remainingApps} apps\n`);

      if (remainingApps <= 0) {
        console.log('✅ All apps already processed!');
        return;
      }

      // Estimate completion time based on hybrid performance
      const estimatedMinutes = Math.round((remainingApps * 1000) / 1000 / 60); // Conservative estimate
      console.log(`⏱️  Estimated completion: ${estimatedMinutes} minutes (${(estimatedMinutes/60).toFixed(1)} hours)\n`);

      // Process in adaptive batches
      const batchSize = 10; // Conservative batch size for API management
      let currentOffset = this.resumeOffset + this.resumeData.processedApps;

      while (currentOffset < totalApps) {
        const batch = await this.getNextBatch(batchSize, currentOffset);
        
        if (batch.length === 0) {
          console.log('✅ No more apps to process');
          break;
        }

        const batchNumber = this.resumeData.completedBatches + 1;
        await this.processHybridBatch(batch, batchNumber);
        currentOffset += batch.length;

        // Show API statistics after each batch
        this.logAPIStats();

        // Periodic backup
        if (this.resumeData.completedBatches % this.backupInterval === 0) {
          await this.createPeriodicBackup();
        }

        // Adaptive delay based on API performance
        const stats = getAPIStats();
        const delay = stats.gemini_quota_errors > 0 ? 2000 : 1000; // Longer delay if hitting quotas
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      await this.createFinalSummary();
      console.log('\n🎉 HYBRID extraction completed!');

    } catch (error) {
      console.error('❌ Hybrid extraction failed:', error);
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
    console.log(`📱 Fetching hybrid batch at offset ${offset}...`);
    
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

    const filteredApps = apps.filter(app => {
      const alreadyProcessed = this.resumeData.allResults.some(r => r.app_id === app.bundle_id);
      return !alreadyProcessed;
    });

    return filteredApps;
  }

  async processHybridBatch(apps, batchNumber) {
    console.log(`\n🔬 Processing HYBRID batch ${batchNumber} (${apps.length} apps)...`);
    
    const batchStartTime = Date.now();

    // Process apps in parallel with hybrid strategy
    const appPromises = apps.map(async (app) => {
      try {
        const appStartTime = Date.now();
        const features = await enrichAppDataHybrid(app);
        const appDuration = Date.now() - appStartTime;

        return {
          app_id: app.bundle_id,
          app_title: app.title,
          app_category: app.category,
          features: features,
          processing_time_ms: appDuration,
          api_used: features.llm_features?.api_used || 'unknown',
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
    
    // Show API breakdown for this batch
    const geminiCount = results.filter(r => r.api_used && r.api_used.includes('gemini')).length;
    const deepseekCount = results.filter(r => r.api_used && r.api_used.includes('deepseek')).length;
    
    console.log(`   ✅ Batch ${batchNumber} complete: ${successful}/${apps.length} successful`);
    console.log(`   ⚡ Performance: ${avgTime}ms avg/app, ${batchDuration}ms total`);
    console.log(`   🔄 API usage: ${geminiCount} Gemini, ${deepseekCount} DeepSeek`);
    console.log(`   📊 Total progress: ${this.resumeData.totalProcessedIncludingOriginal} apps`);

    this.saveBatchResults(batchNumber, results);
    this.resumeData.completedBatches++;
    this.saveResumeData();
  }

  logAPIStats() {
    const stats = getAPIStats();
    console.log(`   📈 API Stats: ${stats.gemini_success_rate} Gemini success, ${stats.deepseek_fallback_rate} DeepSeek fallback`);
    if (parseFloat(stats.quota_error_rate) > 0) {
      console.log(`   ⚠️  Quota errors: ${stats.quota_error_rate}`);
    }
  }

  saveBatchResults(batchNumber, results) {
    const batchFile = path.join(this.outputDir, `batch-${String(batchNumber).padStart(4, '0')}-results.json`);
    
    const successful = results.filter(r => r.success);
    const avgTime = successful.length > 0 
      ? Math.round(successful.reduce((sum, r) => sum + (r.processing_time_ms || 0), 0) / successful.length)
      : 0;

    const batchData = {
      batch_number: batchNumber,
      extraction_type: "hybrid_gemini_deepseek",
      processed_at: new Date().toISOString(),
      total_apps: results.length,
      successful: successful.length,
      failed: results.filter(r => !r.success).length,
      avg_processing_time_ms: avgTime,
      api_breakdown: {
        gemini_used: results.filter(r => r.api_used && r.api_used.includes('gemini')).length,
        deepseek_used: results.filter(r => r.api_used && r.api_used.includes('deepseek')).length
      },
      api_stats: getAPIStats(),
      results: results
    };

    fs.writeFileSync(batchFile, JSON.stringify(batchData, null, 2));
    console.log(`   💾 Hybrid batch ${batchNumber} saved`);
  }

  async createPeriodicBackup() {
    console.log('\n💾 Creating periodic backup...');
    
    const backupFile = path.join(this.outputDir, `backup-${Date.now()}.json`);
    const successful = this.resumeData.allResults.filter(r => r.success);
    
    const backupData = {
      backup_created: new Date().toISOString(),
      extraction_type: "hybrid_gemini_deepseek",
      original_apps_completed: this.resumeOffset,
      hybrid_apps_processed: this.resumeData.processedApps,
      total_processed: this.resumeData.totalProcessedIncludingOriginal,
      successful_count: successful.length,
      failed_count: this.resumeData.processedApps - successful.length,
      processing_started: this.resumeData.startTime,
      api_stats: getAPIStats(),
      results: this.resumeData.allResults
    };

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`   ✅ Backup created: ${path.basename(backupFile)}`);
    console.log(`   📊 Progress: ${this.resumeData.totalProcessedIncludingOriginal} total apps processed`);
    this.logAPIStats();
  }

  async createFinalSummary() {
    console.log('\n📊 Creating final hybrid summary...');
    
    const successful = this.resumeData.allResults.filter(r => r.success);
    const failed = this.resumeData.allResults.filter(r => !r.success);
    const stats = getAPIStats();
    
    const avgProcessingTime = successful.length > 0 
      ? Math.round(successful.reduce((sum, r) => sum + (r.processing_time_ms || 0), 0) / successful.length)
      : 0;
    
    const summary = {
      extraction_completed: new Date().toISOString(),
      extraction_type: "hybrid_gemini_deepseek_fallback",
      processing_started: this.resumeData.startTime,
      total_duration_hours: (Date.now() - new Date(this.resumeData.startTime).getTime()) / (1000 * 60 * 60),
      
      statistics: {
        original_pipeline_apps: this.resumeOffset,
        hybrid_pipeline_apps: this.resumeData.processedApps,
        total_apps_processed: this.resumeData.totalProcessedIncludingOriginal,
        hybrid_successful: successful.length,
        hybrid_failed: failed.length,
        hybrid_success_rate: (successful.length / this.resumeData.processedApps * 100).toFixed(2) + '%',
        completed_batches: this.resumeData.completedBatches
      },
      
      api_performance: {
        ...stats,
        avg_processing_time_ms: avgProcessingTime,
        strategy_effectiveness: parseFloat(stats.gemini_success_rate) > 50 ? 'Gemini primary' : 'DeepSeek heavy fallback',
        cost_estimate: parseFloat(stats.gemini_success_rate) > 50 ? '$0.18-0.35' : '$0.35-0.53'
      },
      
      ready_for_upload: true
    };

    const finalFile = path.join(this.outputDir, 'final-hybrid-results.json');
    const finalData = {
      ...summary,
      all_hybrid_results: this.resumeData.allResults
    };
    
    fs.writeFileSync(finalFile, JSON.stringify(finalData, null, 2));
    
    const summaryFile = path.join(this.outputDir, 'hybrid-summary.json');
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

    console.log(`   ✅ Final results: ${finalFile}`);
    console.log(`   ✅ Summary: ${summaryFile}`);
    console.log(`\n📈 FINAL HYBRID Results:`);
    console.log(`   Original pipeline: ${summary.statistics.original_pipeline_apps} apps`);
    console.log(`   Hybrid pipeline: ${summary.statistics.hybrid_pipeline_apps} apps`);
    console.log(`   Total processed: ${summary.statistics.total_apps_processed} apps`);
    console.log(`   Success rate: ${summary.statistics.hybrid_success_rate}`);
    console.log(`   Duration: ${summary.total_duration_hours.toFixed(2)} hours`);
    console.log(`   Average speed: ${avgProcessingTime}ms per app`);
    console.log(`   🎯 API Performance:`);
    console.log(`     Gemini success: ${stats.gemini_success_rate}`);
    console.log(`     DeepSeek fallback: ${stats.deepseek_fallback_rate}`);
    console.log(`     Strategy: ${summary.api_performance.strategy_effectiveness}`);
    console.log(`     Estimated cost: ${summary.api_performance.cost_estimate}`);
  }
}

// CLI interface
async function main() {
  console.log('🎯 HYBRID EXTRACTION: iTunes feature extraction with smart fallback');
  console.log('   📁 Original 27 batches (135 apps) archived');
  console.log('   💡 Gemini 2.0-flash-exp → DeepSeek fallback strategy\n');
  
  const extractor = new HybridFeatureExtractor();
  await extractor.runHybridExtraction();
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ HYBRID extraction completed successfully!');
      console.log('🎯 Optimal cost/performance balance achieved');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 HYBRID extraction failed:', error);
      process.exit(1);
    });
}

module.exports = { HybridFeatureExtractor };