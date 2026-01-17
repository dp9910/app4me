/**
 * Resume Upload Script
 * Completes the upload of remaining apps from merged files to database
 * Handles the missing ~5,000 apps from the interrupted merge process
 */

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const BATCH_SIZE = 100; // Smaller batches for reliability
const DELAY_BETWEEN_BATCHES = 1000; // 1 second delay

class ResumeUploader {
  constructor() {
    this.stats = {
      startTime: new Date(),
      itunes: { total: 0, uploaded: 0, skipped: 0, errors: 0 },
      serp: { total: 0, uploaded: 0, skipped: 0, errors: 0 },
      rss: { total: 0, uploaded: 0, skipped: 0, errors: 0 }
    };
  }

  async resumeUpload() {
    console.log('🔄 Resuming upload of remaining apps...\n');
    
    // Check current database status
    await this.checkCurrentStatus();
    
    // Resume iTunes upload
    await this.resumeItunesUpload();
    
    // Resume SERP upload  
    await this.resumeSerpUpload();
    
    // Verify RSS upload (should be complete)
    await this.verifyRssUpload();
    
    // Final summary
    await this.printFinalSummary();
  }

  async checkCurrentStatus() {
    console.log('📊 Current Database Status:');
    
    const { count: itunes } = await supabase.from('itunes_apps').select('*', { count: 'exact', head: true });
    const { count: rss } = await supabase.from('apple_rss_apps').select('*', { count: 'exact', head: true });
    const { count: serp } = await supabase.from('serp_apps').select('*', { count: 'exact', head: true });
    
    console.log(`📱 iTunes apps: ${itunes} uploaded`);
    console.log(`🍎 Apple RSS apps: ${rss} uploaded`);
    console.log(`🔍 SERP apps: ${serp} uploaded`);
    console.log(`📈 Total: ${itunes + rss + serp} apps\n`);
    
    return { itunes, rss, serp };
  }

  async resumeItunesUpload() {
    console.log('📱 RESUMING ITUNES UPLOAD');
    console.log('================================');
    
    try {
      // Load iTunes merged data
      const itunesData = JSON.parse(fs.readFileSync('./data-scraping/merged_data/itunes_merged.json', 'utf8'));
      const apps = itunesData.apps;
      
      console.log(`📋 Total iTunes apps in file: ${apps.length}`);
      
      // Get existing bundle_ids to avoid duplicates
      const { data: existingApps } = await supabase
        .from('itunes_apps')
        .select('bundle_id');
      
      const existingIds = new Set(existingApps?.map(app => app.bundle_id) || []);
      console.log(`🔍 Found ${existingIds.size} existing iTunes apps`);
      
      // Filter out existing apps
      const newApps = apps.filter(app => !existingIds.has(app.bundle_id));
      console.log(`🆕 New apps to upload: ${newApps.length}`);
      
      this.stats.itunes.total = newApps.length;
      
      if (newApps.length === 0) {
        console.log('✅ iTunes upload already complete!\n');
        return;
      }
      
      // Upload in batches
      await this.uploadInBatches('itunes_apps', newApps, 'iTunes');
      
    } catch (error) {
      console.error('❌ iTunes upload error:', error.message);
      this.stats.itunes.errors++;
    }
  }

  async resumeSerpUpload() {
    console.log('\n🔍 RESUMING SERP UPLOAD');
    console.log('===============================');
    
    try {
      // Load SERP merged data
      const serpData = JSON.parse(fs.readFileSync('./data-scraping/merged_data/serp_merged.json', 'utf8'));
      const apps = serpData.apps;
      
      console.log(`📋 Total SERP apps in file: ${apps.length}`);
      
      // Get existing bundle_ids to avoid duplicates
      const { data: existingApps } = await supabase
        .from('serp_apps')
        .select('bundle_id');
      
      const existingIds = new Set(existingApps?.map(app => app.bundle_id) || []);
      console.log(`🔍 Found ${existingIds.size} existing SERP apps`);
      
      // Filter out existing apps
      const newApps = apps.filter(app => !existingIds.has(app.bundle_id));
      console.log(`🆕 New apps to upload: ${newApps.length}`);
      
      this.stats.serp.total = newApps.length;
      
      if (newApps.length === 0) {
        console.log('✅ SERP upload already complete!\n');
        return;
      }
      
      // Upload in batches
      await this.uploadInBatches('serp_apps', newApps, 'SERP');
      
    } catch (error) {
      console.error('❌ SERP upload error:', error.message);
      this.stats.serp.errors++;
    }
  }

