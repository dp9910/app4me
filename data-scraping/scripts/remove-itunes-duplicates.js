/**
 * Remove iTunes Duplicates from serp_unique_clean Table
 * Keep all rich SERP data while removing true duplicates
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class ItunesDuplicateRemover {
  async removeDuplicates() {
    console.log('🗑️  Removing iTunes duplicates from serp_unique_clean...\n');

    try {
      // Step 1: Get iTunes apps for comparison
      const itunesApps = await this.getItunesApps();
      
      // Step 2: Get SERP apps from clean table
      const serpApps = await this.getSerpApps();
      
      // Step 3: Find duplicates
      const duplicates = this.findDuplicates(serpApps, itunesApps);
      
      // Step 4: Remove duplicates
      await this.removeDuplicateRecords(duplicates);
      
      // Step 5: Verify result
      await this.verifyResult();
      
      console.log('\n🎉 iTunes duplicates removed successfully!');

    } catch (error) {
      console.error('❌ Duplicate removal failed:', error);
      throw error;
    }
  }

  async getItunesApps() {
    console.log('📱 Loading iTunes apps for comparison...');

    const { data: itunesApps, error } = await supabase
      .from('itunes_apps')
      .select('bundle_id, title, developer');

    if (error) throw error;

    console.log(`   📊 iTunes apps loaded: ${itunesApps.length}`);
    return itunesApps;
  }

  async getSerpApps() {
    console.log('📊 Loading SERP apps from serp_unique_clean...');

    const { data: serpApps, error } = await supabase
      .from('serp_unique_clean')
      .select('id, bundle_id, title, developer, icon_url, version');

    if (error) throw error;

    console.log(`   📊 SERP apps loaded: ${serpApps.length}`);
    
    // Show sample of rich data
    const withIcons = serpApps.filter(app => app.icon_url && app.icon_url.length > 0);
    const withVersions = serpApps.filter(app => app.version && app.version.length > 0);
    
    console.log(`   🖼️  Apps with icons: ${withIcons.length}`);
    console.log(`   📱 Apps with versions: ${withVersions.length}`);

    return serpApps;
  }

  findDuplicates(serpApps, itunesApps) {
    console.log('\n🔍 Finding duplicates between SERP and iTunes...');

    // Create efficient lookup structures
    const itunesBundleIds = new Set(itunesApps.map(app => app.bundle_id));
    
    // Create title+developer combinations for fuzzy matching
    const itunesTitleDev = new Set(
      itunesApps.map(app => 
        this.normalizeString(`${app.title || ''}|||${app.developer || ''}`)
      )
    );

    console.log(`   📋 iTunes bundle IDs: ${itunesBundleIds.size}`);
    console.log(`   📋 iTunes title+dev combinations: ${itunesTitleDev.size}`);

    // Find duplicates
    const duplicates = [];
    
    serpApps.forEach(serpApp => {
      // Check 1: Exact bundle_id match
      if (itunesBundleIds.has(serpApp.bundle_id)) {
        duplicates.push({
          id: serpApp.id,
          reason: 'bundle_id_exact_match',
          app: serpApp
        });
        return;
      }

      // Check 2: Title + Developer fuzzy match
      const serpTitleDev = this.normalizeString(`${serpApp.title || ''}|||${serpApp.developer || ''}`);
      if (itunesTitleDev.has(serpTitleDev)) {
        duplicates.push({
          id: serpApp.id,
          reason: 'title_developer_match',
          app: serpApp
        });
        return;
      }
    });

    console.log(`   🎯 Duplicates found: ${duplicates.length}/${serpApps.length}`);
    console.log(`   📊 Unique apps remaining: ${serpApps.length - duplicates.length}`);

    // Show breakdown by reason
    const reasons = {};
    duplicates.forEach(dup => {
      reasons[dup.reason] = (reasons[dup.reason] || 0) + 1;
    });

    console.log(`   📋 Duplicate breakdown:`);
    Object.entries(reasons).forEach(([reason, count]) => {
      console.log(`     ${reason}: ${count} apps`);
    });

    // Show sample duplicates
    if (duplicates.length > 0) {
      console.log(`   📋 Sample duplicates to remove:`);
      duplicates.slice(0, 5).forEach((dup, i) => {
        console.log(`     ${i + 1}. ${dup.app.title} (${dup.reason})`);
        console.log(`        Bundle ID: ${dup.app.bundle_id}`);
        console.log(`        Has icon: ${dup.app.icon_url ? 'Yes' : 'No'}`);
      });
    }

    return duplicates;
  }

  normalizeString(str) {
    return str.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ')        // Normalize whitespace
      .trim();
  }

  async removeDuplicateRecords(duplicates) {
    if (duplicates.length === 0) {
      console.log('\n✅ No duplicates to remove');
      return;
    }

    console.log(`\n🗑️  Removing ${duplicates.length} duplicate records...`);

    // Remove in batches
    const batchSize = 50;
    let removedCount = 0;

    for (let i = 0; i < duplicates.length; i += batchSize) {
      const batch = duplicates.slice(i, i + batchSize);
      const idsToRemove = batch.map(dup => dup.id);

      const { error: deleteError } = await supabase
        .from('serp_unique_clean')
        .delete()
        .in('id', idsToRemove);

      if (deleteError) {
        console.error(`   ❌ Delete batch ${Math.floor(i/batchSize) + 1} failed:`, deleteError);
      } else {
        removedCount += batch.length;
        const batchNum = Math.floor(i/batchSize) + 1;
        const totalBatches = Math.ceil(duplicates.length/batchSize);
        console.log(`   ✅ Removed batch ${batchNum}/${totalBatches} (${removedCount} total)`);
      }
    }

    console.log(`   🎉 Total duplicates removed: ${removedCount}/${duplicates.length}`);
  }

  async verifyResult() {
    console.log('\n🔍 Verifying final serp_unique_clean table...');

    try {
      // Get final statistics
      const { count: totalCount, error: countError } = await supabase
        .from('serp_unique_clean')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.log(`   ❌ Count verification failed: ${countError.message}`);
        return;
      }

      // Check data quality
      const { data: qualityCheck, error: qualityError } = await supabase
        .from('serp_unique_clean')
        .select('bundle_id, title, icon_url, version, description, rating, screenshots')
        .limit(100);

      if (qualityError) {
        console.log(`   ❌ Quality check failed: ${qualityError.message}`);
        return;
      }

      // Calculate statistics
      const stats = {
        total: totalCount,
        hasIcon: qualityCheck.filter(app => app.icon_url && app.icon_url.length > 0).length,
        hasVersion: qualityCheck.filter(app => app.version && app.version.length > 0).length,
        hasDescription: qualityCheck.filter(app => app.description && app.description.length > 20).length,
        hasRating: qualityCheck.filter(app => app.rating && app.rating > 0).length,
        hasScreenshots: qualityCheck.filter(app => app.screenshots).length
      };

      console.log(`   📊 Final Results:`);
      console.log(`     Total unique SERP apps: ${stats.total}`);
      console.log(`     Data completeness (sample of ${qualityCheck.length}):`);
      console.log(`       With icons: ${stats.hasIcon}/${qualityCheck.length} (${(stats.hasIcon/qualityCheck.length*100).toFixed(1)}%)`);
      console.log(`       With versions: ${stats.hasVersion}/${qualityCheck.length} (${(stats.hasVersion/qualityCheck.length*100).toFixed(1)}%)`);
      console.log(`       With descriptions: ${stats.hasDescription}/${qualityCheck.length} (${(stats.hasDescription/qualityCheck.length*100).toFixed(1)}%)`);
      console.log(`       With ratings: ${stats.hasRating}/${qualityCheck.length} (${(stats.hasRating/qualityCheck.length*100).toFixed(1)}%)`);
      console.log(`       With screenshots: ${stats.hasScreenshots}/${qualityCheck.length} (${(stats.hasScreenshots/qualityCheck.length*100).toFixed(1)}%)`);

      // Show sample apps with rich data
      const richApps = qualityCheck.filter(app => app.icon_url && app.icon_url.length > 0);
      
      if (richApps.length > 0) {
        console.log(`\n   📋 Sample apps with rich data:`);
        richApps.slice(0, 3).forEach((app, i) => {
          console.log(`     ${i + 1}. ${app.title} (${app.bundle_id})`);
          console.log(`        Icon: ✅, Version: ${app.version || 'none'}, Rating: ${app.rating || 'none'}`);
        });
      } else {
        console.log(`\n   ⚠️  No apps with icon URLs found in sample`);
      }

      console.log(`\n   🎯 Ready for feature extraction: ${stats.total} unique SERP apps`);

    } catch (error) {
      console.error('   ❌ Verification failed:', error);
    }
  }
}

// CLI interface
async function main() {
  console.log('🎯 This will remove iTunes duplicates from serp_unique_clean table');
  console.log('   Goal: Keep unique SERP apps with rich data (icons, versions, etc.)\n');
  
  const remover = new ItunesDuplicateRemover();
  await remover.removeDuplicates();
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ iTunes duplicate removal completed!');
      console.log('🚀 serp_unique_clean table is ready for feature extraction');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Duplicate removal failed:', error);
      process.exit(1);
    });
}

module.exports = { ItunesDuplicateRemover };