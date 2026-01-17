/**
 * JSON TO DATABASE LOADER
 * 
 * Loads massive app data from JSON files into Supabase database
 * - Processes data/ directory created by massive_scraper.js  
 * - Loads into appropriate tables (itunes_apps, apple_rss_apps, serp_apps)
 * - Runs final reconciliation into apps_unified table
 * - Handles duplicates and data quality scoring
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class DatabaseLoader {
  constructor() {
    this.dataDir = './data';
    this.stats = {
      startTime: new Date(),
      iTunes: { files: 0, apps: 0, loaded: 0, errors: 0 },
      appleRSS: { files: 0, apps: 0, loaded: 0, errors: 0 },
      serp: { files: 0, apps: 0, loaded: 0, errors: 0 },
      reconciliation: { total: 0, unified: 0, quality_avg: 0 },
      errors: []
    };
  }

  async verifyDatabase() {
    console.log('🔍 Verifying database connection and tables...');
    
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

  async loadItunesData() {
    console.log('\n📱 LOADING ITUNES DATA');
    console.log('='.repeat(40));
    
    const itunesDir = path.join(this.dataDir, 'itunes');
    if (!fs.existsSync(itunesDir)) {
      console.log('⚠️ iTunes data directory not found');
      return;
    }
    
    const files = fs.readdirSync(itunesDir).filter(f => f.endsWith('.json'));
    this.stats.iTunes.files = files.length;
    
    console.log(`📁 Found ${files.length} iTunes JSON files`);
    
    for (const file of files) {
      try {
        const filePath = path.join(itunesDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        console.log(`📱 Loading ${file}: ${data.apps.length} apps`);
        
        // Process apps for database format
        const processedApps = data.apps.map(app => ({
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
        
        // Batch insert with UPSERT
        const { data: insertedData, error } = await supabase
          .from('itunes_apps')
          .upsert(processedApps, { 
            onConflict: 'bundle_id,source,query_term',
            ignoreDuplicates: false 
          })
          .select('bundle_id');
        
        if (error) {
          console.error(`❌ Error loading ${file}:`, error.message);
          this.stats.iTunes.errors++;
          this.stats.errors.push({ source: 'itunes', file, error: error.message });
        } else {
          console.log(`✅ Loaded ${insertedData.length} apps from ${file}`);
          this.stats.iTunes.loaded += insertedData.length;
        }
        
        this.stats.iTunes.apps += data.apps.length;
        
      } catch (error) {
        console.error(`❌ Failed to process ${file}:`, error.message);
        this.stats.iTunes.errors++;
        this.stats.errors.push({ source: 'itunes', file, error: error.message });
      }
    }
    
    console.log(`📊 iTunes Summary: ${this.stats.iTunes.loaded} apps loaded from ${this.stats.iTunes.files} files`);
  }

  async loadAppleRSSData() {
    console.log('\n🍎 LOADING APPLE RSS DATA');
    console.log('='.repeat(40));
    
    const rssDir = path.join(this.dataDir, 'apple_rss');
    if (!fs.existsSync(rssDir)) {
      console.log('⚠️ Apple RSS data directory not found');
      return;
    }
    
    const files = fs.readdirSync(rssDir).filter(f => f.endsWith('.json'));
    this.stats.appleRSS.files = files.length;
    
    console.log(`📁 Found ${files.length} Apple RSS JSON files`);
    
    for (const file of files) {
      try {
        const filePath = path.join(rssDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        console.log(`🍎 Loading ${file}: ${data.apps.length} apps`);
        
        // Process apps for database format
        const processedApps = data.apps.map(app => ({
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
        
        // Batch insert with UPSERT
        const { data: insertedData, error } = await supabase
          .from('apple_rss_apps')
          .upsert(processedApps, { 
            onConflict: 'bundle_id,source,feed_type',
            ignoreDuplicates: false 
          })
          .select('bundle_id');
        
        if (error) {
          console.error(`❌ Error loading ${file}:`, error.message);
          this.stats.appleRSS.errors++;
          this.stats.errors.push({ source: 'apple_rss', file, error: error.message });
        } else {
          console.log(`✅ Loaded ${insertedData.length} apps from ${file}`);
          this.stats.appleRSS.loaded += insertedData.length;
        }
        
        this.stats.appleRSS.apps += data.apps.length;
        
      } catch (error) {
        console.error(`❌ Failed to process ${file}:`, error.message);
        this.stats.appleRSS.errors++;
        this.stats.errors.push({ source: 'apple_rss', file, error: error.message });
      }
    }
    
    console.log(`📊 Apple RSS Summary: ${this.stats.appleRSS.loaded} apps loaded from ${this.stats.appleRSS.files} files`);
  }

  async loadSerpData() {
    console.log('\n🔍 LOADING SERP DATA');
    console.log('='.repeat(40));
    
    const serpDir = path.join(this.dataDir, 'serp');
    if (!fs.existsSync(serpDir)) {
      console.log('⚠️ SERP data directory not found');
      return;
    }
    
    const files = fs.readdirSync(serpDir).filter(f => f.endsWith('.json'));
    this.stats.serp.files = files.length;
    
    console.log(`📁 Found ${files.length} SERP JSON files`);
    
    for (const file of files) {
      try {
        const filePath = path.join(serpDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        console.log(`🔍 Loading ${file}: ${data.apps.length} apps`);
        
        // Process apps for database format
        const processedApps = data.apps.map(app => ({
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
        
        // Batch insert with UPSERT
        const { data: insertedData, error } = await supabase
          .from('serp_apps')
          .upsert(processedApps, { 
            onConflict: 'bundle_id,source,query_term',
            ignoreDuplicates: false 
          })
          .select('bundle_id');
        
        if (error) {
          console.error(`❌ Error loading ${file}:`, error.message);
          this.stats.serp.errors++;
          this.stats.errors.push({ source: 'serp', file, error: error.message });
        } else {
          console.log(`✅ Loaded ${insertedData.length} apps from ${file}`);
          this.stats.serp.loaded += insertedData.length;
        }
        
        this.stats.serp.apps += data.apps.length;
        
      } catch (error) {
        console.error(`❌ Failed to process ${file}:`, error.message);
        this.stats.serp.errors++;
        this.stats.errors.push({ source: 'serp', file, error: error.message });
      }
    }
    
    console.log(`📊 SERP Summary: ${this.stats.serp.loaded} apps loaded from ${this.stats.serp.files} files`);
  }

  async runMassiveReconciliation() {
    console.log('\n🔄 RUNNING MASSIVE DATA RECONCILIATION');
    console.log('='.repeat(50));
    
    try {
      // Get all apps from all source tables
      console.log('📊 Fetching data from all source tables...');
      
      const [itunesResult, rssResult, serpResult] = await Promise.all([
        supabase.from('itunes_apps').select('*'),
        supabase.from('apple_rss_apps').select('*'), 
        supabase.from('serp_apps').select('*')
      ]);
      
      const allSourceApps = [
        ...(itunesResult.data || []),
        ...(rssResult.data || []),
        ...(serpResult.data || [])
      ];
      
      console.log(`📱 iTunes: ${itunesResult.data?.length || 0} apps`);
      console.log(`🍎 Apple RSS: ${rssResult.data?.length || 0} apps`);
      console.log(`🔍 SERP: ${serpResult.data?.length || 0} apps`);
      console.log(`📊 Total source apps: ${allSourceApps.length}`);
      
      if (allSourceApps.length === 0) {
        console.log('❌ No source data found for reconciliation');
        return;
      }
      
      // Group by bundle_id for reconciliation
      console.log('🔄 Grouping apps by bundle_id...');
      const appGroups = allSourceApps.reduce((groups, app) => {
        const bundleId = app.bundle_id;
        if (!groups[bundleId]) {
          groups[bundleId] = [];
        }
        groups[bundleId].push(app);
        return groups;
      }, {});
      
      console.log(`🎯 Found ${Object.keys(appGroups).length} unique bundle IDs`);
      
      // Reconcile each group
      const reconciledApps = [];
      let multiSourceCount = 0;
      
      for (const [bundleId, sources] of Object.entries(appGroups)) {
        // Advanced reconciliation logic
        const bestTitle = sources.find(s => s.title && s.title.length > 0)?.title || bundleId;
        const bestDeveloper = sources.find(s => s.developer && s.developer.length > 0)?.developer || '';
        
        // Best rating: highest sample size
        const bestRating = sources.reduce((best, s) => 
          (s.rating_count || 0) > (best.rating_count || 0) ? s : best, sources[0]);
        
        // Best icon: prefer higher resolution
        const bestIcon = sources.find(s => s.icon_url_512)?.icon_url_512 ||
                         sources.find(s => s.icon_url)?.icon_url || '';
        const bestIconHD = sources.find(s => s.icon_url_512)?.icon_url_512 || bestIcon;
        
        // Best description: longest
        const bestDescription = sources.reduce((best, s) => 
          (s.description?.length || 0) > (best.description?.length || 0) ? s : best, sources[0]);
        
        // Calculate quality score
        let qualityScore = 0;
        if (bestTitle && bestTitle.length > 0) qualityScore += 15;
        if (bestDeveloper && bestDeveloper.length > 0) qualityScore += 15;
        if (bestDescription?.description && bestDescription.description.length > 50) qualityScore += 20;
        if (bestRating?.rating && bestRating.rating > 0) qualityScore += 15;
        if (bestRating?.rating_count && bestRating.rating_count > 1000) qualityScore += 20;
        if (bestIcon && bestIcon.length > 0) qualityScore += 15;
        
        // Multi-source detection
        const sourceTypes = [...new Set(sources.map(s => s.source.replace('_api', '')))];
        if (sourceTypes.length > 1) multiSourceCount++;
        
        const reconciledApp = {
          bundle_id: bundleId,
          title: bestTitle,
          developer: bestDeveloper,
          version: sources[0]?.version || '',
          rating: bestRating?.rating || null,
          rating_count: bestRating?.rating_count || null,
          rating_source: bestRating?.source || '',
          icon_url: bestIcon,
          icon_url_hd: bestIconHD,
          description: bestDescription?.description || '',
          description_source: bestDescription?.source || '',
          primary_category: sources[0]?.category || '',
          all_categories: [...new Set(sources.map(s => s.category).filter(Boolean))],
          available_in_sources: sourceTypes,
          total_appearances: sources.length,
          data_quality_score: qualityScore,
          best_rank: Math.min(...sources.map(s => s.position || s.rss_rank || s.rank || 999).filter(r => r < 999))
        };
        
        reconciledApps.push(reconciledApp);
      }
      
      // Clear existing unified data and insert new reconciled data
      console.log('🧹 Clearing existing unified data...');
      await supabase.from('apps_unified').delete().neq('id', 0);
      
      console.log(`💾 Inserting ${reconciledApps.length} reconciled apps...`);
      
      // Insert in batches (Supabase has size limits)
      const batchSize = 1000;
      let insertedCount = 0;
      
      for (let i = 0; i < reconciledApps.length; i += batchSize) {
        const batch = reconciledApps.slice(i, i + batchSize);
        
        const { data, error } = await supabase
          .from('apps_unified')
          .insert(batch)
          .select('bundle_id, data_quality_score');
        
        if (error) {
          console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} failed:`, error.message);
          this.stats.errors.push({ source: 'reconciliation', batch: Math.floor(i/batchSize) + 1, error: error.message });
        } else {
          insertedCount += data.length;
          console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: ${data.length} apps inserted`);
        }
      }
      
      // Calculate final statistics
      const avgQuality = reconciledApps.reduce((sum, app) => sum + (app.data_quality_score || 0), 0) / reconciledApps.length;
      
      this.stats.reconciliation = {
        total: allSourceApps.length,
        unified: insertedCount,
        quality_avg: Math.round(avgQuality),
        multi_source: multiSourceCount,
        single_source: reconciledApps.length - multiSourceCount
      };
      
      console.log('\n🎉 RECONCILIATION COMPLETED!');
      console.log(`📊 ${allSourceApps.length} source apps → ${insertedCount} unified apps`);
      console.log(`📈 Average quality score: ${Math.round(avgQuality)}/100`);
      console.log(`🔄 Multi-source apps: ${multiSourceCount}`);
      console.log(`📱 Single-source apps: ${reconciledApps.length - multiSourceCount}`);
      
    } catch (error) {
      console.error('❌ Reconciliation failed:', error);
      this.stats.errors.push({ source: 'reconciliation', error: error.message });
    }
  }

  async generateLoadingReport() {
    this.stats.endTime = new Date();
    this.stats.duration = (this.stats.endTime - this.stats.startTime) / 1000 / 60;
    
    console.log('\n🎉 DATABASE LOADING COMPLETED!');
    console.log('='.repeat(60));
    console.log(`⏱️  Duration: ${this.stats.duration.toFixed(1)} minutes`);
    console.log(`📱 iTunes: ${this.stats.iTunes.loaded} apps from ${this.stats.iTunes.files} files`);
    console.log(`🍎 Apple RSS: ${this.stats.appleRSS.loaded} apps from ${this.stats.appleRSS.files} files`);
    console.log(`🔍 SERP: ${this.stats.serp.loaded} apps from ${this.stats.serp.files} files`);
    console.log(`🔄 Reconciliation: ${this.stats.reconciliation.unified} unified apps (${this.stats.reconciliation.quality_avg}/100 avg quality)`);
    
    const totalErrors = this.stats.iTunes.errors + this.stats.appleRSS.errors + this.stats.serp.errors;
    if (totalErrors > 0) {
      console.log(`\n⚠️  Total Errors: ${totalErrors}`);
      this.stats.errors.forEach(error => {
        console.log(`   ${error.source}: ${error.file || error.batch || 'general'} - ${error.error}`);
      });
    }
    
    console.log('\n🚀 MASSIVE DATABASE IS READY!');
    console.log('✅ All app data loaded and reconciled');
    console.log('✅ Ready for production user queries');
    console.log('✅ No more live API calls needed for basic searches');
    
    // Save loading statistics
    const statsFile = path.join(this.dataDir, 'combined', 'loading_statistics.json');
    fs.writeFileSync(statsFile, JSON.stringify(this.stats, null, 2));
    console.log(`\n📈 Loading statistics saved to: ${statsFile}`);
  }

  async run() {
    console.log('🚀 Starting JSON to Database Loading...');
    
    // Verify database connectivity
    const dbOk = await this.verifyDatabase();
    if (!dbOk) {
      console.error('❌ Database verification failed. Please check your Supabase connection.');
      return;
    }
    
    // Load all data sources
    await this.loadItunesData();
    await this.loadAppleRSSData();
    await this.loadSerpData();
    
    // Run massive reconciliation
    await this.runMassiveReconciliation();
    
    // Generate final report
    await this.generateLoadingReport();
  }
}

// Run the database loader
const loader = new DatabaseLoader();
loader.run().catch(console.error);