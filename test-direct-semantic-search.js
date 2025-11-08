/**
 * Direct test of semantic search with sleep query
 * Using the same approach as contextual-problem-solver.js
 */

const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

class DirectSemanticTest {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.embeddingModel = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vecA, vecB) {
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

  /**
   * Pure semantic search - no keyword filtering
   */
  async directSemanticSearch(queryText, limit = 20) {
    console.log(`🔍 Testing PURE semantic search with: "${queryText}"`);
    console.log('=' .repeat(60));
    
    try {
      // 1. Generate embedding for the query text
      console.log('🧠 Generating query embedding...');
      const embeddingResponse = await this.embeddingModel.embedContent(queryText);
      const queryEmbedding = embeddingResponse.embedding.values;
      console.log(`✅ Generated embedding with ${queryEmbedding.length} dimensions`);

      // 2. Get ALL embeddings from the database (not filtered)
      console.log('📊 Fetching ALL app embeddings from database...');
      const { data: allEmbeddings, error: fetchError } = await this.supabase
        .from('new_embeddings')
        .select('app_id, embedding')
        .limit(500); // Limit for performance

      if (fetchError) {
        throw new Error(`Error fetching embeddings: ${fetchError.message}`);
      }

      console.log(`✅ Fetched ${allEmbeddings.length} app embeddings`);

      // 3. Calculate similarities for ALL apps
      console.log('🧮 Calculating cosine similarities...');
      const similarities = [];
      let processed = 0;
      
      for (const row of allEmbeddings) {
        try {
          let appEmbedding = row.embedding;
          if (typeof appEmbedding === 'string' && appEmbedding.startsWith('[')) {
            appEmbedding = JSON.parse(appEmbedding);
          }
          
          const similarity = this.cosineSimilarity(queryEmbedding, appEmbedding);
          if (!isNaN(similarity) && similarity > 0.1) { // Very low threshold
            similarities.push({ 
              app_id: row.app_id, 
              similarity
            });
          }
          processed++;
        } catch (err) {
          // Skip problematic embeddings
          console.log(`⚠️  Skipped app ${row.app_id}: ${err.message}`);
        }
      }
      
      console.log(`✅ Processed ${processed} embeddings, found ${similarities.length} with similarity > 0.1`);

      // 4. Sort by similarity and get top results
      similarities.sort((a, b) => b.similarity - a.similarity);
      const topSimilarities = similarities.slice(0, limit);

      if (topSimilarities.length === 0) {
        console.log('❌ No embeddings found with similarity > 0.1');
        return [];
      }

      // 5. Get app details for top results
      console.log('📝 Fetching app details for top results...');
      const appIds = topSimilarities.map(s => s.app_id);
      const { data: appDetails, error: detailsError } = await this.supabase
        .from('apps_unified')
        .select('id, title, developer, description, rating, icon_url, price, primary_category')
        .in('id', appIds);

      if (detailsError) {
        throw new Error(`Error fetching app details: ${detailsError.message}`);
      }

      // 6. Combine results with app details
      const results = topSimilarities.map(sim => {
        const app = appDetails.find(a => a.id === sim.app_id);
        if (!app) return null;
        
        return {
          app_id: app.id,
          title: app.title,
          developer: app.developer,
          description: app.description,
          rating: app.rating,
          icon_url: app.icon_url,
          price: app.price,
          primary_category: app.primary_category,
          similarity_score: sim.similarity,
          relevance: sim.similarity
        };
      }).filter(Boolean);

      return results;

    } catch (error) {
      console.error(`❌ Pure semantic search failed: ${error.message}`);
      throw error;
    }
  }
}

