/**
 * Compare SERP Apps vs iTunes Apps
 * Identify unique apps in serp_apps that need feature extraction
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class SerpItunesComparator {
  constructor() {
    this.outputDir = './data-scraping/features-output';
    this.ensureOutputDir();
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async compareAndAnalyze() {
    console.log('🔍 Comparing SERP apps vs iTunes apps...\n');

    try {
      // Step 1: Get all SERP apps
      const serpApps = await this.getAllSerpApps();
      console.log(`📱 Total SERP apps: ${serpApps.length}`);

      // Step 2: Get all iTunes apps bundle_ids
      const itunesApps = await this.getAllItunesApps();
      console.log(`📱 Total iTunes apps: ${itunesApps.length}`);

      // Step 3: Compare by bundle_id
      const comparison = this.performComparison(serpApps, itunesApps);
      this.displayComparisonResults(comparison);

      // Step 4: Compare by title + developer (fuzzy matching)
      const fuzzyComparison = this.performFuzzyComparison(serpApps, itunesApps);
      this.displayFuzzyResults(fuzzyComparison);

      // Step 5: Identify apps for feature extraction
      const uniqueSerpApps = this.identifyUniqueApps(serpApps, itunesApps, comparison, fuzzyComparison);
      
      // Step 6: Save results
      await this.saveResults(comparison, fuzzyComparison, uniqueSerpApps);

      // Step 7: Create feature extraction ready list
      await this.createFeatureExtractionList(uniqueSerpApps);

      console.log('\n🎉 Comparison analysis completed!');

    } catch (error) {
      console.error('❌ Comparison failed:', error);
    }
  }

  async getAllSerpApps() {
    console.log('📊 Fetching all SERP apps...');
    
    const { data: apps, error } = await supabase
      .from('serp_apps')
      .select(`
        bundle_id,
        title,
        developer,
        category,
        description,
        rating,
        rating_count,
        price_value,
        formatted_price,
        icon_url,
        release_date,
        query_term,
        source
      `)
      .order('bundle_id');

    if (error) throw error;
    return apps;
  }

  async getAllItunesApps() {
    console.log('📊 Fetching all iTunes apps...');
    
    const { data: apps, error } = await supabase
      .from('itunes_apps')
      .select(`
        bundle_id,
        title,
        developer,
        category,
        description,
        rating,
        rating_count,
        formatted_price,
        icon_url,
        release_date
      `)
      .order('bundle_id');

    if (error) throw error;
    return apps;
  }

  performComparison(serpApps, itunesApps) {
    console.log('\n🔄 Performing bundle_id comparison...');

    const itunesBundleIds = new Set(itunesApps.map(app => app.bundle_id));
    
    const inBoth = [];
    const serpOnly = [];
    
    serpApps.forEach(serpApp => {
      if (itunesBundleIds.has(serpApp.bundle_id)) {
        inBoth.push(serpApp);
      } else {
        serpOnly.push(serpApp);
      }
    });

    const itunesOnly = itunesApps.filter(itunesApp => 
      !serpApps.some(serpApp => serpApp.bundle_id === itunesApp.bundle_id)
    );

    return {
      inBoth,
      serpOnly,
      itunesOnly,
      serpTotal: serpApps.length,
      itunesTotal: itunesApps.length
    };
  }

  performFuzzyComparison(serpApps, itunesApps) {
    console.log('🔄 Performing fuzzy title+developer matching...');

    const itunesMap = new Map();
    itunesApps.forEach(app => {
      const key = this.createFuzzyKey(app.title, app.developer);
      if (!itunesMap.has(key)) {
        itunesMap.set(key, []);
      }
      itunesMap.get(key).push(app);
    });

    const fuzzyMatches = [];
    const noFuzzyMatch = [];

    serpApps.forEach(serpApp => {
      const serpKey = this.createFuzzyKey(serpApp.title, serpApp.developer);
      
      if (itunesMap.has(serpKey)) {
        const matches = itunesMap.get(serpKey);
        fuzzyMatches.push({
          serpApp,
          itunesMatches: matches,
          matchType: 'exact_title_dev'
        });
      } else {
        // Try partial matches
        let partialMatch = null;
        for (const [itunesKey, itunesApps] of itunesMap.entries()) {
          if (this.isPartialMatch(serpKey, itunesKey)) {
            partialMatch = { serpApp, itunesMatches: itunesApps, matchType: 'partial' };
            break;
          }
        }
        
        if (partialMatch) {
          fuzzyMatches.push(partialMatch);
        } else {
          noFuzzyMatch.push(serpApp);
        }
      }
    });

    return {
      fuzzyMatches,
      noFuzzyMatch
    };
  }

  createFuzzyKey(title, developer) {
    const cleanTitle = (title || '').toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    const cleanDeveloper = (developer || '').toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    return `${cleanTitle}|||${cleanDeveloper}`;
  }

  isPartialMatch(key1, key2) {
    const [title1, dev1] = key1.split('|||');
    const [title2, dev2] = key2.split('|||');
    
    // Check if titles are very similar (80% match)
    const titleSimilarity = this.calculateSimilarity(title1, title2);
    const devSimilarity = this.calculateSimilarity(dev1, dev2);
    
    return titleSimilarity > 0.8 && devSimilarity > 0.7;
  }

  calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  displayComparisonResults(comparison) {
    console.log('\n📊 Bundle ID Comparison Results:');
    console.log(`   📱 SERP total: ${comparison.serpTotal}`);
    console.log(`   📱 iTunes total: ${comparison.itunesTotal}`);
    console.log(`   🔄 In both tables: ${comparison.inBoth.length}`);
    console.log(`   🆕 SERP only: ${comparison.serpOnly.length}`);
    console.log(`   🆕 iTunes only: ${comparison.itunesOnly.length}`);
    
    const overlapPercentage = (comparison.inBoth.length / comparison.serpTotal * 100).toFixed(1);
    console.log(`   📈 Overlap percentage: ${overlapPercentage}%`);

    if (comparison.serpOnly.length > 0) {
      console.log(`\n   📋 Sample SERP-only apps:`);
      comparison.serpOnly.slice(0, 5).forEach((app, i) => {
        console.log(`     ${i + 1}. ${app.title} (${app.bundle_id})`);
      });
    }
  }

  displayFuzzyResults(fuzzyComparison) {
    console.log('\n🔍 Fuzzy Matching Results:');
    console.log(`   🎯 Apps with fuzzy matches: ${fuzzyComparison.fuzzyMatches.length}`);
    console.log(`   🆕 Apps with no matches: ${fuzzyComparison.noFuzzyMatch.length}`);

    if (fuzzyComparison.fuzzyMatches.length > 0) {
      console.log(`\n   📋 Sample fuzzy matches:`);
      fuzzyComparison.fuzzyMatches.slice(0, 3).forEach((match, i) => {
        console.log(`     ${i + 1}. SERP: "${match.serpApp.title}" by "${match.serpApp.developer}"`);
        console.log(`        iTunes: "${match.itunesMatches[0].title}" by "${match.itunesMatches[0].developer}"`);
        console.log(`        Match type: ${match.matchType}`);
      });
    }
  }

  identifyUniqueApps(serpApps, itunesApps, comparison, fuzzyComparison) {
    console.log('\n🎯 Identifying truly unique SERP apps...');

    // Start with bundle_id unique apps
    let uniqueApps = [...comparison.serpOnly];

    // Remove apps that have fuzzy matches (likely same apps with different bundle_ids)
    const fuzzyMatchedBundleIds = new Set(
      fuzzyComparison.fuzzyMatches.map(match => match.serpApp.bundle_id)
    );

    uniqueApps = uniqueApps.filter(app => !fuzzyMatchedBundleIds.has(app.bundle_id));

    // Add apps that have no fuzzy matches at all
    const noMatchApps = fuzzyComparison.noFuzzyMatch.filter(app => 
      !comparison.inBoth.some(inBothApp => inBothApp.bundle_id === app.bundle_id)
    );

    uniqueApps.push(...noMatchApps);

    // Remove duplicates (just in case)
    const uniqueAppMap = new Map();
    uniqueApps.forEach(app => {
      uniqueAppMap.set(app.bundle_id, app);
    });

    const finalUniqueApps = Array.from(uniqueAppMap.values());

    console.log(`   ✅ Truly unique SERP apps: ${finalUniqueApps.length}`);
    console.log(`   📊 Percentage of SERP apps that are unique: ${(finalUniqueApps.length / serpApps.length * 100).toFixed(1)}%`);

    return finalUniqueApps;
  }

  async saveResults(comparison, fuzzyComparison, uniqueApps) {
    console.log('\n💾 Saving comparison results...');

    const results = {
      analysis_date: new Date().toISOString(),
      summary: {
        serp_total: comparison.serpTotal,
        itunes_total: comparison.itunesTotal,
        overlap_bundle_id: comparison.inBoth.length,
        serp_only_bundle_id: comparison.serpOnly.length,
        itunes_only: comparison.itunesOnly.length,
        fuzzy_matches: fuzzyComparison.fuzzyMatches.length,
        truly_unique_serp: uniqueApps.length,
        overlap_percentage: (comparison.inBoth.length / comparison.serpTotal * 100).toFixed(1)
      },
      detailed_results: {
        bundle_id_comparison: comparison,
        fuzzy_comparison: fuzzyComparison,
        unique_serp_apps: uniqueApps
      }
    };

    const resultsFile = path.join(this.outputDir, 'serp-itunes-comparison.json');
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    
    console.log(`   ✅ Results saved: ${resultsFile}`);
  }

  async createFeatureExtractionList(uniqueApps) {
    console.log('\n📋 Creating feature extraction ready list...');

    // Filter apps that have sufficient data for feature extraction
    const readyForExtraction = uniqueApps.filter(app => {
      return app.description && 
             app.description.length > 20 && 
             app.title && 
             app.title.length > 0;
    });

    const extractionList = {
      created_at: new Date().toISOString(),
      total_unique_apps: uniqueApps.length,
      ready_for_extraction: readyForExtraction.length,
      filtering_criteria: [
        "Has description (> 20 characters)",
        "Has title",
        "Not duplicate of iTunes apps"
      ],
      apps: readyForExtraction.map(app => ({
        bundle_id: app.bundle_id,
        title: app.title,
        developer: app.developer,
        category: app.category,
        description: app.description,
        rating: app.rating,
        rating_count: app.rating_count,
        source: 'serp_apps'
      }))
    };

    const extractionFile = path.join(this.outputDir, 'serp-unique-apps-for-extraction.json');
    fs.writeFileSync(extractionFile, JSON.stringify(extractionList, null, 2));

    console.log(`   ✅ Feature extraction list created: ${extractionFile}`);
    console.log(`   📊 Apps ready for feature extraction: ${readyForExtraction.length}`);
    console.log(`   📊 Filtered out: ${uniqueApps.length - readyForExtraction.length} (insufficient data)`);

    return extractionList;
  }
}

// CLI interface
async function main() {
  const comparator = new SerpItunesComparator();
  await comparator.compareAndAnalyze();
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ SERP vs iTunes comparison completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Comparison failed:', error);
      process.exit(1);
    });
}

module.exports = { SerpItunesComparator };