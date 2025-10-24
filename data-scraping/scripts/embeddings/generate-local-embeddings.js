const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);
const OUTPUT_DIR = 'data-scraping/features-output/embeddings';
const OUTPUT_FILE = `${OUTPUT_DIR}/itunes_app_embeddings.jsonl`;
const PROGRESS_FILE = `${OUTPUT_DIR}/progress.json`;
const BATCH_SIZE = 20;

function createEmbeddingText(app) {
  const parts = [];
  if (app.title) {
    parts.push(`App: ${app.title}`);
  }
  if (app.category) {
    parts.push(`Category: ${app.category}`);
  }
  if (app.description) {
    const truncated = app.description.substring(0, 2000);
    parts.push(truncated);
  }
  return parts.join('\n\n').trim();
}

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    return progress.lastProcessedId;
  }
  return 0;
}

function saveProgress(lastProcessedId) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ lastProcessedId }));
}

async function generateLocalEmbeddings() {
  console.log('Starting full local embedding generation...');
  let lastProcessedId = loadProgress();
  console.log(`Resuming from last processed ID: ${lastProcessedId}`);

  let appsProcessed = 0;

  while (true) {
    console.log(`\nFetching batch of apps after ID ${lastProcessedId}...`);
    const { data: apps, error } = await supabase
      .from('itunes_apps')
      .select('id, bundle_id, title, description, category')
      .gt('id', lastProcessedId)
      .order('id', { ascending: true })
      .limit(BATCH_SIZE);

    if (error) {
      console.error('Error fetching data:', error);
      break;
    }

    if (!apps || apps.length === 0) {
      console.log('No more apps to process.');
      break;
    }

    console.log(`Processing ${apps.length} apps in this batch.`);

    for (const app of apps) {
      const embeddingText = createEmbeddingText(app);
      if (!embeddingText) {
        console.log(`  Skipping app ${app.id} due to empty text.`);
        lastProcessedId = app.id;
        saveProgress(lastProcessedId);
        continue;
      }

      try {
        const result = await genAI.models.embedContent({
            model: 'embedding-001',
            contents: [embeddingText]
        });
        const embedding = result.embeddings[0].values;

        const output = {
          bundle_id: app.bundle_id,
          embedding: embedding
        };

        fs.appendFileSync(OUTPUT_FILE, JSON.stringify(output) + '\n');
        appsProcessed++;
        lastProcessedId = app.id;
        saveProgress(lastProcessedId);
        console.log(`  (${appsProcessed}) Successfully processed app ID: ${app.id}`);

      } catch (e) {
        console.error(`  Error generating embedding for app ID ${app.id}:`, e);
        if (e.message.includes('429')) { // Rate limit error
          console.log('Rate limit detected. Pausing for 60 seconds...');
          await new Promise(resolve => setTimeout(resolve, 60000));
          console.log('Resuming...');
          // The loop will retry the current app
        } else {
          // For other errors, we stop to avoid losing data
          console.error('Unrecoverable error. Stopping.');
          return;
        }
      }
    }
  }

  console.log(`\n✅ Full embedding generation complete. Total apps processed: ${appsProcessed}`);
}

generateLocalEmbeddings();