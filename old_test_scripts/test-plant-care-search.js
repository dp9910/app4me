const ContextualProblemSolver = require('./contextual-problem-solver.js');

async function testPlantCareSearch() {
  try {
    const solver = new ContextualProblemSolver();
    const query = "apps for plant care";
    
    console.log('='.repeat(80));
    console.log(`Testing query: "${query}"`);
    console.log('='.repeat(80));
    
    // Test 1: Direct semantic search
    console.log('\n1. DIRECT SEMANTIC SEARCH:');
    console.log('-'.repeat(50));
    try {
      const semanticResults = await solver.searchBySemanticSimilarity(query, 15);
      console.log(`Found ${semanticResults.length} semantic matches:\n`);
      
      semanticResults.forEach((app, i) => {
        console.log(`${i+1}. ${app.title}`);
        console.log(`   Category: ${app.primary_category || 'Unknown'}`);
        console.log(`   Similarity: ${(app.similarity_score || app.relevance || 0).toFixed(4)}`);
        console.log(`   Description: ${(app.description || '').substring(0, 100)}...`);
        console.log('');
      });
    } catch (error) {
      console.log(`Semantic search failed: ${error.message}`);
    }
    
    // Test 2: Contextual search (which now should use semantic search for general queries)
    console.log('\n2. CONTEXTUAL SEARCH (with enhanced general search):');
    console.log('-'.repeat(50));
    const contextualResults = await solver.solveUserQuery(query);
    
    console.log(`Query Type: ${contextualResults.query_type}`);
    console.log(`Total Apps Found: ${contextualResults.total_apps}\n`);
    
    if (contextualResults.query_type === 'general') {
      contextualResults.results.forEach((app, i) => {
        console.log(`${i+1}. ${app.title}`);
        console.log(`   Category: ${app.primary_category || 'Unknown'}`);
        console.log(`   Source: ${app.source || 'unknown'}`);
        console.log(`   Relevance: ${(app.relevance_score || app.relevance || 0).toFixed(4)}`);
        console.log(`   Description: ${(app.description || '').substring(0, 100)}...`);
        console.log('');
      });
    } else if (contextualResults.query_type === 'problem') {
      contextualResults.solution_steps.forEach(step => {
        console.log(`\nStep ${step.step}: ${step.step_name}`);
        step.apps.forEach((app, i) => {
          console.log(`  ${i+1}. ${app.title} - ${app.primary_category || 'Unknown'}`);
        });
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
}

testPlantCareSearch();