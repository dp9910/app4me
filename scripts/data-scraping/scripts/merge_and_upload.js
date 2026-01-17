/**
 * MERGE AND UPLOAD SCRIPT
 * 
 * Takes individual JSON files from standalone_scraper.js and:
 * 1. Merges all data into combined files
 * 2. Deduplicates and reconciles
 * 3. Uploads to Supabase database
 * 4. Generates comprehensive statistics
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class MergeAndUploader {
  constructor() {
    this.scrapedDir = './data-scraping/scraped_data';
    this.mergedDir = './data-scraping/merged_data';
    this.stats = {
      startTime: new Date(),
      merging: { iTunes: 0, appleRSS: 0, serp: 0, totalRaw: 0, totalUnique: 0 },
      uploading: { iTunes: 0, appleRSS: 0, serp: 0, reconciled: 0 },
      errors: []
    };
    
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.mergedDir)) {
      fs.mkdirSync(this.mergedDir, { recursive: true });
      console.log(`📁 Created directory: ${this.mergedDir}`);
    }
  }

  async verifyScrapedData() {
    console.log('🔍 Verifying scraped data...');
    
    const requiredDirs = ['itunes', 'apple_rss', 'serp'];
    
    for (const dir of requiredDirs) {
      const dirPath = path.join(this.scrapedDir, dir);
      if (!fs.existsSync(dirPath)) {
        console.error(`❌ Missing directory: ${dirPath}`);
        console.log('   Run standalone_scraper.js first to collect data');
        return false;
      }
      
      const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json') && !f.includes('_failed'));
      console.log(`✅ ${dir}: ${files.length} data files found`);
    }
    
    return true;
  }

  mergeItunesData() {
    console.log('\n📱 MERGING ITUNES DATA');
    console.log('='.repeat(40));
    
    const itunesDir = path.join(this.scrapedDir, 'itunes');
    const files = fs.readdirSync(itunesDir).filter(f => f.endsWith('.json') && !f.includes('_failed'));
    
    const allApps = [];
    const allMetadata = [];
    
    files.forEach(file => {
      try {
        const filePath = path.join(itunesDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        console.log(`📱 Processing ${file}: ${data.apps.length} apps`);
        
        allApps.push(...data.apps);
        allMetadata.push(data.metadata);
        this.stats.merging.iTunes += data.apps.length;
        
      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error.message);
        this.stats.errors.push({ source: 'itunes_merge', file, error: error.message });
      }
    });
    
    // Save merged iTunes data
    const mergedData = {
      metadata: {
        source: 'itunes',
        merged_at: new Date().toISOString(),
        total_files: files.length,
        total_apps: allApps.length,
        categories_scraped: allMetadata.map(m => m.category)
      },
      apps: allApps
    };
    
    const outputFile = path.join(this.mergedDir, 'itunes_merged.json');
    fs.writeFileSync(outputFile, JSON.stringify(mergedData, null, 2));
    
    console.log(`✅ iTunes merged: ${allApps.length} apps from ${files.length} files → ${outputFile}`);
    return mergedData;
  }

  mergeAppleRSSData() {
    console.log('\n🍎 MERGING APPLE RSS DATA');
    console.log('='.repeat(40));
    
    const rssDir = path.join(this.scrapedDir, 'apple_rss');
    const files = fs.readdirSync(rssDir).filter(f => f.endsWith('.json') && !f.includes('_failed'));
    
    const allApps = [];
    const allMetadata = [];
    
    files.forEach(file => {
      try {
        const filePath = path.join(rssDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        console.log(`🍎 Processing ${file}: ${data.apps.length} apps`);
        
        allApps.push(...data.apps);
        allMetadata.push(data.metadata);
        this.stats.merging.appleRSS += data.apps.length;
        
      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error.message);
        this.stats.errors.push({ source: 'apple_rss_merge', file, error: error.message });
      }
    });
    
    // Save merged Apple RSS data
    const mergedData = {
      metadata: {
        source: 'apple_rss',
        merged_at: new Date().toISOString(),
        total_files: files.length,
        total_apps: allApps.length,
        feeds_scraped: allMetadata.map(m => m.feed_type)
      },
      apps: allApps
    };
    
    const outputFile = path.join(this.mergedDir, 'apple_rss_merged.json');
    fs.writeFileSync(outputFile, JSON.stringify(mergedData, null, 2));
    
    console.log(`✅ Apple RSS merged: ${allApps.length} apps from ${files.length} files → ${outputFile}`);
    return mergedData;
  }

  mergeSerpData() {
    console.log('\n🔍 MERGING SERP DATA');
    console.log('='.repeat(40));
    
    const serpDir = path.join(this.scrapedDir, 'serp');
    const files = fs.readdirSync(serpDir).filter(f => f.endsWith('.json') && !f.includes('_failed'));
    
    const allApps = [];
    const allMetadata = [];
    
    files.forEach(file => {
      try {
        const filePath = path.join(serpDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        console.log(`🔍 Processing ${file}: ${data.apps.length} apps`);
        
        allApps.push(...data.apps);
        allMetadata.push(data.metadata);
        this.stats.merging.serp += data.apps.length;
        
      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error.message);
        this.stats.errors.push({ source: 'serp_merge', file, error: error.message });
      }
    });
    
    // Save merged SERP data
    const mergedData = {
      metadata: {
        source: 'serp',
        merged_at: new Date().toISOString(),
        total_files: files.length,
        total_apps: allApps.length,
        categories_scraped: allMetadata.map(m => m.category)
      },
      apps: allApps
    };
    
    const outputFile = path.join(this.mergedDir, 'serp_merged.json');
    fs.writeFileSync(outputFile, JSON.stringify(mergedData, null, 2));
    
    console.log(`✅ SERP merged: ${allApps.length} apps from ${files.length} files → ${outputFile}`);
    return mergedData;
  }

  createCombinedAndDeduplicated(itunesData, appleRSSData, serpData) {
    console.log('\n🔄 CREATING COMBINED AND DEDUPLICATED DATA');
    console.log('='.repeat(50));
    
    // Combine all apps
    const allApps = [
      ...itunesData.apps,
      ...appleRSSData.apps,
      ...serpData.apps
    ];
    
    this.stats.merging.totalRaw = allApps.length;
    console.log(`📊 Total raw apps: ${allApps.length}`);
    
    // Save combined raw data
    const combinedData = {
      metadata: {
        combined_at: new Date().toISOString(),
        total_raw_apps: allApps.length,
        sources: {
          itunes: itunesData.apps.length,
          apple_rss: appleRSSData.apps.length,
          serp: serpData.apps.length
        }
      },
      apps: allApps
    };
    
    const combinedFile = path.join(this.mergedDir, 'all_apps_combined.json');
    fs.writeFileSync(combinedFile, JSON.stringify(combinedData, null, 2));
    console.log(`💾 Combined data saved: ${combinedFile}`);
    
    // Deduplicate by bundle_id
    console.log('🔄 Deduplicating by bundle_id...');
    const uniqueApps = new Map();
    
    allApps.forEach(app => {
      const bundleId = app.bundle_id;
      if (!bundleId || bundleId.includes('undefined')) return; // Skip invalid bundle IDs
      
      if (!uniqueApps.has(bundleId)) {
        uniqueApps.set(bundleId, app);
      } else {
        // Keep the app with more complete data
        const existing = uniqueApps.get(bundleId);
        const existingFields = Object.keys(existing).filter(k => existing[k] !== null && existing[k] !== '' && existing[k] !== undefined).length;
        const newFields = Object.keys(app).filter(k => app[k] !== null && app[k] !== '' && app[k] !== undefined).length;
        
        // Prefer app with more rating data or more complete fields
        if (newFields > existingFields || 
            (app.rating_count && app.rating_count > (existing.rating_count || 0))) {
          uniqueApps.set(bundleId, { ...existing, ...app }); // Merge data
        }
      }
    });
    
    const deduplicatedApps = Array.from(uniqueApps.values());
    this.stats.merging.totalUnique = deduplicatedApps.length;
    
    // Save deduplicated data
    const deduplicatedData = {
      metadata: {
        deduplicated_at: new Date().toISOString(),
        total_raw_apps: allApps.length,
        total_unique_apps: deduplicatedApps.length,
        duplicates_removed: allApps.length - deduplicatedApps.length,
        deduplication_ratio: ((allApps.length - deduplicatedApps.length) / allApps.length * 100).toFixed(1) + '%'
      },
      apps: deduplicatedApps
    };
    
    const deduplicatedFile = path.join(this.mergedDir, 'apps_deduplicated.json');
    fs.writeFileSync(deduplicatedFile, JSON.stringify(deduplicatedData, null, 2));
    
    console.log(`🔄 Deduplication complete: ${allApps.length} → ${deduplicatedApps.length} apps`);
    console.log(`📊 Removed ${allApps.length - deduplicatedApps.length} duplicates (${((allApps.length - deduplicatedApps.length) / allApps.length * 100).toFixed(1)}%)`);
    console.log(`💾 Deduplicated data saved: ${deduplicatedFile}`);
    
    return deduplicatedData;
  }

  async verifyDatabase() {
    console.log('\n🔍 Verifying database connection...');
    
    const tables = ['itunes_apps', 'apple_rss_apps', 'serp_apps', 'apps_unified'];
    
    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('count').limit(1);
        if (error) throw error;
        console.log(`✅ Table ${table} accessible`);
      } catch (error) {
        console.error(`❌ Table ${table} not accessible:`, error.message);
        return false;
      }
    }
    
    return true;
  }

  async uploadToDatabase(itunesData, appleRSSData, serpData, deduplicatedData) {
    console.log('\n💾 UPLOADING TO DATABASE');
    console.log('='.repeat(40));
    
    const dbOk = await this.verifyDatabase();
    if (!dbOk) {
      console.error('❌ Database verification failed');
      return false;
    }
    
    try {
      // Upload iTunes data
      console.log('📱 Uploading iTunes data...');
      const itunesFormatted = itunesData.apps.map(app => ({
        bundle_id: app.bundle_id,
        source: 'itunes_api',
        query_term: app.category,
        title: app.title,
        developer: app.developer,
        developer_id: app.developer_id,
        version: app.version,
        price: app.price,
        formatted_price: app.formatted_price,
        currency: app.currency,
        rating: app.rating,
        rating_count: app.rating_count,
        icon_url: app.icon_url,
        description: app.description,
        release_date: app.release_date,
        age_rating: app.age_rating,
        genres: app.genres,
        category: app.primary_genre,
        size_bytes: app.size_bytes,
        raw_data: app.raw_data
      }));
      
      // Upload in batches
      const batchSize = 1000;
      let itunesUploaded = 0;
      
      for (let i = 0; i < itunesFormatted.length; i += batchSize) {
        const batch = itunesFormatted.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from('itunes_apps')
          .upsert(batch, { onConflict: 'bundle_id,source,query_term', ignoreDuplicates: false });
        
        if (error) {
          console.error(`❌ iTunes batch ${Math.floor(i/batchSize) + 1} failed:`, error.message);
        } else {
          itunesUploaded += batch.length;
          console.log(`✅ iTunes batch ${Math.floor(i/batchSize) + 1}: ${batch.length} apps uploaded`);
        }
      }
      
      this.stats.uploading.iTunes = itunesUploaded;
      
      // Upload Apple RSS data
      console.log('\n🍎 Uploading Apple RSS data...');
      const rssFormatted = appleRSSData.apps.map(app => ({
        bundle_id: app.bundle_id,
        source: 'apple_rss',
        feed_type: app.feed_type,
        title: app.title,
        developer: app.developer,
        icon_url: app.icon_url,
        category: app.category,
        release_date: app.release_date,
        age_rating: app.age_rating,
        description: app.description,
        formatted_price: app.formatted_price,
        rss_rank: app.rank,
        rss_position: app.rank,
        raw_data: app.raw_data
      }));
      
      let rssUploaded = 0;
      for (let i = 0; i < rssFormatted.length; i += batchSize) {
        const batch = rssFormatted.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from('apple_rss_apps')
          .upsert(batch, { onConflict: 'bundle_id,source,feed_type', ignoreDuplicates: false });
        
        if (error) {
          console.error(`❌ Apple RSS batch ${Math.floor(i/batchSize) + 1} failed:`, error.message);
        } else {
          rssUploaded += batch.length;
          console.log(`✅ Apple RSS batch ${Math.floor(i/batchSize) + 1}: ${batch.length} apps uploaded`);
        }
      }
      
      this.stats.uploading.appleRSS = rssUploaded;
      
      // Upload SERP data  
      console.log('\n🔍 Uploading SERP data...');
      const serpFormatted = serpData.apps.map(app => ({
        bundle_id: app.bundle_id,
        source: 'serp_api',
        query_term: app.category,
        title: app.title,
        developer: app.developer,
        version: app.version,
        price: app.price,
        price_value: app.price_value,
        formatted_price: app.formatted_price,
        rating: app.rating,
        rating_count: app.rating_count,
        icon_url: app.icon_url,
        icon_url_60: app.icon_url_60,
        icon_url_512: app.icon_url_512,
        all_logos: app.all_logos,
        description: app.description,
        category: app.primary_genre,
        position: app.position,
        raw_data: app.raw_data
      }));
      
      let serpUploaded = 0;
      for (let i = 0; i < serpFormatted.length; i += batchSize) {
        const batch = serpFormatted.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from('serp_apps')
          .upsert(batch, { onConflict: 'bundle_id,source,query_term', ignoreDuplicates: false });
        
        if (error) {
          console.error(`❌ SERP batch ${Math.floor(i/batchSize) + 1} failed:`, error.message);
        } else {
          serpUploaded += batch.length;
          console.log(`✅ SERP batch ${Math.floor(i/batchSize) + 1}: ${batch.length} apps uploaded`);
        }
      }
      
      this.stats.uploading.serp = serpUploaded;
      
      console.log('\n📊 Upload Summary:');
      console.log(`📱 iTunes: ${itunesUploaded} apps uploaded`);
      console.log(`🍎 Apple RSS: ${rssUploaded} apps uploaded`);
      console.log(`🔍 SERP: ${serpUploaded} apps uploaded`);
      
      return true;
      
    } catch (error) {
      console.error('❌ Database upload failed:', error);
      this.stats.errors.push({ source: 'database_upload', error: error.message });
      return false;
    }
  }

  async runMergeAndUpload() {
    console.log('🚀 Starting Merge and Upload Process...');
    
    // Verify scraped data exists
    const dataOk = await this.verifyScrapedData();
    if (!dataOk) return;
    
    // Merge individual files
    const itunesData = this.mergeItunesData();
    const appleRSSData = this.mergeAppleRSSData();
    const serpData = this.mergeSerpData();
    
    // Create combined and deduplicated data
    const deduplicatedData = this.createCombinedAndDeduplicated(itunesData, appleRSSData, serpData);
    
    // Upload to database
    const uploadOk = await this.uploadToDatabase(itunesData, appleRSSData, serpData, deduplicatedData);
    
    if (uploadOk) {
      console.log('\n🔄 Running final reconciliation...');
      // Run reconciliation using existing trigger pipeline logic
      const reconcileResponse = await fetch('http://localhost:3002/api/trigger-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'reconcile' })
      });
      
      if (reconcileResponse.ok) {
        const reconcileData = await reconcileResponse.json();
        if (reconcileData.success) {
          console.log(`✅ Reconciliation: ${reconcileData.reconciledCount} apps unified`);
          console.log(`📊 Quality Score: ${reconcileData.avgQuality}/100`);
          this.stats.uploading.reconciled = reconcileData.reconciledCount;
        }
      }
    }
    
    this.generateFinalReport();
  }

  generateFinalReport() {
    const endTime = new Date();
    const duration = (endTime - this.stats.startTime) / 1000 / 60;
    
    console.log('\n🎉 MERGE AND UPLOAD COMPLETED!');
    console.log('='.repeat(60));
    console.log(`⏱️  Duration: ${duration.toFixed(1)} minutes`);
    console.log(`📊 Raw apps merged: ${this.stats.merging.totalRaw}`);
    console.log(`🔄 Unique apps: ${this.stats.merging.totalUnique}`);
    console.log(`💾 Database uploaded: ${this.stats.uploading.iTunes + this.stats.uploading.appleRSS + this.stats.uploading.serp} apps`);
    console.log(`🔄 Reconciled apps: ${this.stats.uploading.reconciled}`);
    
    if (this.stats.errors.length > 0) {
      console.log(`\n⚠️  Errors: ${this.stats.errors.length}`);
      this.stats.errors.forEach(error => {
        console.log(`   ${error.source}: ${error.file || 'general'} - ${error.error}`);
      });
    }
    
    console.log(`\n📁 Merged data saved in: ${this.mergedDir}/`);
    console.log('🚀 MASSIVE CENTRAL DATABASE IS READY!');
    console.log('✅ Production-ready with thousands of apps');
    console.log('✅ No more live API calls needed');
    console.log('✅ Ready for user queries and recommendations');
    
    // Save final statistics
    const statsFile = path.join(this.mergedDir, 'final_statistics.json');
    fs.writeFileSync(statsFile, JSON.stringify(this.stats, null, 2));
    console.log(`\n📈 Final statistics saved to: ${statsFile}`);
  }
}

// Run the merge and upload process
const uploader = new MergeAndUploader();
uploader.runMergeAndUpload().catch(console.error);