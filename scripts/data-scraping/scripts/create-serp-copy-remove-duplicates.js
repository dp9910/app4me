/**
 * Create Copy of serp_apps and Remove iTunes Duplicates
 * Keep all rich data while removing true duplicates
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class SerpCopyDeduplicator {
  async createSerpCopyAndRemoveDuplicates() {
    console.log('🚀 Creating serp_apps copy and removing iTunes duplicates...\n');

    try {
      // Step 1: Create copy of serp_apps table
      await this.createSerpAppsCopy();
      
      // Step 2: Get iTunes apps for comparison
      const itunesApps = await this.getItunesApps();
      
      // Step 3: Find and remove duplicates
      await this.removeDuplicates(itunesApps);
      
      // Step 4: Verify the result
      await this.verifyResult();
      
      console.log('\n🎉 serp_apps copy created with duplicates removed!');

    } catch (error) {
      console.error('❌ Copy and deduplicate failed:', error);
      throw error;
    }
  }

  async createSerpAppsCopy() {
    console.log('📋 Creating copy of serp_apps table...');

    // First, create the table structure
    const createTableSQL = `
      -- Create copy of serp_apps table
      DROP TABLE IF EXISTS serp_apps_unique CASCADE;

      CREATE TABLE serp_apps_unique AS 
      SELECT * FROM serp_apps;

      -- Add indexes for performance
      CREATE INDEX idx_serp_apps_unique_bundle_id ON serp_apps_unique(bundle_id);
      CREATE INDEX idx_serp_apps_unique_title ON serp_apps_unique(title);
      CREATE INDEX idx_serp_apps_unique_developer ON serp_apps_unique(developer);
      CREATE INDEX idx_serp_apps_unique_features_extracted ON serp_apps_unique(features_extracted);

      -- Add processing status columns if they don't exist
      ALTER TABLE serp_apps_unique 
      ADD COLUMN IF NOT EXISTS features_extracted BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS extraction_attempted BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS extraction_error TEXT;

      COMMENT ON TABLE serp_apps_unique IS 'Copy of serp_apps with iTunes duplicates removed';

      SELECT COUNT(*) as copied_records FROM serp_apps_unique;
    `;

    try {
      const { data, error } = await supabase.rpc('execute_sql', { query: createTableSQL });
      
      if (error) {
        console.log('⚠️  Using alternative copy method...');
        await this.createCopyAlternative();
      } else {
        console.log('   ✅ Table copied successfully');
        if (data && data.length > 0) {
          console.log(`   📊 Records copied: ${data[0].copied_records}`);
        }
      }
    } catch (err) {
      console.log('⚠️  Using alternative copy method...');
      await this.createCopyAlternative();
    }
  }

  async createCopyAlternative() {
    console.log('📋 Creating table copy using INSERT method...');

    // Get all serp_apps data
    const { data: serpApps, error: serpError } = await supabase
      .from('serp_apps')
      .select('*');

    if (serpError) throw serpError;

    console.log(`   📊 Source records: ${serpApps.length}`);

    // Add processing columns to each record
    const serpAppsWithProcessing = serpApps.map(app => ({
      ...app,
      features_extracted: false,
      extraction_attempted: false,
      extraction_error: null
    }));

    // Insert in batches
    const batchSize = 100;
    let totalInserted = 0;

    for (let i = 0; i < serpAppsWithProcessing.length; i += batchSize) {
      const batch = serpAppsWithProcessing.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from('serp_apps_unique')
        .insert(batch);

      if (insertError) {
        console.error(`   ❌ Batch ${Math.floor(i/batchSize) + 1} failed:`, insertError);
      } else {
        totalInserted += batch.length;
        console.log(`   ✅ Batch ${Math.floor(i/batchSize) + 1} inserted (${totalInserted} total)`);
      }
    }

    console.log(`   🎉 Total records copied: ${totalInserted}`);
  }

  async getItunesApps() {
    console.log('\n📱 Getting iTunes apps for duplicate comparison...');

    const { data: itunesApps, error } = await supabase
      .from('itunes_apps')
      .select('bundle_id, title, developer');

    if (error) throw error;

    console.log(`   📊 iTunes apps loaded: ${itunesApps.length}`);
    return itunesApps;
  }

  async removeDuplicates(itunesApps) {
    console.log('\n🔧 Removing duplicates from serp_apps_unique...');

    // Create sets for efficient lookup
    const itunesBundleIds = new Set(itunesApps.map(app => app.bundle_id));
    
    // Create title+developer combinations for fuzzy matching
    const itunesTitleDev = new Set(
      itunesApps.map(app => 
        `${(app.title || '').toLowerCase().trim()}|||${(app.developer || '').toLowerCase().trim()}`
      )
    );

    console.log(`   📊 iTunes bundle IDs to check: ${itunesBundleIds.size}`);
    console.log(`   📊 iTunes title+developer combinations: ${itunesTitleDev.size}`);

    // Get all serp_apps_unique for comparison
    const { data: serpApps, error: serpError } = await supabase
      .from('serp_apps_unique')
      .select('id, bundle_id, title, developer');

    if (serpError) throw serpError;

    console.log(`   📊 SERP apps to check: ${serpApps.length}`);

    // Find duplicates
    const duplicatesToRemove = [];
    
    serpApps.forEach(serpApp => {
      // Check bundle_id match
      if (itunesBundleIds.has(serpApp.bundle_id)) {
        duplicatesToRemove.push({
          id: serpApp.id,
          reason: 'bundle_id_match',
          app: serpApp
        });
        return;
      }

      // Check title+developer fuzzy match
      const serpTitleDev = `${(serpApp.title || '').toLowerCase().trim()}|||${(serpApp.developer || '').toLowerCase().trim()}`;
      if (itunesTitleDev.has(serpTitleDev)) {
        duplicatesToRemove.push({
          id: serpApp.id,
          reason: 'title_developer_match',
          app: serpApp
        });
        return;
      }
    });

    console.log(`   🎯 Duplicates found: ${duplicatesToRemove.length}`);
    
    if (duplicatesToRemove.length > 0) {
      console.log(`   📋 Sample duplicates to remove:`);
      duplicatesToRemove.slice(0, 5).forEach((dup, i) => {
        console.log(`     ${i + 1}. ${dup.app.title} (${dup.reason})`);
      });

      // Remove duplicates in batches
      console.log(`\n   🗑️  Removing ${duplicatesToRemove.length} duplicates...`);
      
      const batchSize = 50;
      let removedCount = 0;

      for (let i = 0; i < duplicatesToRemove.length; i += batchSize) {
        const batch = duplicatesToRemove.slice(i, i + batchSize);
        const idsToRemove = batch.map(dup => dup.id);

        const { error: deleteError } = await supabase
          .from('serp_apps_unique')
          .delete()
          .in('id', idsToRemove);

        if (deleteError) {
          console.error(`   ❌ Delete batch ${Math.floor(i/batchSize) + 1} failed:`, deleteError);
        } else {
          removedCount += batch.length;
          console.log(`   ✅ Removed batch ${Math.floor(i/batchSize) + 1} (${removedCount} total)`);
        }
      }

      console.log(`   🎉 Total duplicates removed: ${removedCount}`);
    } else {
      console.log(`   ✅ No duplicates found to remove`);
    }
  }

  async verifyResult() {
    console.log('\n🔍 Verifying deduplicated serp_apps_unique table...');

    try {
      // Check total count
      const { count: totalCount, error: countError } = await supabase
        .from('serp_apps_unique')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.log(`   ❌ Count verification failed: ${countError.message}`);
        return;
      }

      // Check apps with rich data
      const { data: richApps, error: richError } = await supabase
        .from('serp_apps_unique')
        .select('bundle_id, title, icon_url, version, screenshots')
        .not('icon_url', 'is', null)
        .limit(10);

      if (richError) {
        console.log(`   ❌ Rich data check failed: ${richError.message}`);
        return;
      }

      // Check data completeness
      const { data: sample, error: sampleError } = await supabase
        .from('serp_apps_unique')
        .select('bundle_id, title, icon_url, version, description, rating')
        .limit(100);

      if (sampleError) {
        console.log(`   ❌ Sample check failed: ${sampleError.message}`);
        return;
      }

      console.log(`   📊 Final Results:`);
      console.log(`     Total unique SERP apps: ${totalCount}`);
      console.log(`     Apps with icon URLs: ${richApps.length}`);
      
      if (sample && sample.length > 0) {
        const stats = {
          hasIcon: sample.filter(app => app.icon_url && app.icon_url.length > 0).length,
          hasVersion: sample.filter(app => app.version && app.version.length > 0).length,
          hasDescription: sample.filter(app => app.description && app.description.length > 20).length,
          hasRating: sample.filter(app => app.rating && app.rating > 0).length
        };

        console.log(`     Data completeness (sample of ${sample.length}):`);
        console.log(`       Has icons: ${stats.hasIcon}/${sample.length} (${(stats.hasIcon/sample.length*100).toFixed(1)}%)`);
        console.log(`       Has versions: ${stats.hasVersion}/${sample.length} (${(stats.hasVersion/sample.length*100).toFixed(1)}%)`);
        console.log(`       Has descriptions: ${stats.hasDescription}/${sample.length} (${(stats.hasDescription/sample.length*100).toFixed(1)}%)`);
        console.log(`       Has ratings: ${stats.hasRating}/${sample.length} (${(stats.hasRating/sample.length*100).toFixed(1)}%)`);
      }

      if (richApps.length > 0) {
        console.log(`\n   📋 Sample apps with rich data:`);
        richApps.slice(0, 3).forEach((app, i) => {
          console.log(`     ${i + 1}. ${app.title} (${app.bundle_id})`);
          console.log(`        Icon: ✅, Version: ${app.version || 'null'}, Screenshots: ${app.screenshots ? 'Yes' : 'No'}`);
        });
      }

    } catch (error) {
      console.error('   ❌ Verification failed:', error);
    }
  }
}

// CLI interface
async function main() {
  console.log('🎯 This will create serp_apps_unique table with iTunes duplicates removed');
  console.log('   Benefits: Keep ALL rich SERP data while avoiding duplicate processing\n');
  
  const deduplicator = new SerpCopyDeduplicator();
  await deduplicator.createSerpCopyAndRemoveDuplicates();
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ SERP copy and deduplication completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Copy and deduplication failed:', error);
      process.exit(1);
    });
}

module.exports = { SerpCopyDeduplicator };