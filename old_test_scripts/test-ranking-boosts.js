const ContextualProblemSolver = require('./contextual-problem-solver.js');

async function testRankingBoosts() {
  try {
    const solver = new ContextualProblemSolver();
    
    console.log('='.repeat(80));
    console.log('Testing Ranking Boosts with Feature-Aware Search');
    console.log('='.repeat(80));
    
    const testQueries = [
      "easy photo editor",
      "social fitness tracker",
      "offline music app"
    ];
    
    for (const query of testQueries) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🚀 Testing: "${query}"`);
      console.log(`${'='.repeat(60)}`);
      
      try {
        const results = await solver.searchBySemanticSimilarity(query, 6);
        
        console.log(`\n✅ Found ${results.length} results with ranking analysis:\n`);
        
        results.forEach((app, i) => {
          console.log(`${i+1}. ${app.title}`);
          console.log(`   Category: ${app.primary_category || 'Unknown'}`);
          console.log(`   Base similarity: ${app.similarity_score.toFixed(4)}`);
          console.log(`   Boost applied: ${app.boost_applied ? '✅ YES' : '❌ NO'}`);
          if (app.boost_reasons && app.boost_reasons.length > 0) {
            console.log(`   Boost reasons: ${app.boost_reasons.join(', ')}`);
          }
          console.log(`   Final score: ${app.relevance.toFixed(4)}`);
          console.log(`   Description: ${(app.description || '').substring(0, 80)}...`);
          console.log('');
        });
        
      } catch (error) {
        console.log(`❌ Error with query "${query}": ${error.message}`);
      }
    }
    
    // Compare with basic plant care search (no special intents)
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🌿 Control Test: "plant care" (no special intents)`);
    console.log(`${'='.repeat(60)}`);
    
    const controlResults = await solver.searchBySemanticSimilarity("plant care", 4);
    controlResults.forEach((app, i) => {
      console.log(`${i+1}. ${app.title} - Score: ${app.similarity_score.toFixed(4)} - Boost: ${app.boost_applied ? 'YES' : 'NO'}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
}

testRankingBoosts();