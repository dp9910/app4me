const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testKeywordRetriever() {
  console.log('🔍 Testing keyword retriever functionality...');
  
  try {
    // Test 1: Check if we have app_features with TF-IDF data
    console.log('\n1. Checking TF-IDF features availability...');
    
    const { data: featuresTest, error: featuresError } = await supabase
      .from('app_features')
      .select('app_id, keywords_tfidf, primary_use_case')
      .not('keywords_tfidf', 'is', null)
      .limit(5);
    
    if (featuresError) {
      console.error('❌ Features test error:', featuresError);
      return;
    }
    
    console.log(`✅ Found ${featuresTest.length} apps with TF-IDF features`);
    
    if (featuresTest.length > 0) {
      const sampleFeature = featuresTest[0];
      const tfidfData = sampleFeature.keywords_tfidf || {};
      console.log('TF-IDF structure:', Object.keys(tfidfData));
      
      if (tfidfData.keywords) {
        console.log('Sample keywords:', Object.keys(tfidfData.keywords).slice(0, 5));
      }
      if (tfidfData.categories) {
        console.log('Sample categories:', Object.keys(tfidfData.categories).slice(0, 3));
      }
      console.log('Sample use case:', sampleFeature.primary_use_case);
    }
    
    // Test 2: Simulate keyword extraction (without LLM for testing)
    console.log('\n2. Testing keyword extraction simulation...');
    
    const testQuery = "budget expense tracking money management";
    const extractedKeywords = simulateKeywordExtraction(testQuery);
    
    console.log('Extracted keywords:', extractedKeywords);
    
    // Test 3: Test TF-IDF based search
    console.log('\n3. Testing TF-IDF keyword search...');
    
    const keywordTexts = extractedKeywords.map(k => k.keyword);
    console.log('Searching for keywords:', keywordTexts);
    
    // Get apps with matching TF-IDF keywords
    const { data: appsWithFeatures, error: searchError } = await supabase
      .from('app_features')
      .select(`
        app_id,
        keywords_tfidf,
        primary_use_case,
        apps_unified!inner(
          title,
          primary_category,
          rating,
          icon_url
        )
      `)
      .limit(20);
    
    if (searchError) {
      console.error('❌ Search error:', searchError);
      return;
    }
    
    // Score apps based on keyword matches
    const scoredApps = [];
    
    for (const app of appsWithFeatures) {
      const tfidfData = app.keywords_tfidf || {};
      const keywordsTfidf = tfidfData.keywords || {};
      const categoriesTfidf = tfidfData.categories || {};
      
      let totalScore = 0;
      const matchedKeywords = [];
      
      for (const extractedKeyword of extractedKeywords) {
        const keyword = extractedKeyword.keyword;
        const weight = extractedKeyword.weight;
        
        // Check for exact match in keywords
        if (keywordsTfidf[keyword]) {
          const tfidfScore = parseFloat(keywordsTfidf[keyword]);
          totalScore += tfidfScore * weight;
          matchedKeywords.push(keyword);
        }
        
        // Check for exact match in categories (with boost)
        if (categoriesTfidf[keyword]) {
          const tfidfScore = parseFloat(categoriesTfidf[keyword]);
          totalScore += tfidfScore * weight * 1.2;
          matchedKeywords.push(`category:${keyword}`);
        }
        
        // Check for partial matches in keywords
        const partialKeywordMatches = Object.keys(keywordsTfidf).filter(tfidfKey =>
          tfidfKey.includes(keyword) || keyword.includes(tfidfKey)
        );
        
        for (const match of partialKeywordMatches) {
          const tfidfScore = parseFloat(keywordsTfidf[match]);
          totalScore += tfidfScore * weight * 0.7;
          matchedKeywords.push(match);
        }
        
        // Check for partial matches in categories
        const partialCategoryMatches = Object.keys(categoriesTfidf).filter(tfidfKey =>
          tfidfKey.includes(keyword) || keyword.includes(tfidfKey)
        );
        
        for (const match of partialCategoryMatches) {
          const tfidfScore = parseFloat(categoriesTfidf[match]);
          totalScore += tfidfScore * weight * 0.8;
          matchedKeywords.push(`category:${match}`);
        }
      }
      
      if (totalScore > 0.1) {
        scoredApps.push({
          app_name: app.apps_unified.title,
          category: app.apps_unified.primary_category,
          rating: app.apps_unified.rating,
          score: totalScore,
          matched_keywords: [...new Set(matchedKeywords)],
          use_case: app.primary_use_case
        });
      }
    }
    
    // Sort by score
    scoredApps.sort((a, b) => b.score - a.score);
    
    console.log(`✅ Found ${scoredApps.length} apps with keyword matches`);
    
    // Display top results
    console.log('\n📊 Top keyword search results:');
    scoredApps.slice(0, 5).forEach((app, i) => {
      console.log(`${i+1}. ${app.app_name} (${app.category})`);
      console.log(`   Score: ${app.score.toFixed(3)}`);
      console.log(`   Matched: ${app.matched_keywords.slice(0, 3).join(', ')}`);
      console.log(`   Use case: ${app.use_case || 'N/A'}`);
      console.log('');
    });
    
    // Test 4: Fallback keyword search
    console.log('\n4. Testing fallback keyword search...');
    
    const fallbackKeywords = ['budget', 'money', 'finance'];
    const searchConditions = fallbackKeywords
      .map(keyword => `title.ilike.%${keyword}%,description.ilike.%${keyword}%,primary_category.ilike.%${keyword}%`)
      .join(',');
    
    const { data: fallbackMatches, error: fallbackError } = await supabase
      .from('apps_unified')
      .select('id, title, primary_category, rating')
      .or(searchConditions)
      .limit(5);
    
    if (fallbackError) {
      console.error('❌ Fallback search error:', fallbackError);
    } else {
      console.log(`✅ Fallback search found ${fallbackMatches.length} matches:`);
      fallbackMatches.forEach((app, i) => {
        console.log(`${i+1}. ${app.title} (${app.primary_category})`);
      });
    }
    
    console.log('\n🎉 Keyword retriever test completed successfully!');
    
  } catch (err) {
    console.error('❌ Test error:', err);
  }
}

// Simple keyword extraction simulation
function simulateKeywordExtraction(query) {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
  
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .map((word, index, array) => ({
      keyword: word,
      weight: Math.max(0.3, 1.0 - (index / array.length) * 0.5),
      intent_type: 'functional'
    }));
}

testKeywordRetriever();