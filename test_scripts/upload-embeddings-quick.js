const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function uploadEmbeddings() {
  try {
    console.log('🚀 Starting embedding upload...');
    
    // Read the iTunes embeddings file (largest one)
    const embeddingFile = 'data-scraping/features-output/embeddings/itunes_app_embeddings.jsonl';
    console.log('📖 Reading embedding file:', embeddingFile);
    
    const lines = fs.readFileSync(embeddingFile, 'utf-8').split('\n').filter(line => line.trim());
    console.log(`📊 Found ${lines.length} embeddings to upload`);
    
    // Process in batches
    const BATCH_SIZE = 100;
    let uploaded = 0;
    
    for (let i = 0; i < lines.length; i += BATCH_SIZE) {
      const batch = lines.slice(i, i + BATCH_SIZE);
      const embeddings = [];
      
      for (const line of batch) {
        try {
          const data = JSON.parse(line);
          
          // Convert embedding array to proper format
          embeddings.push({
            app_id: data.app_id,
            embedding: JSON.stringify(data.embedding), // Store as JSON string
            embedding_model: 'text-embedding-004',
            text_used: data.text_used || data.combined_text,
            token_count: data.token_count
          });
        } catch (parseError) {
          console.warn('⚠️ Skipping invalid line:', parseError.message);
        }
      }
      
      if (embeddings.length > 0) {
        const { data, error } = await supabase
          .from('app_embeddings')
          .upsert(embeddings, { onConflict: 'app_id' });
        
        if (error) {
          console.error(`❌ Batch upload error:`, error.message);
          continue;
        }
        
        uploaded += embeddings.length;
        console.log(`✅ Uploaded batch ${Math.floor(i/BATCH_SIZE) + 1}: ${uploaded}/${lines.length} embeddings`);
      }
      
      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`🎉 Upload complete! Uploaded ${uploaded} embeddings`);
    
  } catch (error) {
    console.error('❌ Upload failed:', error);
  }
}

uploadEmbeddings();