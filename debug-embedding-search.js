const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

async function debugEmbeddingSearch() {
  try {
    console.log('🔍 Debug: Testing embedding search implementation...\n');
    
    const testQuery = "apps to take care of my plants at home";
    console.log(`Query: "${testQuery}"`);
    
    // Generate query embedding
    const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const embResult = await embeddingModel.embedContent(testQuery);
    const queryEmbedding = embResult.embedding.values;
    
    console.log(`Query embedding generated: ${queryEmbedding.length} dimensions\n`);
    
    // Get some embeddings to test with
    const { data: embeddingMatches, error: embError } = await supabase
      .from('app_embeddings')
      .select(`
        app_id,
        embedding,
        apps_unified!inner(
          id,
          title,
          primary_category,
          rating,
          icon_url,
          description
        )
      `)
      .limit(50);
    
    if (embError) throw embError;
    
    console.log(`Testing with ${embeddingMatches.length} apps...\n`);
    
    const similarities = [];
    
    embeddingMatches.forEach(embMatch => {
      try {
        const appData = Array.isArray(embMatch.apps_unified) ? embMatch.apps_unified[0] : embMatch.apps_unified;
        const appEmbedding = JSON.parse(embMatch.embedding);
        
        if (Array.isArray(appEmbedding) && appEmbedding.length === queryEmbedding.length) {
          const similarity = calculateCosineSimilarity(queryEmbedding, appEmbedding);
          
          similarities.push({
            app_id: embMatch.app_id,
            title: appData.title,
            category: appData.primary_category,
            rating: appData.rating,
            similarity: similarity,
            relevance_score: similarity * 6, // Same scoring as implementation
            meets_threshold: similarity > 0.4
          });
        }
      } catch (parseError) {
        console.log(`Failed to parse embedding for app ${embMatch.app_id}`);
      }
    });
    
    // Sort by similarity
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    console.log('📊 TOP 10 EMBEDDING MATCHES:');
    console.log('='.repeat(70));
    similarities.slice(0, 10).forEach((app, i) => {
      const threshold = app.meets_threshold ? '✅' : '❌';
      console.log(`${i+1}. ${threshold} ${app.title} (${app.category}) - ${app.rating}⭐`);
      console.log(`   Similarity: ${app.similarity.toFixed(4)} | Score: ${app.relevance_score.toFixed(2)}`);
    });
    
    console.log(`\n🎯 Apps meeting threshold (>0.4): ${similarities.filter(s => s.meets_threshold).length}`);
    
    // Check for specific apps we expect
    const expectedApps = ['Eden', 'Flora', 'B-hyve', 'Planta'];
    console.log('\n🔍 EXPECTED APPS CHECK:');
    expectedApps.forEach(expected => {
      const found = similarities.find(s => s.title.toLowerCase().includes(expected.toLowerCase()));
      if (found) {
        console.log(`✅ ${expected}: ${found.similarity.toFixed(4)} (${found.meets_threshold ? 'above' : 'below'} threshold)`);
      } else {
        console.log(`❌ ${expected}: Not found in test set`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugEmbeddingSearch();