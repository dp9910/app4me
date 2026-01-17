const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

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

async function testItunesEmbedding() {
  console.log('Fetching data from itunes_apps table...');
  const { data: apps, error } = await supabase
    .from('itunes_apps')
    .select('title, description, category')
    .limit(1);

  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  if (!apps || apps.length === 0) {
    console.log('No apps found in itunes_apps table.');
    return;
  }

  const app = apps[0];
  console.log(`
Processing app: ${app.title}`);

  const embeddingText = createEmbeddingText(app);
  console.log('\nText to be embedded:\n---');
  console.log(embeddingText);
  console.log('---\n');

  try {
    const result = await genAI.models.embedContent({
        model: 'embedding-001',
        contents: [embeddingText]
    });
    const embedding = result.embeddings[0].values;
    console.log('Successfully generated embedding:');
    console.log(`Vector dimensions: ${embedding.length}`);
    console.log(`First 5 values: [${embedding.slice(0, 5).join(', ')}, ...]`);
  } catch (e) {
    console.error('Error generating embedding:', e);
  }
}

testItunesEmbedding();