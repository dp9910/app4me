const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testSemanticSearch() {
  console.log('🧪 Testing semantic search infrastructure...');
  
  try {
    // Get a random embedding for testing
    console.log('1. Getting a sample embedding...');
    const { data: sampleApp, error: sampleError } = await supabase
      .from('app_embeddings')
      .select('embedding, app_id')
      .limit(1)
      .single();
    
    if (sampleError) {
      console.error('❌ Error getting sample embedding:', sampleError);
      return;
    }
    
    console.log(`✅ Got sample embedding for app ${sampleApp.app_id}`);
    
    // Test vector search with the sample embedding
    console.log('2. Testing vector similarity search...');
    const { data: matches, error: searchError } = await supabase.rpc('search_apps_by_embedding', {
      query_embedding: sampleApp.embedding,
      match_threshold: 0.5,
      match_count: 5
    });
    
    if (searchError) {
      console.error('❌ Vector search error:', searchError);
      return;
    }
    
    console.log(`✅ Vector search successful! Found ${matches.length} matches`);
    
    // Display results
    console.log('\n📊 Search Results:');
    matches.forEach((match, i) => {
      console.log(`${i+1}. ${match.app_name} (${match.app_category})`);
      console.log(`   Similarity: ${(match.similarity * 100).toFixed(1)}%`);
      console.log(`   Rating: ${match.app_rating}/5`);
      console.log('');
    });
    
    // Test with features join
    console.log('3. Testing with app features...');
    const { data: appsWithFeatures, error: featuresError } = await supabase
      .from('apps_unified')
      .select(`
        id,
        title,
        primary_category,
        rating,
        app_features(primary_use_case, target_user, key_benefit)
      `)
      .limit(3);
    
    if (featuresError) {
      console.error('❌ Features join error:', featuresError);
    } else {
      console.log(`✅ Features join successful! Sample:`, appsWithFeatures[0]);
    }
    
    console.log('\n🎉 Semantic search infrastructure is working correctly!');
    
  } catch (err) {
    console.error('❌ Test error:', err);
  }
}

testSemanticSearch();