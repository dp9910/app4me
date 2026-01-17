
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

// Helper function to fetch all IDs from a table
async function fetchAllIds(tableName, idColumn) {
  const BATCH_SIZE = 1000;
  let allIds = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select(idColumn)
      .range(from, from + BATCH_SIZE - 1);

    if (error) throw error;
    if (data) allIds = allIds.concat(data.map(r => r[idColumn]));
    if (!data || data.length < BATCH_SIZE) break;

    from += BATCH_SIZE;
  }
  return allIds;
}

function createEmbeddingText(app) {
    const parts = [];
    if (app.title) parts.push(`App: ${app.title}`);
    if (app.primary_category) parts.push(`Category: ${app.primary_category}`);
    if (app.description) parts.push(app.description.substring(0, 2000));
    return parts.join('\n\n').trim();
}

async function findAndFixMissingEmbeddings() {
  console.log('🚀 Starting to find and fix missing embeddings...');

  try {
    // 1. Get all IDs from both tables
    console.log('Fetching IDs from apps_unified and app_embeddings...');
    const unifiedIds = await fetchAllIds('apps_unified', 'id');
    const embeddingAppIds = new Set(await fetchAllIds('app_embeddings', 'app_id'));
    console.log(`  Found ${unifiedIds.length} apps in apps_unified.`);
    console.log(`  Found ${embeddingAppIds.size} apps in app_embeddings.`);

    // 2. Find the missing IDs
    const missingIds = unifiedIds.filter(id => !embeddingAppIds.has(id));
    console.log(`  Found ${missingIds.length} apps with missing embeddings.`);

    if (missingIds.length === 0) {
      console.log('\n✅ No missing embeddings found. Tables are synchronized!');
      return;
    }

    // 3. Process missing apps in batches
    const BATCH_SIZE = 50;
    let processedCount = 0;
    for (let i = 0; i < missingIds.length; i += BATCH_SIZE) {
      const batchIds = missingIds.slice(i, i + BATCH_SIZE);
      console.log(`\nProcessing batch ${i / BATCH_SIZE + 1} of ${Math.ceil(missingIds.length / BATCH_SIZE)}...`);

      const { data: missingApps, error: fetchError } = await supabase
        .from('apps_unified')
        .select('id, title, description, primary_category')
        .in('id', batchIds);

      if (fetchError) {
        console.error('  Error fetching data for missing apps:', fetchError.message);
        continue;
      }

      const embeddingsToInsert = [];
      for (const app of missingApps) {
        const embeddingText = createEmbeddingText(app);
        if (!embeddingText) continue;

        try {
          const result = await genAI.models.embedContent({
              model: 'embedding-001',
              contents: [embeddingText]
          });
          const embedding = result.embeddings[0].values;
          embeddingsToInsert.push({ app_id: app.id, embedding: embedding });
          console.log(`    Generated embedding for app ID: ${app.id}`);
        } catch (e) {
          console.error(`    Error generating embedding for app ID ${app.id}:`, e.message);
        }
      }

      if (embeddingsToInsert.length > 0) {
        const { error: insertError } = await supabase.from('app_embeddings').insert(embeddingsToInsert);
        if (insertError) {
          console.error(`  Error inserting batch of embeddings:`, insertError.message);
        } else {
          processedCount += embeddingsToInsert.length;
          console.log(`  Successfully inserted ${embeddingsToInsert.length} new embeddings.`);
        }
      }
    }

    console.log(`\n✅ Repair process complete! Processed ${processedCount} missing embeddings.`);

  } catch (err) {
    console.error('\n❌ An error occurred during the repair process:', err);
  }
}

findAndFixMissingEmbeddings();
