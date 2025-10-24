/**
 * Populate Corrected serp_unique_apps Table
 * Copy all data from serp_apps for the 814 unique apps with complete schema
 */

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class CorrectedSerpPopulator {
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

  async populateCorrectedTable() {
    console.log('🚀 Populating corrected serp_unique_apps table...\n');

    try {
      // Step 1: Get all SERP apps data for unique apps
      const serpAppsData = await this.getUniqueSerpAppsData();
      
      // Step 2: Transform and insert data
      await this.insertCompleteData(serpAppsData);
      
      // Step 3: Verify the corrected table
      await this.verifyCorrectedTable();
      
      console.log('\n🎉 Corrected serp_unique_apps table populated successfully!');

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

    if (uniqueSerpApps.length !== this.uniqueAppIds.size) {
      console.log(`   ⚠️  Mismatch: ${this.uniqueAppIds.size - uniqueSerpApps.length} apps not found in serp_apps`);
    }

    return uniqueSerpApps;
  }

  async insertCompleteData(serpAppsData) {
    console.log('\n📥 Inserting complete data into corrected table...');

    // Transform data for insertion - add processing status columns
    const dataForInsertion = serpAppsData.map(app => ({
      // Copy all original columns
      bundle_id: app.bundle_id,
      source: app.source,
      query_term: app.query_term,
      title: app.title,
      developer: app.developer,
      developer_id: app.developer_id,
      developer_url: app.developer_url,
      version: app.version,
      price: app.price,
      price_value: app.price_value,
      formatted_price: app.formatted_price,
      rating: app.rating,
      rating_count: app.rating_count,
      rating_type: app.rating_type,
      icon_url: app.icon_url,
      icon_url_60: app.icon_url_60,
      icon_url_512: app.icon_url_512,
      all_logos: app.all_logos,
      screenshots: app.screenshots,
      description: app.description,
      release_date: app.release_date,
      latest_version_release_date: app.latest_version_release_date,
      age_rating: app.age_rating,
      release_note: app.release_note,
      minimum_os_version: app.minimum_os_version,
      category: app.category,
      primary_genre: app.primary_genre,
      genres: app.genres,
      size_in_bytes: app.size_in_bytes,
      supported_languages: app.supported_languages,
      supported_devices: app.supported_devices,
      features: app.features,
      advisories: app.advisories,
      game_center_enabled: app.game_center_enabled,
      vpp_license: app.vpp_license,
      position: app.position,
      rank: app.rank,
      serp_link: app.serp_link,
      first_scraped: app.first_scraped,
      last_scraped: app.last_scraped,
      scrape_count: app.scrape_count,
      raw_data: app.raw_data,
      
      // Add processing status columns
      features_extracted: false,
      extraction_attempted: false,
      extraction_error: null
    }));

    console.log(`   📊 Preparing to insert ${dataForInsertion.length} complete records...`);

    // Insert in batches
    const batchSize = 50; // Smaller batches for complete data
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
          
          // Try individual insertions for debugging
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
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n   🎉 Total complete records inserted: ${totalInserted}/${dataForInsertion.length}`);
  }

  async verifyCorrectedTable() {
    console.log('\n🔍 Verifying corrected serp_unique_apps table...');

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

      // Check sample with complete data
      const { data: sample, error: sampleError } = await supabase
        .from('serp_unique_apps')
        .select('bundle_id, title, developer, category, icon_url, screenshots, features_extracted, price_value, rating')
        .limit(3);

      if (sampleError) {
        console.log(`   ❌ Sample verification failed: ${sampleError.message}`);
        return;
      }

      console.log(`   📋 Sample records with complete data:`);
      sample.forEach((app, i) => {
        console.log(`     ${i + 1}. ${app.title} (${app.bundle_id})`);
        console.log(`        Developer: ${app.developer}`);
        console.log(`        Category: ${app.category}`);
        console.log(`        Price: ${app.price_value}`);
        console.log(`        Rating: ${app.rating}`);
        console.log(`        Has icon: ${app.icon_url ? 'Yes' : 'No'}`);
        console.log(`        Features extracted: ${app.features_extracted}`);
        console.log('');
      });

      // Check data completeness
      const { data: completeness, error: compError } = await supabase
        .from('serp_unique_apps')
        .select('bundle_id, icon_url, screenshots, price_value, rating, description')
        .limit(100);

      if (!compError && completeness) {
        const stats = {
          hasIcon: completeness.filter(app => app.icon_url && app.icon_url.length > 0).length,
          hasScreenshots: completeness.filter(app => app.screenshots).length,
          hasPrice: completeness.filter(app => app.price_value !== null).length,
          hasRating: completeness.filter(app => app.rating && app.rating > 0).length,
          hasDescription: completeness.filter(app => app.description && app.description.length > 20).length
        };

        console.log(`   📊 Data completeness (sample of 100):`);
        console.log(`     Has icon URL: ${stats.hasIcon}/100 (${stats.hasIcon}%)`);
        console.log(`     Has screenshots: ${stats.hasScreenshots}/100 (${stats.hasScreenshots}%)`);
        console.log(`     Has price data: ${stats.hasPrice}/100 (${stats.hasPrice}%)`);
        console.log(`     Has rating: ${stats.hasRating}/100 (${stats.hasRating}%)`);
        console.log(`     Has description: ${stats.hasDescription}/100 (${stats.hasDescription}%)`);
      }

    } catch (error) {
      console.error('   ❌ Verification failed:', error);
    }
  }
}

// CLI interface
async function main() {
  const populator = new CorrectedSerpPopulator();
  await populator.populateCorrectedTable();
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Corrected serp_unique_apps population completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Population failed:', error);
      process.exit(1);
    });
}

module.exports = { CorrectedSerpPopulator };