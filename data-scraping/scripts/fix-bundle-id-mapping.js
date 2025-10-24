/**
 * Fix Bundle ID Mapping Between SERP Tables
 * Map the correct bundle IDs between serp_apps and our unique list
 */

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class BundleIdMapper {
  constructor() {
    this.loadUniqueApps();
  }

  loadUniqueApps() {
    const listFile = './data-scraping/features-output/serp-unique-apps-for-extraction.json';
    if (!fs.existsSync(listFile)) {
      throw new Error('❌ Unique apps list not found.');
    }
    
    const data = JSON.parse(fs.readFileSync(listFile, 'utf8'));
    this.uniqueApps = data.apps;
    console.log(`📋 Loaded ${this.uniqueApps.length} unique apps from comparison`);
  }

  async fixBundleIdMapping() {
    console.log('🔧 Fixing bundle ID mapping between tables...\n');

    try {
      // Step 1: Get all SERP apps to understand the format
      const allSerpApps = await this.getAllSerpApps();
      
      // Step 2: Create mapping between formats
      const mapping = this.createBundleIdMapping(allSerpApps);
      
      // Step 3: Find correct matches
      const correctMatches = this.findCorrectMatches(mapping);
      
      // Step 4: Update the unique apps table with correct data
      await this.updateUniqueAppsWithCorrectData(correctMatches);
      
      console.log('\n🎉 Bundle ID mapping fixed!');

    } catch (error) {
      console.error('❌ Mapping fix failed:', error);
    }
  }

  async getAllSerpApps() {
    console.log('📊 Getting all SERP apps to understand ID formats...');

    const { data: serpApps, error } = await supabase
      .from('serp_apps')
      .select('*')
      .order('bundle_id');

    if (error) throw error;

    console.log(`   📱 Total SERP apps: ${serpApps.length}`);
    
    // Show some examples of bundle_id formats
    console.log(`   📋 Sample bundle_id formats:`);
    serpApps.slice(0, 5).forEach((app, i) => {
      console.log(`     ${i + 1}. ${app.bundle_id} - ${app.title}`);
    });

    return serpApps;
  }

  createBundleIdMapping(serpApps) {
    console.log('\n🔄 Creating bundle ID format mapping...');

    const mapping = new Map();
    
    // For each SERP app, create potential mappings
    serpApps.forEach(app => {
      const originalId = app.bundle_id;
      
      // Convert formats: "serp.social media.0" -> "serp_social_media_0"
      const normalizedId = originalId
        .replace(/\./g, '_')  // Replace dots with underscores
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .toLowerCase();
      
      mapping.set(normalizedId, {
        original: originalId,
        normalized: normalizedId,
        app: app
      });
    });

    console.log(`   📊 Created ${mapping.size} bundle ID mappings`);
    console.log(`   📋 Sample mappings:`);
    
    let count = 0;
    for (const [normalized, data] of mapping.entries()) {
      if (count < 3) {
        console.log(`     ${data.original} -> ${normalized}`);
        count++;
      }
    }

    return mapping;
  }

  findCorrectMatches(mapping) {
    console.log('\n🎯 Finding correct matches for unique apps...');

    const matches = [];
    const unmatchedUnique = [];
    
    this.uniqueApps.forEach(uniqueApp => {
      const uniqueId = uniqueApp.bundle_id;
      
      if (mapping.has(uniqueId)) {
        const match = mapping.get(uniqueId);
        matches.push({
          uniqueApp: uniqueApp,
          serpApp: match.app,
          originalBundleId: match.original,
          normalizedBundleId: uniqueId
        });
      } else {
        unmatchedUnique.push(uniqueApp);
      }
    });

    console.log(`   ✅ Found matches: ${matches.length}/${this.uniqueApps.length}`);
    console.log(`   ❌ Unmatched unique apps: ${unmatchedUnique.length}`);

    if (matches.length > 0) {
      console.log(`   📋 Sample successful matches:`);
      matches.slice(0, 3).forEach((match, i) => {
        const serpApp = match.serpApp;
        console.log(`     ${i + 1}. ${match.uniqueApp.title}`);
        console.log(`        Unique ID: ${match.normalizedBundleId}`);
        console.log(`        SERP ID: ${match.originalBundleId}`);
        console.log(`        Has icon: ${serpApp.icon_url ? 'Yes' : 'No'}`);
        console.log(`        Has version: ${serpApp.version ? 'Yes' : 'No'}`);
      });
    }

    if (unmatchedUnique.length > 0 && unmatchedUnique.length < 10) {
      console.log(`   ❌ Unmatched apps:`);
      unmatchedUnique.forEach((app, i) => {
        console.log(`     ${i + 1}. ${app.title} (${app.bundle_id})`);
      });
    }

    return matches;
  }

  async updateUniqueAppsWithCorrectData(matches) {
    console.log(`\n📥 Updating serp_unique_apps with correct rich data...`);
    console.log(`   📊 Updating ${matches.length} apps with complete data`);

    let successCount = 0;
    let errorCount = 0;

    for (const match of matches) {
      const serpApp = match.serpApp;
      
      // Prepare update data with all the rich fields
      const updateData = {
        // Media assets
        icon_url: serpApp.icon_url,
        icon_url_60: serpApp.icon_url_60,
        icon_url_512: serpApp.icon_url_512,
        all_logos: serpApp.all_logos,
        screenshots: serpApp.screenshots,
        
        // Metadata
        version: serpApp.version,
        age_rating: serpApp.age_rating,
        release_note: serpApp.release_note,
        minimum_os_version: serpApp.minimum_os_version,
        release_date: serpApp.release_date,
        latest_version_release_date: serpApp.latest_version_release_date,
        
        // Categories
        primary_genre: serpApp.primary_genre,
        genres: serpApp.genres,
        
        // Technical
        size_in_bytes: serpApp.size_in_bytes,
        features: serpApp.features,
        advisories: serpApp.advisories,
        
        // Updated timestamp
        updated_at: new Date().toISOString()
      };

      try {
        const { error } = await supabase
          .from('serp_unique_apps')
          .update(updateData)
          .eq('bundle_id', match.normalizedBundleId);

        if (error) {
          console.log(`   ❌ Failed to update ${match.uniqueApp.title}: ${error.message}`);
          errorCount++;
        } else {
          successCount++;
          if (successCount <= 3) {
            console.log(`   ✅ Updated ${match.uniqueApp.title} with rich data`);
          }
        }

      } catch (updateError) {
        console.log(`   ❌ Exception updating ${match.uniqueApp.title}: ${updateError.message}`);
        errorCount++;
      }
    }

    console.log(`\n   📊 Update summary:`);
    console.log(`     ✅ Successfully updated: ${successCount}`);
    console.log(`     ❌ Failed to update: ${errorCount}`);
    console.log(`     📈 Success rate: ${(successCount/matches.length*100).toFixed(1)}%`);
  }

  async verifyRichDataUpdate() {
    console.log('\n🔍 Verifying rich data update...');

    const { data: richApps, error } = await supabase
      .from('serp_unique_apps')
      .select('bundle_id, title, icon_url, version, age_rating, screenshots')
      .not('icon_url', 'is', null)
      .limit(5);

    if (error) {
      console.log(`   ❌ Verification error: ${error.message}`);
      return;
    }

    console.log(`   📱 Apps with rich data after update: ${richApps.length}`);
    
    if (richApps.length > 0) {
      console.log(`   📋 Sample apps with rich data:`);
      richApps.forEach((app, i) => {
        console.log(`     ${i + 1}. ${app.title} (${app.bundle_id})`);
        console.log(`        Icon: ${app.icon_url ? 'Yes' : 'No'}`);
        console.log(`        Version: ${app.version || 'null'}`);
        console.log(`        Age Rating: ${app.age_rating || 'null'}`);
        console.log(`        Screenshots: ${app.screenshots ? 'Yes' : 'No'}`);
      });
    }
  }
}

async function main() {
  const mapper = new BundleIdMapper();
  await mapper.fixBundleIdMapping();
  await mapper.verifyRichDataUpdate();
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Bundle ID mapping fix completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Mapping fix failed:', error);
      process.exit(1);
    });
}

module.exports = { BundleIdMapper };