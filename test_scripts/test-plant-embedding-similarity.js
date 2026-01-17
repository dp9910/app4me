const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testPlantEmbeddingSimilarity() {
  try {
    console.log('🌱 Testing embedding similarity with plant/garden apps...\n');
    
    // Generate embedding for our test query
    const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const testQuery = "apps to take care of my plants at home";
    
    console.log(`Query: "${testQuery}"`);
    const result = await embeddingModel.embedContent(testQuery);
    const queryEmbedding = result.embedding.values;
    console.log(`Generated query embedding with ${queryEmbedding.length} dimensions\n`);
    
    // Get all plant/garden apps we found earlier
    const { data: plantApps, error: plantError } = await supabase
      .from('apps_unified')
      .select('id, title')
      .or('title.ilike.%plant%,title.ilike.%garden%,description.ilike.%plant%,description.ilike.%garden%');
    
    if (plantError) throw plantError;
    
    const plantAppIds = plantApps.map(app => app.id);
    console.log(`Testing ${plantAppIds.length} plant/garden apps...\n`);
    
    // Get embeddings for these apps
    const { data: embeddings, error } = await supabase
      .from('app_embeddings')
      .select(`
        app_id, 
        embedding,
        apps_unified!inner(id, title, primary_category, rating, description)
      `)
      .in('app_id', plantAppIds)
      .limit(50);
    
    if (error) throw error;
    
    console.log(`Found embeddings for ${embeddings.length} plant/garden apps\n`);
    
    // Calculate similarities
    const similarities = [];
    
    embeddings.forEach(appEmb => {
      try {
        // Parse the string embedding back to array
        const appEmbedding = JSON.parse(appEmb.embedding);
        
        if (Array.isArray(appEmbedding) && appEmbedding.length === queryEmbedding.length) {
          const similarity = calculateCosineSimilarity(queryEmbedding, appEmbedding);
          const appData = Array.isArray(appEmb.apps_unified) ? appEmb.apps_unified[0] : appEmb.apps_unified;
          
          // Categorize the app
          const title = appData.title.toLowerCase();
          const desc = appData.description?.toLowerCase() || '';
          
          let appType = 'other';
          if (title.includes('planta') || (title.includes('plant') && desc.includes('care'))) {
            appType = 'plant_care';
          } else if (title.includes('garden') && (title.includes('design') || title.includes('match') || title.includes('game'))) {
            appType = 'garden_game';
          } else if (title.includes('plant') && !title.includes('vs')) {
            appType = 'plant_related';
          } else if (title.includes('garden')) {
            appType = 'garden_related';
          }
          
          similarities.push({
            app_id: appEmb.app_id,
            title: appData.title,
            category: appData.primary_category,
            rating: appData.rating,
            similarity: similarity,
            app_type: appType,
            description: appData.description?.substring(0, 100) + '...'
          });
        }
      } catch (parseError) {
        console.log(`Failed to parse embedding for app ${appEmb.app_id}`);
      }
    });
    
    // Sort by similarity (highest first)
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    console.log('🎯 TOP 15 PLANT/GARDEN APPS BY EMBEDDING SIMILARITY:');
    console.log('='.repeat(80));
    
    similarities.slice(0, 15).forEach((app, i) => {
      const typeEmoji = {
        'plant_care': '🌱',
        'plant_related': '🪴', 
        'garden_game': '🎮',
        'garden_related': '🏡',
        'other': '❓'
      };
      
      console.log(`${i+1}. ${typeEmoji[app.app_type]} ${app.title} (${app.category}) - ${app.rating}⭐`);
      console.log(`   Similarity: ${app.similarity.toFixed(4)} | Type: ${app.app_type}`);
      console.log(`   ${app.description}`);
      console.log('');
    });
    
    // Show actual plant care apps specifically
    console.log('\n🌱 ACTUAL PLANT CARE APPS RANKING:');
    console.log('='.repeat(50));
    
    const actualPlantCare = similarities.filter(app => app.app_type === 'plant_care');
    actualPlantCare.forEach((app, i) => {
      const overallRank = similarities.findIndex(s => s.app_id === app.app_id) + 1;
      console.log(`${i+1}. ${app.title} - Similarity: ${app.similarity.toFixed(4)} (Overall rank: #${overallRank})`);
    });
    
    // Test different query variations
    console.log('\n🔄 TESTING DIFFERENT QUERY VARIATIONS:');
    console.log('='.repeat(50));
    
    const testQueries = [
      "plant care app",
      "help me take care of plants", 
      "watering schedule for houseplants",
      "plant identification and care"
    ];
    
    for (const query of testQueries) {
      const qResult = await embeddingModel.embedContent(query);
      const qEmbedding = qResult.embedding.values;
      
      // Find Planta's similarity with this query
      const plantaApp = similarities.find(app => app.title.toLowerCase().includes('planta'));
      if (plantaApp) {
        const plantaEmbedding = JSON.parse(embeddings.find(e => e.app_id === plantaApp.app_id)?.embedding);
        const plantaSim = calculateCosineSimilarity(qEmbedding, plantaEmbedding);
        console.log(`"${query}" → Planta similarity: ${plantaSim.toFixed(4)}`);
      }
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

testPlantEmbeddingSimilarity();