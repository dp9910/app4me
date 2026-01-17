// Debug the scoring logic more specifically
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function debugScoring() {
  console.log('🔍 Debugging scoring logic...');
  
  try {
    // Get the specific apps we know have matches
    const { data: apps, error } = await supabase
      .from('app_features')
      .select(`
        app_id,
        keywords_tfidf,
        primary_use_case,
        apps_unified!inner(
          title,
          primary_category,
          rating,
          description
        )
      `)
      .in('apps_unified.title', ['Yelp: Food, Services & Reviews', 'Sudoku.com - Number Games'])
      .limit(10);
    
    if (error) {
      console.error('❌ Database error:', error);
      return;
    }
    
    console.log(`\n📊 Found ${apps.length} specific apps to test`);
    
    const extractedKeywords = [
      { keyword: 'relax', weight: 1.0 },
      { keyword: 'sleep', weight: 0.83 },
      { keyword: 'night', weight: 0.67 }
    ];
    
    console.log('Testing keywords:', extractedKeywords.map(k => `${k.keyword} (${k.weight})`));
    
    for (const app of apps) {
      console.log(`\n🎯 Testing: ${app.apps_unified.title}`);
      
      const tfidfData = app.keywords_tfidf || {};
      const keywordsTfidf = tfidfData.keywords || {};
      const categoriesTfidf = tfidfData.categories || {};
      
      console.log(`Available keywords: ${Object.keys(keywordsTfidf).slice(0, 10).join(', ')}`);
      console.log(`Available categories: ${Object.keys(categoriesTfidf).slice(0, 5).join(', ')}`);
      
      let totalScore = 0;
      const matchedKeywords = [];
      const scoreBreakdown = [];
      
      for (const extractedKeyword of extractedKeywords) {
        const keyword = extractedKeyword.keyword;
        const weight = extractedKeyword.weight;
        
        // Check for exact match in keywords
        if (keywordsTfidf[keyword]) {
          const tfidfScore = parseFloat(keywordsTfidf[keyword]);
          const contribution = tfidfScore * weight;
          totalScore += contribution;
          matchedKeywords.push(keyword);
          scoreBreakdown.push(`${keyword}:${tfidfScore}*${weight}=${contribution.toFixed(4)}`);
        }
        
        // Check for exact match in categories (with boost)
        if (categoriesTfidf[keyword]) {
          const tfidfScore = parseFloat(categoriesTfidf[keyword]);
          const contribution = tfidfScore * weight * 1.2;
          totalScore += contribution;
          matchedKeywords.push(`category:${keyword}`);
          scoreBreakdown.push(`cat:${keyword}:${tfidfScore}*${weight}*1.2=${contribution.toFixed(4)}`);
        }
        
        // Check for partial matches in keywords
        const partialKeywordMatches = Object.keys(keywordsTfidf).filter(tfidfKey =>
          tfidfKey.includes(keyword) || keyword.includes(tfidfKey)
        );
        
        for (const match of partialKeywordMatches) {
          if (match !== keyword) { // Don't double-count exact matches
            const tfidfScore = parseFloat(keywordsTfidf[match]);
            const contribution = tfidfScore * weight * 0.7;
            totalScore += contribution;
            matchedKeywords.push(match);
            scoreBreakdown.push(`partial:${match}:${tfidfScore}*${weight}*0.7=${contribution.toFixed(4)}`);
          }
        }
      }
      
      // Quality boost
      const qualityBoost = (app.apps_unified.rating || 0) / 5.0 * 0.1;
      totalScore += qualityBoost;
      scoreBreakdown.push(`quality:${app.apps_unified.rating}/5*0.1=${qualityBoost.toFixed(4)}`);
      
      console.log(`📊 Score breakdown: ${scoreBreakdown.join(' + ')}`);
      console.log(`📈 Total score: ${totalScore.toFixed(4)}`);
      console.log(`🎯 Matched keywords: ${matchedKeywords.join(', ')}`);
      console.log(`🎯 Would be included: ${totalScore > 0.05 ? 'YES' : 'NO'}`);
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugScoring();