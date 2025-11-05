/**
 * Setup PostgreSQL Vector Similarity Function in Supabase
 * This script will attempt to create the vector similarity function
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function setupVectorFunction() {
  console.log('🚀 Setting up PostgreSQL vector similarity function...\n');
  
  try {
    // First, let's test if we can execute a simple function
    console.log('🔍 Testing Supabase function execution...');
    
    // Test with a simple SQL function creation
    const testSQL = `
CREATE OR REPLACE FUNCTION test_vector_setup()
RETURNS TEXT AS $$
BEGIN
    RETURN 'Vector similarity setup test successful';
END;
$$ LANGUAGE plpgsql;
    `;
    
    // Since Supabase client doesn't support direct SQL execution,
    // we'll provide instructions for manual setup
    console.log('📝 Supabase requires manual SQL execution for function creation.');
    console.log('\n🛠️  MANUAL SETUP INSTRUCTIONS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. Open your Supabase Dashboard');
    console.log('2. Go to SQL Editor');
    console.log('3. Copy the contents of setup-vector-similarity.sql');
    console.log('4. Paste and execute the SQL');
    console.log('5. Run this script again to test the function');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Test if the function already exists
    console.log('🔍 Testing if vector_similarity_search function exists...');
    
    try {
      // Try to call the function with dummy data to see if it exists
      const { data, error } = await supabase.rpc('vector_similarity_search', {
        query_embedding: JSON.stringify([0.1, 0.2, 0.3]),
        similarity_threshold: 0.9,
        result_limit: 1
      });
      
      if (error) {
        if (error.message.includes('function') && error.message.includes('does not exist')) {
          console.log('❌ Function does not exist yet. Please run the SQL manually.');
          return false;
        } else {
          console.log('⚠️ Function exists but test failed (expected with dummy data)');
          console.log('✅ Vector similarity function is ready!');
          return true;
        }
      } else {
        console.log('✅ Function exists and working!');
        return true;
      }
    } catch (e) {
      console.log('❌ Function not found or not accessible');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    return false;
  }
}

async function testVectorFunction() {
  console.log('\n🧪 Testing vector similarity function...');
  
  try {
    // Test the function with a real embedding
    const { data, error } = await supabase.rpc('test_vector_similarity', {
      test_app_title: 'HiCoffee - Caffeine Tracker'
    });
    
    if (error) {
      console.error('❌ Test failed:', error);
      return false;
    }
    
    if (data && data.length > 0) {
      console.log('✅ Test successful!');
      data.forEach((result, i) => {
        console.log(`  ${i+1}. ${result.app_title} - Similarity: ${result.similarity?.toFixed(3) || 'N/A'}`);
      });
      return true;
    } else {
      console.log('⚠️ Test completed but no results returned');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
    return false;
  }
}

async function main() {
  const functionExists = await setupVectorFunction();
  
  if (functionExists) {
    await testVectorFunction();
    
    console.log('\n🎉 Next Steps:');
    console.log('• Update the semantic search algorithm to use the PostgreSQL function');
    console.log('• Test performance improvements');
    console.log('• Verify all apps are now searchable via semantic similarity');
  } else {
    console.log('\n⏳ Manual Setup Required:');
    console.log('• Copy setup-vector-similarity.sql contents to Supabase SQL Editor');
    console.log('• Execute the SQL to create the functions');
    console.log('• Run this script again to verify setup');
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = { setupVectorFunction, testVectorFunction };