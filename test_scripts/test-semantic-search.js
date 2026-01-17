/**
 * Test the Semantic Search Function
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testSemanticSearch() {
  console.log('🔍 Testing semantic search function...');
  
  try {
    // Get a sample embedding from the database
    console.log('📋 Fetching sample embedding for testing...');
    const { data: sampleEmbedding, error: fetchError } = await supabase
      .from('app_embeddings')
      .select('app_id, embedding')
      .limit(1)
      .single();
      
    if (fetchError || !sampleEmbedding) {
      console.error('❌ Error fetching sample embedding:', fetchError);
      return;
    }
    
    // Get the app details
    const { data: appDetails, error: appError } = await supabase
      .from('apps_unified')
      .select('title, description, primary_category')
      .eq('id', sampleEmbedding.app_id)
      .single();
      
    if (appError || !appDetails) {
      console.error('❌ Error fetching app details:', appError);
      return;
    }
    
    console.log('✅ Using embedding from app:', appDetails.title);
    console.log('📝 Description:', appDetails.description?.substring(0, 100) + '...');
    
    // Test the semantic search function
    console.log('\n🔍 Running semantic search...');
    const { data, error } = await supabase.rpc('semantic_search_apps', {
      query_embedding_text: sampleEmbedding.embedding,
      similarity_threshold: 0.5,
      result_limit: 10
    });
    
    if (error) {
      console.error('❌ Error calling semantic search:', error);
      return;
    }
    
    console.log('✅ Semantic search successful!');
    console.log('📊 Results found:', data?.length || 0);
    
    if (data && data.length > 0) {
      console.log(`\n🎯 Apps similar to "${appDetails.title}":`);
      data.forEach((app, index) => {
        const isSameApp = app.app_title === appDetails.title;
        console.log(`${index + 1}. ${app.app_title} ${isSameApp ? '(ORIGINAL)' : ''} (similarity: ${app.similarity_score?.toFixed(4)})`);
        console.log(`   Category: ${app.app_category}`);
        console.log(`   Description: ${app.app_description?.substring(0, 100)}...`);
        console.log('');
      });
    } else {
      console.log('⚠️ No similar apps found with threshold 0.5');
      console.log('💡 Try lowering the similarity threshold');
    }
    
    // Test with lower threshold
    console.log('\n🔍 Testing with lower threshold (0.3)...');
    const { data: data2, error: error2 } = await supabase.rpc('semantic_search_apps', {
      query_embedding_text: sampleEmbedding.embedding,
      similarity_threshold: 0.3,
      result_limit: 5
    });
    
    if (error2) {
      console.error('❌ Error with lower threshold:', error2);
    } else {
      console.log('📊 Results with threshold 0.3:', data2?.length || 0);
      if (data2 && data2.length > 0) {
        console.log('🎯 Top matches:');
        data2.slice(0, 3).forEach((app, index) => {
          console.log(`${index + 1}. ${app.app_title} (${app.similarity_score?.toFixed(4)})`);
        });
      }
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

testSemanticSearch().catch(console.error);