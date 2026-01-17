const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkEmbeddings() {
  console.log('📊 Checking app_embeddings table...');
  
  // Count total rows
  const { count, error: countError } = await supabase
    .from('app_embeddings')
    .select('*', { count: 'exact', head: true });
    
  if (countError) {
    console.error('❌ Error counting embeddings:', countError);
    return;
  }
  
  console.log(`🔢 Total embeddings: ${count}`);
  
  // Get sample embeddings to see structure
  const { data: samples, error: sampleError } = await supabase
    .from('app_embeddings')
    .select('app_id, embedding')
    .limit(3);
    
  if (sampleError) {
    console.error('❌ Error fetching samples:', sampleError);
    return;
  }
  
  console.log('\n📋 Sample embeddings structure:');
  samples.forEach((sample, i) => {
    console.log(`  Sample ${i+1}:`);
    console.log(`    app_id: ${sample.app_id}`);
    console.log(`    embedding type: ${typeof sample.embedding}`);
    console.log(`    embedding length: ${Array.isArray(sample.embedding) ? sample.embedding.length : 'not array'}`);
    if (Array.isArray(sample.embedding)) {
      console.log(`    first 5 values: [${sample.embedding.slice(0, 5).join(', ')}]`);
    }
  });
  
  // Check if we have corresponding apps
  const { data: withApps, error: appsError } = await supabase
    .from('app_embeddings')
    .select(`
      app_id, 
      apps_unified!inner(
        id, 
        title, 
        description
      )
    `)
    .limit(3);
    
  if (appsError) {
    console.error('❌ Error fetching apps with embeddings:', appsError);
    return;
  }
  
  if (withApps) {
    console.log('\n📱 Sample apps with embeddings:');
    withApps.forEach((item, i) => {
      const app = Array.isArray(item.apps_unified) ? item.apps_unified[0] : item.apps_unified;
      console.log(`  App ${i+1}: ${app.title}`);
      console.log(`    Description: ${app.description?.substring(0, 100)}...`);
    });
  }
  
  // Check what we're generating embeddings from
  console.log('\n🤔 What are embeddings generated from?');
  console.log('Need to check the embedding generation script...');
}

checkEmbeddings().catch(console.error);