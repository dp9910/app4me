const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function countRows() {
  try {
    const { count: unifiedCount, error: unifiedError } = await supabase
      .from('apps_unified')
      .select('*', { count: 'exact', head: true });

    if (unifiedError) {
      throw unifiedError;
    }

    const { count: embeddingsCount, error: embeddingsError } = await supabase
      .from('app_embeddings')
      .select('*', { count: 'exact', head: true });

    if (embeddingsError) {
      throw embeddingsError;
    }

    console.log(`apps_unified:    ${unifiedCount}`);
    console.log(`app_embeddings:  ${embeddingsCount}`);

    if (unifiedCount === embeddingsCount) {
      console.log('✅ All apps have embeddings!');
    } else {
      console.log(`🔴 Missing ${unifiedCount - embeddingsCount} embeddings.`);
    }

  } catch (err) {
    console.error('❌ An error occurred:', err);
  }
}

countRows();