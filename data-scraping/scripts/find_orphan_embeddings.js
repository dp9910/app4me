
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function findOrphanEmbeddings() {
  try {
    const { data: appIds, error: appIdsError } = await supabase
      .from('apps_unified')
      .select('id');

    if (appIdsError) {
      throw appIdsError;
    }

    const unifiedAppIds = appIds.map(item => item.id);

    const { data: embeddingAppIds, error: embeddingAppIdsError } = await supabase
      .from('app_embeddings')
      .select('app_id');

    if (embeddingAppIdsError) {
      throw embeddingAppIdsError;
    }

    const orphanAppIds = embeddingAppIds.filter(item => !unifiedAppIds.includes(item.app_id));

    if (orphanAppIds.length > 0) {
      console.log('🔴 Found orphan embeddings:');
      console.log(orphanAppIds);
    } else {
      console.log('✅ No orphan embeddings found.');
    }

  } catch (err) {
    console.error('❌ An error occurred:', err);
  }
}

findOrphanEmbeddings();