  async verifyRssUpload() {
    console.log('\n🍎 VERIFYING RSS UPLOAD');
    console.log('============================');
    
    try {
      // Load RSS merged data
      const rssData = JSON.parse(fs.readFileSync('./data-scraping/merged_data/apple_rss_merged.json', 'utf8'));
      const apps = rssData.apps;
      
      console.log(`📋 Total RSS apps in file: ${apps.length}`);
      
      const { count: uploaded } = await supabase.from('apple_rss_apps').select('*', { count: 'exact', head: true });
      console.log(`📤 RSS apps uploaded: ${uploaded}`);
      
      if (uploaded >= apps.length) {
        console.log('✅ RSS upload complete!\n');
      } else {
        console.log(`⚠️  Missing ${apps.length - uploaded} RSS apps\n`);
        // Could add RSS resume logic here if needed
      }
      
    } catch (error) {
      console.error('❌ RSS verification error:', error.message);
    }
  }

  async uploadInBatches(tableName, apps, sourceName) {
    const totalBatches = Math.ceil(apps.length / BATCH_SIZE);
    let uploaded = 0;
    let errors = 0;
    
    for (let i = 0; i < totalBatches; i++) {
      const startIdx = i * BATCH_SIZE;
      const endIdx = Math.min(startIdx + BATCH_SIZE, apps.length);
      const batch = apps.slice(startIdx, endIdx);
      
      console.log(`📦 ${sourceName} batch ${i + 1}/${totalBatches}: uploading ${batch.length} apps...`);
      
      try {
        const { data, error } = await supabase
          .from(tableName)
          .insert(batch);
        
        if (error) {
          console.error(`❌ Batch ${i + 1} error:`, error.message);
          errors += batch.length;
        } else {
          uploaded += batch.length;
          console.log(`✅ Batch ${i + 1}: ${batch.length} apps uploaded successfully`);
        }
        
      } catch (error) {
        console.error(`❌ Batch ${i + 1} exception:`, error.message);
        errors += batch.length;
      }
      
      // Progress indicator
      const progress = ((i + 1) / totalBatches * 100).toFixed(1);
      console.log(`   Progress: ${progress}% | Uploaded: ${uploaded} | Errors: ${errors}`);
      
      // Delay between batches to avoid rate limiting
      if (i < totalBatches - 1) {
        await this.sleep(DELAY_BETWEEN_BATCHES);
      }
    }
    
    // Update stats
    if (sourceName === 'iTunes') {
      this.stats.itunes.uploaded = uploaded;
      this.stats.itunes.errors = errors;
    } else if (sourceName === 'SERP') {
      this.stats.serp.uploaded = uploaded;
      this.stats.serp.errors = errors;
    }
    
    console.log(`\n✅ ${sourceName} upload complete: ${uploaded} uploaded, ${errors} errors\n`);
  }

  async printFinalSummary() {
    const duration = ((Date.now() - this.stats.startTime.getTime()) / 1000 / 60).toFixed(1);
    
    console.log('='.repeat(60));
    console.log('🎉 RESUME UPLOAD COMPLETE!');
    console.log('='.repeat(60));
    console.log(`⏱️  Duration: ${duration} minutes`);
    console.log(`📱 iTunes: ${this.stats.itunes.uploaded} uploaded, ${this.stats.itunes.errors} errors`);
    console.log(`🔍 SERP: ${this.stats.serp.uploaded} uploaded, ${this.stats.serp.errors} errors`);
    
    // Final database count
    const finalStatus = await this.checkCurrentStatus();
    const totalUploaded = finalStatus.itunes + finalStatus.rss + finalStatus.serp;
    
    console.log(`📈 Final Total: ${totalUploaded} apps in database`);
    
    if (totalUploaded >= 9000) {
      console.log('🎯 SUCCESS: Target of ~9,000 apps achieved!');
    } else {
      console.log(`⚠️  Still missing ${9183 - totalUploaded} apps from target of 9,183`);
    }
    
    console.log('='.repeat(60));
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the resume upload
async function main() {
  const uploader = new ResumeUploader();
  await uploader.resumeUpload();
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Resume upload completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Resume upload failed:', error);
      process.exit(1);
    });
}

module.exports = { ResumeUploader };