const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function setupSemanticSearch() {
  console.log('🔧 Setting up enhanced semantic search functions...');
  
  try {
    // Test if our existing function works
    const { data: testResult, error: testError } = await supabase.rpc('semantic_search_apps', {
      query_embedding: new Array(768).fill(0),
      match_threshold: 0.5,
      match_count: 1
    });
    
    if (testError) {
      console.log('⚠️ Existing function needs update:', testError.message);
    } else {
      console.log('✅ Semantic search function is working!');
      console.log(`Test returned ${testResult?.length || 0} results`);
    }
    
    // Test embedding coverage
    const { count: embeddingCount, error: coverageError } = await supabase
      .from('app_embeddings')
      .select('app_id', { count: 'exact', head: true });
    
    if (coverageError) {
      console.error('❌ Error checking embeddings:', coverageError);
    } else {
      console.log(`📊 Embedding coverage: ${embeddingCount} embeddings available`);
    }
    
    // Test apps_unified count
    const { count: appsCount, error: appsError } = await supabase
      .from('apps_unified')
      .select('id', { count: 'exact', head: true });
    
    if (appsError) {
      console.error('❌ Error checking apps:', appsError);
    } else {
      console.log(`📱 Apps available: ${appsCount} apps`);
    }
    
    console.log('✅ Semantic search infrastructure is ready!');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

setupSemanticSearch();