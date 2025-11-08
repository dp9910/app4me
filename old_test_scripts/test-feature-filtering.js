const ContextualProblemSolver = require('./contextual-problem-solver.js');

async function testFeatureFiltering() {
  try {
    const solver = new ContextualProblemSolver();
    
    console.log('='.repeat(80));
    console.log('Testing Enhanced Search with Feature Filtering');
    console.log('='.repeat(80));
    
    const testQueries = [
      "free plant care app",
      "easy photo editor", 
      "offline music app",
      "social fitness tracker",
      "plant care", // Control - no intent keywords
    ];
    
    for (const query of testQueries) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔍 Testing: "${query}"`);
      console.log(`${'='.repeat(60)}`);
      
      try {
        const results = await solver.searchBySemanticSimilarity(query, 8);
        
        console.log(`\n✅ Found ${results.length} results:\n`);
        
        results.forEach((app, i) => {
          console.log(`${i+1}. ${app.title}`);
          console.log(`   Category: ${app.primary_category || 'Unknown'}`);
          console.log(`   Similarity: ${app.similarity_score.toFixed(4)}`);
          console.log(`   Description: ${(app.description || '').substring(0, 100)}...`);
          console.log('');
        });
        
      } catch (error) {
        console.log(`❌ Error with query "${query}": ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
}

testFeatureFiltering();