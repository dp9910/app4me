/**
 * Improved Search Orchestrator with Fixed Plant Care Search
 * - Fast and reliable intent analysis without external API timeouts
 * - Topic-focused vector search with cosine similarity 
 * - Enhanced keyword matching with domain knowledge
 * - Quality ranking based on relevance and rating
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export interface ImprovedSearchResult {
  app_id: string;
  app_data: {
    name: string;
    category: string;
    rating: number;
    icon_url: string;
    description: string;
  };
  relevance_score: number;
  match_reason: string;
  matched_keywords: string[];
  search_methods: string[];
}

export interface SearchIntent {
  main_topic: string;
  search_keywords: string[];
  related_terms: string[];
  intent_type: 'learn' | 'manage' | 'discover' | 'create' | 'monitor';
  domain_focus: string;
}

/**
 * Main improved search function
 */
export async function improvedSearch(
  query: string,
  limit: number = 20
): Promise<ImprovedSearchResult[]> {
  console.log(`🚀 Starting improved search for: "${query}"`);
  
  try {
    // Step 1: Fast local intent analysis (no external API calls)
    const searchIntent = analyzeIntentLocally(query);
    console.log(`🎯 Intent: ${searchIntent.main_topic} (${searchIntent.intent_type})`);
    console.log(`🔍 Keywords: ${searchIntent.search_keywords.join(', ')}`);
    
    // Step 2: Parallel search execution for speed
    const [vectorResults, keywordResults, categoryResults] = await Promise.all([
      performTopicFocusedVectorSearch(query, searchIntent, limit * 2),
      performEnhancedKeywordSearch(searchIntent, limit * 2),
      performCategorySpecificSearch(searchIntent, limit)
    ]);
    
    console.log(`📊 Search results: Vector=${vectorResults.length}, Keyword=${keywordResults.length}, Category=${categoryResults.length}`);
    
    // Step 3: Intelligent result fusion and ranking
    const fusedResults = fuseAndRankResults(
      vectorResults,
      keywordResults,
      categoryResults,
      searchIntent,
      limit
    );
    
    console.log(`✅ Improved search completed: ${fusedResults.length} final results`);
    return fusedResults;
    
  } catch (error) {
    console.error('❌ Improved search error:', error);
    throw error;
  }
}

/**
 * Fast local intent analysis without external API dependencies
 */
function analyzeIntentLocally(query: string): SearchIntent {
  const queryLower = query.toLowerCase();
  
  // Domain detection patterns
  const domainPatterns = {
    plants: ['plant', 'garden', 'flower', 'grow', 'care', 'botanical', 'flora', 'greenhouse', 'watering', 'soil'],
    fitness: ['workout', 'exercise', 'fitness', 'training', 'gym', 'health', 'running', 'yoga'],
    productivity: ['productive', 'organize', 'task', 'todo', 'focus', 'time', 'schedule', 'plan'],
    meditation: ['meditat', 'mindful', 'calm', 'zen', 'peace', 'breath', 'relax'],
    finance: ['money', 'budget', 'invest', 'bank', 'finance', 'expense', 'save', 'payment'],
    education: ['learn', 'teach', 'study', 'education', 'course', 'skill', 'knowledge', 'tutorial']
  };
  
  // Intent type detection
  const intentPatterns = {
    learn: ['learn', 'teach', 'how to', 'tutorial', 'guide', 'education', 'study'],
    manage: ['manage', 'track', 'organize', 'monitor', 'control', 'schedule'],
    discover: ['find', 'discover', 'explore', 'search', 'looking for', 'need'],
    create: ['create', 'design', 'build', 'make', 'generate', 'craft'],
    monitor: ['track', 'monitor', 'watch', 'check', 'observe', 'measure']
  };
  
  // Extract base keywords
  const stopWords = new Set(['i', 'wish', 'there', 'were', 'that', 'help', 'me', 'how', 'to', 'the', 'a', 'an', 'and', 'or', 'but', 'apps', 'app', 'for']);
  const words = queryLower.split(/\s+/).filter(word => word.length > 2 && !stopWords.has(word));
  
  // Detect main topic/domain
  let mainTopic = 'general';
  let domainFocus = 'general';
  let maxMatches = 0;
  
  for (const [domain, patterns] of Object.entries(domainPatterns)) {
    const matches = patterns.filter(pattern => queryLower.includes(pattern));
    if (matches.length > maxMatches) {
      maxMatches = matches.length;
      mainTopic = domain;
      domainFocus = domain;
    }
  }
  
  // Detect intent type
  let intentType: 'learn' | 'manage' | 'discover' | 'create' | 'monitor' = 'discover';
  for (const [intent, patterns] of Object.entries(intentPatterns)) {
    if (patterns.some(pattern => queryLower.includes(pattern))) {
      intentType = intent as any;
      break;
    }
  }
  
  // Build search keywords based on domain
  let searchKeywords = words;
  let relatedTerms: string[] = [];
  
  if (mainTopic === 'plants') {
    searchKeywords = ['plant', 'garden', 'care', 'grow', 'water', 'flower', 'botanical'];
    relatedTerms = ['flora', 'greenhouse', 'soil', 'seed', 'bloom', 'leaf', 'tree', 'herb', 'succulent'];
  } else if (mainTopic === 'fitness') {
    searchKeywords = ['fitness', 'workout', 'exercise', 'health', 'training'];
    relatedTerms = ['gym', 'running', 'yoga', 'cardio', 'strength', 'nutrition'];
  } else if (mainTopic === 'productivity') {
    searchKeywords = ['productivity', 'task', 'organize', 'focus', 'time'];
    relatedTerms = ['todo', 'schedule', 'plan', 'goal', 'habit', 'reminder'];
  }
  
  return {
    main_topic: mainTopic,
    search_keywords: searchKeywords.slice(0, 8),
    related_terms: relatedTerms.slice(0, 6),
    intent_type: intentType,
    domain_focus: domainFocus
  };
}

