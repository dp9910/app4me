const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testFetchAll() {
  console.log('🔍 Testing fetch all apps and embeddings...');
  
  // Test existing embeddings fetch with pagination
  let existingAppIds = [];
  try {
    let hasMoreEmbeddings = true;
    let lastEmbeddingId = 0;
    
    while (hasMoreEmbeddings) {
      const { data: embeddingBatch, error: embError } = await supabase
        .from('new_embeddings')
        .select('id, app_id')
        .gt('id', lastEmbeddingId)
        .order('id')
        .limit(1000);
        
      if (embError) {
        console.log(`❌ Error fetching existing embeddings: ${embError.message}`);
        break;
      }
      
      if (!embeddingBatch || embeddingBatch.length === 0) {
        hasMoreEmbeddings = false;
      } else {
        existingAppIds.push(...embeddingBatch.map(e => e.app_id));
        lastEmbeddingId = embeddingBatch[embeddingBatch.length - 1].id;
        hasMoreEmbeddings = embeddingBatch.length === 1000;
        console.log(`📊 Fetched embedding batch: ${embeddingBatch.length} (total existing: ${existingAppIds.length})`);
      }
    }
  } catch (error) {
    console.log(`❌ Error fetching existing embeddings: ${error.message}`);
    existingAppIds = [];
  }
  
  console.log(`📊 Total existing embeddings: ${existingAppIds.length}`);
  
  // Test apps fetch with pagination
  let allApps = [];
  let hasMore = true;
  let lastId = 0;
  const pageSize = 1000;
  
  while (hasMore) {
    const { data: batch, error: fetchError } = await supabase
      .from('apps_unified')
      .select('id, title, developer, primary_category, description')
      .gt('id', lastId)
      .order('id')
      .limit(pageSize);
      
    if (fetchError) {
      console.log(`❌ Error fetching apps batch: ${fetchError.message}`);
      break;
    }
    
    if (!batch || batch.length === 0) {
      hasMore = false;
    } else {
      allApps.push(...batch);
      lastId = batch[batch.length - 1].id;
      hasMore = batch.length === pageSize;
      console.log(`📊 Fetched app batch: ${batch.length} apps (total so far: ${allApps.length})`);
    }
  }
  
  console.log(`📊 Total apps fetched: ${allApps.length}`);
  
  // Filter out apps that already have embeddings
  const appsToProcess = allApps.filter(app => !existingAppIds.includes(app.id));
  
  console.log(`📊 Apps that need embeddings: ${appsToProcess.length}`);
  console.log(`📊 Apps already processed: ${allApps.length - appsToProcess.length}`);
  
  // Show some sample app IDs that need processing
  if (appsToProcess.length > 0) {
    console.log(`📋 Sample apps to process: ${appsToProcess.slice(0, 5).map(a => `${a.id}:${a.title}`).join(', ')}`);
  }
}

testFetchAll().catch(console.error);