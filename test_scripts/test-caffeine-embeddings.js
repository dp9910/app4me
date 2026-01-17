/**
 * Test Caffeine App Embeddings and Similarity Calculation
 */

const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testCaffeineEmbeddings() {
  console.log('🧪 === TESTING CAFFEINE APP EMBEDDINGS ===\n');
  
  // Get embeddings for caffeine apps
  console.log('🔍 Fetching caffeine apps with embeddings...');
  const { data: caffeineEmbeddings, error } = await supabase
    .from('app_embeddings')
    .select(`
      app_id,
      embedding,
      apps_unified!inner(
        id,
        title,
        primary_category,
        description
      )
    `)
    .in('apps_unified.title', [
      'HiCoffee - Caffeine Tracker',
      'Caffeine App - Track Caffeine', 
      'Caffi - Caffeine Tracker',
      'Caffeine Clock: Track Caffeine'
    ]);
  
  if (error) {
    console.error('❌ Error fetching embeddings:', error);
    return;
  }
  
  console.log(`📊 Found ${caffeineEmbeddings?.length || 0} caffeine apps with embeddings`);
  
  if (!caffeineEmbeddings || caffeineEmbeddings.length === 0) {
    console.log('⚠️ No caffeine apps have embeddings!');
    
    // Check if any caffeine apps exist at all
    const { data: allCaffeineApps } = await supabase
      .from('apps_unified')
      .select('id, title')
      .ilike('title', '%caffeine%');
    
    console.log(`📱 Total caffeine apps in database: ${allCaffeineApps?.length || 0}`);
    
    return;
  }
  
  // Generate query embedding
  console.log('\n🔢 Generating query embedding...');
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const queryResult = await model.embedContent('help me track my caffeine intake');
  const queryEmbedding = queryResult.embedding.values;
  
  console.log(`Query embedding dimensions: ${queryEmbedding.length}`);
  console.log(`Query embedding sample: [${queryEmbedding.slice(0, 5).map(x => x.toFixed(4)).join(', ')}...]`);
  
  // Test similarity with each caffeine app
  console.log('\n🎯 Testing similarity with caffeine apps:');
  
  caffeineEmbeddings.forEach((item, index) => {
    const app = Array.isArray(item.apps_unified) ? item.apps_unified[0] : item.apps_unified;
    const appEmbedding = JSON.parse(item.embedding);
    
    console.log(`\n${index + 1}. App: ${app.title}`);
    console.log(`   Category: ${app.primary_category}`);
    console.log(`   App embedding dimensions: ${appEmbedding.length}`);
    console.log(`   App embedding sample: [${appEmbedding.slice(0, 5).map(x => x.toFixed(4)).join(', ')}...]`);
    
    if (queryEmbedding.length !== appEmbedding.length) {
      console.log(`   ❌ Dimension mismatch! Query: ${queryEmbedding.length}, App: ${appEmbedding.length}`);
      return;
    }
    
    // Calculate cosine similarity
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    
    for (let i = 0; i < queryEmbedding.length; i++) {
      dotProduct += queryEmbedding[i] * appEmbedding[i];
      magnitudeA += queryEmbedding[i] * queryEmbedding[i];
      magnitudeB += appEmbedding[i] * appEmbedding[i];
    }
    
    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);
    
    const similarity = dotProduct / (magnitudeA * magnitudeB);
    
    console.log(`   🧠 Cosine Similarity: ${similarity.toFixed(6)} (${(similarity * 100).toFixed(2)}%)`);
    console.log(`   📊 Dot Product: ${dotProduct.toFixed(6)}`);
    console.log(`   📏 Query Magnitude: ${magnitudeA.toFixed(6)}`);
    console.log(`   📏 App Magnitude: ${magnitudeB.toFixed(6)}`);
    
    if (app.description) {
      console.log(`   📖 Description: ${app.description.substring(0, 100)}...`);
    }
    
    // Determine if this would be above our threshold
    const threshold = 0.4;
    if (similarity > threshold) {
      console.log(`   ✅ ABOVE THRESHOLD (${threshold})`);
    } else {
      console.log(`   ❌ Below threshold (${threshold})`);
    }
  });
  
  console.log('\n🔬 Analysis:');
  if (caffeineEmbeddings.length > 0) {
    const similarities = caffeineEmbeddings.map(item => {
      const appEmbedding = JSON.parse(item.embedding);
      let dotProduct = 0;
      let magnitudeA = 0;
      let magnitudeB = 0;
      
      for (let i = 0; i < queryEmbedding.length; i++) {
        dotProduct += queryEmbedding[i] * appEmbedding[i];
        magnitudeA += queryEmbedding[i] * queryEmbedding[i];
        magnitudeB += appEmbedding[i] * appEmbedding[i];
      }
      
      return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
    });
    
    const maxSim = Math.max(...similarities);
    const minSim = Math.min(...similarities);
    const avgSim = similarities.reduce((a, b) => a + b, 0) / similarities.length;
    
    console.log(`   Max similarity: ${maxSim.toFixed(6)}`);
    console.log(`   Min similarity: ${minSim.toFixed(6)}`);
    console.log(`   Average similarity: ${avgSim.toFixed(6)}`);
    console.log(`   Current threshold: 0.4`);
    
    if (maxSim < 0.4) {
      console.log(`   🚨 ISSUE: Even the most similar caffeine app is below our threshold!`);
      console.log(`   💡 Suggested actions:`);
      console.log(`      • Lower threshold to ${(maxSim * 1.1).toFixed(3)} or below`);
      console.log(`      • Check if embeddings were generated correctly`);
      console.log(`      • Verify Gemini model consistency`);
    }
  }
}

if (require.main === module) {
  testCaffeineEmbeddings().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

module.exports = { testCaffeineEmbeddings };