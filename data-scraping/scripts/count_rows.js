
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function countRows() {
  console.log('Checking row counts...');

  try {
    // Count rows in apps_unified
    const { count: unifiedCount, error: unifiedError } = await supabase
      .from('apps_unified')
      .select('*', { count: 'exact', head: true });

    if (unifiedError) throw unifiedError;

    // Count rows in app_embeddings
    const { count: embeddingsCount, error: embeddingsError } = await supabase
      .from('app_embeddings')
      .select('*', { count: 'exact', head: true });

    if (embeddingsError) throw embeddingsError;

    console.log('\n--- Row Counts ---');
    console.log(`apps_unified:    ${unifiedCount}`);
    console.log(`app_embeddings:  ${embeddingsCount}`);
    console.log('------------------\n');

    if (unifiedCount === embeddingsCount) {
      console.log('✅ The tables are synchronized.');
    } else {
      console.log(`❌ Discrepancy found: ${Math.abs(unifiedCount - embeddingsCount)} rows difference.`);
    }

  } catch (err) {
    console.error('\n❌ An error occurred while counting rows:', err.message);
  }
}

countRows();
