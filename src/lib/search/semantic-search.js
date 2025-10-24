/**
 * Semantic search functionality using embeddings and vector similarity
 * Provides intelligent app recommendations based on user intent
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Performs semantic search for apps based on user query
 * @param {string} query - User's search query
 * @param {Object} options - Search options
 * @param {number} options.limit - Maximum number of results (default: 20)
 * @param {number} options.threshold - Minimum similarity threshold (default: 0.5)
 * @param {Object} options.userContext - Additional user context for personalization
 * @param {boolean} options.includeInsights - Whether to include AI-generated insights
 * @returns {Array} Array of matching apps with similarity scores
 */
export async function semanticSearch(query, options = {}) {
  const {
    limit = 20,
    threshold = 0.5,
    userContext = null,
    includeInsights = false
  } = options;
  
  console.log(`🔍 Semantic search for: "${query}"`);
  console.log(`   Options: limit=${limit}, threshold=${threshold}`);
  
  try {
    // 1. Enhance query with user context if available
    const enrichedQuery = enrichQuery(query, userContext);
    console.log(`🧠 Enriched query: "${enrichedQuery}"`);
    
    // 2. Generate query embedding
    const queryEmbedding = await generateQueryEmbedding(enrichedQuery);
    console.log(`✅ Generated query embedding (${queryEmbedding.length} dimensions)`);
    
    // 3. Search for similar apps using vector similarity
    const { data: matches, error } = await supabase.rpc('search_apps_by_embedding', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit * 2 // Get more results for filtering
    });
    
    if (error) {
      console.error('❌ Vector search error:', error);
      throw new Error(`Search failed: ${error.message}`);
    }
    
    console.log(`📊 Found ${matches?.length || 0} raw matches`);
    
    if (!matches || matches.length === 0) {
      return [];
    }
    
    // 4. Process and enhance results
    const processedResults = await processSearchResults(matches, query, {
      limit,
      includeInsights,
      userContext
    });
    
    console.log(`✅ Returning ${processedResults.length} processed results`);
    
    return processedResults;
    
  } catch (error) {
    console.error('❌ Semantic search error:', error);
    throw error;
  }
}

/**
 * Generates embedding for user query
 * @param {string} query - Query text
 * @returns {Array} Embedding vector
 */
async function generateQueryEmbedding(query) {
  const embeddingModel = genAI.getGenerativeModel({ 
    model: 'text-embedding-004' 
  });
  
  const result = await embeddingModel.embedContent(query);
  const embedding = result.embedding.values;
  
  if (embedding.length !== 768) {
    throw new Error(`Invalid query embedding size: ${embedding.length}, expected 768`);
  }
  
  return embedding;
}

/**
 * Enriches user query with context for better matching
 * @param {string} query - Original query
 * @param {Object} userContext - User context data
 * @returns {string} Enhanced query
 */
function enrichQuery(query, userContext) {
  if (!userContext) {
    return query;
  }
  
  const contextParts = [];
  
  // Add lifestyle context
  if (userContext.lifestyle && userContext.lifestyle.length > 0) {
    contextParts.push(`User lifestyle: ${userContext.lifestyle.join(', ')}`);
  }
  
  // Add preferred categories
  if (userContext.preferredCategories && userContext.preferredCategories.length > 0) {
    contextParts.push(`Preferred categories: ${userContext.preferredCategories.join(', ')}`);
  }
  
  // Add usage patterns
  if (userContext.usagePatterns) {
    contextParts.push(`Usage patterns: ${userContext.usagePatterns}`);
  }
  
  if (contextParts.length === 0) {
    return query;
  }
  
  return `${query}\n\nContext: ${contextParts.join('; ')}`;
}

/**
 * Processes raw search results and adds enhancements
 * @param {Array} matches - Raw matches from vector search
 * @param {string} originalQuery - Original user query
 * @param {Object} options - Processing options
 * @returns {Array} Processed results
 */
async function processSearchResults(matches, originalQuery, options = {}) {
  const { limit, includeInsights, userContext } = options;
  
  // 1. Filter and rank results
  let results = matches
    .filter(match => match.similarity > 0.3) // Filter very weak matches
    .map(match => ({
      app_id: match.app_id,
      name: match.app_name,
      category: match.app_category,
      rating: parseFloat(match.app_rating) || 0,
      icon_url: match.app_icon,
      description: match.app_description,
      similarity_score: parseFloat(match.similarity),
      match_quality: classifyMatchQuality(match.similarity),
      relevance_explanation: generateRelevanceExplanation(match, originalQuery)
    }))
    .sort((a, b) => {
      // Sort by similarity score, but boost highly rated apps slightly
      const scoreA = a.similarity_score + (a.rating > 4.0 ? 0.05 : 0);
      const scoreB = b.similarity_score + (b.rating > 4.0 ? 0.05 : 0);
      return scoreB - scoreA;
    })
    .slice(0, limit);
  
  // 2. Add category diversity (avoid too many apps from same category)
  results = enhanceDiversity(results);
  
  // 3. Add AI insights if requested
  if (includeInsights && results.length > 0) {
    results = await addAIInsights(results.slice(0, 5), originalQuery); // Only for top 5
  }
  
  return results;
}

