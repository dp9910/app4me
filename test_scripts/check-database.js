const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkDatabase() {
  console.log('🔍 Checking database for house/real estate apps...\n');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const searchTerms = ['buying', 'checklist', 'purchase', 'home'];
  
  for (const term of searchTerms) {
    console.log(`📱 Searching for "${term}"...`);
    
    const { data: apps, error, count } = await supabase
      .from('apps_unified')
      .select('id, title, description, primary_category, rating, rating_count', { count: 'exact' })
      .or(`title.ilike.%${term}%,description.ilike.%${term}%,primary_category.ilike.%${term}%`)
      .limit(5);

    if (error) {
      console.error('❌ Error:', error.message);
      continue;
    }

    console.log(`   Found ${count} total matches`);
    if (apps && apps.length > 0) {
      console.log('   Sample apps:');
      apps.forEach(app => {
        console.log(`   • ${app.title} (${app.primary_category}) - ${app.rating}⭐ (${app.rating_count} reviews)`);
      });
    } else {
      console.log('   No apps found');
    }
    console.log('');
  }

  // Also check total app count in database
  const { count: totalApps } = await supabase
    .from('apps_unified')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📊 Total apps in database: ${totalApps}`);
}

checkDatabase().catch(console.error);