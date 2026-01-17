/**
 * Regenerate All App Embeddings
 * This will update all embeddings to use the current Gemini API model
 * ensuring compatibility with new query embeddings
 */
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function regenerateAllEmbeddings() {
  console.log('🔄 === REGENERATING ALL APP EMBEDDINGS ===\n');
  
  try {
    // Step 1: Get all apps that need embeddings regenerated
    console.log('📊 Step 1: Fetching all apps with embeddings...');
    
    const { data: appsWithEmbeddings, error: fetchError } = await supabase
      .from('app_embeddings')
      .select(`
        id,
        app_id,
        embedding_model,
        created_at,
        apps_unified!inner(
          id,
          title,
          developer,
          primary_category,
          description
        )
      `);
      
    if (fetchError) {
      console.error('❌ Error fetching apps:', fetchError);
      return;
    }
    
    console.log(`✅ Found ${appsWithEmbeddings.length} apps with embeddings`);
    console.log(`📅 Existing embeddings from: ${appsWithEmbeddings[0]?.created_at}`);
    console.log(`🤖 Current model: ${appsWithEmbeddings[0]?.embedding_model}`);
    
    // Step 2: Regenerate embeddings in batches
    const batchSize = 10; // Process 10 at a time to avoid rate limits
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    
    let successCount = 0;
    let errorCount = 0;
    const updatedEmbeddings = [];
    
    console.log(`\n🔢 Step 2: Regenerating embeddings (${batchSize} at a time)...`);
    
    for (let i = 0; i < appsWithEmbeddings.length; i += batchSize) {
      const batch = appsWithEmbeddings.slice(i, i + batchSize);
      console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(appsWithEmbeddings.length/batchSize)} (apps ${i+1}-${Math.min(i+batchSize, appsWithEmbeddings.length)})...`);
      
      for (const item of batch) {
        const app = item.apps_unified;
        
        try {
          console.log(`  🔄 ${app.title} (ID: ${app.id})`);
          
          // Use the same format as original search_pd.js
          const text = `${app.title} ${app.developer || ''} ${app.primary_category || ''} ${app.description || ''}`.slice(0, 1000);
          
          const result = await model.embedContent(text);
          const newEmbedding = result.embedding.values;
          
          // Prepare update record
          const updateRecord = {
            id: item.id,
            app_id: item.app_id,
            embedding: JSON.stringify(newEmbedding),
            embedding_model: 'text-embedding-004',
            updated_at: new Date().toISOString()
          };
          
          updatedEmbeddings.push(updateRecord);
          successCount++;
          
          console.log(`    ✅ Generated (${newEmbedding.length} dims)`);
          
          // Small delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`    ❌ Failed: ${error.message}`);
          errorCount++;
        }
      }
      
      console.log(`  📊 Batch complete: ${successCount} success, ${errorCount} errors`);
    }
    
    console.log(`\n📊 Generation Summary:`);
    console.log(`  ✅ Successful: ${successCount}`);
    console.log(`  ❌ Failed: ${errorCount}`);
    console.log(`  📈 Success rate: ${Math.round(successCount/(successCount+errorCount)*100)}%`);
    
    if (updatedEmbeddings.length === 0) {
      console.log('❌ No embeddings generated, stopping.');
      return;
    }
    
    // Step 3: Save backup of new embeddings locally first
    console.log(`\n💾 Step 3: Backing up new embeddings locally...`);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `data-scraping/embedding-updates/regenerated-embeddings-${timestamp}.json`;
    
    // Ensure directory exists
    const backupDir = 'data-scraping/embedding-updates';
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const backupData = {
      timestamp: new Date().toISOString(),
      total_regenerated: updatedEmbeddings.length,
      model_used: 'text-embedding-004',
      format_used: '${title} ${developer} ${category} ${description}',
      embeddings: updatedEmbeddings
    };
    
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`✅ Backup saved: ${backupFile}`);
    
    // Step 4: Ask for confirmation before updating database
    console.log(`\n⚠️  Ready to update ${updatedEmbeddings.length} embeddings in database.`);
    console.log(`This will replace all existing embeddings with new ones.`);
    console.log(`\nProceed with database update? (This script will pause here)`);
    console.log(`\n🔧 To update database, run:`);
    console.log(`node update-embeddings-from-backup.js "${backupFile}"`);
    
    // Test a few samples for quality check
    console.log(`\n🧪 Step 4: Quality check with sample embeddings...`);
    
    if (updatedEmbeddings.length >= 3) {
      const samples = updatedEmbeddings.slice(0, 3);
      console.log(`Testing similarity between ${samples.length} new embeddings...`);
      
      for (let i = 0; i < samples.length; i++) {
        for (let j = i + 1; j < samples.length; j++) {
          const embedding1 = JSON.parse(samples[i].embedding);
          const embedding2 = JSON.parse(samples[j].embedding);
          
          let dotProduct = 0;
          let normA = 0;
          let normB = 0;
          
          for (let k = 0; k < embedding1.length; k++) {
            dotProduct += embedding1[k] * embedding2[k];
            normA += embedding1[k] * embedding1[k];
            normB += embedding2[k] * embedding2[k];
          }
          
          const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
          console.log(`  📊 Sample ${i+1} vs Sample ${j+1}: ${similarity.toFixed(4)}`);
        }
      }
    }
    
    console.log(`\n✅ Embedding regeneration complete!`);
    console.log(`📁 Backup file: ${backupFile}`);
    console.log(`🔧 Next: Review the backup and run the update script to apply changes.`);
    
  } catch (error) {
    console.error('❌ Error during regeneration:', error);
  }
}

regenerateAllEmbeddings().catch(console.error);