// Analyze what TF-IDF keywords are available for better matching
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function analyzeTFIDFKeywords() {
  console.log('🔍 Analyzing TF-IDF keywords in the database...');
  
  try {
    // Get sample of apps with features
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
    
    // Analyze keyword patterns
    const allKeywords = new Set();
    const allCategories = new Set();
    const categoryApps = new Map();
    
    for (const app of apps) {
      const tfidfData = app.keywords_tfidf || {};
      const keywordsTfidf = tfidfData.keywords || {};
      const categoriesTfidf = tfidfData.categories || {};
      
      // Collect all keywords
      Object.keys(keywordsTfidf).forEach(keyword => allKeywords.add(keyword));
      Object.keys(categoriesTfidf).forEach(category => allCategories.add(category));
      
      // Group by app category
      const appCategory = app.apps_unified.primary_category;
      if (!categoryApps.has(appCategory)) {
        categoryApps.set(appCategory, []);
      }
      categoryApps.get(appCategory).push({
        name: app.apps_unified.title,
        keywords: Object.keys(keywordsTfidf).slice(0, 5),
        categories: Object.keys(categoriesTfidf).slice(0, 3),
        use_case: app.primary_use_case
      });
    }
    
    console.log(`\n📊 Analysis of ${apps.length} apps:`);
    console.log(`Total unique keywords: ${allKeywords.size}`);
    console.log(`Total unique categories: ${allCategories.size}`);
    
    // Show finance-related apps
    console.log('\n💰 Finance category apps:');
    if (categoryApps.has('Finance')) {
      categoryApps.get('Finance').forEach(app => {
        console.log(`• ${app.name}`);
        console.log(`  Keywords: ${app.keywords.join(', ')}`);
        console.log(`  Categories: ${app.categories.join(', ')}`);
        console.log(`  Use case: ${app.use_case || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('  No Finance apps in sample');
    }
    
    // Show some common keywords
    console.log('\n🔑 Sample keywords from all apps:');
    const keywordSample = Array.from(allKeywords).slice(0, 20);
    console.log(keywordSample.join(', '));
    
    // Look for finance-related keywords
    console.log('\n💼 Finance-related keywords found:');
    const financeKeywords = Array.from(allKeywords).filter(keyword => 
      keyword.includes('money') || 
      keyword.includes('budget') || 
      keyword.includes('expense') || 
      keyword.includes('financial') || 
      keyword.includes('pay') || 
      keyword.includes('bank') ||
      keyword.includes('cost') ||
      keyword.includes('track')
    );
    
    if (financeKeywords.length > 0) {
      console.log(financeKeywords.join(', '));
    } else {
      console.log('No obvious finance keywords found in sample');
    }
    
    // Check specific apps that might be finance-related
    console.log('\n🏦 Checking potential finance apps:');
    for (const app of apps) {
      const title = app.apps_unified.title.toLowerCase();
      const description = (app.apps_unified.description || '').toLowerCase();
      
      if (title.includes('money') || title.includes('budget') || title.includes('bank') || 
          title.includes('finance') || title.includes('expense') || title.includes('pay') ||
          description.includes('budget') || description.includes('expense') || description.includes('financial')) {
        
        const tfidfData = app.keywords_tfidf || {};
        const keywordsTfidf = tfidfData.keywords || {};
        
        console.log(`• ${app.apps_unified.title} (${app.apps_unified.primary_category})`);
        console.log(`  Top keywords: ${Object.keys(keywordsTfidf).slice(0, 5).join(', ')}`);
        console.log(`  Description: ${(app.apps_unified.description || '').substring(0, 100)}...`);
        console.log('');
      }
    }
    
  } catch (error) {
    console.error('❌ Analysis error:', error);
  }
}

analyzeTFIDFKeywords();