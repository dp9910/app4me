const ContextualProblemSolver = require('./contextual-problem-solver.js');

async function testDatabaseSearch() {
  console.log('🧪 Testing database search...');
  
  try {
    const solver = new ContextualProblemSolver();
    console.log('✅ Solver instance created');
    
    // Test keyword extraction
    const keywords = solver.extractKeywords("cant sleep, too much coffee");
    console.log('📝 Extracted keywords:', keywords);
    
    // Test database search
    console.log('\n🔍 Testing database search with keywords...');
    const results = await solver.searchByKeywords(keywords, 5);
    
    console.log(`✅ Database search completed, found ${results.length} results`);
    
    if (results.length > 0) {
      console.log('\n📱 Results:');
      results.forEach((app, index) => {
        console.log(`  ${index + 1}. ${app.title} (${app.primary_category})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDatabaseSearch();