const ContextualProblemSolver = require('./contextual-problem-solver.js');

async function testMultiModalSearch() {
  try {
    const solver = new ContextualProblemSolver();
    
    console.log('='.repeat(80));
    console.log('Testing Multi-Modal Search (Description + Features)');
    console.log('='.repeat(80));
    
    const testQueries = [
      "easy photo editor",
      "social fitness tracker", 
      "plant care app"
    ];
    
    for (const query of testQueries) {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`📊 Multi-Modal Test: "${query}"`);
      console.log(`${'='.repeat(70)}`);
      
      try {
        const results = await solver.searchBySemanticSimilarity(query, 5);
        
        console.log(`\n✅ Found ${results.length} results with multi-modal analysis:\n`);
        
        results.forEach((app, i) => {
          console.log(`${i+1}. ${app.title}`);
          console.log(`   Category: ${app.primary_category || 'Unknown'}`);
          console.log(`   Search Type: ${app.search_type || 'unknown'}`);
          
          if (app.has_feature_data) {
            console.log(`   📊 Description Similarity: ${app.desc_similarity?.toFixed(4) || 'N/A'}`);
            console.log(`   🎯 Feature Similarity: ${app.feature_similarity?.toFixed(4) || 'N/A'}`);
            console.log(`   🔄 Combined Score: ${app.similarity_score.toFixed(4)} (70% desc + 30% features)`);
          } else {
            console.log(`   📊 Description Only: ${app.similarity_score.toFixed(4)}`);
            console.log(`   ⚠️ No feature data available`);
          }
          
          if (app.boost_applied && app.boost_reasons.length > 0) {
            console.log(`   🚀 Boosts Applied: ${app.boost_reasons.join(', ')}`);
          }
          
          console.log(`   Description: ${(app.description || '').substring(0, 80)}...`);
          console.log('');
        });
        
        // Show summary statistics
        const multiModalCount = results.filter(app => app.search_type === 'multi_modal').length;
        const descOnlyCount = results.filter(app => app.search_type === 'description_only').length;
        
        console.log(`📈 Search Statistics:`);
        console.log(`   Multi-modal results: ${multiModalCount}/${results.length}`);
        console.log(`   Description-only results: ${descOnlyCount}/${results.length}`);
        
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

testMultiModalSearch();