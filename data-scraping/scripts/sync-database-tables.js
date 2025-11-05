const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function syncDatabaseTables() {
  console.log('🔄 Starting database sync process...\n');

  try {
    // Read the ready-to-upload data
    const analysisDir = path.join(__dirname, '../analysis-output');
    const readyFiles = fs.readdirSync(analysisDir)
      .filter(file => file.startsWith('ready-to-upload-'))
      .sort()
      .reverse(); // Get the latest file

    if (readyFiles.length === 0) {
      console.log('❌ No ready-to-upload file found. Run check-existing-features.js first.');
      return;
    }

    const readyToUploadPath = path.join(analysisDir, readyFiles[0]);
    const readyToUpload = JSON.parse(fs.readFileSync(readyToUploadPath, 'utf8'));

    console.log(`📋 Found ${readyToUpload.length} apps ready for upload`);

    // Step 1: Upload features to app_features table
    const featuresUploaded = await uploadFeatures(readyToUpload);
    console.log(`✅ Successfully uploaded ${featuresUploaded} features`);

    // Step 2: Generate and upload embeddings
    const embeddingsUploaded = await generateAndUploadEmbeddings(readyToUpload);
    console.log(`✅ Successfully uploaded ${embeddingsUploaded} embeddings`);

    // Step 3: Verify the sync
    await verifySync();

    console.log('\n🎉 Database sync completed successfully!');

  } catch (error) {
    console.error('❌ Error during sync:', error);
    throw error;
  }
}

async function uploadFeatures(apps) {
  console.log('\n📋 Uploading features to app_features table...');
  
  const newFeaturesDir = path.join(__dirname, '../new-features');
  let uploaded = 0;
  let errors = 0;

  for (const app of apps) {
    try {
      // Read the feature file
      const featureFile = path.join(newFeaturesDir, app.featureFile);
      const data = JSON.parse(fs.readFileSync(featureFile, 'utf8'));
      
      let features = [];
      if (data.features && Array.isArray(data.features)) {
        features = data.features;
      } else if (Array.isArray(data)) {
        features = data;
      }

      // Find the feature for this specific app
      const feature = features.find(f => f.bundle_id === app.bundle_id);
      if (!feature) {
        console.log(`⚠️  Feature not found for ${app.title} (${app.bundle_id})`);
        continue;
      }

      // Prepare feature data for upload
      const featureRecord = {
        app_id: app.id,
        primary_use_case: feature.primary_use_case || null,
        target_user: feature.target_user || null,
        key_benefit: feature.key_benefit || null,
        complexity: feature.complexity || null,
        category_classification: feature.category_analysis || null,
        keywords_tfidf: feature.keywords_analysis || null,
        quality_signals: 0.8, // Default quality score
        api_used: 'deepseek-chat',
        processing_time_ms: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Upload to database
      const { error } = await supabase
        .from('app_features')
        .insert([featureRecord]);

      if (error) {
        console.log(`❌ Failed to upload feature for ${app.title}: ${error.message}`);
        errors++;
      } else {
        uploaded++;
        if (uploaded % 50 === 0) {
          console.log(`  Uploaded ${uploaded} features...`);
        }
      }

    } catch (err) {
      console.log(`❌ Error processing ${app.title}: ${err.message}`);
      errors++;
    }
  }

  console.log(`📊 Features upload complete: ${uploaded} successful, ${errors} errors`);
  return uploaded;
}

async function generateAndUploadEmbeddings(apps) {
  console.log('\n🔢 Generating and uploading embeddings...');
  
  const embeddingsUploaded = [];
  let uploaded = 0;
  let errors = 0;

  // Process in batches to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < apps.length; i += batchSize) {
    const batch = apps.slice(i, i + batchSize);
    
    for (const app of batch) {
      try {
        // First get the app details for embedding generation
        const { data: appData, error: appError } = await supabase
          .from('apps_unified')
          .select('title, description, primary_category')
          .eq('id', app.id)
          .single();

        if (appError || !appData) {
          console.log(`⚠️  App data not found for ${app.title}`);
          continue;
        }

        // Create embedding text
        const embeddingText = `${appData.title}. ${appData.description || ''} ${appData.primary_category || ''}`.trim();
        
        // Generate embedding using OpenAI
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            input: embeddingText,
            model: 'text-embedding-3-small'
          })
        });

        if (!embeddingResponse.ok) {
          console.log(`❌ Failed to generate embedding for ${app.title}`);
          errors++;
          continue;
        }

        const embeddingData = await embeddingResponse.json();
        const embedding = embeddingData.data[0].embedding;

        // Upload embedding to database
        const { error: embeddingError } = await supabase
          .from('app_embeddings')
          .insert([{
            app_id: app.id,
            embedding: embedding,
            created_at: new Date().toISOString()
          }]);

        if (embeddingError) {
          console.log(`❌ Failed to upload embedding for ${app.title}: ${embeddingError.message}`);
          errors++;
        } else {
          uploaded++;
          if (uploaded % 10 === 0) {
            console.log(`  Generated ${uploaded} embeddings...`);
          }
        }

        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (err) {
        console.log(`❌ Error processing embedding for ${app.title}: ${err.message}`);
        errors++;
      }
    }

    // Longer delay between batches
    if (i + batchSize < apps.length) {
      console.log(`  Batch ${Math.floor(i/batchSize) + 1} complete, waiting...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`📊 Embeddings upload complete: ${uploaded} successful, ${errors} errors`);
  return uploaded;
}

async function verifySync() {
  console.log('\n🔍 Verifying sync status...');

  // Count rows in all tables
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

  if (unifiedCount === featuresCount && unifiedCount === embeddingsCount) {
    console.log('✅ All tables are now synchronized!');
  } else {
    console.log('⚠️  Tables still have mismatches:');
    console.log(`  - Missing features: ${unifiedCount - featuresCount}`);
    console.log(`  - Missing embeddings: ${unifiedCount - embeddingsCount}`);
  }
}

// Add option to run specific parts
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--features-only')) {
    console.log('🔧 Running features upload only...');
    const analysisDir = path.join(__dirname, '../analysis-output');
    const readyFiles = fs.readdirSync(analysisDir)
      .filter(file => file.startsWith('ready-to-upload-'))
      .sort()
      .reverse();
    
    if (readyFiles.length === 0) {
      console.log('❌ No ready-to-upload file found.');
      return;
    }

    const readyToUpload = JSON.parse(fs.readFileSync(path.join(analysisDir, readyFiles[0]), 'utf8'));
    await uploadFeatures(readyToUpload);
    await verifySync();
  } else if (args.includes('--embeddings-only')) {
    console.log('🔢 Running embeddings generation only...');
    // This would need to get apps that have features but missing embeddings
    console.log('ℹ️  Use --features-only first, then run full sync');
  } else {
    await syncDatabaseTables();
  }
}

// If this script is run directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { syncDatabaseTables, uploadFeatures, generateAndUploadEmbeddings };