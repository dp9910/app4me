const ContextualProblemSolver = require('./contextual-problem-solver.js');

async function compareSearchMethods() {
  try {
    const solver = new ContextualProblemSolver();
    const query = "plant care";
    
    console.log('='.repeat(80));
    console.log(`Comparing search methods for: "${query}"`);
    console.log('='.repeat(80));
    
    // Test 1: Keyword Search
    console.log('\n1. KEYWORD SEARCH:');
    console.log('-'.repeat(50));
    
    const keywords = solver.extractKeywords(query);
    console.log(`Keywords: ${keywords.join(', ')}`);
    
    const keywordResults = await solver.searchByKeywords(keywords, 20);
    console.log(`Found ${keywordResults.length} keyword matches:\n`);
    
    const keywordApps = new Map();
    keywordResults.forEach((app, i) => {
      console.log(`${i+1}. ${app.title}`);
      console.log(`   Category: ${app.primary_category || 'Unknown'}`);
      console.log(`   Relevance: ${app.relevance}`);
      console.log('');
      keywordApps.set(app.app_id, { ...app, searchMethod: 'keyword' });
    });
    
    // Test 2: Embedding Search  
    console.log('\n2. EMBEDDING SEARCH:');
    console.log('-'.repeat(50));
    
    const embeddingResults = await solver.searchBySemanticSimilarity(query, 20);
    console.log(`Found ${embeddingResults.length} embedding matches:\n`);
    
    const embeddingApps = new Map();
    embeddingResults.forEach((app, i) => {
      console.log(`${i+1}. ${app.title}`);
      console.log(`   Category: ${app.primary_category || 'Unknown'}`);
      console.log(`   Similarity: ${(app.similarity_score || 0).toFixed(4)}`);
      console.log('');
      embeddingApps.set(app.app_id, { ...app, searchMethod: 'embedding' });
    });
    
    // Test 3: Find apps that appear in BOTH searches
    console.log('\n3. APPS FOUND IN BOTH SEARCHES (HIGHEST RELEVANCE):');
    console.log('='.repeat(60));
    
    const commonApps = [];
    for (const [appId, keywordApp] of keywordApps) {
      if (embeddingApps.has(appId)) {
        const embeddingApp = embeddingApps.get(appId);
        commonApps.push({
          ...keywordApp,
          similarity_score: embeddingApp.similarity_score,
          combined_score: (keywordApp.relevance + embeddingApp.similarity_score) / 2
        });
      }
    }
    
    // Sort by combined score
    commonApps.sort((a, b) => b.combined_score - a.combined_score);
    
    if (commonApps.length > 0) {
      console.log(`Found ${commonApps.length} apps in BOTH searches:\n`);
      commonApps.forEach((app, i) => {
        console.log(`${i+1}. ${app.title}`);
        console.log(`   Category: ${app.primary_category || 'Unknown'}`);
        console.log(`   Keyword relevance: ${app.relevance}`);
        console.log(`   Embedding similarity: ${(app.similarity_score || 0).toFixed(4)}`);
        console.log(`   Combined score: ${app.combined_score.toFixed(4)}`);
        console.log('');
      });
    } else {
      console.log('❌ NO OVERLAP between keyword and embedding searches!');
      console.log('This indicates a serious problem with one of the search methods.\n');
    }
    
    // Test 4: Apps only in keyword search
    console.log('\n4. APPS ONLY IN KEYWORD SEARCH:');
    console.log('-'.repeat(50));
    
    const keywordOnly = [];
    for (const [appId, app] of keywordApps) {
      if (!embeddingApps.has(appId)) {
        keywordOnly.push(app);
      }
    }
    
    console.log(`Found ${keywordOnly.length} apps only in keyword search:\n`);
    keywordOnly.slice(0, 10).forEach((app, i) => {
      console.log(`${i+1}. ${app.title} - ${app.primary_category || 'Unknown'}`);
    });
    
    // Test 5: Apps only in embedding search  
    console.log('\n\n5. APPS ONLY IN EMBEDDING SEARCH:');
    console.log('-'.repeat(50));
    
    const embeddingOnly = [];
    for (const [appId, app] of embeddingApps) {
      if (!keywordApps.has(appId)) {
        embeddingOnly.push(app);
      }
    }
    
    console.log(`Found ${embeddingOnly.length} apps only in embedding search:\n`);
    embeddingOnly.slice(0, 10).forEach((app, i) => {
      console.log(`${i+1}. ${app.title} - ${app.primary_category || 'Unknown'}`);
    });
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY:');
    console.log('='.repeat(80));
    console.log(`Keyword results: ${keywordResults.length}`);
    console.log(`Embedding results: ${embeddingResults.length}`);
    console.log(`Common apps (both methods): ${commonApps.length}`);
    console.log(`Keyword-only apps: ${keywordOnly.length}`);
    console.log(`Embedding-only apps: ${embeddingOnly.length}`);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
}

compareSearchMethods();