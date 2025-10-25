// Direct test of keyword retriever functionality
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testKeywordRetrievalDirect() {
  console.log('🧪 Testing keyword retrieval functionality directly...');
  
  try {
    const query = "budget expense tracking money management";
    console.log(`\nTesting query: "${query}"`);
    
    // Step 1: Extract keywords (simplified version)
    console.log('\n1. Extracting keywords...');
    const extractedKeywords = simulateKeywordExtraction(query);
    console.log('Extracted keywords:', extractedKeywords.map(k => `${k.keyword} (${k.weight})`));
    
    // Step 2: Test TF-IDF search with fixed structure
    console.log('\n2. Testing TF-IDF search with fixed structure...');
    
    const keywordTexts = extractedKeywords.map(k => k.keyword);
    const keywordWeights = extractedKeywords.map(k => k.weight);
    
    const { data: appsWithFeatures, error } = await supabase
      .from('app_features')
      .select(`
        app_id,
        keywords_tfidf,
        primary_use_case,
        apps_unified!inner(
          title,
          primary_category,
          rating,
          icon_url,
          description
        )
      `)
      .limit(50);
    
    if (error) {
      console.error('❌ Database error:', error);
      return;
    }
    
    console.log(`📊 Fetched ${appsWithFeatures.length} apps with features`);
    
    // Score apps using the fixed TF-IDF structure
    const scoredApps = [];
    let appsWithValidStructure = 0;
    
    for (const app of appsWithFeatures) {
      const tfidfData = app.keywords_tfidf || {};
      const keywordsTfidf = tfidfData.keywords || {};
      const categoriesTfidf = tfidfData.categories || {};
      
      if (Object.keys(keywordsTfidf).length > 0 || Object.keys(categoriesTfidf).length > 0) {
        appsWithValidStructure++;
      }
      
      let totalScore = 0;
      const matchedKeywords = [];
      
      for (let i = 0; i < keywordTexts.length; i++) {
        const keyword = keywordTexts[i];
        const weight = keywordWeights[i];
        
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
      
      // Quality boost
      const qualityBoost = (app.apps_unified.rating || 0) / 5.0 * 0.1;
      totalScore += qualityBoost;
      
      if (totalScore > 0.05) {
        scoredApps.push({
          app_name: app.apps_unified.title,
          category: app.apps_unified.primary_category,
          rating: app.apps_unified.rating || 0,
          score: totalScore,
          matched_keywords: [...new Set(matchedKeywords)],
          use_case: app.primary_use_case
        });
      }
    }
    
    console.log(`📈 Apps with valid TF-IDF structure: ${appsWithValidStructure}/${appsWithFeatures.length}`);
    
    // Sort by score
    scoredApps.sort((a, b) => b.score - a.score);
    
    console.log(`✅ Found ${scoredApps.length} apps with keyword matches`);
    
    // Display top results
    console.log('\n📊 Top keyword search results:');
    if (scoredApps.length > 0) {
      scoredApps.slice(0, 5).forEach((app, i) => {
        console.log(`${i+1}. ${app.app_name} (${app.category})`);
        console.log(`   Score: ${app.score.toFixed(3)} | Rating: ${app.rating}/5`);
        console.log(`   Matched: ${app.matched_keywords.slice(0, 3).join(', ')}`);
        console.log(`   Use case: ${app.use_case || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('❌ No keyword matches found');
      
      // Let's check what keywords are actually available
      console.log('\n🔍 Sample available keywords:');
      const sampleApp = appsWithFeatures.find(app => app.keywords_tfidf?.keywords);
      if (sampleApp) {
        const keywords = Object.keys(sampleApp.keywords_tfidf.keywords).slice(0, 10);
        console.log(`App: ${sampleApp.apps_unified.title}`);
        console.log(`Keywords: ${keywords.join(', ')}`);
      }
    }
    
    console.log('\n🎉 Keyword retriever test completed!');
    
  } catch (err) {
    console.error('❌ Test error:', err);
  }
}

// Enhanced keyword extraction simulation with stemming
function simulateKeywordExtraction(query) {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'i', 'me', 'my', 'we', 'us', 'our']);
  
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
  
  const keywords = [];
  
  // Add original words
  words.forEach((word, index, array) => {
    keywords.push({
      keyword: word,
      weight: Math.max(0.3, 1.0 - (index / array.length) * 0.5),
      intent_type: 'functional'
    });
  });
  
  // Add stemmed versions for better TF-IDF matching
  words.forEach((word, index, array) => {
    const stemmed = stemWord(word);
    if (stemmed !== word && stemmed.length > 2) {
      keywords.push({
        keyword: stemmed,
        weight: Math.max(0.2, 0.8 - (index / array.length) * 0.4),
        intent_type: 'functional'
      });
    }
  });
  
  return keywords;
}

// Simple stemming function
function stemWord(word) {
  let stemmed = word.toLowerCase();
  
  // Remove common suffixes
  if (stemmed.endsWith('ing')) {
    stemmed = stemmed.slice(0, -3);
  } else if (stemmed.endsWith('ed')) {
    stemmed = stemmed.slice(0, -2);
  } else if (stemmed.endsWith('er')) {
    stemmed = stemmed.slice(0, -2);
  } else if (stemmed.endsWith('s') && stemmed.length > 3) {
    stemmed = stemmed.slice(0, -1);
  }
  
  // Handle specific transformations
  const transformations = {
    'buying': 'bui',
    'build': 'bui',
    'buy': 'bui',
    'tracking': 'track',
    'banking': 'bank',
    'management': 'manag',
    'expense': 'expens',
    'expenses': 'expens',
    'budget': 'budget',
    'money': 'money',
    'financial': 'financi',
    'finance': 'financ',
    'payment': 'payment',
    'payments': 'payment'
  };
  
  return transformations[word] || stemmed;
}

testKeywordRetrievalDirect();