async function testDirectSemantic() {
  try {
    const tester = new DirectSemanticTest();
    
    console.log('🧪 DIRECT SEMANTIC SEARCH TEST');
    console.log('Testing query: "i cant sleep properly, maybe too much coffee or phone"');
    console.log('This bypasses ALL keyword filtering and uses PURE embeddings\n');
    
    const results = await tester.directSemanticSearch('i cant sleep properly, maybe too much coffee or phone', 15);
    
    console.log('\n' + '=' .repeat(60));
    console.log('📊 PURE SEMANTIC SEARCH RESULTS');
    console.log('=' .repeat(60));
    console.log(`Found ${results.length} apps with semantic similarity:`);
    console.log('');
    
    if (results.length > 0) {
      results.forEach((app, i) => {
        console.log(`${i+1}. ${app.title}`);
        console.log(`   Category: ${app.primary_category || 'Unknown'}`);
        console.log(`   Similarity: ${app.similarity_score.toFixed(4)}`);
        console.log(`   Rating: ${app.rating || 'N/A'}`);
        console.log(`   Description: ${(app.description || 'No description').substring(0, 80)}...`);
        console.log('');
      });
      
      // Analysis
      console.log('📈 ANALYSIS:');
      console.log('=' .repeat(40));
      
      const sleepRelated = results.filter(app => {
        const text = `${app.title} ${app.description}`.toLowerCase();
        return text.includes('sleep') || text.includes('rest') || text.includes('insomnia') || 
               text.includes('pillow') || text.includes('bedtime') || text.includes('dream');
      });
      
      const healthRelated = results.filter(app => {
        const category = (app.primary_category || '').toLowerCase();
        return category.includes('health') || category.includes('fitness') || category.includes('medical');
      });
      
      const irrelevantApps = results.filter(app => {
        const text = `${app.title} ${app.description}`.toLowerCase();
        const category = (app.primary_category || '').toLowerCase();
        return text.includes('ielts') || text.includes('exam') || text.includes('test') ||
               category.includes('game') || category.includes('education');
      });
      
      console.log(`🛌 Sleep-related apps: ${sleepRelated.length}/${results.length}`);
      console.log(`🏥 Health-related apps: ${healthRelated.length}/${results.length}`);
      console.log(`❌ Irrelevant apps: ${irrelevantApps.length}/${results.length}`);
      
      if (irrelevantApps.length > 0) {
        console.log('\n❌ Irrelevant apps found:');
        irrelevantApps.forEach(app => {
          console.log(`   - ${app.title} (${app.primary_category})`);
        });
      }
      
      if (sleepRelated.length === 0) {
        console.log('\n⚠️  WARNING: No sleep-related apps found in top results!');
        console.log('   This suggests the embeddings may not be working well for sleep queries.');
      }
      
    } else {
      console.log('❌ No results found - embeddings may not be working properly');
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

async function testSpecificSleepApps() {
  try {
    const tester = new DirectSemanticTest();
    
    console.log('\n🎯 TESTING SPECIFIC SLEEP APPS');
    console.log('=' .repeat(60));
    
    const query = 'i cant sleep properly, maybe too much coffee or phone';
    console.log(`Query: "${query}"`);
    
    // Generate query embedding
    const embeddingResponse = await tester.embeddingModel.embedContent(query);
    const queryEmbedding = embeddingResponse.embedding.values;
    
    // Get specific top-rated sleep apps
    const sleepAppTitles = [
      'Meditopia: Sleep, Meditation', 
      'Simple Habit Sleep, Meditation', 
      'Aura: Meditation & Sleep, CBT',
      'Pillow: Sleep Tracker'
    ];
    
    const { data: sleepApps } = await tester.supabase
      .from('apps_unified')
      .select('id, title, description, rating')
      .in('title', sleepAppTitles);
    
    console.log(`\nFound ${sleepApps?.length || 0} specific sleep apps:`);
    
    for (const app of sleepApps || []) {
      const { data: embeddingData } = await tester.supabase
        .from('new_embeddings')
        .select('embedding')
        .eq('app_id', app.id)
        .single();
      
      if (embeddingData) {
        let appEmbedding = embeddingData.embedding;
        if (typeof appEmbedding === 'string') {
          appEmbedding = JSON.parse(appEmbedding);
        }
        
        const similarity = tester.cosineSimilarity(queryEmbedding, appEmbedding);
        console.log(`\n📱 ${app.title}`);
        console.log(`   Similarity: ${similarity.toFixed(4)}`);
        console.log(`   Rating: ${app.rating}`);
        console.log(`   Description: ${(app.description || 'No description').substring(0, 100)}...`);
        
        if (similarity > 0.4) {
          console.log('   ✅ HIGH similarity - should be top result!');
        } else if (similarity > 0.3) {
          console.log('   🟡 MEDIUM similarity');
        } else {
          console.log('   🔴 LOW similarity - might not appear in results');
        }
      } else {
        console.log(`\n📱 ${app.title}`);
        console.log('   ❌ No embedding found');
      }
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Run both tests
testDirectSemantic().then(() => {
  return testSpecificSleepApps();
});