/**
 * Topic-focused vector search using actual embeddings
 */
async function performTopicFocusedVectorSearch(
  query: string,
  intent: SearchIntent,
  limit: number
): Promise<any[]> {
  try {
    console.log('🧠 Performing topic-focused vector search...');
    
    // Generate query embedding
    const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await embeddingModel.embedContent(query);
    const queryEmbedding = result.embedding.values;
    
    if (queryEmbedding.length !== 768) {
      throw new Error(`Invalid embedding dimensions: ${queryEmbedding.length}`);
    }
    
    // Get apps with embeddings
    const { data: appsWithEmbeddings, error } = await supabase
      .from('app_embeddings')
      .select(`
        app_id,
        embedding,
        apps_unified!inner(
          id,
          title,
          primary_category,
          rating,
          icon_url,
          description
        )
      `)
      .limit(300); // Reasonable sample size
    
    if (error) throw error;
    
    const results = [];
    
    for (const app of appsWithEmbeddings) {
      if (!app.embedding) continue;
      
      const appData = Array.isArray(app.apps_unified) ? app.apps_unified[0] : app.apps_unified;
      if (!appData) continue;
      
      // Calculate cosine similarity
      const similarity = calculateCosineSimilarity(queryEmbedding, app.embedding);
      
      // Topic relevance boost
      const topicBoost = calculateTopicRelevance(appData, intent);
      
      // Combined score
      const relevanceScore = similarity + topicBoost;
      
      if (relevanceScore > 0.4) { // Reasonable threshold
        results.push({
          app_id: app.app_id.toString(),
          app_name: appData.title || '',
          category: appData.primary_category || '',
          rating: appData.rating || 0,
          description: appData.description || '',
          icon_url: appData.icon_url || null,
          relevance_score: relevanceScore,
          semantic_similarity: similarity,
          topic_boost: topicBoost,
          source: 'vector'
        });
      }
    }
    
    return results
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, limit);
    
  } catch (error) {
    console.error('❌ Vector search error:', error);
    return [];
  }
}

/**
 * Enhanced keyword search with domain knowledge
 */
