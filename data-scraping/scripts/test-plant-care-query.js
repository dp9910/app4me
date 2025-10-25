// Test plant care query to verify the system works for any domain
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testPlantCareQuery() {
  console.log('🌱 Testing plant care query...');
  
  const query = "i wish there were apps that help me teach how to take care of plants";
  console.log(`\nQuery: "${query}"`);
  
  try {
    // Step 1: Extract keywords
    console.log('\n1. Extracting keywords...');
    const extractedKeywords = extractKeywords(query);
    console.log('Extracted keywords:', extractedKeywords);
    
    // Step 2: Test semantic search simulation
    console.log('\n2. Testing semantic search (simulation)...');
    const semanticResults = await simulateSemanticSearch(query, 10);
    console.log(`📊 Semantic results: ${semanticResults.length}`);
    
    if (semanticResults.length > 0) {
      console.log('Top semantic matches:');
      semanticResults.slice(0, 5).forEach((app, i) => {
        console.log(`  ${i+1}. ${app.app_name} (${app.category}) - Score: ${app.semantic_score.toFixed(3)}`);
      });
    }
    
    // Step 3: Test keyword search with TF-IDF
    console.log('\n3. Testing keyword search with TF-IDF...');
    const keywordResults = await performKeywordSearch(extractedKeywords, 10);
    console.log(`📊 Keyword results: ${keywordResults.length}`);
    
    if (keywordResults.length > 0) {
      console.log('Top keyword matches:');
      keywordResults.slice(0, 5).forEach((app, i) => {
        console.log(`  ${i+1}. ${app.app_name} (${app.category}) - Score: ${app.keyword_score.toFixed(3)}`);
        console.log(`     Matched: ${app.matched_keywords.join(', ')}`);
      });
    }
    
    // Step 4: Apply RRF fusion
    console.log('\n4. Applying RRF fusion...');
    const hybridResults = applyRRF(semanticResults, keywordResults);
    console.log(`🔗 Hybrid results: ${hybridResults.length}`);
    
    // Step 5: Display final results
    console.log('\n📱 Final plant care app recommendations:');
    if (hybridResults.length > 0) {
      hybridResults.slice(0, 8).forEach((app, i) => {
        console.log(`${i+1}. ${app.app_name} (${app.category})`);
        console.log(`   Final Score: ${app.final_score.toFixed(3)} | Methods: ${app.retrieval_methods.join(', ')}`);
        console.log(`   Semantic: ${app.semantic_score.toFixed(3)} | Keyword: ${app.keyword_score.toFixed(3)}`);
        console.log(`   Description: ${app.description}`);
        console.log('');
      });
    } else {
      console.log('❌ No relevant apps found');
    }
    
    // Step 6: Check what plant-related apps exist in the database
    console.log('\n6. Checking for plant-related apps in database...');
    await checkPlantApps();
    
    // Step 7: Test fallback search
    console.log('\n7. Testing fallback search...');
    const fallbackResults = await fallbackSearch(['plant', 'garden', 'care', 'teach', 'learn']);
    if (fallbackResults.length > 0) {
      console.log('Fallback search results:');
      fallbackResults.forEach((app, i) => {
        console.log(`  ${i+1}. ${app.title} (${app.primary_category})`);
        console.log(`     ${(app.description || '').substring(0, 80)}...`);
      });
    } else {
      console.log('No fallback results found');
    }
    
    console.log('\n🌿 Plant care query test completed!');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Extract keywords from plant care query
function extractKeywords(query) {
  const stopWords = new Set(['i', 'wish', 'there', 'were', 'that', 'help', 'me', 'how', 'to', 'the', 'a', 'an', 'and', 'or', 'but']);
  
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
  
  // Add stemmed versions
  const keywords = [];
  words.forEach(word => {
    keywords.push(word);
    
    // Add stemmed version
    let stemmed = word;
    if (word === 'apps') stemmed = 'app';
    if (word === 'teach') stemmed = 'teach'; // Keep as is
    if (word === 'care') stemmed = 'care'; // Keep as is
    if (word === 'plants') stemmed = 'plant';
    if (word === 'teaching') stemmed = 'teach';
    
    if (stemmed !== word) {
      keywords.push(stemmed);
    }
  });
  
  return [...new Set(keywords)]; // Remove duplicates
}

// Simulate semantic search
async function simulateSemanticSearch(query, limit) {
  // Look for apps with plant/garden/care related terms in title/description
  const { data: apps, error } = await supabase
    .from('apps_unified')
    .select('id, title, primary_category, rating, icon_url, description')
    .or('title.ilike.%plant%,title.ilike.%garden%,title.ilike.%care%,description.ilike.%plant%,description.ilike.%garden%,description.ilike.%care%')
    .limit(limit);
  
  if (error) throw error;
  
  return apps.map((app, index) => ({
    app_id: app.id.toString(),
    app_name: app.title,
    category: app.primary_category,
    rating: app.rating || 0,
    semantic_score: Math.max(0.6, 0.9 - (index * 0.05)),
    description: (app.description || '').substring(0, 100),
    retrieval_method: 'semantic',
    rank: index + 1
  }));
}

// Perform keyword search with TF-IDF
async function performKeywordSearch(keywords, limit) {
  const { data: apps, error } = await supabase
    .from('app_features')
    .select(`
      app_id,
      keywords_tfidf,
      apps_unified!inner(
        title,
        primary_category,
        rating,
        description
      )
    `)
    .limit(100);
  
  if (error) throw error;
  
  const scoredApps = [];
  
  for (const app of apps) {
    const tfidfData = app.keywords_tfidf || {};
    const keywordsTfidf = tfidfData.keywords || {};
    const categoriesTfidf = tfidfData.categories || {};
    
    let totalScore = 0;
    const matchedKeywords = [];
    
    for (const keyword of keywords) {
      // Check exact matches
      if (keywordsTfidf[keyword]) {
        const score = parseFloat(keywordsTfidf[keyword]);
        if (!isNaN(score)) {
          totalScore += score;
          matchedKeywords.push(keyword);
        }
      }
      
      if (categoriesTfidf[keyword]) {
        const score = parseFloat(categoriesTfidf[keyword]);
        if (!isNaN(score)) {
          totalScore += score * 1.2;
          matchedKeywords.push(`category:${keyword}`);
        }
      }
      
      // Check partial matches
      Object.keys(keywordsTfidf).forEach(tfidfKey => {
        if (tfidfKey.includes(keyword) || keyword.includes(tfidfKey)) {
          const score = parseFloat(keywordsTfidf[tfidfKey]);
          if (!isNaN(score) && !matchedKeywords.includes(tfidfKey)) {
            totalScore += score * 0.7;
            matchedKeywords.push(tfidfKey);
          }
        }
      });
    }
    
    // Quality boost
    totalScore += (app.apps_unified.rating || 0) / 5.0 * 0.1;
    
    if (totalScore > 0.05) {
      scoredApps.push({
        app_id: app.app_id.toString(),
        app_name: app.apps_unified.title,
        category: app.apps_unified.primary_category,
        rating: app.apps_unified.rating || 0,
        keyword_score: totalScore,
        matched_keywords: [...new Set(matchedKeywords)],
        description: (app.apps_unified.description || '').substring(0, 100),
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

// Apply RRF fusion
function applyRRF(semanticResults, keywordResults, k = 60) {
  const resultMap = new Map();
  
  // Add semantic results
  semanticResults.forEach((result) => {
    const rrf_score = 1 / (k + result.rank);
    resultMap.set(result.app_id, {
      app_id: result.app_id,
      app_name: result.app_name,
      category: result.category,
      rating: result.rating,
      semantic_score: result.semantic_score,
      keyword_score: 0,
      rrf_score: rrf_score,
      final_score: rrf_score,
      retrieval_methods: ['semantic'],
      description: result.description,
      matched_keywords: []
    });
  });
  
  // Add keyword results
  keywordResults.forEach((result) => {
    const rrf_score = 1 / (k + result.rank);
    
    if (resultMap.has(result.app_id)) {
      const existing = resultMap.get(result.app_id);
      existing.keyword_score = result.keyword_score;
      existing.rrf_score += rrf_score;
      existing.final_score = existing.rrf_score;
      existing.retrieval_methods.push('keyword');
      existing.matched_keywords = result.matched_keywords;
    } else {
      resultMap.set(result.app_id, {
        app_id: result.app_id,
        app_name: result.app_name,
        category: result.category,
        rating: result.rating,
        semantic_score: 0,
        keyword_score: result.keyword_score,
        rrf_score: rrf_score,
        final_score: rrf_score,
        retrieval_methods: ['keyword'],
        description: result.description,
        matched_keywords: result.matched_keywords
      });
    }
  });
  
  // Enhance scoring
  const results = Array.from(resultMap.values());
  results.forEach(result => {
    // Multi-method boost
    if (result.retrieval_methods.length > 1) {
      result.final_score += 0.15;
    }
    
    // Quality boost
    if (result.rating > 4.0) {
      result.final_score += 0.1;
    }
  });
  
  // Sort by final score
  results.sort((a, b) => b.final_score - a.final_score);
  
  return results;
}

// Check for plant-related apps
async function checkPlantApps() {
  const { data: apps, error } = await supabase
    .from('apps_unified')
    .select('title, primary_category, description')
    .or('title.ilike.%plant%,title.ilike.%garden%,title.ilike.%flower%,description.ilike.%plant%,description.ilike.%garden%')
    .limit(10);
  
  if (error) {
    console.error('Error checking plant apps:', error);
    return;
  }
  
  if (apps.length > 0) {
    console.log(`Found ${apps.length} plant-related apps:`);
    apps.forEach((app, i) => {
      console.log(`  ${i+1}. ${app.title} (${app.primary_category})`);
      console.log(`     ${(app.description || '').substring(0, 80)}...`);
    });
  } else {
    console.log('No plant-related apps found in database');
  }
}

// Fallback search
async function fallbackSearch(keywords) {
  const searchConditions = keywords
    .map(keyword => `title.ilike.%${keyword}%,description.ilike.%${keyword}%`)
    .join(',');
  
  const { data: matches, error } = await supabase
    .from('apps_unified')
    .select('title, primary_category, description')
    .or(searchConditions)
    .limit(5);
  
  return error ? [] : matches;
}

testPlantCareQuery();