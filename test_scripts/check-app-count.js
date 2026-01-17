const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkAppCount() {
  console.log('🔍 Checking apps_unified table...');
  
  // Get total count
  const { count: totalCount, error: countError } = await supabase
    .from('apps_unified')
    .select('*', { count: 'exact', head: true });
    
  if (countError) {
    console.error('❌ Error getting count:', countError.message);
    return;
  }
  
  console.log(`📊 Total apps in apps_unified: ${totalCount}`);
  
  // Check if there's a limit on the select query by fetching with limit
  const { data: allApps, error: fetchError } = await supabase
    .from('apps_unified')
    .select('id, title, developer, primary_category, description')
    .order('id');
    
  if (fetchError) {
    console.error('❌ Error fetching apps:', fetchError.message);
    return;
  }
  
  console.log(`📊 Actually fetched: ${allApps ? allApps.length : 0} apps`);
  
  if (allApps && allApps.length < totalCount) {
    console.log('⚠️ Fetched fewer apps than total count - there might be a query limit');
    
    // Try with explicit limit
    const { data: limitedApps, error: limitError } = await supabase
      .from('apps_unified')
      .select('id, title, developer, primary_category, description')
      .order('id')
      .limit(5000);
      
    if (!limitError) {
      console.log(`📊 With limit 5000: ${limitedApps.length} apps`);
    }
  }
  
  // Check existing embeddings
  const { count: embeddingCount, error: embError } = await supabase
    .from('new_embeddings')
    .select('*', { count: 'exact', head: true });
    
  if (!embError) {
    console.log(`📊 Existing embeddings: ${embeddingCount}`);
  }
}

checkAppCount().catch(console.error);