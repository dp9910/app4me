// Comprehensive test script for plain English search
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Generic search function for any plain English query
async function plainEnglishSearch(query, searchType = 'general') {
  console.log(`\n🔍 === SEARCHING: "${query}" ===`);
  
  try {
    const allResults = [];
    
    // Step 1: Title and description search
    console.log('\n📍 STEP 1: Title and description search');
    
    const { data: titleResults, error } = await supabase
      .from('apps_unified')
      .select('id, title, primary_category, rating, description')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .not('primary_category', 'eq', 'Games')  // Exclude games by default
      .limit(10);
    
    if (!error && titleResults) {
      console.log(`🎯 Found ${titleResults.length} apps in titles/descriptions:`);
      titleResults.forEach((app, i) => {
        console.log(`  ${i+1}. ${app.title} (${app.primary_category}) - Rating: ${app.rating}`);
        allResults.push({
          ...app,
          relevance_score: 7,
          search_method: 'title_description'
        });
      });
    } else {
      console.error('❌ Step 1 error:', error);
    }
    
    // Step 2: Feature-based search
    console.log('\n📍 STEP 2: Feature-based search');
    
    const { data: featureResults, error: featureError } = await supabase
      .from('app_features')
      .select(`
        app_id,
        primary_use_case,
        target_user,
        key_benefit,
        apps_unified!inner(id, title, primary_category, rating, description)
      `)
      .or(`primary_use_case.ilike.%${query}%,target_user.ilike.%${query}%,key_benefit.ilike.%${query}%`)
      .limit(8);
    
    if (!featureError && featureResults) {
      console.log(`🌟 Found ${featureResults.length} apps via features:`);
      featureResults.forEach((feature, i) => {
        const app = Array.isArray(feature.apps_unified) ? feature.apps_unified[0] : feature.apps_unified;
        console.log(`  ${i+1}. ${app.title} (${app.primary_category})`);
        console.log(`     → Use case: ${feature.primary_use_case}`);
        
        // Add to results if not already included
        if (!allResults.find(r => r.id === app.id)) {
          allResults.push({
            ...app,
            relevance_score: 9,
            search_method: 'features',
            feature_match: {
              use_case: feature.primary_use_case,
              target_user: feature.target_user,
              key_benefit: feature.key_benefit
            }
          });
        }
      });
    } else {
      console.error('❌ Step 2 error:', featureError);
    }
    
    // Step 3: Apply basic filtering
    console.log('\n📍 STEP 3: Applying filters');
    
    const filteredResults = allResults.filter(app => {
      const title = app.title.toLowerCase();
      const category = app.primary_category?.toLowerCase() || '';
      
      // Basic exclusions
      if (title.includes('zombies') || title.includes('zombie')) return false;
      if (title.includes('vs.') || title.includes('versus')) return false;
      
      return true;
    });
    
    console.log(`🧹 Filtered from ${allResults.length} to ${filteredResults.length} results`);
    
    // Step 4: Final ranked results
    console.log('\n📍 STEP 4: Final ranked results:');
    const finalResults = filteredResults
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, 5);
    
    finalResults.forEach((app, i) => {
      console.log(`  ${i+1}. ${app.title} (${app.primary_category}) - Score: ${app.relevance_score}`);
      console.log(`     Method: ${app.search_method}, Rating: ${app.rating}`);
      if (app.feature_match) {
        console.log(`     Feature: ${app.feature_match.use_case}`);
      }
    });
    
    console.log(`\n✅ SUCCESS: Found ${finalResults.length} relevant apps!`);
    return finalResults;
    
  } catch (error) {
    console.error('❌ Search failed:', error);
    return [];
  }
}

// Test multiple search queries
async function runComprehensiveTests() {
  console.log('🚀 Starting comprehensive search tests...\n');
  
  const testQueries = [
    'plant care',
    'fitness tracking',
    'photo editing',
    'meditation',
    'cooking recipes',
    'learn languages',
    'budgeting money'
  ];
  
  const results = {};
  
  for (const query of testQueries) {
    const searchResults = await plainEnglishSearch(query);
    results[query] = searchResults.length;
    
    // Wait a bit between searches
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🎉 === COMPREHENSIVE TEST SUMMARY ===');
  Object.entries(results).forEach(([query, count]) => {
    console.log(`  "${query}": ${count} results`);
  });
  
  return results;
}

// Run the tests
runComprehensiveTests().then(results => {
  console.log('\n✅ All tests completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Tests failed:', error);
  process.exit(1);
});