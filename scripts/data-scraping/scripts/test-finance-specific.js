// Test keyword matching specifically for finance apps
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testFinanceSpecific() {
  console.log('🏦 Testing keyword matching for finance-specific apps...');
  
  try {
    // Get finance apps specifically
    const { data: financeApps, error } = await supabase
      .from('apps_unified')
      .select(`
        id,
        title,
        primary_category,
        rating,
        description,
        app_features!inner(
          keywords_tfidf,
          primary_use_case
        )
      `)
      .in('primary_category', ['Finance', 'finance'])
      .limit(10);
    
    if (error) {
      console.error('❌ Database error:', error);
      return;
    }
    
    console.log(`📊 Found ${financeApps.length} finance apps`);
    
    if (financeApps.length === 0) {
      // Try a broader search
      console.log('\n🔍 Searching with broader criteria...');
      
      const { data: broadApps, error: broadError } = await supabase
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
        .or('apps_unified.title.ilike.%finance%,apps_unified.title.ilike.%bank%,apps_unified.title.ilike.%money%,apps_unified.title.ilike.%budget%,apps_unified.title.ilike.%pay%')
        .limit(10);
      
      if (broadError) {
        console.error('❌ Broad search error:', broadError);
        return;
      }
      
      console.log(`📊 Broad search found ${broadApps.length} apps`);
      
      broadApps.forEach(app => {
        const tfidfData = app.keywords_tfidf || {};
        const keywordsTfidf = tfidfData.keywords || {};
        
        console.log(`\n• ${app.apps_unified.title} (${app.apps_unified.primary_category})`);
        console.log(`  Keywords: ${Object.keys(keywordsTfidf).slice(0, 8).join(', ')}`);
        console.log(`  Description: ${(app.apps_unified.description || '').substring(0, 100)}...`);
        
        // Test our finance keywords against this app
        const financeKeywords = ['budget', 'money', 'bank', 'track', 'expens', 'payment', 'bui'];
        const matches = [];
        
        for (const keyword of financeKeywords) {
          if (keywordsTfidf[keyword]) {
            matches.push(`${keyword}:${keywordsTfidf[keyword]}`);
          }
        }
        
        if (matches.length > 0) {
          console.log(`  ✅ Matches: ${matches.join(', ')}`);
        } else {
          console.log(`  ❌ No matches for finance keywords`);
        }
      });
      
      return;
    }
    
    // Test each finance app
    financeApps.forEach(app => {
      const tfidfData = app.app_features.keywords_tfidf || {};
      const keywordsTfidf = tfidfData.keywords || {};
      
      console.log(`\n• ${app.title} (${app.primary_category})`);
      console.log(`  Keywords: ${Object.keys(keywordsTfidf).slice(0, 8).join(', ')}`);
      console.log(`  Use case: ${app.app_features.primary_use_case || 'N/A'}`);
      
      // Test our finance keywords against this app
      const financeKeywords = ['budget', 'money', 'bank', 'track', 'expens', 'payment', 'bui'];
      const matches = [];
      
      for (const keyword of financeKeywords) {
        if (keywordsTfidf[keyword]) {
          matches.push(`${keyword}:${keywordsTfidf[keyword]}`);
        }
      }
      
      if (matches.length > 0) {
        console.log(`  ✅ Matches: ${matches.join(', ')}`);
      } else {
        console.log(`  ❌ No matches for finance keywords`);
      }
    });
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testFinanceSpecific();