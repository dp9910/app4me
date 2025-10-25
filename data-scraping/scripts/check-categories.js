// Check what primary categories exist in the database
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkCategories() {
  console.log('🔍 Checking primary categories in the database...');
  
  try {
    // Get unique categories
    const { data: categories, error } = await supabase
      .from('apps_unified')
      .select('primary_category')
      .limit(100);
    
    if (error) {
      console.error('❌ Database error:', error);
      return;
    }
    
    const uniqueCategories = [...new Set(categories.map(row => row.primary_category))];
    console.log(`📊 Found ${uniqueCategories.length} unique categories:`);
    uniqueCategories.sort().forEach(cat => console.log(`  • ${cat}`));
    
    // Look for finance-related categories
    console.log('\n💰 Finance-related categories:');
    const financeRelated = uniqueCategories.filter(cat => 
      cat && (cat.toLowerCase().includes('finance') || 
              cat.toLowerCase().includes('business') || 
              cat.toLowerCase().includes('bank'))
    );
    
    if (financeRelated.length > 0) {
      financeRelated.forEach(cat => console.log(`  ✅ ${cat}`));
    } else {
      console.log('  ❌ No obvious finance categories found');
    }
    
    // Check for apps with finance-related titles
    console.log('\n🏦 Apps with finance-related titles:');
    const { data: financeApps, error: financeError } = await supabase
      .from('apps_unified')
      .select('title, primary_category')
      .or('title.ilike.%finance%,title.ilike.%bank%,title.ilike.%money%,title.ilike.%budget%')
      .limit(10);
      
    if (financeError) {
      console.error('❌ Finance search error:', financeError);
    } else {
      financeApps.forEach(app => {
        console.log(`  • ${app.title} (${app.primary_category})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Check error:', error);
  }
}

checkCategories();