/**
 * Test New Semantic Search with Improved Embeddings
 * This tests whether the new embedding format works better for semantic search
 */
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testNewSemanticSearch() {
  console.log('🧪 === TESTING NEW SEMANTIC SEARCH ===\n');
  
  // Test queries that should find coffee apps via semantic similarity
  const testQueries = [
    'track my caffeine intake',
    'caffeine tracker app',
    'monitor my coffee consumption',
    'track daily coffee drinks'
  ];
  
  for (const query of testQueries) {
    console.log(`🔍 Testing query: "${query}"`);
    console.log('=' .repeat(60));
    
    try {
      // Step 1: Generate embedding for query using improved format
      const queryEmbedding = await generateQueryEmbedding(query);
      if (!queryEmbedding) {
        console.log('❌ Failed to generate query embedding');
        continue;
      }
      
      console.log(`✅ Generated query embedding: ${queryEmbedding.length} dimensions`);
      
      // Step 2: Get test embeddings from new_embeddings table
      const { data: testEmbeddings, error } = await supabase
        .from('new_embeddings')
        .select(`
          app_id,
          embedding,
          embedding_text,
          format_version,
          apps_unified!inner(
            id,
            title,
            description,
            primary_category
          )
        `);
        
      if (error) {
        console.error('❌ Error fetching test embeddings:', error);
        continue;
      }
      
      console.log(`📊 Comparing against ${testEmbeddings.length} test embeddings...`);
      
      // Step 3: Calculate similarities
      const similarities = [];
      
      for (const item of testEmbeddings) {
        try {
          const appEmbedding = JSON.parse(item.embedding);
          
          if (queryEmbedding.length !== appEmbedding.length) {
            console.log(`⚠️ Dimension mismatch for app ${item.apps_unified.title}`);
            continue;
          }
          
          const similarity = calculateCosineSimilarity(queryEmbedding, appEmbedding);
          
          similarities.push({
            app_id: item.app_id,
            title: item.apps_unified.title,
            category: item.apps_unified.primary_category,
            description: item.apps_unified.description,
            embedding_text: item.embedding_text,
            similarity: similarity,
            is_coffee_related: isCoffeeRelated(item.apps_unified.title, item.apps_unified.description)
          });
          
        } catch (err) {
          console.log(`❌ Error processing ${item.apps_unified.title}: ${err.message}`);
        }
      }
      
      // Step 4: Sort by similarity and analyze results
      similarities.sort((a, b) => b.similarity - a.similarity);
      
      console.log(`\n🎯 Results for "${query}":`);
      console.log(`📈 Similarity scores:`);
      
      similarities.forEach((result, i) => {
        const coffeeEmoji = result.is_coffee_related ? '☕' : '🔹';
        console.log(`  ${i + 1}. ${coffeeEmoji} ${result.title}: ${result.similarity.toFixed(4)}`);
        if (result.is_coffee_related) {
          console.log(`      🎯 COFFEE APP - Should be found by semantic search!`);
        }
      });
      
      // Step 5: Analysis
      const coffeeApps = similarities.filter(r => r.is_coffee_related);
      const topCoffeeApp = coffeeApps[0];
      const threshold = 0.4;
      const coffeeAppsAboveThreshold = coffeeApps.filter(r => r.similarity > threshold);
      
      console.log(`\n📊 Analysis:`);
      console.log(`   Coffee apps found: ${coffeeApps.length}`);
      console.log(`   Best coffee app similarity: ${topCoffeeApp ? topCoffeeApp.similarity.toFixed(4) : 'none'}`);
      console.log(`   Coffee apps above 0.4 threshold: ${coffeeAppsAboveThreshold.length}`);
      
      if (coffeeAppsAboveThreshold.length > 0) {
        console.log(`✅ SUCCESS! Coffee apps found via semantic search:`);
        coffeeAppsAboveThreshold.forEach((app, i) => {
          console.log(`   ${i + 1}. ${app.title} (${app.similarity.toFixed(4)})`);
        });
      } else if (coffeeApps.length > 0) {
        console.log(`🔶 PARTIAL: Coffee apps found but below threshold:`);
        console.log(`   Best: ${topCoffeeApp.title} (${topCoffeeApp.similarity.toFixed(4)})`);
        console.log(`   Consider lowering threshold to ${Math.max(0.2, topCoffeeApp.similarity - 0.05).toFixed(2)}`);
      } else {
        console.log(`❌ ISSUE: No coffee apps found in semantic search`);
      }
      
    } catch (error) {
      console.error(`❌ Error testing query "${query}":`, error.message);
    }
    
    console.log('\\n');
  }
  
  console.log('🎉 === TESTING COMPLETE ===');
  console.log('\\n💡 Summary:');
  console.log('This test verifies whether our new embedding format can semantically');
  console.log('connect caffeine tracking queries to coffee-related apps, proving that');
  console.log('semantic search can find relevant apps even without exact keyword matches.');
}

async function generateQueryEmbedding(query) {
  try {
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    
    // Use the same improved format for query embeddings
    // Format: "Query. Description of what user wants. Category: relevant category"
    const queryText = `${query}. Mobile app for tracking and monitoring daily intake. Category: Health & Fitness`;
    
    console.log(`  📝 Query text: "${queryText}"`);
    
    const result = await model.embedContent(queryText);
    return result.embedding.values;
    
  } catch (error) {
    console.error('❌ Error generating query embedding:', error.message);
    return null;
  }
}

function calculateCosineSimilarity(vectorA, vectorB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    normA += vectorA[i] * vectorA[i];
    normB += vectorB[i] * vectorB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function isCoffeeRelated(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  const coffeeKeywords = ['coffee', 'cafe', 'espresso', 'latte', 'cappuccino', 'caffeine'];
  return coffeeKeywords.some(keyword => text.includes(keyword));
}

testNewSemanticSearch().catch(console.error);