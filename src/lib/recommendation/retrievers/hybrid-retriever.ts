/**
 * Hybrid Retrieval System with Reciprocal Rank Fusion (RRF)
 * Combines semantic search and keyword matching for robust recommendations
 * Part of the multi-signal recommendation system
 */

import { semanticRetrieval, SemanticSearchResult } from './semantic-retriever-working';
import { keywordRetrieval, KeywordSearchResult } from './keyword-retriever';

export interface HybridSearchResult {
  app_id: string;
  app_data: {
    name: string;
    category: string;
    rating: number;
    icon_url: string;
    description: string;
    use_cases?: string[];
  };
  semantic_score: number;
  keyword_score: number;
  rrf_score: number;
  final_score: number;
  retrieval_methods: string[];
  retrieval_score: number;
  rank?: number;
}

export interface HybridSearchConfig {
  semantic_weight?: number;
  keyword_weight?: number;
  rrf_k?: number;
  diversity_boost?: number;
  category_boost?: number;
  quality_boost?: number;
  min_score_threshold?: number;
}

/**
 * Main hybrid retrieval function using RRF fusion
 */
export async function hybridRetrieval(
  query: string,
  userProfile?: any,
  limit: number = 30,
  config: HybridSearchConfig = {}
): Promise<HybridSearchResult[]> {
  console.log(`🔄 Hybrid retrieval for: "${query}" (limit: ${limit})`);
  
  const {
    semantic_weight = 0.6,
    keyword_weight = 0.4,
    rrf_k = 60,
    diversity_boost = 0.1,
    category_boost = 0.05,
    quality_boost = 0.1,
    min_score_threshold = 0.3
  } = config;
  
  try {
    // 1. Perform parallel retrieval from both systems
    console.log('🔍 Running parallel semantic and keyword retrieval...');
    
    const [semanticResults, keywordResults] = await Promise.all([
      semanticRetrieval(query, userProfile, limit * 2).catch(error => {
        console.warn('⚠️ Semantic retrieval failed:', error.message);
        return [];
      }),
      keywordRetrieval(query, limit * 2).catch(error => {
        console.warn('⚠️ Keyword retrieval failed:', error.message);
        return [];
      })
    ]);
    
    console.log(`📊 Retrieved ${semanticResults.length} semantic + ${keywordResults.length} keyword results`);
    
    // 2. Apply Reciprocal Rank Fusion (RRF)
    const fusedResults = applyRRF(semanticResults, keywordResults, rrf_k);
    console.log(`🔗 Fused into ${fusedResults.length} hybrid results`);
    
    // 3. Apply additional scoring factors
    const enhancedResults = enhanceScoring(
      fusedResults, 
      semantic_weight, 
      keyword_weight,
      diversity_boost,
      category_boost,
      quality_boost
    );
    
    // 4. Filter and rank final results
    const finalResults = enhancedResults
      .filter(result => result.final_score >= min_score_threshold)
      .sort((a, b) => b.final_score - a.final_score)
      .slice(0, limit)
      .map((result, index) => ({
        ...result,
        rank: index + 1
      }));
    
    console.log(`✅ Hybrid retrieval completed: ${finalResults.length} final results`);
    return finalResults;
    
  } catch (error) {
    console.error('❌ Hybrid retrieval error:', error);
    throw error;
  }
}

/**
 * Applies Reciprocal Rank Fusion to combine semantic and keyword results
 */
function applyRRF(
  semanticResults: SemanticSearchResult[],
  keywordResults: KeywordSearchResult[],
  k: number = 60
): HybridSearchResult[] {
  // Create maps for efficient lookup
  const semanticMap = new Map<string, SemanticSearchResult>();
  const keywordMap = new Map<string, KeywordSearchResult>();
  const allAppIds = new Set<string>();
  
  // Populate semantic results map
  semanticResults.forEach((result, index) => {
    semanticMap.set(result.app_id, result);
    allAppIds.add(result.app_id);
  });
  
  // Populate keyword results map
  keywordResults.forEach((result, index) => {
    keywordMap.set(result.app_id, result);
    allAppIds.add(result.app_id);
  });
  
  // Calculate RRF scores for each app
  const fusedResults: HybridSearchResult[] = [];
  
  for (const appId of allAppIds) {
    const semanticResult = semanticMap.get(appId);
    const keywordResult = keywordMap.get(appId);
    
    // Calculate RRF score: 1/(k + rank)
    let rrf_score = 0;
    const retrieval_methods: string[] = [];
    
    if (semanticResult) {
      const semanticRank = semanticResult.rank || semanticResults.indexOf(semanticResult) + 1;
      rrf_score += 1 / (k + semanticRank);
      retrieval_methods.push('semantic');
    }
    
    if (keywordResult) {
      const keywordRank = keywordResult.rank || keywordResults.indexOf(keywordResult) + 1;
      rrf_score += 1 / (k + keywordRank);
      retrieval_methods.push('keyword');
    }
    
    // Use the result with more complete data (prefer semantic for app_data)
    const primaryResult = semanticResult || keywordResult;
    if (!primaryResult) continue;
    
    const hybridResult: HybridSearchResult = {
      app_id: appId,
      app_data: primaryResult.app_data,
      semantic_score: semanticResult?.similarity || semanticResult?.retrieval_score || 0,
      keyword_score: keywordResult?.keyword_score || keywordResult?.retrieval_score || 0,
      rrf_score,
      final_score: rrf_score, // Will be enhanced later
      retrieval_methods,
      retrieval_score: rrf_score,
      rank: 0 // Will be set later
    };
    
    fusedResults.push(hybridResult);
  }
  
  return fusedResults;
}

