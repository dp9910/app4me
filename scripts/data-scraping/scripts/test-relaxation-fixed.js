// Test relaxation query with fixed NaN handling
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testRelaxationFixed() {
  console.log('😴 Testing relaxation query with fixed NaN handling...');
  
  try {
    const query = "apps to help me relax and sleep at night";
    console.log(`\nTesting query: "${query}"`);
    
    const extractedKeywords = [
      { keyword: 'relax', weight: 1.0 },
      { keyword: 'sleep', weight: 0.83 },
      { keyword: 'night', weight: 0.67 }
    ];
    
    console.log('Extracted keywords:', extractedKeywords.map(k => `${k.keyword} (${k.weight})`));
    
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
      .limit(100);
    
    if (error) {
      console.error('❌ Database error:', error);
      return;
    }
    
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
          if (!isNaN(tfidfScore)) {
            totalScore += tfidfScore * weight;
            matchedKeywords.push(keyword);
          }
        }
        
        // Check for exact match in categories (with boost)
        if (categoriesTfidf[keyword]) {
          const tfidfScore = parseFloat(categoriesTfidf[keyword]);
          if (!isNaN(tfidfScore)) {
            totalScore += tfidfScore * weight * 1.2;
            matchedKeywords.push(`category:${keyword}`);
          }
        }
        
        // Check for partial matches in keywords
        const partialKeywordMatches = Object.keys(keywordsTfidf).filter(tfidfKey =>
          tfidfKey.includes(keyword) || keyword.includes(tfidfKey)
        );
        
        for (const match of partialKeywordMatches) {
          if (match !== keyword) { // Don't double-count
            const tfidfScore = parseFloat(keywordsTfidf[match]);
            if (!isNaN(tfidfScore)) {
              totalScore += tfidfScore * weight * 0.7;
              matchedKeywords.push(match);
            }
          }
        }
        
        // Check for partial matches in categories
        const partialCategoryMatches = Object.keys(categoriesTfidf).filter(tfidfKey =>
          tfidfKey.includes(keyword) || keyword.includes(tfidfKey)
        );
        
        for (const match of partialCategoryMatches) {
          const tfidfScore = parseFloat(categoriesTfidf[match]);
          if (!isNaN(tfidfScore)) {
            totalScore += tfidfScore * weight * 0.8;
            matchedKeywords.push(`category:${match}`);
          }
        }
      }
      
      // Quality boost
      const qualityBoost = (app.apps_unified.rating || 0) / 5.0 * 0.1;
      totalScore += qualityBoost;
      
      if (totalScore > 0.05 && matchedKeywords.length > 0) { // Only include apps with actual matches
        scoredApps.push({
          app_name: app.apps_unified.title,
          category: app.apps_unified.primary_category,
          rating: app.apps_unified.rating || 0,
          score: totalScore,
          matched_keywords: [...new Set(matchedKeywords)],
          use_case: app.primary_use_case,
          description: (app.apps_unified.description || '').substring(0, 100)
        });
      }
    }
    
    // Sort by score
    scoredApps.sort((a, b) => b.score - a.score);
    
    console.log(`\n✅ Found ${scoredApps.length} apps with actual keyword matches`);
    
    // Display top results
    console.log('\n📊 Top relaxation/sleep search results:');
    if (scoredApps.length > 0) {
      scoredApps.slice(0, 8).forEach((app, i) => {
        console.log(`${i+1}. ${app.app_name} (${app.category})`);
        console.log(`   Score: ${app.score.toFixed(3)} | Rating: ${app.rating}/5`);
        console.log(`   Matched: ${app.matched_keywords.join(', ')}`);
        console.log(`   Use case: ${app.use_case || 'N/A'}`);
        console.log(`   Description: ${app.description}...`);
        console.log('');
      });
    } else {
      console.log('❌ No keyword matches found');
    }
    
    console.log('\n🎉 Fixed relaxation query test completed!');
    
  } catch (err) {
    console.error('❌ Test error:', err);
  }
}

testRelaxationFixed();