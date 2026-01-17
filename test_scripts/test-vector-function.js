/**
 * Test the PostgreSQL Vector Similarity Function
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testVectorFunction() {
  console.log('🧪 === TESTING POSTGRESQL VECTOR SIMILARITY FUNCTION ===\n');
  
  try {
    console.log('1️⃣ Getting test embedding...');
    
    // Get a test embedding first
    const { data: testApp, error: testError } = await supabase
      .from('app_embeddings')
      .select(`
        embedding,
        apps_unified!inner(title)
      `)
      .limit(1);
    
    if (testError || !testApp || testApp.length === 0) {
      console.error('❌ Cannot get test embedding:', testError);
      return false;
    }
    
    const testEmbedding = testApp[0].embedding;
    const testTitle = testApp[0].apps_unified.title;
    
    console.log(`📱 Using test app: ${testTitle}`);
    
    console.log('\n2️⃣ Testing vector similarity function...');
    
    // Test the vector similarity function
    const { data: similarityResults, error: similarityError } = await supabase.rpc('vector_similarity_search', {
      query_embedding_json: testEmbedding,
      similarity_threshold: 0.5,
      result_limit: 5
    });
    
    if (similarityError) {
      console.error('❌ Vector similarity test failed:', similarityError);
      
      if (similarityError.message.includes('does not exist')) {
        console.log('\n📝 MANUAL SETUP REQUIRED:');
        console.log('1. Open Supabase Dashboard → SQL Editor');
        console.log('2. Copy contents of setup-vector-similarity-fixed.sql');
        console.log('3. Execute the SQL to create the functions');
        return false;
      }
      return false;
    } 
    
    console.log(`✅ Vector similarity function working! Found ${similarityResults?.length || 0} results`);
    
    if (similarityResults && similarityResults.length > 0) {
      console.log('\n🎯 Top similar apps:');
      similarityResults.forEach((result, i) => {
        console.log(`  ${i+1}. ${result.app_title} - Similarity: ${(result.similarity_score * 100).toFixed(1)}%`);
      });
    }
    
    console.log('\n3️⃣ Testing performance...');
    
    const startTime = Date.now();
    
    // Test with lower threshold to get more results
    const { data: perfResults, error: perfError } = await supabase.rpc('vector_similarity_search', {
      query_embedding_json: testEmbedding,
      similarity_threshold: 0.3,
      result_limit: 20
    });
    
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    if (perfError) {
      console.error('❌ Performance test failed:', perfError);
    } else {
      console.log(`✅ Performance test completed: ${executionTime}ms`);
      console.log(`📊 Found ${perfResults?.length || 0} apps above 0.3 threshold`);
      
      if (executionTime < 1000) {
        console.log('🚀 Excellent performance! (<1 second)');
      } else if (executionTime < 5000) {
        console.log('⚡ Good performance! (<5 seconds)');
      } else {
        console.log('⏳ Slower than expected (>5 seconds)');
      }
    }
    
    console.log('\n4️⃣ Testing caffeine-specific similarity...');
    
    // Test caffeine-specific search
    const { data: caffeineResults, error: caffeineError } = await supabase.rpc('test_caffeine_similarity');
    
    if (caffeineError) {
      console.error('❌ Caffeine test failed:', caffeineError);
    } else {
      console.log(`✅ Caffeine similarity test working! Found ${caffeineResults?.length || 0} results`);
      
      if (caffeineResults && caffeineResults.length > 0) {
        console.log('\n☕ Caffeine-related apps:');
        caffeineResults.forEach((result, i) => {
          console.log(`  ${i+1}. ${result.app_title} - Similarity: ${(result.similarity * 100).toFixed(1)}% (${result.category})`);
        });
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Test error:', error);
    return false;
  }
}

async function comparePerformance() {
  console.log('\n🏁 === PERFORMANCE COMPARISON ===');
  
  try {
    // Get a test embedding
    const { data: testApp } = await supabase
      .from('app_embeddings')
      .select('embedding')
      .limit(1);
    
    if (!testApp || testApp.length === 0) {
      console.log('❌ No test embedding available');
      return;
    }
    
    const testEmbedding = testApp[0].embedding;
    
    console.log('\n📊 Testing different thresholds and limits:');
    
    const tests = [
      { threshold: 0.6, limit: 10, name: 'High threshold (0.6), 10 results' },
      { threshold: 0.4, limit: 20, name: 'Medium threshold (0.4), 20 results' },
      { threshold: 0.3, limit: 50, name: 'Low threshold (0.3), 50 results' }
    ];
    
    for (const test of tests) {
      const startTime = Date.now();
      
      const { data, error } = await supabase.rpc('vector_similarity_search', {
        query_embedding_json: testEmbedding,
        similarity_threshold: test.threshold,
        result_limit: test.limit
      });
      
      const endTime = Date.now();
      
      if (error) {
        console.log(`❌ ${test.name}: Failed - ${error.message}`);
      } else {
        console.log(`✅ ${test.name}: ${endTime - startTime}ms (${data?.length || 0} results)`);
      }
    }
    
  } catch (error) {
    console.error('❌ Performance comparison failed:', error);
  }
}

async function main() {
  const success = await testVectorFunction();
  
  if (success) {
    await comparePerformance();
    
    console.log('\n🎉 === NEXT STEPS ===');
    console.log('✅ PostgreSQL vector function is working!');
    console.log('📈 Ready to update the semantic search algorithm');
    console.log('🚀 Expected benefits:');
    console.log('   • 10-100x faster semantic search');
    console.log('   • Search ALL apps, not just first 1000');
    console.log('   • Lower memory usage');
    console.log('   • Better scalability');
  } else {
    console.log('\n⚠️ === SETUP REQUIRED ===');
    console.log('Please create the functions manually in Supabase:');
    console.log('1. Copy setup-vector-similarity-fixed.sql');
    console.log('2. Paste in Supabase SQL Editor');
    console.log('3. Execute to create the functions');
    console.log('4. Run this test again');
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = { testVectorFunction, comparePerformance };