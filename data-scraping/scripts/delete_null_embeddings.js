
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function deleteNullEmbeddings() {
  try {
    const { error } = await supabase
      .from('app_embeddings')
      .delete()
      .is('app_id', null);

    if (error) {
      throw error;
    }

    console.log('✅ Null embeddings deleted successfully.');

  } catch (err) {
    console.error('❌ An error occurred:', err);
  }
}

deleteNullEmbeddings();
