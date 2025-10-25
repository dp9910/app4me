// Debug why relaxation keywords aren't matching
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function debugRelaxationMatches() {
  console.log('🔍 Debugging relaxation keyword matches...');
  
  try {
    const query = "apps to help me relax and sleep at night";
    const extractedKeywords = ['relax', 'sleep', 'night'];
    
    console.log(`\nSearching for keywords: ${extractedKeywords.join(', ')}`);
    
    // Get a sample of apps and check their TF-IDF keywords
    const { data: apps, error } = await supabase
      .from('app_features')
      .select(`
        app_id,
        keywords_tfidf,
        primary_use_case,
        apps_unified!inner(
          title,
          primary_category,
          description
        )
      `)
      .limit(20);
    
    if (error) {
      console.error('❌ Database error:', error);
      return;
    }
    
    console.log(`\n📊 Checking ${apps.length} apps for relaxation keywords...`);
    
    let foundAnyMatches = false;
    
    for (const app of apps) {
      const tfidfData = app.keywords_tfidf || {};
      const keywordsTfidf = tfidfData.keywords || {};
      const categoriesTfidf = tfidfData.categories || {};
      
      let hasMatch = false;
      const matches = [];
      
      // Check each of our search keywords
      for (const keyword of extractedKeywords) {
        if (keywordsTfidf[keyword]) {
          matches.push(`${keyword}:${keywordsTfidf[keyword]}`);
          hasMatch = true;
        }
        if (categoriesTfidf[keyword]) {
          matches.push(`cat:${keyword}:${categoriesTfidf[keyword]}`);
          hasMatch = true;
        }
        
        // Check partial matches
        const partialKeywords = Object.keys(keywordsTfidf).filter(k => k.includes(keyword) || keyword.includes(k));
        const partialCategories = Object.keys(categoriesTfidf).filter(k => k.includes(keyword) || keyword.includes(k));
        
        if (partialKeywords.length > 0) {
          partialKeywords.forEach(k => matches.push(`partial:${k}:${keywordsTfidf[k]}`));
          hasMatch = true;
        }
        if (partialCategories.length > 0) {
          partialCategories.forEach(k => matches.push(`cat-partial:${k}:${categoriesTfidf[k]}`));
          hasMatch = true;
        }
      }
      
      if (hasMatch) {
        foundAnyMatches = true;
        console.log(`\n✅ MATCH FOUND: ${app.apps_unified.title} (${app.apps_unified.primary_category})`);
        console.log(`   Matches: ${matches.join(', ')}`);
        console.log(`   Available keywords: ${Object.keys(keywordsTfidf).slice(0, 8).join(', ')}`);
      }
    }
    
    if (!foundAnyMatches) {
      console.log('\n❌ No matches found for relaxation keywords');
      console.log('\n🔍 Let\'s see what keywords are actually available:');
      
      // Show available keywords that might be related
      const allKeywords = new Set();
      apps.forEach(app => {
        const tfidfData = app.keywords_tfidf || {};
        const keywordsTfidf = tfidfData.keywords || {};
        Object.keys(keywordsTfidf).forEach(k => allKeywords.add(k));
      });
      
      const relaxationRelated = Array.from(allKeywords).filter(keyword => 
        keyword.includes('sleep') || 
        keyword.includes('relax') || 
        keyword.includes('calm') || 
        keyword.includes('rest') || 
        keyword.includes('meditat') ||
        keyword.includes('peace') ||
        keyword.includes('night') ||
        keyword.includes('wellness') ||
        keyword.includes('health')
      );
      
      if (relaxationRelated.length > 0) {
        console.log('Related keywords found:', relaxationRelated.join(', '));
      } else {
        console.log('No obviously related keywords found in sample');
      }
      
      // Let's also check if any apps have relevant titles/descriptions
      console.log('\n🎯 Checking for apps with relevant titles/descriptions:');
      for (const app of apps) {
        const title = app.apps_unified.title.toLowerCase();
        const description = (app.apps_unified.description || '').toLowerCase();
        
        if (title.includes('sleep') || title.includes('relax') || title.includes('calm') || 
            title.includes('meditation') || title.includes('wellness') ||
            description.includes('sleep') || description.includes('relax') || description.includes('calm')) {
          
          const tfidfData = app.keywords_tfidf || {};
          const keywordsTfidf = tfidfData.keywords || {};
          
          console.log(`\n• ${app.apps_unified.title} (${app.apps_unified.primary_category})`);
          console.log(`  Keywords: ${Object.keys(keywordsTfidf).slice(0, 8).join(', ')}`);
          console.log(`  Title/Desc contains relaxation terms`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugRelaxationMatches();