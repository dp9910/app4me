/**
 * ENHANCED STATE-OF-ART SEARCH WITH SEMANTIC SEARCH
 * Example: Adding vector similarity search to existing algorithm
 */

const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

class EnhancedStateOfArtSearch {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    this.openai = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY,
    });
  }

  /**
   * NEW: Generate query embedding for semantic search
   */
  async generateQueryEmbedding(userQuery) {
    console.log(`🔢 Generating embedding for: "${userQuery}"`);
    
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: userQuery,
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('❌ Embedding generation failed:', error);
      return null;
    }
  }

  /**
   * NEW: Semantic search using vector similarity
   */
  async performSemanticSearch(userQuery, intent, limit = 20) {
    console.log('\n🧠 Performing semantic search...');
    
    try {
      // Generate embedding for user query
      const queryEmbedding = await this.generateQueryEmbedding(userQuery);
      if (!queryEmbedding) return [];

      // Use Supabase's vector similarity search
      // This searches the app_embeddings table for apps with similar meanings
      const { data: semanticMatches, error } = await this.supabase.rpc(
        'match_apps_semantic',
        {
          query_embedding: queryEmbedding,
          match_threshold: 0.7, // Similarity threshold (0-1)
          match_count: limit
        }
      );

      if (error) {
        console.error('❌ Semantic search error:', error);
        return [];
      }

      console.log(`🎯 Found ${semanticMatches?.length || 0} semantic matches`);

      // Convert to standardized format and add semantic scoring
      return (semanticMatches || []).map(match => ({
        id: match.app_id,
        title: match.app_name,
        primary_category: match.category,
        rating: match.rating,
        icon_url: match.icon_url,
        description: match.description,
        relevance_score: 7 + (match.similarity * 3), // Boost by similarity
        search_method: 'semantic_vector',
        matched_keywords: [],
        semantic_similarity: match.similarity
      }));

    } catch (error) {
      console.error('❌ Semantic search failed:', error);
      return [];
    }
  }

  /**
   * ENHANCED: Main search with semantic layer
   */
  async search(userQuery, limit = 10) {
    console.log(`\n🚀 === ENHANCED SEMANTIC SEARCH: "${userQuery}" ===`);
    
    try {
      // Step 1: Analyze intent (existing)
      const userIntent = await this.analyzeUserIntent(userQuery);
      
      // Step 2: Targeted keyword search (existing)
      const keywordResults = await this.performTargetedSearch(userIntent, limit);
      console.log(`📝 Keyword results: ${keywordResults.length}`);
      
      // Step 3: Feature-based search (existing)  
      const featureResults = await this.performFeatureBasedSearch(userIntent, limit);
      console.log(`🌟 Feature results: ${featureResults.length}`);
      
      // Step 4: NEW - Semantic vector search
      const semanticResults = await this.performSemanticSearch(userQuery, userIntent, limit);
      console.log(`🧠 Semantic results: ${semanticResults.length}`);
      
      // Step 5: ENHANCED - Combine all results with semantic boost
      const finalResults = await this.intelligentRanking(
        keywordResults,
        featureResults, 
        semanticResults,
        userIntent,
        limit
      );
      
      return {
        query: userQuery,
        intent: userIntent,
        results: finalResults,
        metadata: {
          keyword_matches: keywordResults.length,
          feature_matches: featureResults.length,
          semantic_matches: semanticResults.length,
          final_count: finalResults.length
        }
      };

    } catch (error) {
      console.error('❌ Enhanced search failed:', error);
      return { query: userQuery, results: [], error: error.message };
    }
  }

  /**
   * ENHANCED: Intelligent ranking combining all signals
   */
  async intelligentRanking(keywordResults, featureResults, semanticResults, intent, limit) {
    console.log('\n🎯 Intelligent ranking with semantic signals...');
    
    // Combine all results
    const allResults = [...keywordResults, ...featureResults, ...semanticResults];
    
    // Deduplicate and combine scores from different methods
    const deduplicatedMap = new Map();
    
    allResults.forEach(result => {
      const key = result.title?.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      if (!key) return;
      
      const existing = deduplicatedMap.get(key);
      
      if (!existing) {
        deduplicatedMap.set(key, {
          ...result,
          combined_score: this.calculateCombinedScore(result, intent),
          search_methods: [result.search_method]
        });
      } else {
        // Combine scores from multiple methods
        const newCombinedScore = this.calculateCombinedScore(result, intent);
        
        // Boost score when app found through multiple methods
        const methodBonus = existing.search_methods.includes(result.search_method) ? 0 : 1;
        
        existing.combined_score = Math.max(existing.combined_score, newCombinedScore) + methodBonus;
        existing.search_methods.push(result.search_method);
        existing.search_method = existing.search_methods.join('+');
        
        // Keep the best semantic similarity if available
        if (result.semantic_similarity) {
          existing.semantic_similarity = Math.max(
            existing.semantic_similarity || 0, 
            result.semantic_similarity
          );
        }
      }
    });
    
    // Sort by combined score
    const rankedResults = Array.from(deduplicatedMap.values())
      .sort((a, b) => b.combined_score - a.combined_score)
      .slice(0, limit);
    
    console.log('  Top results after intelligent ranking:');
    rankedResults.slice(0, 5).forEach((app, i) => {
      console.log(`    ${i+1}. ${app.title} - Score: ${app.combined_score.toFixed(1)} (${app.search_method})`);
      if (app.semantic_similarity) {
        console.log(`       Semantic similarity: ${(app.semantic_similarity * 100).toFixed(1)}%`);
      }
    });
    
    return rankedResults;
  }

  /**
   * NEW: Calculate combined score from multiple signals
   */
  calculateCombinedScore(result, intent) {
    let score = result.relevance_score || 0;
    
    // Boost semantic matches
    if (result.semantic_similarity) {
      score += result.semantic_similarity * 4; // Up to +4 points for high similarity
    }
    
    // Boost for multiple keyword matches
    if (result.matched_keywords && result.matched_keywords.length > 1) {
      score += result.matched_keywords.length * 0.5;
    }
    
    // Boost for apps with high ratings
    if (result.rating > 4.0) {
      score += 1;
    }
    
    // Boost for exact app type matches
    if (intent.app_type && result.title?.toLowerCase().includes(intent.app_type.toLowerCase())) {
      score += 2;
    }
    
    return score;
  }
}

/**
 * EXAMPLE: How semantic search improves "track my coffee intake"
 */
async function demonstrateSemanticSearch() {
  const search = new EnhancedStateOfArtSearch();
  
  console.log('🔍 SEARCH QUERY: "i want to track my coffee intake"');
  console.log('\n📊 COMPARISON:');
  
  console.log('\n❌ KEYWORD-ONLY RESULTS:');
  console.log('  - Apps containing "coffee", "track", "intake"');
  console.log('  - Misses: "caffeine monitor", "beverage logger", "habit tracker"');
  
  console.log('\n✅ SEMANTIC SEARCH RESULTS:');
  console.log('  - Understanding: track coffee = monitor caffeine consumption');
  console.log('  - Finds apps about:');
  console.log('    • Caffeine tracking (high similarity)');
  console.log('    • Beverage logging (medium similarity)');  
  console.log('    • Habit tracking (medium similarity)');
  console.log('    • Health monitoring (lower similarity)');
  
  console.log('\n🎯 SEMANTIC MATCHING EXAMPLES:');
  console.log('  Query: "track my coffee intake"');
  console.log('  Matches:');
  console.log('    • "Caffeine Zone" - 92% similarity');
  console.log('    • "Beverage Tracker" - 87% similarity');
  console.log('    • "Daily Habits" - 73% similarity');
  console.log('    • "WaterMinder" - 68% similarity (hydration tracking)');
}

module.exports = EnhancedStateOfArtSearch;

// Run demonstration
if (require.main === module) {
  demonstrateSemanticSearch();
}