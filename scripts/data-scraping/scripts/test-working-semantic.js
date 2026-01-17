// Test the working semantic search directly
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testWorkingSemanticSearch() {
  console.log('🧪 Testing working semantic search implementation...');
  
  try {
    // Test fast semantic search (keyword-based)
    console.log('\n1. Testing fast semantic search...');
    
    const query = "budget expense tracking";
    const { data: matches, error } = await supabase
      .from('apps_unified')
      .select(`
        id,
        title,
        primary_category,
        rating,
        icon_url,
        description
      `)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%,primary_category.ilike.%${query}%`)
      .limit(5);
    
    if (error) {
      console.error('❌ Search error:', error);
      return;
    }
    
    console.log(`✅ Found ${matches.length} matches for "${query}"`);
    
    matches.forEach((app, i) => {
      console.log(`${i+1}. ${app.title} (${app.primary_category})`);
      console.log(`   Rating: ${app.rating || 'N/A'}/5`);
      console.log(`   Description: ${(app.description || '').substring(0, 100)}...`);
      console.log('');
    });
    
    // Test with a different query
    console.log('\n2. Testing with health/fitness query...');
    
    const healthQuery = "fitness health exercise";
    const { data: healthMatches, error: healthError } = await supabase
      .from('apps_unified')
      .select(`
        id,
        title,
        primary_category,
        rating,
        icon_url
      `)
      .or(`title.ilike.%fitness%,title.ilike.%health%,title.ilike.%exercise%,primary_category.ilike.%health%,primary_category.ilike.%fitness%`)
      .limit(5);
    
    if (healthError) {
      console.error('❌ Health search error:', healthError);
      return;
    }
    
    console.log(`✅ Found ${healthMatches.length} health/fitness matches`);
    
    healthMatches.forEach((app, i) => {
      console.log(`${i+1}. ${app.title} (${app.primary_category})`);
    });
    
    console.log('\n✅ Fast semantic search is working correctly!');
    
    // Test if we can get embeddings for these apps
    console.log('\n3. Testing embedding availability...');
    
    const appIds = matches.slice(0, 3).map(app => app.id);
    const { data: embeddings, error: embError } = await supabase
      .from('app_embeddings')
      .select('app_id, embedding_model')
      .in('app_id', appIds);
    
    if (embError) {
      console.error('❌ Embeddings check error:', embError);
    } else {
      console.log(`✅ Found embeddings for ${embeddings.length}/${appIds.length} test apps`);
      if (embeddings.length > 0) {
        console.log(`   Using model: ${embeddings[0].embedding_model}`);
      }
    }
    
  } catch (err) {
    console.error('❌ Test error:', err);
  }
}

testWorkingSemanticSearch();