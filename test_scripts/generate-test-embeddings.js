/**
 * Generate Test Embeddings with Improved Natural Language Format
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

async function generateTestEmbeddings() {
  console.log('🔢 === GENERATING TEST EMBEDDINGS ===\n');
  
  try {
    // Load test apps
    const testData = JSON.parse(fs.readFileSync('test-apps-selection.json', 'utf8'));
    const allTestApps = [...testData.coffee_apps, ...testData.random_apps];
    
    console.log(`📋 Generating embeddings for ${allTestApps.length} test apps...`);
    console.log(`☕ Coffee apps: ${testData.coffee_apps.length}`);
    console.log(`🎲 Random apps: ${testData.random_apps.length}`);
    
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const generatedEmbeddings = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < allTestApps.length; i++) {
      const app = allTestApps[i];
      console.log(`\n[${i + 1}/${allTestApps.length}] Processing: ${app.title}`);
      
      try {
        // Create natural language embedding text (improved format)
        const embeddingText = createNaturalEmbeddingText(app);
        console.log(`  📝 Text: "${embeddingText.substring(0, 100)}..."`);
        
        // Generate embedding
        const result = await model.embedContent(embeddingText);
        const embedding = result.embedding.values;
        
        console.log(`  ✅ Generated embedding: ${embedding.length} dimensions`);
        
        // Prepare record for database
        const embeddingRecord = {
          app_id: app.id,
          embedding: JSON.stringify(embedding), // Store as JSON for now
          embedding_text: embeddingText,
          embedding_model: 'text-embedding-004',
          format_version: 'v2_natural',
          token_count: Math.ceil(embeddingText.length / 4), // Rough estimate
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        generatedEmbeddings.push(embeddingRecord);
        successCount++;
        
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`  ❌ Failed: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Generation Summary:`);
    console.log(`  ✅ Successful: ${successCount}`);
    console.log(`  ❌ Failed: ${errorCount}`);
    console.log(`  📈 Success rate: ${Math.round(successCount/(successCount+errorCount)*100)}%`);
    
    if (generatedEmbeddings.length === 0) {
      console.log('❌ No embeddings generated, stopping.');
      return;
    }
    
    // Save embeddings locally first
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `test-embeddings-${timestamp}.json`;
    
    const backupData = {
      timestamp: new Date().toISOString(),
      format_version: 'v2_natural',
      model_used: 'text-embedding-004',
      total_generated: generatedEmbeddings.length,
      coffee_apps_count: testData.coffee_apps.length,
      random_apps_count: testData.random_apps.length,
      embedding_format: 'title. description. Category: category',
      embeddings: generatedEmbeddings
    };
    
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`\n💾 Embeddings saved locally: ${backupFile}`);
    
    // Try to save to new_embeddings table (if it exists)
    console.log(`\n💾 Attempting to save to new_embeddings table...`);
    
    // Note: Since we can't use vector type directly, we'll save as JSON and convert later
    for (let i = 0; i < generatedEmbeddings.length; i++) {
      const embedding = generatedEmbeddings[i];
      
      try {
        const { data, error } = await supabase
          .from('new_embeddings')
          .insert({
            app_id: embedding.app_id,
            embedding: embedding.embedding, // JSON string for now
            embedding_text: embedding.embedding_text,
            embedding_model: embedding.embedding_model,
            format_version: embedding.format_version,
            token_count: embedding.token_count
          });
          
        if (error) {
          console.log(`  ⚠️ Database insert failed (table may not exist): ${error.message}`);
          break;
        } else {
          console.log(`  ✅ Saved embedding ${i + 1}/${generatedEmbeddings.length}`);
        }
      } catch (err) {
        console.log(`  ⚠️ Database error: ${err.message}`);
        break;
      }
    }
    
    console.log(`\n🎯 Next Steps:`);
    console.log(`1. Ensure new_embeddings table is created in Supabase`);
    console.log(`2. Update search algorithm to use new_embeddings table`);
    console.log(`3. Test semantic search with 'caffeine tracker' query`);
    console.log(`4. Verify coffee apps are found via semantic similarity`);
    
    console.log(`\n📋 Test Apps Generated:`);
    console.log(`☕ Coffee Apps (should match 'caffeine tracker' semantically):`);
    testData.coffee_apps.slice(0, 5).forEach((app, i) => {
      console.log(`   ${i+1}. ${app.title}`);
    });
    
    return generatedEmbeddings;
    
  } catch (error) {
    console.error('❌ Error during embedding generation:', error);
  }
}

function createNaturalEmbeddingText(app) {
  // Create natural language text that flows well
  // Format: "Title. Description. Category: CategoryName"
  
  const title = app.title || '';
  const description = (app.description || '').replace(/\\n/g, ' ').trim();
  const category = app.primary_category || 'Mobile App';
  
  // Clean up description - take first sentence or 200 chars
  let cleanDescription = description;
  if (cleanDescription.length > 200) {
    const sentences = cleanDescription.split(/[.!?]+/);
    cleanDescription = sentences[0] + (sentences[0].endsWith('.') ? '' : '.');
  }
  
  // Create natural language format
  const embeddingText = `${title}. ${cleanDescription} Category: ${category}`.slice(0, 1000);
  
  return embeddingText;
}

generateTestEmbeddings().catch(console.error);