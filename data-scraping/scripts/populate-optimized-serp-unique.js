/**
 * Populate Optimized serp_unique_apps Table
 * Copy all valuable data from serp_apps excluding bulky device/language arrays
 */

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class OptimizedSerpPopulator {
  constructor() {
    this.loadUniqueAppIds();
  }

  loadUniqueAppIds() {
    const listFile = './data-scraping/features-output/serp-unique-apps-for-extraction.json';
    if (!fs.existsSync(listFile)) {
      throw new Error('❌ Unique apps list not found. Run compare-serp-itunes.js first.');
    }
    
    const data = JSON.parse(fs.readFileSync(listFile, 'utf8'));
    this.uniqueAppIds = new Set(data.apps.map(app => app.bundle_id));
    console.log(`📋 Loaded ${this.uniqueAppIds.size} unique SERP app IDs`);
  }

  async populateOptimizedTable() {
    console.log('🚀 Populating optimized serp_unique_apps table...\n');

    try {
      // Step 1: Get all SERP apps data for unique apps
      const serpAppsData = await this.getUniqueSerpAppsData();
      
      // Step 2: Transform and insert optimized data
      await this.insertOptimizedData(serpAppsData);
      
      // Step 3: Verify the optimized table
      await this.verifyOptimizedTable();
      
      console.log('\n🎉 Optimized serp_unique_apps table populated successfully!');

    } catch (error) {
      console.error('❌ Population failed:', error);
      throw error;
    }
  }

  async getUniqueSerpAppsData() {
    console.log('📊 Fetching complete SERP apps data for unique apps...');

    // Get all SERP apps
    const { data: allSerpApps, error } = await supabase
      .from('serp_apps')
      .select('*')
      .order('bundle_id');

    if (error) throw error;

    // Filter to only unique apps
    const uniqueSerpApps = allSerpApps.filter(app => 
      this.uniqueAppIds.has(app.bundle_id)
    );

    console.log(`   📱 Total SERP apps: ${allSerpApps.length}`);
    console.log(`   🎯 Unique apps found: ${uniqueSerpApps.length}`);
    console.log(`   📋 Expected unique apps: ${this.uniqueAppIds.size}`);

    return uniqueSerpApps;
  }

  async insertOptimizedData(serpAppsData) {
    console.log('\n📥 Inserting optimized data (excluding bulky device/language arrays)...');

    // Transform data for insertion - exclude bulky fields
    const dataForInsertion = serpAppsData.map(app => ({
      // Core app info
      bundle_id: app.bundle_id,
      source: app.source,
      query_term: app.query_term,
      title: app.title,
      developer: app.developer,
      developer_id: app.developer_id,
      developer_url: app.developer_url,
      version: app.version,
      
      // Pricing
      price: app.price,
      price_value: app.price_value,
      formatted_price: app.formatted_price,
      
      // Ratings
      rating: app.rating,
      rating_count: app.rating_count,
      rating_type: app.rating_type,
      
      // Media assets
      icon_url: app.icon_url,
      icon_url_60: app.icon_url_60,
      icon_url_512: app.icon_url_512,
      all_logos: app.all_logos,
      screenshots: app.screenshots,
      
      // Metadata
      description: app.description,
      release_date: app.release_date,
      latest_version_release_date: app.latest_version_release_date,
      age_rating: app.age_rating,
      release_note: app.release_note,
      minimum_os_version: app.minimum_os_version,
      
      // Categories
      category: app.category,
      primary_genre: app.primary_genre,
      genres: app.genres,
      
      // Technical info (excluding bulky arrays)
      size_in_bytes: app.size_in_bytes,
      features: app.features,
      advisories: app.advisories,
      game_center_enabled: app.game_center_enabled,
      vpp_license: app.vpp_license,
      
      // Search position
      position: app.position,
      rank: app.rank,
      serp_link: app.serp_link,
      
      // Tracking
      first_scraped: app.first_scraped,
      last_scraped: app.last_scraped,
      scrape_count: app.scrape_count,
      
      // Raw data (keeping for debugging, but could be excluded too)
      raw_data: app.raw_data,
      
      // Processing status
      features_extracted: false,
      extraction_attempted: false,
      extraction_error: null
    }));

    console.log(`   📊 Preparing to insert ${dataForInsertion.length} optimized records...`);
    console.log(`   💾 Excluded: supported_devices, supported_languages (saves storage)`);

    // Insert in batches
    const batchSize = 50;
    let totalInserted = 0;

    for (let i = 0; i < dataForInsertion.length; i += batchSize) {
      const batch = dataForInsertion.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(dataForInsertion.length / batchSize);

      console.log(`   📦 Inserting batch ${batchNumber}/${totalBatches} (${batch.length} apps)...`);

      try {
        const { data, error } = await supabase
          .from('serp_unique_apps')
          .insert(batch);

        if (error) {
          console.error(`   ❌ Batch ${batchNumber} failed:`, error);
          
          // Try individual insertions
          for (const app of batch) {
            try {
              const { error: singleError } = await supabase
                .from('serp_unique_apps')
                .insert([app]);
              
              if (singleError) {
                console.log(`     ❌ Failed: ${app.title} (${app.bundle_id})`);
                console.log(`        Error: ${singleError.message}`);
              } else {
                totalInserted++;
              }
            } catch (singleErr) {
              console.log(`     ❌ Exception: ${app.title} - ${singleErr.message}`);
            }
          }
        } else {
          totalInserted += batch.length;
          console.log(`   ✅ Batch ${batchNumber} inserted successfully`);
        }

      } catch (batchError) {
        console.error(`   ❌ Batch ${batchNumber} exception:`, batchError);
      }

      // Delay between batches
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n   🎉 Total optimized records inserted: ${totalInserted}/${dataForInsertion.length}`);
  }

  async verifyOptimizedTable() {
    console.log('\n🔍 Verifying optimized serp_unique_apps table...');

    try {
      // Check total count
      const { count, error: countError } = await supabase
        .from('serp_unique_apps')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.log(`   ❌ Count verification failed: ${countError.message}`);
        return;
      }

      console.log(`   📊 Total records: ${count}`);

      // Check sample with media assets
      const { data: sample, error: sampleError } = await supabase
        .from('serp_unique_apps')
        .select(`
          bundle_id, title, developer, category, 
          icon_url, screenshots, version, age_rating,
          features_extracted, price_value, rating
        `)
        .limit(5);

      if (sampleError) {
        console.log(`   ❌ Sample verification failed: ${sampleError.message}`);
        return;
      }

      console.log(`   📋 Sample records with media assets:`);
      sample.forEach((app, i) => {
        console.log(`     ${i + 1}. ${app.title} (${app.bundle_id})`);
        console.log(`        Developer: ${app.developer}`);
        console.log(`        Category: ${app.category}`);
        console.log(`        Version: ${app.version}`);
        console.log(`        Age Rating: ${app.age_rating}`);
        console.log(`        Price: ${app.price_value}`);
        console.log(`        Rating: ${app.rating}`);
        console.log(`        Has icon: ${app.icon_url ? 'Yes' : 'No'}`);
        console.log(`        Has screenshots: ${app.screenshots ? 'Yes' : 'No'}`);
        console.log(`        Features extracted: ${app.features_extracted}`);
        console.log('');
      });

      // Check data completeness
      const { data: completeness, error: compError } = await supabase
        .from('serp_unique_apps')
        .select('bundle_id, icon_url, screenshots, price_value, rating, description, version, age_rating')
        .limit(100);

      if (!compError && completeness) {
        const stats = {
          hasIcon: completeness.filter(app => app.icon_url && app.icon_url.length > 0).length,
          hasScreenshots: completeness.filter(app => app.screenshots).length,
          hasPrice: completeness.filter(app => app.price_value !== null).length,
          hasRating: completeness.filter(app => app.rating && app.rating > 0).length,
          hasDescription: completeness.filter(app => app.description && app.description.length > 20).length,
          hasVersion: completeness.filter(app => app.version && app.version.length > 0).length,
          hasAgeRating: completeness.filter(app => app.age_rating && app.age_rating.length > 0).length
        };

        console.log(`   📊 Data completeness (sample of 100):`);
        console.log(`     Has icon URL: ${stats.hasIcon}/100 (${stats.hasIcon}%)`);
        console.log(`     Has screenshots: ${stats.hasScreenshots}/100 (${stats.hasScreenshots}%)`);
        console.log(`     Has price data: ${stats.hasPrice}/100 (${stats.hasPrice}%)`);
        console.log(`     Has rating: ${stats.hasRating}/100 (${stats.hasRating}%)`);
        console.log(`     Has description: ${stats.hasDescription}/100 (${stats.hasDescription}%)`);
        console.log(`     Has version: ${stats.hasVersion}/100 (${stats.hasVersion}%)`);
        console.log(`     Has age rating: ${stats.hasAgeRating}/100 (${stats.hasAgeRating}%)`);
      }

    } catch (error) {
      console.error('   ❌ Verification failed:', error);
    }
  }
}

// CLI interface
async function main() {
  const populator = new OptimizedSerpPopulator();
  await populator.populateOptimizedTable();
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Optimized serp_unique_apps population completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Population failed:', error);
      process.exit(1);
    });
}

module.exports = { OptimizedSerpPopulator };