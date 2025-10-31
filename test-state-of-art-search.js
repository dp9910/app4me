/**
 * COMPREHENSIVE TEST SUITE FOR STATE-OF-ART SEARCH
 */

const StateOfArtSearch = require('./data-scraping/scripts/state-of-art-search');

async function runComprehensiveTests() {
  console.log('🚀 === TESTING STATE-OF-ART SEARCH ENGINE ===\n');
  
  const searchEngine = new StateOfArtSearch();
  
  const testQueries = [
    // Basic functionality
    'plant care apps',
    'fitness tracking',
    'photo editing',
    
    // Complex natural language
    'I want to learn a new language',
    'help me manage my money and budget',
    'apps for meditation and mindfulness',
    
    // Specific use cases
    'apps for cooking recipes',
    'social media management tools',
    'video conferencing apps',
    
    // Edge cases
    'productivity apps for remote work',
    'games for children',
    'music streaming services'
  ];
  
  const results = {};
  let totalTime = 0;
  
  for (let i = 0; i < testQueries.length; i++) {
    const query = testQueries[i];
    console.log(`\n📝 TEST ${i + 1}/${testQueries.length}: "${query}"`);
    console.log('=' + '='.repeat(60));
    
    try {
      const searchResult = await searchEngine.search(query);
      searchEngine.displayResults(searchResult);
      
      results[query] = {
        success: true,
        count: searchResult.results.length,
        time: searchResult.metadata.search_time_ms,
        intent: searchResult.analysis.intent
      };
      
      totalTime += searchResult.metadata.search_time_ms;
      
    } catch (error) {
      console.error(`❌ Test failed for "${query}":`, error.message);
      results[query] = {
        success: false,
        error: error.message
      };
    }
    
    // Brief pause between searches
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary report
  console.log('\n\n🎉 === COMPREHENSIVE TEST SUMMARY ===');
  console.log('=' + '='.repeat(50));
  
  const successful = Object.values(results).filter(r => r.success).length;
  const failed = Object.values(results).filter(r => !r.success).length;
  const avgTime = totalTime / successful;
  
  console.log(`Total Tests: ${testQueries.length}`);
  console.log(`Successful: ${successful} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Average Search Time: ${avgTime.toFixed(0)}ms`);
  console.log(`Total Search Time: ${(totalTime / 1000).toFixed(1)}s`);
  
  console.log('\n📊 DETAILED RESULTS:');
  Object.entries(results).forEach(([query, result]) => {
    if (result.success) {
      console.log(`  ✅ "${query}": ${result.count} results (${result.time}ms, intent: ${result.intent})`);
    } else {
      console.log(`  ❌ "${query}": ${result.error}`);
    }
  });
  
  // Performance analysis
  console.log('\n⚡ PERFORMANCE ANALYSIS:');
  const fastSearches = Object.values(results).filter(r => r.success && r.time < 2000).length;
  const slowSearches = Object.values(results).filter(r => r.success && r.time >= 2000).length;
  
  console.log(`  Fast searches (<2s): ${fastSearches}`);
  console.log(`  Slow searches (≥2s): ${slowSearches}`);
  
  // Coverage analysis
  console.log('\n🎯 COVERAGE ANALYSIS:');
  const highResults = Object.values(results).filter(r => r.success && r.count >= 5).length;
  const lowResults = Object.values(results).filter(r => r.success && r.count < 5 && r.count > 0).length;
  const noResults = Object.values(results).filter(r => r.success && r.count === 0).length;
  
  console.log(`  High coverage (≥5 results): ${highResults}`);
  console.log(`  Low coverage (1-4 results): ${lowResults}`);
  console.log(`  No results: ${noResults}`);
  
  return results;
}

// Run individual test for quick debugging
async function runSingleTest(query = 'plant care apps') {
  console.log('🔍 === SINGLE TEST ===\n');
  
  const searchEngine = new StateOfArtSearch();
  const result = await searchEngine.search(query);
  searchEngine.displayResults(result);
  
  return result;
}

// Check if running directly or being imported
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    // Single test with custom query
    const query = args.join(' ');
    runSingleTest(query).then(() => {
      console.log('\n✅ Single test completed!');
      process.exit(0);
    }).catch(error => {
      console.error('❌ Single test failed:', error);
      process.exit(1);
    });
  } else {
    // Full comprehensive test suite
    runComprehensiveTests().then(() => {
      console.log('\n✅ All tests completed!');
      process.exit(0);
    }).catch(error => {
      console.error('❌ Tests failed:', error);
      process.exit(1);
    });
  }
}

module.exports = { runComprehensiveTests, runSingleTest };