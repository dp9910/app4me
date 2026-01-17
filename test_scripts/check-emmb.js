
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

async function checkEmbeddingSearch() {
  console.log('🧪 Testing Embedding and Similarity Search...');

  try {
    // Initialize clients
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });

    // Test query
    const queryText = "cant sleep, too much cofee";
    console.log(`🔍 Query: "${queryText}"`);

    // 1. Generate embedding for the query
    console.log('🧠 Generating embedding...');
    const embeddingResponse = await embeddingModel.embedContent(queryText);
    const queryEmbedding = embeddingResponse.embedding.values;
    console.log('Embedding generated successfully.');

    // 2. Get all embeddings and calculate similarity in JavaScript
    console.log('🔍 Fetching embeddings for similarity calculation...');
    const { data: allEmbeddings, error: fetchError } = await supabase
      .from('new_embeddings')
      .select('app_id, embedding');

    if (fetchError) {
      throw new Error(`Error fetching embeddings: ${fetchError.message}`);
    }

    console.log(`📊 Fetched ${allEmbeddings.length} embeddings`);

    // 3. Calculate similarities in JavaScript
    const similarities = [];
    for (const row of allEmbeddings) {
      try {
        let appEmbedding = row.embedding;
        if (typeof appEmbedding === 'string' && appEmbedding.startsWith('[')) {
          appEmbedding = JSON.parse(appEmbedding);
        }
        
        const similarity = cosineSimilarity(queryEmbedding, appEmbedding);
        if (!isNaN(similarity) && similarity > 0.1) {
          similarities.push({ app_id: row.app_id, similarity });
        }
      } catch (err) {
        // Skip problematic embeddings
      }
    }

    // 4. Sort by similarity and get top results
    similarities.sort((a, b) => b.similarity - a.similarity);
    const topSimilarities = similarities.slice(0, 5);

    // 5. Get app details for results
    if (topSimilarities.length > 0) {
      const appIds = topSimilarities.map(s => s.app_id);
      const { data: appDetails, error: detailsError } = await supabase
        .from('apps_unified')
        .select('id, title, developer, description, rating, primary_category')
        .in('id', appIds);

      if (detailsError) {
        throw new Error(`Error fetching app details: ${detailsError.message}`);
      }

      const similarApps = topSimilarities.map(sim => {
        const app = appDetails.find(a => a.id === sim.app_id);
        return { ...app, similarity_score: sim.similarity };
      });

      console.log('✅ Found similar apps:');
      similarApps.forEach((app, index) => {
        console.log(`${index + 1}. ${app.title} (${app.similarity_score.toFixed(3)})`);
        console.log(`   Developer: ${app.developer}`);
        console.log(`   Rating: ${app.rating}`);
      });
    } else {
      console.log('⚠️ No similar apps found.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Cosine similarity calculation
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

checkEmbeddingSearch();
