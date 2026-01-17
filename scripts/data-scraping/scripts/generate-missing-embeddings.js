const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function generateMissingEmbeddings() {
  console.log('🔢 Generating missing embeddings...\n');

  try {
    // Function to get all data with pagination
    async function getAllData(table, selectFields) {
      let allData = [];
      let start = 0;
      const batchSize = 1000;
      
      while (true) {
        const { data, error } = await supabase
          .from(table)
          .select(selectFields)
          .range(start, start + batchSize - 1);

        if (error) throw error;
        
        if (data.length === 0) break;
        allData = [...allData, ...data];
        start += batchSize;
        
        if (data.length < batchSize) break;
      }
      
      return allData;
    }

    // Get apps that have features but missing embeddings
    console.log('📋 Fetching apps with features...');
    const appsWithFeatures = await getAllData('app_features', 'app_id');

    console.log('🔢 Fetching apps with embeddings...');
    const appsWithEmbeddings = await getAllData('app_embeddings', 'app_id');

    const embeddingsSet = new Set(appsWithEmbeddings.map(app => app.app_id));
    const missingEmbeddings = appsWithFeatures
      .filter(app => !embeddingsSet.has(app.app_id))
      .map(app => app.app_id);

    console.log(`📋 Found ${missingEmbeddings.length} apps missing embeddings`);

    if (missingEmbeddings.length === 0) {
      console.log('✅ No missing embeddings found!');
      return;
    }

    // For testing, limit to first 50 apps
    const testLimit = process.argv.includes('--test') ? 50 : missingEmbeddings.length;
    const appsToProcess = missingEmbeddings.slice(0, testLimit);
    
    if (process.argv.includes('--test')) {
      console.log(`🧪 TEST MODE: Processing only first ${testLimit} apps`);
    }

    // Process in smaller batches
    const batchSize = 20;
    let totalUploaded = 0;
    let totalErrors = 0;

    for (let i = 0; i < appsToProcess.length; i += batchSize) {
      const batch = appsToProcess.slice(i, i + batchSize);
      console.log(`\n🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(appsToProcess.length/batchSize)} (${batch.length} apps)`);
      
      const batchResults = await processBatch(batch);
      totalUploaded += batchResults.uploaded;
      totalErrors += batchResults.errors;

      console.log(`  ✅ Batch complete: ${batchResults.uploaded} uploaded, ${batchResults.errors} errors`);
      console.log(`  📊 Total progress: ${totalUploaded}/${appsToProcess.length} (${Math.round(totalUploaded/appsToProcess.length*100)}%)`);

      // Rate limiting delay
      if (i + batchSize < appsToProcess.length) {
        console.log('  ⏳ Waiting 3 seconds...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    console.log(`\n🎉 Embeddings generation complete!`);
    console.log(`📊 Final results: ${totalUploaded} uploaded, ${totalErrors} errors`);

    // Verify final state
    await verifyEmbeddingsSync();

  } catch (error) {
    console.error('❌ Error generating embeddings:', error);
    throw error;
  }
}

async function processBatch(appIds) {
  let uploaded = 0;
  let errors = 0;

  // Get app details for all apps in batch
  const { data: apps, error: appsError } = await supabase
    .from('apps_unified')
    .select('id, title, description, primary_category')
    .in('id', appIds);

  if (appsError) {
    console.log(`❌ Error fetching app details: ${appsError.message}`);
    return { uploaded: 0, errors: appIds.length };
  }

  // Prepare embedding requests
  const embeddingRequests = apps.map(app => {
    const embeddingText = `${app.title}. ${app.description || ''} ${app.primary_category || ''}`.trim();
    return embeddingText;
  });

  try {
    // Generate embeddings for the entire batch
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: embeddingRequests,
        model: 'text-embedding-3-small'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ OpenAI API error: ${response.status} - ${errorText}`);
      return { uploaded: 0, errors: apps.length };
    }

    const embeddingData = await response.json();
    const embeddings = embeddingData.data;

    // Upload embeddings to database
    const embeddingRecords = apps.map((app, index) => ({
      app_id: app.id,
      embedding: embeddings[index].embedding,
      created_at: new Date().toISOString()
    }));

    const { error: uploadError } = await supabase
      .from('app_embeddings')
      .insert(embeddingRecords);

    if (uploadError) {
      console.log(`❌ Database upload error: ${uploadError.message}`);
      return { uploaded: 0, errors: apps.length };
    }

    return { uploaded: apps.length, errors: 0 };

  } catch (error) {
    console.log(`❌ Batch processing error: ${error.message}`);
    return { uploaded: 0, errors: apps.length };
  }
}

async function verifyEmbeddingsSync() {
  console.log('\n🔍 Verifying embeddings sync...');

  const { count: unifiedCount } = await supabase
    .from('apps_unified')
    .select('*', { count: 'exact', head: true });

  const { count: featuresCount } = await supabase
    .from('app_features')
    .select('*', { count: 'exact', head: true });

  const { count: embeddingsCount } = await supabase
    .from('app_embeddings')
    .select('*', { count: 'exact', head: true });

  console.log('\n📊 FINAL ROW COUNTS:');
  console.log(`apps_unified:    ${unifiedCount}`);
  console.log(`app_features:    ${featuresCount}`);
  console.log(`app_embeddings:  ${embeddingsCount}`);

  const missingFeatures = unifiedCount - featuresCount;
  const missingEmbeddings = unifiedCount - embeddingsCount;

  if (missingFeatures === 0 && missingEmbeddings === 0) {
    console.log('🎉 All tables are now perfectly synchronized!');
  } else {
    console.log(`⚠️  Remaining gaps:`);
    if (missingFeatures > 0) console.log(`  - Missing features: ${missingFeatures}`);
    if (missingEmbeddings > 0) console.log(`  - Missing embeddings: ${missingEmbeddings}`);
  }
}

// If this script is run directly
if (require.main === module) {
  generateMissingEmbeddings().catch(console.error);
}

module.exports = { generateMissingEmbeddings };