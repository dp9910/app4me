/**
 * Test Gemini Semantic Search
 * Now that we know existing embeddings are from Gemini text-embedding-004
 */

const StateOfArtSearch = require('./data-scraping/scripts/state-of-art-search.js');

async function testGeminiSemantic() {
  console.log('🧠 === TESTING GEMINI SEMANTIC SEARCH ===\n');
  
  const search = new StateOfArtSearch();
  
  // Test a simple query to see if semantic search works now
  const testQuery = "help me track my caffeine intake";
  
  console.log(`🔍 Testing: "${testQuery}"`);
  console.log(`\n💡 What we now know:`);
  console.log(`   • Existing embeddings: Gemini text-embedding-004`);
  console.log(`   • Query embeddings: Gemini text-embedding-004 (same model)`);
  console.log(`   • Threshold lowered: 0.65 → 0.4`);
  console.log(`   • Added debug logging to see similarity scores`);
  
  try {
    const results = await search.search(testQuery, 8);
    
    console.log(`\n📊 Results:`);
    console.log(`   Total: ${results.results?.length || 0}`);
    console.log(`   Semantic matches: ${results.metadata?.result_breakdown?.semantic || 0}`);
    
    if (results.results && results.results.length > 0) {
      console.log(`\n🎯 Top results with semantic info:`);
      results.results.forEach((app, i) => {
        console.log(`\n${i + 1}. ${app.title}`);
        console.log(`   🔢 Score: ${(app.relevance_score || 0).toFixed(1)}`);
        console.log(`   🔍 Method: ${app.search_method}`);
        if (app.semantic_similarity) {
          console.log(`   🧠 Semantic: ${(app.semantic_similarity * 100).toFixed(1)}%`);
        }
      });
    }
    
  } catch (error) {
    console.error(`❌ Test failed:`, error);
  }
}

// Run the test
if (require.main === module) {
  testGeminiSemantic().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

module.exports = { testGeminiSemantic };