async function performEnhancedKeywordSearch(
  intent: SearchIntent,
  limit: number
): Promise<any[]> {
  try {
    console.log('🔑 Performing enhanced keyword search...');
    
    const allKeywords = [...intent.search_keywords, ...intent.related_terms];
    
    // Direct title/description search
    const titleDescConditions = allKeywords
      .map(keyword => `title.ilike.%${keyword}%,description.ilike.%${keyword}%`)
      .join(',');
    
    const { data: directMatches, error: directError } = await supabase
      .from('apps_unified')
      .select(`
        id,
        title,
        primary_category,
        rating,
        icon_url,
        description
      `)
      .or(titleDescConditions)
      .limit(50);
    
    if (directError) throw directError;
    
    const results = [];
    
    // Score direct matches
    directMatches.forEach(app => {
      const titleLower = (app.title || '').toLowerCase();
      const descLower = (app.description || '').toLowerCase();
      
      let score = 0;
      const matchedKeywords = [];
      
      // Main keywords get higher weight
      for (const keyword of intent.search_keywords) {
        const keywordLower = keyword.toLowerCase();
        if (titleLower.includes(keywordLower)) {
          score += 2.0; // High score for title matches
          matchedKeywords.push(keyword);
        } else if (descLower.includes(keywordLower)) {
          score += 1.0; // Medium score for description matches
          matchedKeywords.push(keyword);
        }
      }
      
      // Related terms get medium weight
      for (const term of intent.related_terms) {
        const termLower = term.toLowerCase();
        if (titleLower.includes(termLower)) {
          score += 1.0;
          matchedKeywords.push(term);
        } else if (descLower.includes(termLower)) {
          score += 0.5;
          matchedKeywords.push(term);
        }
      }
      
      // Quality boost
      score += (app.rating || 0) / 5.0 * 0.5;
      
      if (score > 0.5) {
        results.push({
          app_id: app.id.toString(),
          app_name: app.title,
          category: app.primary_category,
          rating: app.rating || 0,
          description: app.description || '',
          icon_url: app.icon_url,
          relevance_score: score,
          matched_keywords: matchedKeywords,
          source: 'keyword'
        });
      }
    });
    
    // TF-IDF search for broader coverage
    const { data: tfidfApps, error: tfidfError } = await supabase
      .from('app_features')
      .select(`
        app_id,
        keywords_tfidf,
        apps_unified!inner(
          title,
          primary_category,
          rating,
          icon_url,
          description
        )
      `)
      .limit(100);
    
    if (!tfidfError && tfidfApps) {
      const existingIds = new Set(results.map(r => r.app_id));
      
      tfidfApps.forEach(app => {
        const appData = Array.isArray(app.apps_unified) ? app.apps_unified[0] : app.apps_unified;
        if (!appData || existingIds.has(app.app_id.toString())) return;
        
        const tfidfData = app.keywords_tfidf || {};
        const keywordsTfidf = tfidfData.keywords || {};
        
        let score = 0;
        const matchedKeywords = [];
        
        // Check main keywords with high weight
        for (const keyword of intent.search_keywords) {
          if (keywordsTfidf[keyword]) {
            const tfidfScore = parseFloat(keywordsTfidf[keyword]);
            if (!isNaN(tfidfScore)) {
              score += tfidfScore * 2;
              matchedKeywords.push(keyword);
            }
          }
        }
        
        // Check related terms with medium weight
        for (const term of intent.related_terms) {
          if (keywordsTfidf[term]) {
            const tfidfScore = parseFloat(keywordsTfidf[term]);
            if (!isNaN(tfidfScore)) {
              score += tfidfScore * 1;
              matchedKeywords.push(term);
            }
          }
        }
        
        // Quality boost
        score += (appData.rating || 0) / 5.0 * 0.2;
        
        if (score > 0.3) {
          results.push({
            app_id: app.app_id.toString(),
            app_name: appData.title,
            category: appData.primary_category,
            rating: appData.rating || 0,
            description: appData.description || '',
            icon_url: appData.icon_url,
            relevance_score: score,
            matched_keywords: matchedKeywords,
            source: 'tfidf'
          });
        }
      });
    }
    
    return results
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, limit);
    
  } catch (error) {
    console.error('❌ Enhanced keyword search error:', error);
    return [];
  }
}

/**
 * Category-specific search for domain expertise
 */
