
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function findMissingIds() {
  try {
    console.log('Fetching all app IDs from apps_unified...');
    
    // Get all unified app IDs with pagination
    const unifiedIds = new Set();
    let offset = 0;
    const batchSize = 1000;
    
    while (true) {
      const { data: batch, error } = await supabase
        .from('apps_unified')
        .select('id')
        .range(offset, offset + batchSize - 1);

      if (error) {
        throw error;
      }

      if (!batch || batch.length === 0) {
        break;
      }

      batch.forEach(item => unifiedIds.add(item.id));
      offset += batchSize;
      
      if (batch.length < batchSize) {
        break; // Last batch
      }
    }

    console.log(`Found ${unifiedIds.size} unique app IDs in apps_unified.`);

    console.log('Fetching all app IDs from app_embeddings...');
    
    // Get all embedding app IDs with pagination
    const embeddingIds = new Set();
    offset = 0;
    
    while (true) {
      const { data: batch, error } = await supabase
        .from('app_embeddings')
        .select('app_id')
        .range(offset, offset + batchSize - 1);

      if (error) {
        throw error;
      }

      if (!batch || batch.length === 0) {
        break;
      }

      batch.forEach(item => embeddingIds.add(item.app_id));
      offset += batchSize;
      
      if (batch.length < batchSize) {
        break; // Last batch
      }
    }

    console.log(`Found ${embeddingIds.size} unique app IDs in app_embeddings.`);

    const missingIds = [];
    for (const id of unifiedIds) {
      if (!embeddingIds.has(id)) {
        missingIds.push(id);
      }
    }

    if (missingIds.length > 0) {
      console.log('🔴 Found missing ids:');
      console.log(missingIds);
      return missingIds;
    } else {
      console.log('✅ No missing ids found.');
      return [];
    }

  } catch (err) {
    console.error('❌ An error occurred:', err);
    return [];
  }
}

async function main() {
  const missingIds = await findMissingIds();
  
  if (missingIds.length > 0) {
    console.log(`\n📝 Found ${missingIds.length} apps missing embeddings.`);
    console.log('To generate embeddings for these apps, run:');
    console.log('node data-scraping/scripts/embeddings/generate-embeddings.js --no-skip');
  }
}

if (require.main === module) {
  main();
}

module.exports = { findMissingIds };
