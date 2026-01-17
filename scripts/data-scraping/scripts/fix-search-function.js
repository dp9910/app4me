const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixSearchFunction() {
  console.log('🔧 Fixing search function to match current schema...');
  
  try {
    // Create a corrected version of the search function
    const createFunctionSQL = `
CREATE OR REPLACE FUNCTION search_apps_by_embedding(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 20
)
RETURNS TABLE (
  app_id BIGINT,
  similarity FLOAT,
  app_name TEXT,
  app_category TEXT,
  app_rating DECIMAL,
  app_icon TEXT,
  app_description TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ae.app_id,
    1 - (ae.embedding <=> query_embedding) AS similarity,
    a.title AS app_name,
    a.primary_category AS app_category,
    a.rating AS app_rating,
    a.icon_url AS app_icon,
    a.description AS app_description
  FROM app_embeddings ae
  JOIN apps_unified a ON a.id = ae.app_id
  WHERE 
    1 - (ae.embedding <=> query_embedding) > match_threshold
  ORDER BY ae.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
    `;
    
    console.log('Creating corrected search function...');
    
    // Split the function creation into parts to execute
    const { error } = await supabase.rpc('query', { 
      query: createFunctionSQL 
    });
    
    if (error) {
      console.log('Trying direct execution...');
      // Try using a simple approach
      const testQuery = `
        SELECT 
          ae.app_id,
          a.title,
          a.primary_category,
          a.rating,
          a.icon_url
        FROM app_embeddings ae
        JOIN apps_unified a ON a.id = ae.app_id
        LIMIT 3
      `;
      
      const { data: testResult, error: testError } = await supabase.rpc('query', {
        query: testQuery
      });
      
      if (testError) {
        console.error('❌ Test query error:', testError);
      } else {
        console.log('✅ Schema test successful:', testResult);
      }
    } else {
      console.log('✅ Function created successfully!');
    }
    
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

fixSearchFunction();