/**
 * Classifies match quality based on similarity score
 * @param {number} similarity - Similarity score (0-1)
 * @returns {string} Quality classification
 */
function classifyMatchQuality(similarity) {
  if (similarity >= 0.85) return 'excellent';
  if (similarity >= 0.75) return 'good';
  if (similarity >= 0.65) return 'fair';
  if (similarity >= 0.50) return 'weak';
  return 'poor';
}

/**
 * Generates simple relevance explanation
 * @param {Object} match - Search match
 * @param {string} query - Original query
 * @returns {string} Relevance explanation
 */
function generateRelevanceExplanation(match, query) {
  const similarity = match.similarity;
  const category = match.app_category;
  
  if (similarity >= 0.85) {
    return `Excellent match - ${match.app_name} perfectly fits your needs`;
  } else if (similarity >= 0.75) {
    return `Good match - ${match.app_name} is highly relevant for ${category.toLowerCase()}`;
  } else if (similarity >= 0.65) {
    return `Fair match - ${match.app_name} may be helpful`;
  } else {
    return `Related option - Consider ${match.app_name} as an alternative`;
  }
}

/**
 * Enhances result diversity by limiting apps per category
 * @param {Array} results - Search results
 * @returns {Array} Results with improved diversity
 */
function enhanceDiversity(results) {
  const MAX_PER_CATEGORY = 3;
  const categoryCounts = {};
  
  return results.filter(result => {
    const category = result.category;
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    
    // Keep if under category limit or if it's a very high quality match
    return categoryCounts[category] <= MAX_PER_CATEGORY || result.similarity_score >= 0.9;
  });
}

/**
 * Adds AI-generated insights for top results
 * @param {Array} results - Top search results
 * @param {string} query - Original query
 * @returns {Array} Results with AI insights
 */
async function addAIInsights(results, query) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    for (const result of results) {
      const prompt = `
Based on this user query: "${query}"

And this app: ${result.name} (${result.category})
Description: ${result.description}

Provide a brief insight (1 sentence) about why this app matches the user's needs.
Focus on specific features or benefits that relate to their query.
`;

      const aiResult = await model.generateContent(prompt);
      const insight = aiResult.response.text().trim();
      
      result.ai_insight = insight;
    }
  } catch (error) {
    console.error('⚠️  Failed to generate AI insights:', error);
    // Continue without insights
  }
  
  return results;
}

/**
 * Logs search quality for monitoring and improvement
 * @param {string} query - Search query
 * @param {Array} results - Search results
 * @param {Object} userFeedback - User interaction feedback
 */
export async function logSearchQuality(query, results, userFeedback = {}) {
  try {
    const topScore = results.length > 0 ? results[0].similarity_score : 0;
    const avgScore = results.length > 0 
      ? results.reduce((sum, r) => sum + r.similarity_score, 0) / results.length 
      : 0;
    
    await supabase.from('search_quality_logs').insert({
      query,
      top_similarity_score: topScore,
      avg_similarity_score: avgScore,
      result_count: results.length,
      user_clicked: userFeedback.clicked || false,
      user_liked: userFeedback.liked || null,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('⚠️  Failed to log search quality:', error);
    // Don't throw - logging shouldn't break search
  }
}

/**
 * Gets search analytics and performance metrics
 * @returns {Object} Search analytics data
 */
export async function getSearchAnalytics() {
  try {
    const { data: logs } = await supabase
      .from('search_quality_logs')
      .select('*')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      .order('created_at', { ascending: false });
    
    if (!logs || logs.length === 0) {
      return {
        totalSearches: 0,
        avgSimilarityScore: 0,
        avgResultCount: 0,
        clickThroughRate: 0
      };
    }
    
    const totalSearches = logs.length;
    const avgSimilarityScore = logs.reduce((sum, log) => sum + (log.avg_similarity_score || 0), 0) / totalSearches;
    const avgResultCount = logs.reduce((sum, log) => sum + (log.result_count || 0), 0) / totalSearches;
    const clickThroughRate = logs.filter(log => log.user_clicked).length / totalSearches;
    
    return {
      totalSearches,
      avgSimilarityScore: parseFloat(avgSimilarityScore.toFixed(3)),
      avgResultCount: parseFloat(avgResultCount.toFixed(1)),
      clickThroughRate: parseFloat((clickThroughRate * 100).toFixed(1)),
      period: '7 days'
    };
  } catch (error) {
    console.error('❌ Failed to get search analytics:', error);
    throw error;
  }
}