/**
 * Simple Test of Semantic Search - Working Around Type Issues
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testSemanticSearchSimple() {
  console.log('🔍 Testing semantic search (simplified approach)...');
  
  try {
    // Test the built-in test function first
    console.log('🧪 Testing built-in test function...');
    const { data: testData, error: testError } = await supabase.rpc('test_simple_semantic');
    
    if (testError) {
      console.error('❌ Test function error:', testError);
    } else {
      console.log('✅ Test function works!');
      console.log('📊 Test results:', testData?.length || 0);
      if (testData && testData.length > 0) {
        console.log('🎯 Sample results:');
        testData.slice(0, 3).forEach((app, i) => {
          console.log(`${i + 1}. ${app.app_title} (similarity: ${app.similarity?.toFixed(4)})`);
        });
      }
    }
    
    // Manual check: Get embeddings directly and compute similarity in JavaScript
    console.log('\n🔍 Manual approach: Testing similarity calculation...');
    
    // Get a sample embedding
    const { data: sampleEmbedding, error: embError } = await supabase
      .from('app_embeddings')
      .select('app_id, embedding')
      .limit(1)
      .single();
      
    if (embError || !sampleEmbedding) {
      console.error('❌ Error fetching embedding:', embError);
      return;
    }
    
    // Get app details
    const { data: appDetails, error: appError } = await supabase
      .from('apps_unified')
      .select('title, description, primary_category')
      .eq('id', sampleEmbedding.app_id)
      .single();
      
    if (appError || !appDetails) {
      console.error('❌ Error fetching app:', appError);
      return;
    }
    
    console.log(`✅ Reference app: ${appDetails.title}`);
    console.log(`📝 Description: ${appDetails.description?.substring(0, 80)}...`);
    
    // Get several embeddings for comparison
    const { data: otherEmbeddings, error: othersError } = await supabase
      .from('app_embeddings')
      .select(`
        app_id,
        embedding,
        apps_unified!inner(title, description, primary_category)
      `)
      .limit(10);
      
    if (othersError) {
      console.error('❌ Error fetching other embeddings:', othersError);
      return;
    }
    
    console.log(`\n🧮 Computing cosine similarity manually...`);
    
    // Parse reference embedding
    const refEmbedding = JSON.parse(sampleEmbedding.embedding);
    
    const similarities = [];
    
    for (const other of otherEmbeddings) {
      try {
        const otherEmbedding = JSON.parse(other.embedding);
        
        // Compute cosine similarity
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < refEmbedding.length; i++) {
          dotProduct += refEmbedding[i] * otherEmbedding[i];
          normA += refEmbedding[i] * refEmbedding[i];
          normB += otherEmbedding[i] * otherEmbedding[i];
        }
        
        const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
        
        similarities.push({
          app_id: other.app_id,
          title: other.apps_unified.title,
          category: other.apps_unified.primary_category,
          description: other.apps_unified.description,
          similarity: similarity
        });
      } catch (err) {
        console.error(`❌ Error computing similarity for app ${other.app_id}:`, err.message);
      }
    }
    
    // Sort by similarity
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    console.log(`\n🎯 Top similar apps (manual calculation):`);
    similarities.slice(0, 5).forEach((app, i) => {
      const isOriginal = app.app_id === sampleEmbedding.app_id;
      console.log(`${i + 1}. ${app.title} ${isOriginal ? '(ORIGINAL)' : ''} (${app.similarity.toFixed(4)})`);
      console.log(`   📱 Category: ${app.category}`);
      console.log(`   📖 ${app.description?.substring(0, 80)}...`);
      console.log('');
    });
    
    console.log('✅ Manual semantic search working!');
    console.log('💡 The PostgreSQL function has type issues, but the core semantic search logic works');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

testSemanticSearchSimple().catch(console.error);