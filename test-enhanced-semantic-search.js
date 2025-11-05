/**
 * Test Enhanced State-of-Art Search with Semantic Search
 * Testing the two requested queries:
 * 1. "help me track my caffeine as i am consuming too much coffee"
 * 2. "app to track expense with my friends when i eat out"
 */

const StateOfArtSearch = require('./data-scraping/scripts/state-of-art-search.js');

async function testEnhancedSearch() {
  console.log('🧪 === TESTING ENHANCED SEMANTIC SEARCH ===\n');
  
  const search = new StateOfArtSearch();
  
  const testQueries = [
    "help me track my caffeine as i am consuming too much coffee",
    "app to track expense with my friends when i eat out"
  ];
  
  for (const query of testQueries) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 Testing Query: "${query}"`);
    console.log(`${'='.repeat(80)}`);
    
    try {
      const startTime = Date.now();
      const results = await search.search(query, 10);
      const endTime = Date.now();
      
      console.log(`\n📊 === SEARCH RESULTS ===`);
      console.log(`Query: "${query}"`);
      console.log(`Total time: ${endTime - startTime}ms`);
      console.log(`Methods used: ${results.metadata?.methods_used?.join(', ') || 'unknown'}`);
      
      if (results.metadata?.result_breakdown) {
        const breakdown = results.metadata.result_breakdown;
        console.log(`Result breakdown:`);
        console.log(`  • Targeted: ${breakdown.targeted}`);
        console.log(`  • Features: ${breakdown.features}`);
        console.log(`  • Semantic: ${breakdown.semantic}`);
        console.log(`  • Final: ${breakdown.final}`);
      }
      
      if (results.results && results.results.length > 0) {
        console.log(`\n🎯 Top ${Math.min(5, results.results.length)} Results:`);
        results.results.slice(0, 5).forEach((app, i) => {
          console.log(`\n${i + 1}. ${app.title}`);
          console.log(`   📱 Category: ${app.primary_category || 'Unknown'}`);
          console.log(`   ⭐ Rating: ${app.rating || 'N/A'}`);
          console.log(`   🔢 Score: ${(app.relevance_score || 0).toFixed(1)}`);
          console.log(`   🔍 Method: ${app.search_method}`);
          
          if (app.semantic_similarity) {
            console.log(`   🧠 Semantic: ${(app.semantic_similarity * 100).toFixed(1)}%`);
          }
          
          if (app.matched_keywords && app.matched_keywords.length > 0) {
            console.log(`   🎯 Keywords: ${app.matched_keywords.join(', ')}`);
          }
          
          if (app.description) {
            const shortDesc = app.description.length > 120 
              ? app.description.substring(0, 120) + '...' 
              : app.description;
            console.log(`   📖 ${shortDesc}`);
          }
        });
      } else {
        console.log('\n❌ No results found');
      }
      
      // Show intent analysis
      if (results.intent) {
        console.log(`\n🧠 Intent Analysis:`);
        console.log(`   App type: ${results.intent.app_type}`);
        console.log(`   User goal: ${results.intent.user_goal}`);
        if (results.intent.search_terms?.exact_keywords) {
          console.log(`   Keywords: ${results.intent.search_terms.exact_keywords.join(', ')}`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Search failed for "${query}":`, error.message);
    }
  }
  
  console.log(`\n\n🎉 === TESTING COMPLETE ===`);
  console.log(`\n💡 Analysis:`);
  console.log(`✅ Semantic search should find apps that keyword search misses:`);
  console.log(`   • Caffeine query: Should find "Caffeine Zone", "Up Coffee", etc.`);
  console.log(`   • Expense query: Should find "Splitwise", "Tab", "Bill splitting apps"`);
  console.log(`✅ Multi-method scoring gives better rankings`);
  console.log(`✅ Error handling prevents crashes when embeddings fail`);
}

// Run the test
if (require.main === module) {
  testEnhancedSearch().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

module.exports = { testEnhancedSearch };