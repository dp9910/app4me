/**
 * Test the Fixed Embedding Format
 */
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testFixedEmbeddings() {
  console.log('🔍 === TESTING FIXED EMBEDDING FORMAT ===\n');
  
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    
    // Test queries
    const testQueries = [
      "help me track my caffeine intake",
      "split expenses with friends",
      "meditation and mindfulness app"
    ];
    
    for (const userQuery of testQueries) {
      console.log(`🎯 Testing: "${userQuery}"`);
      
      // Generate embedding using the new format (matching search_pd.js)
      const expandedQuery = `${userQuery} mobile app application ${userQuery} description features functionality`.slice(0, 1000);
      console.log(`📝 Expanded: "${expandedQuery}"`);
      
      const result = await model.embedContent(expandedQuery);
      const queryEmbedding = result.embedding.values;
      
      console.log(`✅ Generated embedding: ${queryEmbedding.length} dimensions`);
      
      // Get some sample stored embeddings for comparison
      const { data: sampleApps, error } = await supabase
        .from('app_embeddings')
        .select(`
          app_id,
          embedding,
          apps_unified!inner(title, description, primary_category)
        `)
        .limit(20);
        
      if (error) {
        console.error('❌ Error fetching embeddings:', error);
        continue;
      }
      
      console.log(`📊 Comparing against ${sampleApps.length} stored embeddings...`);
      
      let bestSimilarity = 0;
      let bestMatch = null;
      let matchesAbove30 = 0;
      let matchesAbove40 = 0;
      
      for (const app of sampleApps) {
        try {
          const appEmbedding = JSON.parse(app.embedding);
          
          if (queryEmbedding.length !== appEmbedding.length) continue;
          
          // Calculate cosine similarity
          let dotProduct = 0;
          let normA = 0;
          let normB = 0;
          
          for (let i = 0; i < queryEmbedding.length; i++) {
            dotProduct += queryEmbedding[i] * appEmbedding[i];
            normA += queryEmbedding[i] * queryEmbedding[i];
            normB += appEmbedding[i] * appEmbedding[i];
          }
          
          const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
          
          if (similarity > bestSimilarity) {
            bestSimilarity = similarity;
            bestMatch = app.apps_unified.title;
          }
          
          if (similarity > 0.3) {
            matchesAbove30++;
            console.log(`  📱 ${app.apps_unified.title}: ${similarity.toFixed(4)} (${app.apps_unified.primary_category})`);
          }
          
          if (similarity > 0.4) {
            matchesAbove40++;
          }
          
        } catch (err) {
          // Skip problematic embeddings
        }
      }
      
      console.log(`📈 Results:`);
      console.log(`   Best match: ${bestMatch} (${bestSimilarity.toFixed(4)})`);
      console.log(`   Matches > 0.3: ${matchesAbove30}`);
      console.log(`   Matches > 0.4: ${matchesAbove40}`);
      
      if (matchesAbove40 > 0) {
        console.log(`   ✅ SUCCESS! Found matches above 0.4 threshold`);
      } else if (matchesAbove30 > 0) {
        console.log(`   🔶 PARTIAL: Found matches above 0.3, consider lowering threshold`);
      } else {
        console.log(`   ❌ ISSUE: No matches above 0.3, format still not compatible`);
      }
      
      console.log('');
    }
    
    // Test with a stored embedding's original format
    console.log('🔍 Testing reverse compatibility...');
    const { data: testApp, error: testError } = await supabase
      .from('app_embeddings')
      .select(`
        app_id,
        embedding,
        apps_unified!inner(title, description, primary_category, developer)
      `)
      .limit(1)
      .single();
      
    if (!testError && testApp) {
      const app = testApp.apps_unified;
      
      // Generate embedding using EXACT original format from search_pd.js
      const originalFormat = `${app.title} ${app.developer} ${app.primary_category} ${app.description}`.slice(0, 1000);
      console.log(`📝 Original format: "${originalFormat.substring(0, 100)}..."`);
      
      const originalResult = await model.embedContent(originalFormat);
      const originalEmbedding = originalResult.embedding.values;
      
      // Compare to stored embedding
      const storedEmbedding = JSON.parse(testApp.embedding);
      
      // Calculate similarity between original format and stored
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;
      
      for (let i = 0; i < originalEmbedding.length; i++) {
        dotProduct += originalEmbedding[i] * storedEmbedding[i];
        normA += originalEmbedding[i] * originalEmbedding[i];
        normB += storedEmbedding[i] * storedEmbedding[i];
      }
      
      const compatibility = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
      console.log(`🔄 Format compatibility: ${compatibility.toFixed(4)}`);
      
      if (compatibility > 0.9) {
        console.log(`✅ EXCELLENT: Embeddings are highly compatible`);
      } else if (compatibility > 0.8) {
        console.log(`🔶 GOOD: Embeddings are reasonably compatible`);
      } else {
        console.log(`❌ POOR: Embeddings may have model version differences`);
      }
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

testFixedEmbeddings().catch(console.error);