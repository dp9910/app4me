/**
 * Analyze and Fix SERP Apps Table Duplicates
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class SerpDeduplicator {
  async analyzeSerpDuplicates() {
    console.log('🔍 Analyzing SERP apps table duplicates...\n');

    try {
      // Step 1: Get total count
      const { count: totalCount, error: countError } = await supabase
        .from('serp_apps')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;
      console.log(`📊 Total rows in serp_apps: ${totalCount}`);

      // Step 2: Find duplicates by bundle_id
      const { data: duplicates, error: dupError } = await supabase
        .rpc('analyze_serp_duplicates');

      if (dupError) {
        console.log('🔧 Creating analysis function...');
        await this.createAnalysisFunction();
        
        // Try again
        const { data: duplicates2, error: dupError2 } = await supabase
          .rpc('analyze_serp_duplicates');
        
        if (dupError2) {
          console.log('📊 Manual duplicate analysis...');
          await this.manualDuplicateAnalysis();
          return;
        }
        
        this.displayDuplicateResults(duplicates2, totalCount);
      } else {
        this.displayDuplicateResults(duplicates, totalCount);
      }

      // Step 3: Show sample duplicates
      await this.showSampleDuplicates();

      // Step 4: Offer deduplication options
      await this.showDeduplicationOptions();

    } catch (error) {
      console.error('❌ Analysis failed:', error);
    }
  }

  async createAnalysisFunction() {
    const { error } = await supabase.rpc('execute_sql', {
      query: `
        CREATE OR REPLACE FUNCTION analyze_serp_duplicates()
        RETURNS TABLE (
          bundle_id TEXT,
          duplicate_count BIGINT,
          sources TEXT,
          query_terms TEXT,
          latest_scrape TIMESTAMPTZ
        ) AS $$
        BEGIN
          RETURN QUERY
          SELECT 
            s.bundle_id,
            COUNT(*) as duplicate_count,
            string_agg(DISTINCT s.source, ', ') as sources,
            string_agg(DISTINCT s.query_term, ', ') as query_terms,
            MAX(s.last_scraped) as latest_scrape
          FROM serp_apps s
          GROUP BY s.bundle_id 
          HAVING COUNT(*) > 1 
          ORDER BY duplicate_count DESC;
        END;
        $$ LANGUAGE plpgsql;
      `
    });

    if (error) {
      console.log('⚠️  Could not create function, using manual analysis');
    }
  }

  async manualDuplicateAnalysis() {
    console.log('📊 Running manual duplicate analysis...');

    // Get all apps and group by bundle_id
    const { data: allApps, error } = await supabase
      .from('serp_apps')
      .select('bundle_id, title, source, query_term, last_scraped, rating_count')
      .order('bundle_id');

    if (error) throw error;

    const duplicateMap = new Map();
    
    allApps.forEach(app => {
      if (!duplicateMap.has(app.bundle_id)) {
        duplicateMap.set(app.bundle_id, []);
      }
      duplicateMap.get(app.bundle_id).push(app);
    });

    const duplicates = [];
    duplicateMap.forEach((apps, bundleId) => {
      if (apps.length > 1) {
        duplicates.push({
          bundle_id: bundleId,
          duplicate_count: apps.length,
          sources: [...new Set(apps.map(a => a.source))].join(', '),
          query_terms: [...new Set(apps.map(a => a.query_term))].join(', '),
          latest_scrape: new Date(Math.max(...apps.map(a => new Date(a.last_scraped)))),
          sample_title: apps[0].title
        });
      }
    });

    console.log(`\n📈 Duplicate Analysis Results:`);
    console.log(`   Total unique bundle_ids with duplicates: ${duplicates.length}`);
    console.log(`   Total duplicate rows: ${duplicates.reduce((sum, d) => sum + d.duplicate_count - 1, 0)}`);
    console.log(`   Unique apps after deduplication: ${duplicateMap.size}`);

    // Show top duplicates
    console.log(`\n🔝 Top 10 apps with most duplicates:`);
    duplicates
      .sort((a, b) => b.duplicate_count - a.duplicate_count)
      .slice(0, 10)
      .forEach((dup, i) => {
        console.log(`   ${i + 1}. ${dup.sample_title}: ${dup.duplicate_count} copies`);
        console.log(`      Bundle ID: ${dup.bundle_id}`);
        console.log(`      Sources: ${dup.sources}`);
        console.log(`      Query terms: ${dup.query_terms}`);
        console.log('');
      });

    return duplicates;
  }

  displayDuplicateResults(duplicates, totalCount) {
    console.log(`\n📈 Duplicate Analysis Results:`);
    console.log(`   Total rows: ${totalCount}`);
    console.log(`   Apps with duplicates: ${duplicates.length}`);
    
    if (duplicates.length > 0) {
      const totalDuplicateRows = duplicates.reduce((sum, d) => sum + parseInt(d.duplicate_count) - 1, 0);
      console.log(`   Duplicate rows to remove: ${totalDuplicateRows}`);
      console.log(`   Unique apps after cleanup: ${totalCount - totalDuplicateRows}`);
    }
  }

  async showSampleDuplicates() {
    console.log('\n📋 Sample duplicate entries:');
    
    const { data: sample, error } = await supabase
      .from('serp_apps')
      .select('bundle_id, title, source, query_term, last_scraped, rating_count')
      .limit(1000);

    if (error) throw error;

    // Find a bundle_id with duplicates
    const bundleMap = new Map();
    sample.forEach(app => {
      if (!bundleMap.has(app.bundle_id)) {
        bundleMap.set(app.bundle_id, []);
      }
      bundleMap.get(app.bundle_id).push(app);
    });

    let foundExample = false;
    bundleMap.forEach((apps, bundleId) => {
      if (apps.length > 1 && !foundExample) {
        console.log(`\n   Example: ${apps[0].title} (${bundleId})`);
        apps.forEach((app, i) => {
          console.log(`   ${i + 1}. Source: ${app.source}, Query: ${app.query_term}, Scraped: ${app.last_scraped}`);
        });
        foundExample = true;
      }
    });
  }

  async showDeduplicationOptions() {
    console.log('\n🛠️  Deduplication Strategy Options:');
    console.log('   1. Keep most recent entry (by last_scraped)');
    console.log('   2. Keep entry with highest rating_count');
    console.log('   3. Keep entry with richest data (most fields filled)');
    console.log('   4. Manual review before deletion');
    console.log('\n📋 Recommended: Option 1 (most recent) + Option 2 (highest rating_count)');
  }

  async executeDeduplication() {
    console.log('\n🔧 Executing SERP apps deduplication...');

    try {
      // Create deduplication query
      const deduplicationSQL = `
        WITH ranked_apps AS (
          SELECT 
            *,
            ROW_NUMBER() OVER (
              PARTITION BY bundle_id 
              ORDER BY 
                last_scraped DESC NULLS LAST,
                rating_count DESC NULLS LAST,
                id DESC
            ) as rn
          FROM serp_apps
        ),
        apps_to_keep AS (
          SELECT * FROM ranked_apps WHERE rn = 1
        ),
        apps_to_remove AS (
          SELECT * FROM ranked_apps WHERE rn > 1
        )
        SELECT 
          (SELECT COUNT(*) FROM apps_to_keep) as apps_to_keep,
          (SELECT COUNT(*) FROM apps_to_remove) as apps_to_remove,
          (SELECT COUNT(DISTINCT bundle_id) FROM serp_apps) as unique_bundle_ids
      `;

      console.log('📊 Preview of deduplication impact...');
      
      // Execute deduplication
      const { data: preview, error: previewError } = await supabase
        .rpc('execute_sql', { query: deduplicationSQL });

      if (previewError) {
        console.log('⚠️  Using alternative approach...');
        await this.alternativeDeduplication();
        return;
      }

      console.log(`   Apps to keep: ${preview[0]?.apps_to_keep || 'unknown'}`);
      console.log(`   Apps to remove: ${preview[0]?.apps_to_remove || 'unknown'}`);

      // Ask for confirmation
      console.log('\n❓ Ready to execute deduplication? This will:');
      console.log('   - Keep the most recently scraped version of each app');
      console.log('   - If tie, keep the one with highest rating_count');
      console.log('   - Permanently delete duplicate entries');
      console.log('\n   Run: node analyze-serp-duplicates.js --execute');

    } catch (error) {
      console.error('❌ Deduplication failed:', error);
    }
  }

  async alternativeDeduplication() {
    console.log('🔄 Using batch-based deduplication...');

    // Get all duplicates in batches
    let offset = 0;
    const batchSize = 1000;
    let totalRemoved = 0;

    while (true) {
      const { data: batch, error } = await supabase
        .from('serp_apps')
        .select('id, bundle_id, last_scraped, rating_count')
        .range(offset, offset + batchSize - 1)
        .order('bundle_id');

      if (error) throw error;
      if (batch.length === 0) break;

      // Group by bundle_id and find duplicates
      const bundleGroups = new Map();
      batch.forEach(app => {
        if (!bundleGroups.has(app.bundle_id)) {
          bundleGroups.set(app.bundle_id, []);
        }
        bundleGroups.get(app.bundle_id).push(app);
      });

      // Find IDs to remove
      const idsToRemove = [];
      bundleGroups.forEach(apps => {
        if (apps.length > 1) {
          // Sort by last_scraped DESC, rating_count DESC, id DESC
          apps.sort((a, b) => {
            if (a.last_scraped !== b.last_scraped) {
              return new Date(b.last_scraped) - new Date(a.last_scraped);
            }
            if (a.rating_count !== b.rating_count) {
              return (b.rating_count || 0) - (a.rating_count || 0);
            }
            return b.id - a.id;
          });
          
          // Keep first, remove rest
          idsToRemove.push(...apps.slice(1).map(app => app.id));
        }
      });

      if (idsToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('serp_apps')
          .delete()
          .in('id', idsToRemove);

        if (deleteError) throw deleteError;
        
        totalRemoved += idsToRemove.length;
        console.log(`   Removed ${idsToRemoved.length} duplicates from batch (total: ${totalRemoved})`);
      }

      offset += batchSize;
    }

    console.log(`✅ Deduplication complete! Removed ${totalRemoved} duplicate entries`);
  }
}

// CLI interface
async function main() {
  const deduplicator = new SerpDeduplicator();
  
  if (process.argv.includes('--execute')) {
    await deduplicator.executeDeduplication();
  } else {
    await deduplicator.analyzeSerpDuplicates();
  }
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ SERP analysis completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Analysis failed:', error);
      process.exit(1);
    });
}

module.exports = { SerpDeduplicator };