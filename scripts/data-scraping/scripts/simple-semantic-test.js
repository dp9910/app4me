const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function simpleSemanticTest() {
  console.log('🧪 Simple semantic search test...');
  
  try {
    // Get a sample embedding
    const { data: sampleApp, error: sampleError } = await supabase
      .from('app_embeddings')
      .select('embedding, app_id')
      .limit(1)
      .single();
    
    if (sampleError) {
      console.error('❌ Error getting sample:', sampleError);
      return;
    }
    
    console.log(`✅ Got sample embedding for app ${sampleApp.app_id}`);
    
    // Manual similarity search using raw SQL via direct query
    const similarityQuery = `
      SELECT 
        ae.app_id,
        1 - (ae.embedding <=> $1::vector) AS similarity,
        a.title AS app_name,
        a.primary_category AS app_category,
        a.rating AS app_rating,
        a.icon_url AS app_icon,
        a.description AS app_description
      FROM app_embeddings ae
      JOIN apps_unified a ON a.id = ae.app_id
      WHERE 1 - (ae.embedding <=> $1::vector) > 0.5
      ORDER BY ae.embedding <=> $1::vector
      LIMIT 5
    `;
    
    // Use the PostgreSQL REST API directly for more control
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_KEY
      },
      body: JSON.stringify({
        query: similarityQuery,
        params: [sampleApp.embedding]
      })
    });
    
    if (!response.ok) {
      console.log('Let me try a simpler approach...');
      
      // Just test the basic structure without similarity search
      const { data: basicTest, error: basicError } = await supabase
        .from('apps_unified')
        .select(`
          id,
          title,
          primary_category,
          rating,
          icon_url,
          description
        `)
        .limit(3);
      
      if (basicError) {
        console.error('❌ Basic test error:', basicError);
      } else {
        console.log('✅ Basic query successful:');
        basicTest.forEach(app => {
          console.log(`- ${app.title} (${app.primary_category})`);
        });
        
        // Check if we have embeddings for these apps
        const appIds = basicTest.map(app => app.id);
        const { data: embeddings, error: embError } = await supabase
          .from('app_embeddings')
          .select('app_id')
          .in('app_id', appIds);
        
        if (embError) {
          console.error('❌ Embeddings check error:', embError);
        } else {
          console.log(`✅ Found embeddings for ${embeddings.length}/${basicTest.length} apps`);
        }
      }
    } else {
      const results = await response.json();
      console.log('✅ Similarity search successful:', results);
    }
    
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

simpleSemanticTest();