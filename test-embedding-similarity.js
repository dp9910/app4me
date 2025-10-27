const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testEmbeddingSimilarity() {
  try {
    console.log('🧠 Testing embedding-based similarity search...\n');
    
    // Generate embedding for our test query
    const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const testQuery = "apps to take care of my plants at home";
    
    console.log(`Query: "${testQuery}"`);
    const result = await embeddingModel.embedContent(testQuery);
    const queryEmbedding = result.embedding.values;
    console.log(`Generated query embedding with ${queryEmbedding.length} dimensions\n`);
    
    // Get embeddings for our known plant apps and some random apps for comparison
    const { data: embeddings, error } = await supabase
      .from('app_embeddings')
      .select(`
        app_id, 
        embedding,
        apps_unified!inner(id, title, primary_category, rating, description)
      `)
      .limit(50); // Test with first 50 apps
    
    if (error) throw error;
    
    console.log(`Testing similarity with ${embeddings.length} apps...\n`);
    
    // Calculate similarities
    const similarities = [];
    
    embeddings.forEach(appEmb => {
      try {
        // Parse the string embedding back to array
        const appEmbedding = JSON.parse(appEmb.embedding);
        
        if (Array.isArray(appEmbedding) && appEmbedding.length === queryEmbedding.length) {
          const similarity = calculateCosineSimilarity(queryEmbedding, appEmbedding);
          const appData = Array.isArray(appEmb.apps_unified) ? appEmb.apps_unified[0] : appEmb.apps_unified;
          
          similarities.push({
            app_id: appEmb.app_id,
            title: appData.title,
            category: appData.primary_category,
            rating: appData.rating,
            similarity: similarity,
            description: appData.description?.substring(0, 100) + '...'
          });
        }
      } catch (parseError) {
        console.log(`Failed to parse embedding for app ${appEmb.app_id}`);
      }
    });
    
    // Sort by similarity (highest first)
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    console.log('🎯 TOP 10 MOST SIMILAR APPS:');
    console.log('='.repeat(70));
    
    similarities.slice(0, 10).forEach((app, i) => {
      console.log(`${i+1}. ${app.title} (${app.category}) - ${app.rating}⭐`);
      console.log(`   Similarity: ${app.similarity.toFixed(4)}`);
      console.log(`   ${app.description}`);
      console.log('');
    });
    
    // Show plant-related apps specifically
    console.log('\n🌱 PLANT-RELATED APPS IN RESULTS:');
    console.log('='.repeat(50));
    
    const plantRelated = similarities.filter(app => 
      app.title.toLowerCase().includes('plant') || 
      app.title.toLowerCase().includes('garden') ||
      app.description.toLowerCase().includes('plant') ||
      app.description.toLowerCase().includes('garden')
    );
    
    plantRelated.slice(0, 5).forEach((app, i) => {
      console.log(`${i+1}. ${app.title} - Similarity: ${app.similarity.toFixed(4)}`);
    });
    
    // Compare with current search results
    console.log('\n📊 COMPARISON WITH CURRENT SEARCH:');
    console.log('Current #1: Planta: Plant & Garden Care');
    const plantaApp = similarities.find(app => app.title.toLowerCase().includes('planta'));
    if (plantaApp) {
      console.log(`Planta embedding similarity: ${plantaApp.similarity.toFixed(4)}`);
      const rank = similarities.findIndex(app => app.app_id === plantaApp.app_id) + 1;
      console.log(`Planta would rank #${rank} in pure embedding search`);
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

testEmbeddingSimilarity();