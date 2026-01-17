/**
 * Detailed SERP Apps Analysis
 * Check for different types of duplicates and data quality
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class DetailedSerpAnalysis {
  async runFullAnalysis() {
    console.log('🔍 Running detailed SERP apps analysis...\n');

    try {
      // Get all data
      const { data: allApps, error } = await supabase
        .from('serp_apps')
        .select('*')
        .order('bundle_id');

      if (error) throw error;

      console.log(`📊 Total SERP apps: ${allApps.length}`);

      // Analysis 1: Bundle ID duplicates
      await this.analyzeBundleIdDuplicates(allApps);

      // Analysis 2: Title + Developer duplicates (different bundle_ids)
      await this.analyzeTitleDeveloperDuplicates(allApps);

      // Analysis 3: Constraint analysis
      await this.analyzeConstraints(allApps);

      // Analysis 4: Data quality analysis
      await this.analyzeDataQuality(allApps);

      // Analysis 5: Source and query term distribution
      await this.analyzeSourceDistribution(allApps);

    } catch (error) {
      console.error('❌ Analysis failed:', error);
    }
  }

  analyzeBundleIdDuplicates(allApps) {
    console.log('\n1️⃣  Bundle ID Duplicate Analysis:');
    
    const bundleMap = new Map();
    allApps.forEach(app => {
      if (!bundleMap.has(app.bundle_id)) {
        bundleMap.set(app.bundle_id, []);
      }
      bundleMap.get(app.bundle_id).push(app);
    });

    const duplicates = Array.from(bundleMap.entries()).filter(([_, apps]) => apps.length > 1);
    
    console.log(`   Unique bundle_ids: ${bundleMap.size}`);
    console.log(`   Bundle_ids with duplicates: ${duplicates.length}`);
    
    if (duplicates.length > 0) {
      console.log(`   Top duplicates:`);
      duplicates.slice(0, 5).forEach(([bundleId, apps]) => {
        console.log(`     ${bundleId}: ${apps.length} copies (${apps[0].title})`);
      });
    } else {
      console.log(`   ✅ No bundle_id duplicates found`);
    }
  }

  analyzeTitleDeveloperDuplicates(allApps) {
    console.log('\n2️⃣  Title + Developer Duplicate Analysis:');
    
    const titleDevMap = new Map();
    allApps.forEach(app => {
      const key = `${app.title?.toLowerCase()}|||${app.developer?.toLowerCase()}`;
      if (!titleDevMap.has(key)) {
        titleDevMap.set(key, []);
      }
      titleDevMap.get(key).push(app);
    });

    const duplicates = Array.from(titleDevMap.entries()).filter(([_, apps]) => apps.length > 1);
    
    console.log(`   Unique title+developer combinations: ${titleDevMap.size}`);
    console.log(`   Potential duplicates by title+developer: ${duplicates.length}`);
    
    if (duplicates.length > 0) {
      console.log(`   Examples:`);
      duplicates.slice(0, 5).forEach(([key, apps]) => {
        const [title, developer] = key.split('|||');
        console.log(`     "${title}" by "${developer}": ${apps.length} entries`);
        console.log(`       Bundle IDs: ${apps.map(a => a.bundle_id).join(', ')}`);
      });
    }
  }

  analyzeConstraints(allApps) {
    console.log('\n3️⃣  Constraint Analysis:');
    
    // Check current unique constraint: (bundle_id, source, query_term)
    const constraintMap = new Map();
    allApps.forEach(app => {
      const key = `${app.bundle_id}|||${app.source}|||${app.query_term}`;
      if (!constraintMap.has(key)) {
        constraintMap.set(key, []);
      }
      constraintMap.get(key).push(app);
    });

    const constraintViolations = Array.from(constraintMap.entries()).filter(([_, apps]) => apps.length > 1);
    
    console.log(`   Unique (bundle_id, source, query_term) combinations: ${constraintMap.size}`);
    console.log(`   Constraint violations: ${constraintViolations.length}`);
    
    if (constraintViolations.length > 0) {
      console.log(`   ⚠️  Constraint violations found:`);
      constraintViolations.slice(0, 3).forEach(([key, apps]) => {
        const [bundleId, source, queryTerm] = key.split('|||');
        console.log(`     ${bundleId} + ${source} + ${queryTerm}: ${apps.length} entries`);
      });
    } else {
      console.log(`   ✅ No constraint violations`);
    }
  }

  analyzeDataQuality(allApps) {
    console.log('\n4️⃣  Data Quality Analysis:');
    
    const stats = {
      hasDescription: allApps.filter(a => a.description && a.description.length > 10).length,
      hasRating: allApps.filter(a => a.rating && a.rating > 0).length,
      hasRatingCount: allApps.filter(a => a.rating_count && a.rating_count > 0).length,
      hasIconUrl: allApps.filter(a => a.icon_url && a.icon_url.length > 0).length,
      hasScreenshots: allApps.filter(a => a.screenshots && JSON.parse(a.screenshots || '[]').length > 0).length,
      hasCategory: allApps.filter(a => a.category && a.category.length > 0).length,
      hasPrice: allApps.filter(a => a.price_value !== null && a.price_value !== undefined).length
    };

    console.log(`   Apps with description: ${stats.hasDescription} (${(stats.hasDescription/allApps.length*100).toFixed(1)}%)`);
    console.log(`   Apps with rating: ${stats.hasRating} (${(stats.hasRating/allApps.length*100).toFixed(1)}%)`);
    console.log(`   Apps with rating count: ${stats.hasRatingCount} (${(stats.hasRatingCount/allApps.length*100).toFixed(1)}%)`);
    console.log(`   Apps with icon: ${stats.hasIconUrl} (${(stats.hasIconUrl/allApps.length*100).toFixed(1)}%)`);
    console.log(`   Apps with screenshots: ${stats.hasScreenshots} (${(stats.hasScreenshots/allApps.length*100).toFixed(1)}%)`);
    console.log(`   Apps with category: ${stats.hasCategory} (${(stats.hasCategory/allApps.length*100).toFixed(1)}%)`);
    console.log(`   Apps with price: ${stats.hasPrice} (${(stats.hasPrice/allApps.length*100).toFixed(1)}%)`);

    // Quality score distribution
    const qualityScores = allApps.map(app => {
      let score = 0;
      if (app.description && app.description.length > 10) score += 20;
      if (app.rating && app.rating > 0) score += 15;
      if (app.rating_count && app.rating_count > 0) score += 15;
      if (app.icon_url) score += 10;
      if (app.screenshots && JSON.parse(app.screenshots || '[]').length > 0) score += 20;
      if (app.category) score += 10;
      if (app.price_value !== null) score += 10;
      return score;
    });

    const avgQuality = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
    const highQuality = qualityScores.filter(score => score >= 80).length;
    
    console.log(`   Average quality score: ${avgQuality.toFixed(1)}/100`);
    console.log(`   High quality apps (80+): ${highQuality} (${(highQuality/allApps.length*100).toFixed(1)}%)`);
  }

  analyzeSourceDistribution(allApps) {
    console.log('\n5️⃣  Source and Query Distribution:');
    
    const sources = new Map();
    const queryTerms = new Map();
    
    allApps.forEach(app => {
      // Sources
      const source = app.source || 'unknown';
      sources.set(source, (sources.get(source) || 0) + 1);
      
      // Query terms
      const query = app.query_term || 'unknown';
      queryTerms.set(query, (queryTerms.get(query) || 0) + 1);
    });

    console.log(`\n   📊 Source distribution:`);
    Array.from(sources.entries())
      .sort(([,a], [,b]) => b - a)
      .forEach(([source, count]) => {
        console.log(`     ${source}: ${count} apps (${(count/allApps.length*100).toFixed(1)}%)`);
      });

    console.log(`\n   📊 Top query terms:`);
    Array.from(queryTerms.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([query, count]) => {
        console.log(`     "${query}": ${count} apps`);
      });

    console.log(`\n   📈 Summary:`);
    console.log(`     Total unique sources: ${sources.size}`);
    console.log(`     Total unique query terms: ${queryTerms.size}`);
  }
}

// Run the analysis
async function main() {
  const analyzer = new DetailedSerpAnalysis();
  await analyzer.runFullAnalysis();
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Detailed SERP analysis completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Analysis failed:', error);
      process.exit(1);
    });
}

module.exports = { DetailedSerpAnalysis };