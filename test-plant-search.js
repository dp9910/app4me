// Test script for improved plant care search
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// IMPROVED SEARCH - Step by step with filtering
async function improvedPlantCareSearch() {
  console.log('🚀 === IMPROVED PLANT CARE SEARCH WITH FILTERING ===');
  const query = "find apps that help me with plant care";
  
  try {
    const allResults = [];
    
    // Step 1: Smart keyword search with exclusions
    console.log('\n📍 STEP 1: Smart keyword search (excluding games and irrelevant apps)');
    
    const { data: smartResults, error } = await supabase
      .from('apps_unified')
      .select('id, title, primary_category, rating, description')
      .or('title.ilike.%plant care%,title.ilike.%planta%,description.ilike.%plant care%,description.ilike.%watering plants%')
      .not('title', 'ilike', '%zombies%')  // Exclude zombie games
      .not('title', 'ilike', '%focus plant%')  // Exclude focus apps
      .not('primary_category', 'eq', 'Games')  // Exclude games
      .limit(10);
    
    if (!error && smartResults) {
      console.log(`🎯 Found ${smartResults.length} relevant plant apps:`);
      smartResults.forEach((app, i) => {
        console.log(`  ${i+1}. ${app.title} (${app.primary_category}) - Rating: ${app.rating}`);
        allResults.push({
          ...app,
          relevance_score: 8,
          search_method: 'smart_keyword',
          matched_keywords: ['plant care']
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
      .or('primary_use_case.ilike.%plant care%,target_user.ilike.%plant lovers%,key_benefit.ilike.%plant health%')
      .limit(5);
    
    if (!featureError && featureResults) {
      console.log(`🌱 Found ${featureResults.length} apps via features:`);
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
            matched_keywords: [],
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
    
    // Step 3: Apply smart filtering to remove false positives
    console.log('\n📍 STEP 3: Applying smart filters');
    
    const filteredResults = allResults.filter(app => {
      const title = app.title.toLowerCase();
      const category = app.primary_category?.toLowerCase() || '';
      
      // Exclude obvious false positives
      if (title.includes('zombies') || title.includes('zombie')) return false;
      if (title.includes('focus plant') || title.includes('forest')) return false;
      if (category === 'games') return false;
      if (title.includes('vs.') || title.includes('versus')) return false;
      
      return true;
    });
    
    console.log(`🧹 Filtered from ${allResults.length} to ${filteredResults.length} results`);
    
    // Step 4: Final ranked results
    console.log('\n📍 STEP 4: Final ranked results for plant care:');
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
    
    console.log(`\n✅ SUCCESS: Found ${finalResults.length} highly relevant plant care apps!`);
    return finalResults;
    
  } catch (error) {
    console.error('❌ Improved search failed:', error);
    return [];
  }
}

// Run the test
console.log('🚀 Starting improved plant care search test...');
improvedPlantCareSearch().then(results => {
  console.log(`\n🎉 Test completed! Found ${results.length} results.`);
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});