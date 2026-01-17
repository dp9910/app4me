const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

if (!process.env.DEEPSEEK_API_KEY) {
  console.error('❌ DEEPSEEK_API_KEY not found. Please check your .env.local file.');
  process.exit(1);
}

const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

async function generateMissingFeatures() {
  console.log('🚀 Starting to generate missing features...');

  try {
    // 1. Read the list of missing app_ids
    console.log('Reading missing features file...');
    const missingAppIds = JSON.parse(fs.readFileSync('data-scraping/features-output/missing-features.json', 'utf-8'));

    console.log(`Found ${missingAppIds.length} apps with missing features.`);

    // 2. Process missing apps in batches
    const BATCH_SIZE = 50;
    const output_path = 'data-scraping/features-output/generated-features.jsonl';
    let processedCount = 0;

    for (let i = 0; i < missingAppIds.length; i += BATCH_SIZE) {
      const batchIds = missingAppIds.slice(i, i + BATCH_SIZE);
      console.log(`\nProcessing batch ${i / BATCH_SIZE + 1} of ${Math.ceil(missingAppIds.length / BATCH_SIZE)}...`);

      const { data: missingApps, error: fetchError } = await supabase
        .from('apps_unified')
        .select('id, title, description, primary_category')
        .in('id', batchIds);

      if (fetchError) {
        console.error('  Error fetching data for missing apps:', fetchError.message);
        continue;
      }

      for (const app of missingApps) {
        const title = (app.title || app.name || '').substring(0, 50);
        const category = (app.category || app.primary_category || '').substring(0, 30);
        const description = (app.description || '').substring(0, 200);
        
        if (!title || description.length < 20) {
          continue;
        }

        const prompt = `App: ${title}\nCategory: ${category}\nDescription: ${description}\n\nExtract 3 key insights as JSON:\n{\n  "primary_use": "main purpose in 2-4 words",\n  "target_user": "who uses this in 2-3 words", \n  "key_benefit": "main value in 4-6 words"\n}`;

        try {
          const completion = await deepseek.chat.completions.create({
            model: "deepseek-chat",
            messages: [
              {
                role: "user",
                content: prompt
              }
            ],
            max_tokens: 100,
            temperature: 0.3
          });
          
          const responseText = completion.choices[0].message.content;
          const jsonMatch = responseText.match(/\{[\s\S]*?\}/);

          if (jsonMatch) {
            const features = JSON.parse(jsonMatch[0]);
            const featureData = {
              app_id: app.id,
              features: features
            };
            fs.appendFileSync(output_path, JSON.stringify(featureData) + '\n');
            processedCount++;
            console.log(`    Generated features for app ID: ${app.id}`);
          }
        } catch (e) {
          console.error(`    Error generating features for app ID ${app.id}:`, e.message);
        }
      }
    }

    console.log(`\n✅ Generation process complete! Processed ${processedCount} missing features.`);

  } catch (err) {
    console.error('An error occurred during the generation process:', err);
  }
}

generateMissingFeatures();