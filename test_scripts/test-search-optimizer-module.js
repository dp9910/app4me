// Test the search optimizer module
const { getSearchOptimization } = require('./src/lib/recommendation/search-optimizer.ts');
require('dotenv').config({ path: '.env.local' });

async function testOptimizer() {
  try {
    console.log('🧠 Testing Search Optimizer Module...\n');
    
    const testQuery = "apps to take care of my plants at home";
    console.log(`Query: "${testQuery}"`);
    
    const optimization = await getSearchOptimization(testQuery);
    
    console.log('\n📊 OPTIMIZATION RESULT:');
    console.log('='.repeat(50));
    console.log(JSON.stringify(optimization, null, 2));
    
    console.log('\n🎯 KEY INSIGHTS:');
    console.log(`Search Focus: ${optimization.search_focus}`);
    console.log(`App Names: ${optimization.exact_app_names.join(', ') || 'none'}`);
    console.log(`Title Keywords: ${optimization.title_keywords.join(', ')}`);
    console.log(`Use Case Keywords: ${optimization.feature_filters.use_case_keywords.join(', ')}`);
    console.log(`Semantic Query: ${optimization.semantic_query}`);
    console.log(`Categories: ${optimization.category_hints.join(', ')}`);
    console.log(`Exclude: ${optimization.exclude_categories.join(', ') || 'none'}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testOptimizer();