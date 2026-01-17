const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkTableCounts() {
  console.log('🔍 Checking row counts across all tables...\n');
  
  try {
    // Check apps_unified table
    const { count: appsCount, error: appsError } = await supabase
      .from('apps_unified')
      .select('*', { count: 'exact', head: true });
    
    if (appsError) {
      console.error('❌ Error counting apps_unified:', appsError.message);
    } else {
      console.log(`📊 apps_unified: ${appsCount} rows`);
    }

    // Check new_embeddings table
    const { count: embeddingsCount, error: embeddingsError } = await supabase
      .from('new_embeddings')
      .select('*', { count: 'exact', head: true });
    
    if (embeddingsError) {
      console.error('❌ Error counting new_embeddings:', embeddingsError.message);
    } else {
      console.log(`📊 new_embeddings: ${embeddingsCount} rows`);
    }

    // Check features table
    const { count: featuresCount, error: featuresError } = await supabase
      .from('features')
      .select('*', { count: 'exact', head: true });
    
    if (featuresError) {
      console.error('❌ Error counting features:', featuresError.message);
    } else {
      console.log(`📊 features: ${featuresCount} rows`);
    }

    // Check old app_embeddings table if it exists
    const { count: oldEmbeddingsCount, error: oldEmbeddingsError } = await supabase
      .from('app_embeddings')
      .select('*', { count: 'exact', head: true });
    
    if (oldEmbeddingsError) {
      console.log(`⚠️ app_embeddings table: ${oldEmbeddingsError.message}`);
    } else {
      console.log(`📊 app_embeddings (old): ${oldEmbeddingsCount} rows`);
    }

    console.log('\n📋 Summary:');
    if (!appsError && !embeddingsError) {
      const coverage = ((embeddingsCount / appsCount) * 100).toFixed(1);
      console.log(`📈 Embedding coverage: ${coverage}% (${embeddingsCount}/${appsCount})`);
      
      if (embeddingsCount === appsCount) {
        console.log('✅ All apps have embeddings!');
      } else if (embeddingsCount > appsCount) {
        console.log('⚠️ More embeddings than apps - possible duplicates');
      } else {
        console.log(`📝 Missing embeddings for ${appsCount - embeddingsCount} apps`);
      }
    }

    if (!appsError && !featuresError) {
      const featuresCoverage = ((featuresCount / appsCount) * 100).toFixed(1);
      console.log(`📈 Features coverage: ${featuresCoverage}% (${featuresCount}/${appsCount})`);
    }

  } catch (error) {
    console.error('❌ Error checking table counts:', error.message);
  }
}

checkTableCounts().catch(console.error);