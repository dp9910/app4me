// Test the hybrid retrieval system with RRF fusion
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testHybridRetriever() {
  console.log('🔄 Testing hybrid retrieval system with RRF fusion...');
  
  const testCases = [
    {
      name: 'Finance/Budget Query',
      query: 'budget expense tracking money management',
      description: 'Should find finance apps using both semantic and keyword matching'
    },
    {
      name: 'Relaxation/Wellness Query', 
      query: 'apps to help me relax and sleep at night',
      description: 'Should find health/wellness apps across different categories'
    },
    {
      name: 'Productivity Query',
      query: 'productivity tools for organizing tasks and notes',
      description: 'Should find productivity apps with task management features'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 Test Case: ${testCase.name}`);
    console.log(`Query: "${testCase.query}"`);
    console.log(`Expected: ${testCase.description}`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      // Test the hybrid retrieval by calling the individual components first
      console.log('\n1. Testing individual components...');
      
      // Simulate semantic search (simplified)
      const semanticResults = await simulateSemanticSearch(testCase.query, 15);
      console.log(`🧠 Semantic search: ${semanticResults.length} results`);
      
      // Simulate keyword search (simplified) 
      const keywordResults = await simulateKeywordSearch(testCase.query, 15);
      console.log(`🔑 Keyword search: ${keywordResults.length} results`);
      
      // Combine using RRF
      console.log('\n2. Applying Reciprocal Rank Fusion...');
      const hybridResults = applyRRF(semanticResults, keywordResults);
      console.log(`🔄 RRF fusion: ${hybridResults.length} combined results`);
      
      // Display top results
      console.log('\n3. Top hybrid recommendations:');
      hybridResults.slice(0, 8).forEach((result, i) => {
        console.log(`${i+1}. ${result.app_name} (${result.category})`);
        console.log(`   Final Score: ${result.final_score.toFixed(3)} | Methods: ${result.retrieval_methods.join(', ')}`);
        console.log(`   Semantic: ${result.semantic_score.toFixed(3)} | Keyword: ${result.keyword_score.toFixed(3)} | RRF: ${result.rrf_score.toFixed(3)}`);
        if (result.explanation) {
          console.log(`   ${result.explanation}`);
        }
        console.log('');
      });
      
      // Analytics
      console.log('\n4. Hybrid Search Analytics:');
      const analytics = getAnalytics(hybridResults);
      console.log(`   Total results: ${analytics.total_results}`);
      console.log(`   Semantic only: ${analytics.semantic_only}`);
      console.log(`   Keyword only: ${analytics.keyword_only}`);
      console.log(`   Both methods: ${analytics.both_methods}`);
      console.log(`   Categories found: ${analytics.categories.length} (${analytics.categories.slice(0, 5).join(', ')})`);
      console.log(`   Average score: ${analytics.avg_score.toFixed(3)}`);
      
    } catch (error) {
      console.error(`❌ Test case "${testCase.name}" failed:`, error.message);
    }
  }
  
  console.log('\n🎉 Hybrid retriever testing completed!');
}

// Simulate semantic search using simple text matching (for testing)
async function simulateSemanticSearch(query, limit) {
  const { data: apps, error } = await supabase
    .from('apps_unified')
    .select('id, title, primary_category, rating, icon_url, description')
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .limit(limit);
  
  if (error) throw error;
  
  return apps.map((app, index) => ({
    app_id: app.id.toString(),
    app_name: app.title,
    category: app.primary_category,
    rating: app.rating || 0,
    semantic_score: Math.max(0.5, 0.9 - (index * 0.05)), // Simulated semantic similarity
    retrieval_method: 'semantic',
    rank: index + 1
  }));
}

// Simulate keyword search using our existing TF-IDF logic (simplified)
async function simulateKeywordSearch(query, limit) {
  const keywords = extractKeywords(query);
  
  const { data: apps, error } = await supabase
    .from('app_features')
    .select(`
      app_id,
      keywords_tfidf,
      apps_unified!inner(
        title,
        primary_category,
        rating,
        icon_url
      )
    `)
    .limit(limit * 2);
  
  if (error) throw error;
  
  const scoredApps = [];
  
  for (const app of apps) {
    const tfidfData = app.keywords_tfidf || {};
    const keywordsTfidf = tfidfData.keywords || {};
    
    let score = 0;
    
    for (const keyword of keywords) {
      if (keywordsTfidf[keyword]) {
        score += parseFloat(keywordsTfidf[keyword]) || 0;
      }
    }
    
    // Quality boost
    score += (app.apps_unified.rating || 0) / 5.0 * 0.1;
    
    if (score > 0.05) {
      scoredApps.push({
        app_id: app.app_id.toString(),
        app_name: app.apps_unified.title,
        category: app.apps_unified.primary_category,
        rating: app.apps_unified.rating || 0,
        keyword_score: score,
        retrieval_method: 'keyword',
        rank: 0
      });
    }
  }
  
  // Sort and assign ranks
  scoredApps.sort((a, b) => b.keyword_score - a.keyword_score);
  scoredApps.forEach((app, index) => {
    app.rank = index + 1;
  });
  
  return scoredApps.slice(0, limit);
}

// Extract keywords from query
function extractKeywords(query) {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'apps', 'help', 'me']);
  
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .map(word => {
      // Apply basic stemming
      if (word.endsWith('ing')) return word.slice(0, -3);
      if (word.endsWith('ed')) return word.slice(0, -2);
      if (word === 'tracking') return 'track';
      if (word === 'management') return 'manag';
      return word;
    });
}

// Apply Reciprocal Rank Fusion
function applyRRF(semanticResults, keywordResults, k = 60) {
  const resultMap = new Map();
  
  // Add semantic results
  semanticResults.forEach((result) => {
    const appId = result.app_id;
    const rrf_score = 1 / (k + result.rank);
    
    resultMap.set(appId, {
      app_id: appId,
      app_name: result.app_name,
      category: result.category,
      rating: result.rating,
      semantic_score: result.semantic_score || 0,
      keyword_score: 0,
      rrf_score: rrf_score,
      final_score: rrf_score,
      retrieval_methods: ['semantic'],
      rank: 0
    });
  });
  
  // Add keyword results
  keywordResults.forEach((result) => {
    const appId = result.app_id;
    const rrf_score = 1 / (k + result.rank);
    
    if (resultMap.has(appId)) {
      // App found by both methods
      const existing = resultMap.get(appId);
      existing.keyword_score = result.keyword_score || 0;
      existing.rrf_score += rrf_score;
      existing.final_score = existing.rrf_score;
      existing.retrieval_methods.push('keyword');
    } else {
      // App found only by keyword search
      resultMap.set(appId, {
        app_id: appId,
        app_name: result.app_name,
        category: result.category,
        rating: result.rating,
        semantic_score: 0,
        keyword_score: result.keyword_score || 0,
        rrf_score: rrf_score,
        final_score: rrf_score,
        retrieval_methods: ['keyword'],
        rank: 0
      });
    }
  });
  
  // Enhance scoring and sort
  const results = Array.from(resultMap.values());
  
  // Apply additional scoring factors
  results.forEach(result => {
    // Quality boost
    if (result.rating > 4.0) {
      result.final_score += 0.1;
    }
    
    // Multi-method boost
    if (result.retrieval_methods.length > 1) {
      result.final_score += 0.15;
      result.explanation = `Found by both semantic and keyword search, highly rated (${result.rating}/5)`;
    } else if (result.retrieval_methods.includes('semantic')) {
      result.explanation = `Semantically similar to your query (${result.semantic_score.toFixed(2)})`;
    } else {
      result.explanation = `Matches your keywords (${result.keyword_score.toFixed(2)})`;
    }
  });
  
  // Sort by final score and assign ranks
  results.sort((a, b) => b.final_score - a.final_score);
  results.forEach((result, index) => {
    result.rank = index + 1;
  });
  
  return results;
}

// Get analytics for the hybrid results
function getAnalytics(results) {
  return {
    total_results: results.length,
    semantic_only: results.filter(r => r.retrieval_methods.includes('semantic') && r.retrieval_methods.length === 1).length,
    keyword_only: results.filter(r => r.retrieval_methods.includes('keyword') && r.retrieval_methods.length === 1).length,
    both_methods: results.filter(r => r.retrieval_methods.length > 1).length,
    categories: [...new Set(results.map(r => r.category))],
    avg_score: results.reduce((sum, r) => sum + r.final_score, 0) / results.length
  };
}

testHybridRetriever();