/**
 * Resume Upload Script - Fixed Schema Mapping
 * Properly maps merged data fields to database schema
 */

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const BATCH_SIZE = 50; // Smaller batches for reliability
const DELAY_BETWEEN_BATCHES = 500; // 0.5 second delay

class FixedResumeUploader {
  constructor() {
    this.stats = {
      startTime: new Date(),
      itunes: { total: 0, uploaded: 0, skipped: 0, errors: 0 },
      serp: { total: 0, uploaded: 0, skipped: 0, errors: 0 }
    };
  }

  // Map merged data fields to database schema
  mapItunesApp(app) {
    return {
      bundle_id: app.bundle_id,
      source: app.source || 'itunes_api',
      query_term: app.category || app.primary_genre,
      title: app.title,
      developer: app.developer,
      developer_id: app.developer_id,
      developer_url: null, // Not in merged data
      version: app.version,
      price: app.price,
      formatted_price: app.formatted_price,
      currency: app.currency,
      rating: app.rating,
      rating_count: app.rating_count,
      icon_url: app.icon_url,
      screenshots: null, // Not in merged data
      description: app.description,
      release_date: app.release_date,
      last_updated: null, // Not in merged data
      age_rating: app.age_rating,
      genres: app.genres,
      category: app.category || app.primary_genre, // Map primary_genre to category
      size_bytes: app.size_bytes,
      languages_supported: null, // Not in merged data
      rank: null, // Not in merged data
      first_scraped: app.scraped_at || new Date().toISOString(),
      last_scraped: new Date().toISOString(),
      scrape_count: 1,
      raw_data: app.raw_data
    };
  }

  mapSerpApp(app) {
    // SERP apps have different schema - need to check SERP table structure
    return {
      bundle_id: app.bundle_id,
      source: app.source || 'serp_api',
      query_term: app.category || app.query,
      title: app.title,
      developer: app.developer,
      rating: app.rating,
      rating_count: app.rating_count,
      price: app.price,
      formatted_price: app.formatted_price,
      description: app.description,
      category: app.category,
      first_scraped: app.scraped_at || new Date().toISOString(),
      last_scraped: new Date().toISOString(),
      scrape_count: 1,
      raw_data: app.raw_data
    };
  }

  async resumeUpload() {
    console.log('🔄 Resuming upload with proper field mapping...\n');
    
    // Check current status
    await this.checkCurrentStatus();
    
    // Resume iTunes upload with proper mapping
    await this.resumeItunesUpload();
    
    // Resume SERP upload with proper mapping
    await this.resumeSerpUpload();
    
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
    console.log('📱 RESUMING ITUNES UPLOAD (FIXED MAPPING)');
    console.log('==========================================');
    
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
      
      // Filter out existing apps and map fields
      const newApps = apps
        .filter(app => !existingIds.has(app.bundle_id))
        .map(app => this.mapItunesApp(app));
      
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
    console.log('\n🔍 RESUMING SERP UPLOAD (FIXED MAPPING)');
    console.log('=======================================');
    
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
      
      // Filter out existing apps and map fields
      const newApps = apps
        .filter(app => !existingIds.has(app.bundle_id))
        .map(app => this.mapSerpApp(app));
      
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
          console.error(`❌ Batch ${i + 1} error:`, error.message.substring(0, 100));
          errors += batch.length;
        } else {
          uploaded += batch.length;
          console.log(`✅ Batch ${i + 1}: ${batch.length} apps uploaded successfully`);
        }
        
      } catch (error) {
        console.error(`❌ Batch ${i + 1} exception:`, error.message.substring(0, 100));
        errors += batch.length;
      }
      
      // Progress indicator
      const progress = ((i + 1) / totalBatches * 100).toFixed(1);
      console.log(`   Progress: ${progress}% | Uploaded: ${uploaded} | Errors: ${errors}`);
      
      // Delay between batches
      if (i < totalBatches - 1) {
        await this.sleep(DELAY_BETWEEN_BATCHES);
      }
      
      // Checkpoint every 10 batches
      if ((i + 1) % 10 === 0) {
        console.log(`📊 Checkpoint: ${uploaded} uploaded so far...`);
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
    console.log('🎉 FIXED RESUME UPLOAD COMPLETE!');
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
      console.log('🚀 Ready for embedding generation!');
    } else {
      console.log(`⚠️  Current: ${totalUploaded} apps (target: 9,183)`);
    }
    
    console.log('='.repeat(60));
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the fixed resume upload
async function main() {
  const uploader = new FixedResumeUploader();
  await uploader.resumeUpload();
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Fixed resume upload completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Fixed resume upload failed:', error);
      process.exit(1);
    });
}

module.exports = { FixedResumeUploader };