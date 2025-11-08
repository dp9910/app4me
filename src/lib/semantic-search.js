/**
 * Pure Semantic Search Module
 * 
 * Provides clean semantic similarity search using embeddings
 * No keyword filtering, no complex logic - just pure vector similarity
 */

const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class SemanticSearch {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.embeddingModel = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
  }

  /**
   * Pure semantic search - no filtering, just similarity ranking
   * @param {string} queryText - The search query
   * @param {object} options - Search options
   * @param {number} options.limit - Max number of results (default: 10)
   * @param {number} options.threshold - Minimum similarity threshold (default: 0.3)
   * @param {number} options.maxApps - Max apps to process (default: 1000)
   * @returns {Promise<Array>} Ranked results by similarity
   */
  async search(queryText, options = {}) {
    const {
      limit = 10,
      threshold = 0.3,
      maxApps = 1000
    } = options;

    console.log(`🔍 Semantic search: "${queryText}"`);
    console.log(`📊 Options: limit=${limit}, threshold=${threshold}, maxApps=${maxApps}`);

    try {
      // 1. Generate query embedding
      console.log('🧠 Generating query embedding...');
      const embeddingResponse = await this.embeddingModel.embedContent(queryText);
      const queryEmbedding = embeddingResponse.embedding.values;
      console.log(`✅ Generated embedding with ${queryEmbedding.length} dimensions`);

      // 2. Fetch all app embeddings (up to maxApps limit)
      console.log(`📊 Fetching up to ${maxApps} app embeddings...`);
      const { data: allEmbeddings, error: fetchError } = await this.supabase
        .from('new_embeddings')
        .select('app_id, embedding')
        .limit(maxApps);

      if (fetchError) {
        throw new Error(`Error fetching embeddings: ${fetchError.message}`);
      }

      console.log(`✅ Fetched ${allEmbeddings.length} app embeddings`);

      // 3. Calculate similarities
      console.log('🧮 Calculating cosine similarities...');
      const similarities = [];
      let processed = 0;
      let skipped = 0;
      
      for (const row of allEmbeddings) {
        try {
          let appEmbedding = row.embedding;
          if (typeof appEmbedding === 'string' && appEmbedding.startsWith('[')) {
            appEmbedding = JSON.parse(appEmbedding);
          }
          
          const similarity = this.cosineSimilarity(queryEmbedding, appEmbedding);
          if (!isNaN(similarity) && similarity >= threshold) {
            similarities.push({ 
              app_id: row.app_id, 
              similarity
            });
          }
          processed++;
        } catch (err) {
          skipped++;
          // Skip problematic embeddings
        }
      }
      
      console.log(`✅ Processed ${processed} embeddings, skipped ${skipped}, found ${similarities.length} above threshold`);

      // 4. Sort by similarity and limit results
      similarities.sort((a, b) => b.similarity - a.similarity);
      const topSimilarities = similarities.slice(0, limit);

      if (topSimilarities.length === 0) {
        console.log(`❌ No results found above threshold ${threshold}`);
        return [];
      }

      // 5. Fetch app details for top results
      console.log(`📝 Fetching app details for top ${topSimilarities.length} results...`);
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

      console.log(`✅ Returning ${results.length} semantic results`);
      
      // Log top results for debugging
      if (results.length > 0) {
        console.log('🎯 Top results:');
        results.slice(0, 3).forEach((app, i) => {
          console.log(`   ${i+1}. ${app.title} (${app.similarity_score.toFixed(4)})`);
        });
      }

      return results;

    } catch (error) {
      console.error(`❌ Semantic search failed: ${error.message}`);
      throw error;
    }
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
   * Batch search multiple queries (for testing or comparison)
   */
  async batchSearch(queries, options = {}) {
    const results = {};
    
    for (const query of queries) {
      console.log(`\n🔄 Batch searching: "${query}"`);
      try {
        results[query] = await this.search(query, options);
      } catch (error) {
        console.error(`❌ Batch search failed for "${query}": ${error.message}`);
        results[query] = [];
      }
    }
    
    return results;
  }

  /**
   * Get similarity score for a specific app and query
   */
  async getSimilarity(queryText, appId) {
    try {
      // Generate query embedding
      const embeddingResponse = await this.embeddingModel.embedContent(queryText);
      const queryEmbedding = embeddingResponse.embedding.values;

      // Get app embedding
      const { data: appEmbedding, error } = await this.supabase
        .from('new_embeddings')
        .select('embedding')
        .eq('app_id', appId)
        .single();

      if (error || !appEmbedding) {
        throw new Error(`App embedding not found for ID ${appId}`);
      }

      let embedding = appEmbedding.embedding;
      if (typeof embedding === 'string') {
        embedding = JSON.parse(embedding);
      }

      return this.cosineSimilarity(queryEmbedding, embedding);

    } catch (error) {
      console.error(`Error calculating similarity for app ${appId}:`, error.message);
      return 0;
    }
  }
}

module.exports = SemanticSearch;