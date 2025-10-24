
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const readline = require('readline');

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const inputFile = process.argv[2];
if (!inputFile) {
  console.error('Please provide the input file path as a command-line argument.');
  process.exit(1);
}

const PROGRESS_FILE = `data-scraping/features-output/embeddings/upload_progress_${inputFile.split('/').pop()}.json`;

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    return new Set(progress.processedBundleIds || []);
  }
  return new Set();
}

function saveProgress(processedBundleIds) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ processedBundleIds: Array.from(processedBundleIds) }));
}

async function uploadEmbeddings() {
  console.log(`Starting embedding upload process for ${inputFile}...`);
  const processedBundleIds = loadProgress();
  console.log(`Resuming from ${processedBundleIds.size} processed embeddings.`);

  const fileStream = fs.createReadStream(inputFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineCount = 0;
  let uploadCount = 0;

  for await (const line of rl) {
    lineCount++;
    const { bundle_id, embedding } = JSON.parse(line);

    if (processedBundleIds.has(bundle_id)) {
      continue;
    }

    try {
      const { data: app, error: appError } = await supabase
        .from('apps_unified')
        .select('id')
        .eq('bundle_id', bundle_id)
        .single();

      if (appError || !app) {
        console.warn(`  Could not find app with bundle_id: ${bundle_id}`);
        continue;
      }

      const { error: insertError } = await supabase
        .from('app_embeddings')
        .insert({ app_id: app.id, embedding: embedding });

      if (insertError) {
        console.error(`  Error inserting embedding for ${bundle_id}:`, insertError.message);
        if (insertError.code === '23505') { // unique_violation
            processedBundleIds.add(bundle_id);
            saveProgress(processedBundleIds);
        }
        continue;
      }

      uploadCount++;
      processedBundleIds.add(bundle_id);
      if (uploadCount % 50 === 0) { // Save progress every 50 uploads
        saveProgress(processedBundleIds);
      }
      console.log(`  (${uploadCount}) Successfully uploaded embedding for ${bundle_id}`);

    } catch (e) {
      console.error(`  An unexpected error occurred for ${bundle_id}:`, e);
    }
  }
  saveProgress(processedBundleIds); // Final save
  console.log(`\n✅ Embedding upload complete for ${inputFile}. Uploaded ${uploadCount} new embeddings.`);
}

uploadEmbeddings();
