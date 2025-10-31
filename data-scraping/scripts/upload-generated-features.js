const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function uploadGeneratedFeatures() {
  console.log('🚀 Starting upload of generated features...');

  try {
    // 1. Read the generated features JSONL file
    const filePath = 'data-scraping/features-output/generated-features.jsonl';
    
    if (!fs.existsSync(filePath)) {
      console.error('❌ Generated features file not found:', filePath);
      return;
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.trim().split('\n').filter(line => line.trim());
    
    console.log(`📄 Found ${lines.length} features to upload`);

    // 2. Parse and prepare features for upload
    const featuresToUpload = [];
    let parseErrors = 0;

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        if (data.app_id && data.features) {
          featuresToUpload.push({
            app_id: data.app_id,
            primary_use_case: data.features.primary_use || null,
            target_user: data.features.target_user || null,
            key_benefit: data.features.key_benefit || null,
            keywords_tfidf: {},
            category_classification: {},
            quality_signals: null,
            complexity: null,
            api_used: 'deepseek',
            processing_time_ms: null
          });
        }
      } catch (err) {
        parseErrors++;
        console.error(`  ❌ Error parsing line: ${line.substring(0, 50)}...`);
      }
    }

    console.log(`  ✅ Parsed: ${featuresToUpload.length} valid features`);
    console.log(`  ❌ Parse errors: ${parseErrors}`);

    // 3. Upload to Supabase in batches
    console.log('\nUploading features to app_features table...');
    const BATCH_SIZE = 100;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < featuresToUpload.length; i += BATCH_SIZE) {
      const batch = featuresToUpload.slice(i, i + BATCH_SIZE);
      
      const { error: upsertError } = await supabase
        .from('app_features')
        .upsert(batch, { onConflict: 'app_id' });

      if (upsertError) {
        console.error(`  ❌ Error uploading batch ${Math.floor(i / BATCH_SIZE) + 1}:`, upsertError.message);
        errorCount++;
      } else {
        console.log(`  ✅ Uploaded batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(featuresToUpload.length / BATCH_SIZE)}`);
        successCount++;
      }
    }

    // 4. Verify upload
    const { count: finalCount, error: countError } = await supabase
      .from('app_features')
      .select('*', { count: 'exact', head: true });
      
    if (countError) throw countError;

    console.log('\n🎉 UPLOAD COMPLETE!');
    console.log('================');
    console.log(`Features processed: ${featuresToUpload.length}`);
    console.log(`Final count in app_features: ${finalCount}`);
    console.log(`Successful batches: ${successCount}`);
    console.log(`Failed batches: ${errorCount}`);

  } catch (err) {
    console.error('\n❌ An error occurred during the upload process:', err);
  }
}

uploadGeneratedFeatures();