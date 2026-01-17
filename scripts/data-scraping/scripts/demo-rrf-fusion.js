// Demonstration of RRF fusion with mock data
console.log('🔄 Demonstrating Reciprocal Rank Fusion (RRF) Algorithm...');

// Mock semantic search results
const semanticResults = [
  { app_id: '1', name: 'Mint: Budget & Money Manager', category: 'Finance', semantic_score: 0.95, rank: 1 },
  { app_id: '2', name: 'YNAB (You Need A Budget)', category: 'Finance', semantic_score: 0.88, rank: 2 },
  { app_id: '3', name: 'PocketGuard: Budget Tracker', category: 'Finance', semantic_score: 0.82, rank: 3 },
  { app_id: '4', name: 'Headspace: Meditation', category: 'Health', semantic_score: 0.75, rank: 4 },
  { app_id: '5', name: 'Todoist: Task Manager', category: 'Productivity', semantic_score: 0.70, rank: 5 }
];

// Mock keyword search results (different ranking)
const keywordResults = [
  { app_id: '2', name: 'YNAB (You Need A Budget)', category: 'Finance', keyword_score: 0.92, rank: 1 },
  { app_id: '6', name: 'Expense Tracker: Money Manager', category: 'Finance', keyword_score: 0.89, rank: 2 },
  { app_id: '1', name: 'Mint: Budget & Money Manager', category: 'Finance', keyword_score: 0.85, rank: 3 },
  { app_id: '7', name: 'Money Lover: Expense Manager', category: 'Finance', keyword_score: 0.78, rank: 4 },
  { app_id: '3', name: 'PocketGuard: Budget Tracker', category: 'Finance', keyword_score: 0.72, rank: 5 }
];

console.log('\n📊 Input Results:');
console.log('Semantic Search Results:');
semanticResults.forEach((r, i) => console.log(`  ${i+1}. ${r.name} (score: ${r.semantic_score})`));

console.log('\nKeyword Search Results:');
keywordResults.forEach((r, i) => console.log(`  ${i+1}. ${r.name} (score: ${r.keyword_score})`));

// Apply RRF fusion
function applyRRF(semanticResults, keywordResults, k = 60) {
  const resultMap = new Map();
  
  // Add semantic results with RRF scoring
  semanticResults.forEach((result) => {
    const rrf_score = 1 / (k + result.rank);
    resultMap.set(result.app_id, {
      app_id: result.app_id,
      name: result.name,
      category: result.category,
      semantic_score: result.semantic_score,
      keyword_score: 0,
      rrf_score: rrf_score,
      retrieval_methods: ['semantic']
    });
  });
  
  // Add keyword results with RRF scoring
  keywordResults.forEach((result) => {
    const rrf_score = 1 / (k + result.rank);
    
    if (resultMap.has(result.app_id)) {
      // App found by both methods - combine RRF scores
      const existing = resultMap.get(result.app_id);
      existing.keyword_score = result.keyword_score;
      existing.rrf_score += rrf_score; // Add RRF scores
      existing.retrieval_methods.push('keyword');
    } else {
      // App found only by keyword search
      resultMap.set(result.app_id, {
        app_id: result.app_id,
        name: result.name,
        category: result.category,
        semantic_score: 0,
        keyword_score: result.keyword_score,
        rrf_score: rrf_score,
        retrieval_methods: ['keyword']
      });
    }
  });
  
  // Convert to array and sort by RRF score
  const fusedResults = Array.from(resultMap.values());
  fusedResults.sort((a, b) => b.rrf_score - a.rrf_score);
  
  return fusedResults;
}

const fusedResults = applyRRF(semanticResults, keywordResults);

console.log('\n🔗 RRF Fusion Results (k=60):');
console.log('Rank | App Name | RRF Score | Methods | Semantic | Keyword');
console.log('-'.repeat(80));

fusedResults.forEach((result, index) => {
  const methods = result.retrieval_methods.join('+');
  const semantic = result.semantic_score > 0 ? result.semantic_score.toFixed(2) : '--';
  const keyword = result.keyword_score > 0 ? result.keyword_score.toFixed(2) : '--';
  
  console.log(
    `${(index + 1).toString().padStart(4)} | ${result.name.padEnd(30)} | ${result.rrf_score.toFixed(4).padStart(8)} | ${methods.padEnd(15)} | ${semantic.padStart(8)} | ${keyword.padStart(7)}`
  );
});

console.log('\n📈 Analysis:');
console.log('1. YNAB ranks #1 because it was found by BOTH methods (RRF scores combine)');
console.log('2. Apps found by both methods get higher scores than single-method apps');
console.log('3. RRF balances different ranking orders from semantic vs keyword search');
console.log('4. Final ranking considers consensus between multiple retrieval methods');

// Show the RRF calculation for top result
const topResult = fusedResults[0];
console.log(`\n🧮 RRF Calculation for "${topResult.name}":`);

if (topResult.retrieval_methods.includes('semantic')) {
  const semanticRank = semanticResults.find(r => r.app_id === topResult.app_id)?.rank;
  const semanticRRF = 1 / (60 + semanticRank);
  console.log(`   Semantic: 1/(60 + ${semanticRank}) = ${semanticRRF.toFixed(4)}`);
}

if (topResult.retrieval_methods.includes('keyword')) {
  const keywordRank = keywordResults.find(r => r.app_id === topResult.app_id)?.rank;
  const keywordRRF = 1 / (60 + keywordRank);
  console.log(`   Keyword:  1/(60 + ${keywordRank}) = ${keywordRRF.toFixed(4)}`);
}

console.log(`   Total RRF Score: ${topResult.rrf_score.toFixed(4)}`);

console.log('\n✅ RRF Fusion demonstration completed!');
console.log('This shows how hybrid retrieval combines different ranking methods for better results.');