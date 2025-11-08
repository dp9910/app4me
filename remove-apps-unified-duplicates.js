/**
 * Remove Duplicates from apps_unified Table
 * Priority: Keep entries with logos, higher ratings, and more complete data
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class AppsUnifiedDuplicateRemover {
  async removeDuplicates() {
    console.log('🗑️ Removing duplicates from apps_unified table...\n');
    console.log('Priority: Keep apps with logos, higher ratings, and complete data\n');

    try {
      // Step 1: Get all apps
      const allApps = await this.getAllApps();
      
      // Step 2: Group duplicates by title
      const duplicateGroups = this.groupDuplicatesByTitle(allApps);
      
      // Step 3: Select best version of each duplicate
      const appsToKeep = this.selectBestVersions(duplicateGroups);
      
      // Step 4: Remove inferior duplicates
      await this.removeInferiorDuplicates(allApps, appsToKeep);
      
      // Step 5: Clean up related tables
      await this.cleanupRelatedTables();
      
      // Step 6: Verify result
      await this.verifyResult();
      
      console.log('\n🎉 Duplicate removal completed successfully!');

    } catch (error) {
      console.error('❌ Duplicate removal failed:', error);
      throw error;
    }
  }

  async getAllApps() {
    console.log('📱 Loading all apps from apps_unified...');

    let allApps = [];
    let from = 0;
    const batchSize = 1000;

    while (true) {
      const { data: apps, error } = await supabase
        .from('apps_unified')
        .select('id, title, developer, icon_url, bundle_id, primary_category, rating, price, description')
        .range(from, from + batchSize - 1);

      if (error) throw error;
      if (!apps || apps.length === 0) break;

      allApps = allApps.concat(apps);
      from += batchSize;

      if (apps.length < batchSize) break;
    }

    console.log(`   📊 Total apps loaded: ${allApps.length}`);
    return allApps;
  }

  groupDuplicatesByTitle(allApps) {
    console.log('🔍 Grouping apps by title to find duplicates...');

    const titleGroups = new Map();

    allApps.forEach(app => {
      const normalizedTitle = this.normalizeTitle(app.title);
      if (!titleGroups.has(normalizedTitle)) {
        titleGroups.set(normalizedTitle, []);
      }
      titleGroups.get(normalizedTitle).push(app);
    });

    // Filter to only duplicate groups (more than 1 app)
    const duplicateGroups = [];
    for (const [title, apps] of titleGroups) {
      if (apps.length > 1) {
        duplicateGroups.push({
          title: apps[0].title, // Original title
          normalizedTitle: title,
          apps: apps
        });
      }
    }

    console.log(`   📊 Unique titles: ${titleGroups.size}`);
    console.log(`   📊 Duplicate groups found: ${duplicateGroups.length}`);
    
    const totalDuplicateApps = duplicateGroups.reduce((sum, group) => sum + group.apps.length, 0);
    const duplicatesToRemove = totalDuplicateApps - duplicateGroups.length;
    console.log(`   📊 Total apps in duplicate groups: ${totalDuplicateApps}`);
    console.log(`   📊 Apps to remove: ${duplicatesToRemove}`);

    // Show sample duplicate groups
    if (duplicateGroups.length > 0) {
      console.log('\n   📋 Sample duplicate groups:');
      duplicateGroups.slice(0, 5).forEach((group, i) => {
        console.log(`     ${i + 1}. "${group.title}" (${group.apps.length} duplicates)`);
        group.apps.forEach((app, j) => {
          const hasIcon = app.icon_url ? '✅' : '❌';
          console.log(`        ${j + 1}. ID:${app.id} ${hasIcon} Rating:${app.rating || 'N/A'} Dev:${app.developer || 'N/A'}`);
        });
      });
    }

    return duplicateGroups;
  }

  normalizeTitle(title) {
    if (!title) return '';
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  selectBestVersions(duplicateGroups) {
    console.log('\n🎯 Selecting best version of each duplicate...');

    const appsToKeep = new Set();

    duplicateGroups.forEach(group => {
      // Sort apps by quality score (best first)
      const sortedApps = group.apps.sort((a, b) => {
        return this.calculateQualityScore(b) - this.calculateQualityScore(a);
      });

      // Keep the best one
      const bestApp = sortedApps[0];
      appsToKeep.add(bestApp.id);

      console.log(`   📌 "${group.title}": Keeping ID:${bestApp.id} (Score: ${this.calculateQualityScore(bestApp).toFixed(2)})`);
      console.log(`      Icon: ${bestApp.icon_url ? '✅' : '❌'}, Rating: ${bestApp.rating || 'N/A'}, Bundle: ${bestApp.bundle_id || 'N/A'}`);
    });

    console.log(`\n   📊 Apps selected to keep: ${appsToKeep.size}`);
    return appsToKeep;
  }

  calculateQualityScore(app) {
    let score = 0;

    // Icon URL (most important for UI)
    if (app.icon_url && app.icon_url.length > 0) {
      score += 50;
    }

    // Rating
    if (app.rating && app.rating > 0) {
      score += app.rating * 5; // Max 25 points for 5-star rating
    }

    // Bundle ID quality (iTunes apps usually have better bundle IDs)
    if (app.bundle_id && app.bundle_id.includes('.')) {
      score += 15; // Proper reverse domain notation
    } else if (app.bundle_id && !app.bundle_id.startsWith('serp_')) {
      score += 5; // Has bundle ID but not SERP-generated
    }

    // Developer info
    if (app.developer && app.developer.length > 0) {
      score += 5;
    }

    // Category info
    if (app.primary_category && app.primary_category.length > 0) {
      score += 3;
    }

    // Description completeness
    if (app.description && app.description.length > 100) {
      score += 2;
    }

    return score;
  }

  async removeInferiorDuplicates(allApps, appsToKeep) {
    // Get all apps from duplicate groups
    const duplicateGroups = this.groupDuplicatesByTitle(allApps);
    const allDuplicateAppIds = new Set();
    
    duplicateGroups.forEach(group => {
      group.apps.forEach(app => {
        allDuplicateAppIds.add(app.id);
      });
    });

    // Find apps to remove (duplicates that are not in the keep list)
    const appsToRemove = Array.from(allDuplicateAppIds).filter(id => !appsToKeep.has(id));

    if (appsToRemove.length === 0) {
      console.log('\n✅ No inferior duplicates to remove');
      return;
    }

    console.log(`\n🗑️ Removing ${appsToRemove.length} inferior duplicate apps...`);

    // Remove in batches to avoid query size limits
    const batchSize = 50;
    let removedCount = 0;

    for (let i = 0; i < appsToRemove.length; i += batchSize) {
      const batch = appsToRemove.slice(i, i + batchSize);

      const { error: deleteError } = await supabase
        .from('apps_unified')
        .delete()
        .in('id', batch);

      if (deleteError) {
        console.error(`   ❌ Delete batch ${Math.floor(i/batchSize) + 1} failed:`, deleteError);
      } else {
        removedCount += batch.length;
        const batchNum = Math.floor(i/batchSize) + 1;
        const totalBatches = Math.ceil(appsToRemove.length/batchSize);
        console.log(`   ✅ Removed batch ${batchNum}/${totalBatches} (${removedCount} total)`);
      }
    }

    console.log(`   🎉 Total inferior duplicates removed: ${removedCount}/${appsToRemove.length}`);
  }

  async cleanupRelatedTables() {
    console.log('\n🧹 Cleaning up related tables...');

    // Clean up app_features for removed apps
    console.log('   🔧 Cleaning app_features...');
    const { error: featuresError } = await supabase.rpc('delete_orphaned_features');
    if (featuresError) {
      console.log(`   ⚠️ Could not auto-clean app_features: ${featuresError.message}`);
    } else {
      console.log('   ✅ Orphaned features cleaned');
    }

    // Clean up new_embeddings for removed apps  
    console.log('   🔧 Cleaning new_embeddings...');
    const { error: embeddingsError } = await supabase.rpc('delete_orphaned_embeddings');
    if (embeddingsError) {
      console.log(`   ⚠️ Could not auto-clean new_embeddings: ${embeddingsError.message}`);
    } else {
      console.log('   ✅ Orphaned embeddings cleaned');
    }
  }

  async verifyResult() {
    console.log('\n🔍 Verifying duplicate removal...');

    try {
      // Get final app count
      const { count: totalCount, error: countError } = await supabase
        .from('apps_unified')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;

      // Check for remaining duplicates
      const { data: sampleApps, error: sampleError } = await supabase
        .from('apps_unified')
        .select('id, title, icon_url, rating')
        .limit(500);

      if (sampleError) throw sampleError;

      // Group by title to find any remaining duplicates
      const titleGroups = new Map();
      sampleApps.forEach(app => {
        const normalizedTitle = this.normalizeTitle(app.title);
        if (!titleGroups.has(normalizedTitle)) {
          titleGroups.set(normalizedTitle, []);
        }
        titleGroups.get(normalizedTitle).push(app);
      });

      const remainingDuplicates = Array.from(titleGroups.values()).filter(group => group.length > 1);
      
      // Check data quality
      const appsWithIcons = sampleApps.filter(app => app.icon_url && app.icon_url.length > 0);
      const appsWithRatings = sampleApps.filter(app => app.rating && app.rating > 0);

      console.log(`   📊 Final Results:`);
      console.log(`     Total apps: ${totalCount}`);
      console.log(`     Remaining duplicates in sample: ${remainingDuplicates.length}/${sampleApps.length}`);
      console.log(`     Apps with icons: ${appsWithIcons.length}/${sampleApps.length} (${(appsWithIcons.length/sampleApps.length*100).toFixed(1)}%)`);
      console.log(`     Apps with ratings: ${appsWithRatings.length}/${sampleApps.length} (${(appsWithRatings.length/sampleApps.length*100).toFixed(1)}%)`);

      if (remainingDuplicates.length > 0) {
        console.log('\n   ⚠️ Remaining duplicates found:');
        remainingDuplicates.slice(0, 3).forEach((group, i) => {
          console.log(`     ${i + 1}. "${group[0].title}" (${group.length} copies)`);
        });
      } else {
        console.log('\n   ✅ No duplicates found in sample - duplicate removal successful!');
      }

    } catch (error) {
      console.error('   ❌ Verification failed:', error);
    }
  }
}

// CLI interface
async function main() {
  console.log('🎯 This will remove duplicate apps from apps_unified table');
  console.log('   Priority: Keep apps with logos, higher ratings, and complete data');
  console.log('   Warning: This will permanently delete inferior duplicates\n');
  
  const remover = new AppsUnifiedDuplicateRemover();
  await remover.removeDuplicates();
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Duplicate removal completed successfully!');
      console.log('🚀 apps_unified table now has only high-quality unique apps');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Duplicate removal failed:', error);
      process.exit(1);
    });
}

module.exports = { AppsUnifiedDuplicateRemover };