/**
 * Enhances scoring with additional factors beyond RRF
 */
function enhanceScoring(
  results: HybridSearchResult[],
  semantic_weight: number,
  keyword_weight: number,
  diversity_boost: number,
  category_boost: number,
  quality_boost: number
): HybridSearchResult[] {
  const categories_seen = new Set<string>();
  
  return results.map(result => {
    let enhanced_score = result.rrf_score;
    
    // 1. Weighted combination of original scores
    const weighted_semantic = result.semantic_score * semantic_weight;
    const weighted_keyword = result.keyword_score * keyword_weight;
    enhanced_score += (weighted_semantic + weighted_keyword) * 0.3; // Blend with RRF
    
    // 2. Quality boost based on app rating
    if (result.app_data.rating > 0) {
      const quality_factor = (result.app_data.rating / 5.0) * quality_boost;
      enhanced_score += quality_factor;
    }
    
    // 3. Diversity boost for apps in new categories
    if (!categories_seen.has(result.app_data.category)) {
      enhanced_score += diversity_boost;
      categories_seen.add(result.app_data.category);
    }
    
    // 4. Multi-signal boost (apps found by both methods)
    if (result.retrieval_methods.length > 1) {
      enhanced_score += 0.15; // Boost for consensus
    }
    
    // 5. Category relevance boost (could be expanded with user preferences)
    if (result.app_data.category) {
      // Basic category relevance - could be enhanced with user profile
      enhanced_score += category_boost;
    }
    
    return {
      ...result,
      final_score: enhanced_score
    };
  });
}

/**
 * Advanced hybrid search with intent-aware weighting
 */
export async function intentAwareHybridSearch(
  query: string,
  userIntent: 'discovery' | 'specific' | 'problem_solving' = 'discovery',
  userProfile?: any,
  limit: number = 30
): Promise<HybridSearchResult[]> {
  // Intent-specific configurations
  const intentConfigs: Record<string, HybridSearchConfig> = {
    discovery: {
      semantic_weight: 0.7, // Higher semantic for exploration
      keyword_weight: 0.3,
      diversity_boost: 0.2, // Encourage variety
      rrf_k: 40,
      min_score_threshold: 0.2
    },
    specific: {
      semantic_weight: 0.4, // Higher keyword for precision
      keyword_weight: 0.6,
      diversity_boost: 0.05,
      rrf_k: 80,
      min_score_threshold: 0.4
    },
    problem_solving: {
      semantic_weight: 0.6, // Balanced approach
      keyword_weight: 0.4,
      diversity_boost: 0.15,
      quality_boost: 0.15, // Prioritize quality solutions
      rrf_k: 60,
      min_score_threshold: 0.3
    }
  };
  
  const config = intentConfigs[userIntent];
  console.log(`🎯 Intent-aware hybrid search: ${userIntent} mode`);
  
  return hybridRetrieval(query, userProfile, limit, config);
}

/**
 * Hybrid search with category preferences
 */
export async function categoryAwareHybridSearch(
  query: string,
  preferredCategories: string[] = [],
  userProfile?: any,
  limit: number = 30
): Promise<HybridSearchResult[]> {
  const results = await hybridRetrieval(query, userProfile, limit * 2);
  
  // Apply category boosting
  const categoryBoostedResults = results.map(result => {
    let boosted_score = result.final_score;
    
    // Boost apps in preferred categories
    if (preferredCategories.includes(result.app_data.category)) {
      boosted_score += 0.25;
    }
    
    return {
      ...result,
      final_score: boosted_score
    };
  });
  
  // Re-sort and limit
  return categoryBoostedResults
    .sort((a, b) => b.final_score - a.final_score)
    .slice(0, limit)
    .map((result, index) => ({
      ...result,
      rank: index + 1
    }));
}

/**
 * Explains why specific apps were recommended
 */
export function explainRecommendation(result: HybridSearchResult): string {
  const explanations: string[] = [];
  
  if (result.retrieval_methods.includes('semantic')) {
    explanations.push(`semantically similar (${result.semantic_score.toFixed(2)})`);
  }
  
  if (result.retrieval_methods.includes('keyword')) {
    explanations.push(`keyword match (${result.keyword_score.toFixed(2)})`);
  }
  
  if (result.retrieval_methods.length > 1) {
    explanations.push('found by multiple methods');
  }
  
  if (result.app_data.rating > 4.0) {
    explanations.push(`highly rated (${result.app_data.rating}/5)`);
  }
  
  return `Recommended because: ${explanations.join(', ')}`;
}

/**
 * Gets hybrid search analytics
 */
export function getHybridAnalytics(results: HybridSearchResult[]) {
  const analytics = {
    total_results: results.length,
    semantic_only: results.filter(r => r.retrieval_methods.includes('semantic') && r.retrieval_methods.length === 1).length,
    keyword_only: results.filter(r => r.retrieval_methods.includes('keyword') && r.retrieval_methods.length === 1).length,
    both_methods: results.filter(r => r.retrieval_methods.length > 1).length,
    avg_final_score: results.reduce((sum, r) => sum + r.final_score, 0) / results.length,
    categories: [...new Set(results.map(r => r.app_data.category))],
    top_categories: getTopCategories(results, 5)
  };
  
  return analytics;
}

function getTopCategories(results: HybridSearchResult[], limit: number) {
  const categoryCounts = new Map<string, number>();
  
  results.forEach(result => {
    const category = result.app_data.category;
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
  });
  
  return Array.from(categoryCounts.entries())
    .sort(([,a], [,b]) => b - a)
    .slice(0, limit)
    .map(([category, count]) => ({ category, count }));
}