async function performCategorySpecificSearch(
  intent: SearchIntent,
  limit: number
): Promise<any[]> {
  try {
    console.log('📂 Performing category-specific search...');
    
    // Domain-specific category mappings
    const categoryMappings = {
      plants: ['design', 'lifestyle', 'reference', 'education', 'productivity'],
      fitness: ['health', 'fitness', 'lifestyle', 'medical'],
      productivity: ['productivity', 'business', 'utilities'],
      education: ['education', 'reference', 'books'],
      meditation: ['health', 'lifestyle', 'medical']
    };
    
    const relevantCategories = categoryMappings[intent.domain_focus] || ['lifestyle', 'productivity'];
    
    const categoryConditions = relevantCategories
      .map(category => `primary_category.ilike.%${category}%`)
      .join(',');
    
    const { data: categoryApps, error } = await supabase
      .from('apps_unified')
      .select(`
        id,
        title,
        primary_category,
        rating,
        icon_url,
        description
      `)
      .or(categoryConditions)
      .order('rating', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    
    return categoryApps.map(app => ({
      app_id: app.id.toString(),
      app_name: app.title,
      category: app.primary_category,
      rating: app.rating || 0,
      description: app.description || '',
      icon_url: app.icon_url,
      relevance_score: (app.rating || 0) / 5.0 + 0.5, // Base category relevance
      source: 'category'
    }));
    
  } catch (error) {
    console.error('❌ Category search error:', error);
    return [];
  }
}

/**
 * Intelligent result fusion and ranking
 */
function fuseAndRankResults(
  vectorResults: any[],
  keywordResults: any[],
  categoryResults: any[],
  intent: SearchIntent,
  limit: number
): ImprovedSearchResult[] {
  const resultMap = new Map<string, any>();
  
  // Add results from all sources
  [...vectorResults, ...keywordResults, ...categoryResults].forEach(result => {
    if (resultMap.has(result.app_id)) {
      const existing = resultMap.get(result.app_id);
      existing.search_methods.push(result.source);
      existing.relevance_score = Math.max(existing.relevance_score, result.relevance_score);
      existing.matched_keywords = [...new Set([...existing.matched_keywords, ...(result.matched_keywords || [])])];
    } else {
      resultMap.set(result.app_id, {
        ...result,
        search_methods: [result.source],
        matched_keywords: result.matched_keywords || []
      });
    }
  });
  
  // Calculate final scores and format results
  const finalResults: ImprovedSearchResult[] = [];
  
  for (const [appId, result] of Array.from(resultMap)) {
    // Multi-source boost
    const multiSourceBoost = result.search_methods.length > 1 ? 0.3 : 0;
    
    // Quality boost
    const qualityBoost = result.rating > 4.0 ? 0.2 : 0;
    
    // Domain relevance boost
    const domainBoost = calculateDomainRelevance(result, intent);
    
    const finalScore = result.relevance_score + multiSourceBoost + qualityBoost + domainBoost;
    
    finalResults.push({
      app_id: result.app_id,
      app_data: {
        name: result.app_name,
        category: result.category,
        rating: result.rating,
        icon_url: result.icon_url,
        description: result.description
      },
      relevance_score: finalScore,
      match_reason: generateMatchReason(result, intent),
      matched_keywords: result.matched_keywords,
      search_methods: result.search_methods
    });
  }
  
  // Sort and return top results
  return finalResults
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, limit);
}

/**
 * Helper functions
 */
function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
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

function calculateTopicRelevance(app: any, intent: SearchIntent): number {
  const text = `${app.title} ${app.description}`.toLowerCase();
  let boost = 0;
  
  // Check for main topic
  if (text.includes(intent.main_topic.toLowerCase())) {
    boost += 0.3;
  }
  
  // Check for search keywords
  for (const keyword of intent.search_keywords) {
    if (text.includes(keyword.toLowerCase())) {
      boost += 0.1;
    }
  }
  
  return Math.min(boost, 0.6);
}

function calculateDomainRelevance(result: any, intent: SearchIntent): number {
  const text = `${result.app_name} ${result.description}`.toLowerCase();
  
  if (intent.domain_focus === 'plants') {
    const plantTerms = ['plant', 'garden', 'flower', 'botanical', 'flora', 'greenhouse'];
    const matches = plantTerms.filter(term => text.includes(term));
    return matches.length * 0.1;
  }
  
  return 0;
}

function generateMatchReason(result: any, intent: SearchIntent): string {
  const reasons = [];
  
  if (result.search_methods.includes('vector')) {
    reasons.push('semantic similarity');
  }
  
  if (result.search_methods.includes('keyword')) {
    reasons.push('keyword match');
  }
  
  if (result.matched_keywords && result.matched_keywords.length > 0) {
    reasons.push(`keywords: ${result.matched_keywords.slice(0, 2).join(', ')}`);
  }
  
  if (result.rating > 4.0) {
    reasons.push('highly rated');
  }
  
  return reasons.length > 0 ? `Found via: ${reasons.join(', ')}` : 'Relevant match';
}