const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function exploreEmbeddings() {
  try {
    console.log('🔍 Exploring app_embeddings table structure...\n');
    
    // Get table structure
    const { data: sample, error: sampleError } = await supabase
      .from('app_embeddings')
      .select('*')
      .limit(3);
    
    if (sampleError) throw sampleError;
    
    if (sample.length > 0) {
      console.log('📊 app_embeddings table columns:');
      console.log(Object.keys(sample[0]).join(', '));
      console.log('\n' + '='.repeat(60) + '\n');
      
      console.log('🔢 Sample embedding data:');
      sample.forEach((row, i) => {
        console.log(`${i+1}. App ID: ${row.app_id}`);
        if (row.embedding) {
          if (Array.isArray(row.embedding)) {
            console.log(`   Embedding: Array with ${row.embedding.length} dimensions`);
            console.log(`   First 5 values: [${row.embedding.slice(0, 5).map(n => n.toFixed(4)).join(', ')}...]`);
          } else {
            console.log(`   Embedding type: ${typeof row.embedding}`);
            console.log(`   Embedding: ${JSON.stringify(row.embedding).substring(0, 100)}...`);
          }
        }
        console.log('');
      });
    }
    
    // Get total count
    const { count, error: countError } = await supabase
      .from('app_embeddings')
      .select('*', { count: 'exact', head: true });
    
    if (!countError) {
      console.log(`📊 Total embeddings: ${count}`);
    }
    
    // Check embeddings for our known plant apps
    console.log('\n🌱 Checking embeddings for plant care apps...');
    const plantAppIds = [5601, 7134, 2601, 4800, 5396]; // Our known plant apps
    
    const { data: plantEmbeddings, error: plantError } = await supabase
      .from('app_embeddings')
      .select('app_id, embedding')
      .in('app_id', plantAppIds);
    
    if (!plantError) {
      console.log(`Found embeddings for ${plantEmbeddings.length} plant apps:`);
      plantEmbeddings.forEach(emb => {
        const dimensions = Array.isArray(emb.embedding) ? emb.embedding.length : 'unknown';
        console.log(`- App ID ${emb.app_id}: ${dimensions} dimensions`);
      });
    }
    
    // Test embedding generation for a query
    console.log('\n🧠 Testing query embedding generation...');
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    
    const testQuery = "apps to take care of my plants at home";
    console.log(`Query: "${testQuery}"`);
    
    try {
      const result = await embeddingModel.embedContent(testQuery);
      const queryEmbedding = result.embedding.values;
      console.log(`Query embedding: ${queryEmbedding.length} dimensions`);
      console.log(`First 5 values: [${queryEmbedding.slice(0, 5).map(n => n.toFixed(4)).join(', ')}...]`);
      
      // Test similarity with one plant app
      if (plantEmbeddings.length > 0) {
        const plantEmb = plantEmbeddings[0].embedding;
        if (Array.isArray(plantEmb) && plantEmb.length === queryEmbedding.length) {
          const similarity = calculateCosineSimilarity(queryEmbedding, plantEmb);
          console.log(`\nSimilarity with App ID ${plantEmbeddings[0].app_id}: ${similarity.toFixed(4)}`);
        }
      }
      
    } catch (embError) {
      console.log('Failed to generate query embedding:', embError.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

function calculateCosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (normA * normB);
}

exploreEmbeddings();