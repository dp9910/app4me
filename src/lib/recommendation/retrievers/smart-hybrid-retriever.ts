/**
 * Smart Hybrid Retriever with Intent-Aware Semantic Processing
 * Uses LLM to understand query intent and emphasize main topics
 * Focuses on relevance over just keyword matching
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export interface SmartSearchResult {
  app_id: string;
  app_data: {
    name: string;
    category: string;
    rating: number;
    icon_url: string;
    description: string;
    use_cases?: string[];
  };
  relevance_score: number;
  intent_match_score: number;
  semantic_similarity: number;
  keyword_relevance: number;
  final_score: number;
  explanation: string;
  matched_concepts: string[];
  rank?: number;
}

export interface QueryIntent {
  main_topic: string;
  user_need: string;
  intent_type: 'learn' | 'solve' | 'discover' | 'manage' | 'entertainment';
  key_concepts: string[];
  search_focus: string[];
  semantic_query: string;
}

/**
 * Main smart retrieval function with intent awareness
 */
export async function smartHybridRetrieval(
  query: string,
  limit: number = 30
): Promise<SmartSearchResult[]> {
  console.log(`🧠 Smart hybrid retrieval for: "${query}"`);
  
  try {
    // 1. Analyze query intent using LLM
    const queryIntent = await analyzeQueryIntent(query);
    console.log(`🎯 Intent: ${queryIntent.main_topic} (${queryIntent.intent_type})`);
    console.log(`🔍 Focus: ${queryIntent.search_focus.join(', ')}`);
    
    // 2. Generate semantic embedding for the focused query
    const semanticQuery = queryIntent.semantic_query;
    const queryEmbedding = await generateQueryEmbedding(semanticQuery);
    console.log(`✅ Generated embedding for: "${semanticQuery}"`);
    
    // 3. Perform semantic search with vector similarity
    const semanticResults = await performSmartSemanticSearch(
      queryEmbedding, 
      queryIntent, 
      limit * 2
    );
    console.log(`🧠 Semantic search: ${semanticResults.length} results`);
    
    // 4. Perform focused keyword search
    const keywordResults = await performFocusedKeywordSearch(
      queryIntent.search_focus,
      queryIntent.main_topic,
      limit * 2
    );
    console.log(`🔑 Keyword search: ${keywordResults.length} results`);
    
    // 5. Combine and rank results with intent awareness
    const finalResults = await combineWithIntentRanking(
      semanticResults,
      keywordResults,
      queryIntent,
      limit
    );
    
    console.log(`✅ Smart retrieval completed: ${finalResults.length} results`);
    return finalResults;
    
  } catch (error) {
    console.error('❌ Smart retrieval error:', error);
    throw error;
  }
}

/**
 * Analyzes query intent using Gemini LLM
 */
async function analyzeQueryIntent(query: string): Promise<QueryIntent> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    const prompt = `Analyze this app search query and extract the user's intent:

Query: "${query}"

Return JSON with:
- main_topic: The primary subject/domain (e.g., "plants", "fitness", "finance")
- user_need: What the user wants to accomplish
- intent_type: "learn", "solve", "discover", "manage", or "entertainment"
- key_concepts: Array of 3-5 core concepts related to the main topic
- search_focus: Array of 3-5 specific keywords to prioritize in search
- semantic_query: A refined search query that emphasizes the main topic

Focus on what the user REALLY wants, not just the words they used.

Example:
Query: "i wish there were apps that help me teach how to take care of plants"
Response: {
  "main_topic": "plants",
  "user_need": "learn plant care and gardening",
  "intent_type": "learn",
  "key_concepts": ["plant care", "gardening", "botany", "plant health", "watering"],
  "search_focus": ["plant", "garden", "care", "grow", "water"],
  "semantic_query": "plant care gardening apps learn how to grow plants"
}

Return ONLY the JSON object:`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from LLM response');
    }
    
    const intent = JSON.parse(jsonMatch[0]);
    
    // Validate the response
    if (!intent.main_topic || !intent.search_focus || !Array.isArray(intent.search_focus)) {
      throw new Error('Invalid intent analysis response');
    }
    
    return intent;
    
  } catch (error) {
    console.error('⚠️ Intent analysis failed:', error);
    
    // Fallback intent analysis
    return {
      main_topic: extractMainTopic(query),
      user_need: 'find relevant apps',
      intent_type: 'discover' as const,
      key_concepts: extractKeywords(query).slice(0, 5),
      search_focus: extractKeywords(query).slice(0, 5),
      semantic_query: query
    };
  }
}

/**
 * Generates query embedding using Gemini
 */
async function generateQueryEmbedding(query: string): Promise<number[]> {
  const embeddingModel = genAI.getGenerativeModel({ 
    model: 'text-embedding-004' 
  });
  
  const result = await embeddingModel.embedContent(query);
  const embedding = result.embedding.values;
  
  if (embedding.length !== 768) {
    throw new Error(`Invalid embedding dimensions: ${embedding.length}, expected 768`);
  }
  
  return embedding;
}

/**
 * Performs semantic search using actual vector similarity
 */
async function performSmartSemanticSearch(
  queryEmbedding: number[],
  intent: QueryIntent,
  limit: number
): Promise<any[]> {
  try {
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
      .limit(200); // Get a good sample size
    
    if (error) throw error;
    
    const results = [];
    
    for (const app of appsWithEmbeddings) {
      if (!app.embedding) continue;
      
      // Calculate cosine similarity
      const similarity = calculateCosineSimilarity(queryEmbedding, app.embedding);
      
      // Intent relevance boost
      const intentBoost = calculateIntentRelevance(app.apps_unified, intent);
      
      // Combined relevance score
      const relevanceScore = similarity + intentBoost;
      
      if (relevanceScore > 0.4) { // Higher threshold for relevance
        results.push({
          app_id: app.app_id.toString(),
          app_name: app.apps_unified.title,
          category: app.apps_unified.primary_category,
          rating: app.apps_unified.rating || 0,
          description: app.apps_unified.description || '',
          icon_url: app.apps_unified.icon_url,
          semantic_similarity: similarity,
          intent_match: intentBoost,
          relevance_score: relevanceScore,
          source: 'semantic'
        });
      }
    }
    
    // Sort by relevance and return top results
    return results
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, limit);
    
  } catch (error) {
    console.error('❌ Smart semantic search error:', error);
    return [];
  }
}

/**
 * Performs keyword search focused on main topic
 */
async function performFocusedKeywordSearch(
  searchFocus: string[],
  mainTopic: string,
  limit: number
): Promise<any[]> {
  try {
    // First, try to find apps that mention the main topic in title/description
    const topicQuery = `title.ilike.%${mainTopic}%,description.ilike.%${mainTopic}%`;
    
    const { data: topicApps, error: topicError } = await supabase
      .from('apps_unified')
      .select(`
        id,
        title,
        primary_category,
        rating,
        icon_url,
        description
      `)
      .or(topicQuery)
      .limit(20);
    
    if (topicError) throw topicError;
    
    // Then, search with TF-IDF for broader matches
    const { data: tfidfApps, error: tfidfError } = await supabase
      .from('app_features')
      .select(`
        app_id,
        keywords_tfidf,
        primary_use_case,
        apps_unified!inner(
          title,
          primary_category,
          rating,
          icon_url,
          description
        )
      `)
      .limit(100);
    
    if (tfidfError) throw tfidfError;
    
    const results = [];
    
    // Score topic-focused apps highly
    topicApps.forEach((app, index) => {
      const topicRelevance = calculateTopicRelevance(app, mainTopic, searchFocus);
      
      results.push({
        app_id: app.id.toString(),
        app_name: app.title,
        category: app.primary_category,
        rating: app.rating || 0,
        description: app.description || '',
        icon_url: app.icon_url,
        keyword_score: topicRelevance + 0.5, // Boost for topic match
        topic_match: true,
        source: 'keyword_topic'
      });
    });
    
    // Score TF-IDF apps
    tfidfApps.forEach(app => {
      // Skip if already found in topic search
      if (results.some(r => r.app_id === app.app_id.toString())) return;
      
      const tfidfData = app.keywords_tfidf || {};
      const keywordsTfidf = tfidfData.keywords || {};
      const categoriesTfidf = tfidfData.categories || {};
      
      let score = 0;
      const matchedKeywords = [];
      
      // Prioritize main topic and focus keywords
      for (const keyword of [mainTopic, ...searchFocus]) {
        if (keywordsTfidf[keyword]) {
          const tfidfScore = parseFloat(keywordsTfidf[keyword]);
          if (!isNaN(tfidfScore)) {
            score += tfidfScore * 2; // Double weight for focus keywords
            matchedKeywords.push(keyword);
          }
        }
        
        if (categoriesTfidf[keyword]) {
          const tfidfScore = parseFloat(categoriesTfidf[keyword]);
          if (!isNaN(tfidfScore)) {
            score += tfidfScore * 2.5; // Higher weight for category matches
            matchedKeywords.push(`category:${keyword}`);
          }
        }
      }
      
      // Quality boost
      score += (app.apps_unified.rating || 0) / 5.0 * 0.1;
      
      if (score > 0.1) {
        results.push({
          app_id: app.app_id.toString(),
          app_name: app.apps_unified.title,
          category: app.apps_unified.primary_category,
          rating: app.apps_unified.rating || 0,
          description: app.apps_unified.description || '',
          icon_url: app.apps_unified.icon_url,
          keyword_score: score,
          matched_keywords: matchedKeywords,
          topic_match: false,
          source: 'keyword_tfidf'
        });
      }
    });
    
    return results
      .sort((a, b) => b.keyword_score - a.keyword_score)
      .slice(0, limit);
    
  } catch (error) {
    console.error('❌ Focused keyword search error:', error);
    return [];
  }
}

/**
 * Combines results with intent-aware ranking
 */
async function combineWithIntentRanking(
  semanticResults: any[],
  keywordResults: any[],
  intent: QueryIntent,
  limit: number
): Promise<SmartSearchResult[]> {
  const combinedMap = new Map<string, any>();
  
  // Add semantic results
  semanticResults.forEach(result => {
    combinedMap.set(result.app_id, {
      ...result,
      semantic_similarity: result.semantic_similarity || 0,
      keyword_relevance: 0,
      matched_concepts: []
    });
  });
  
  // Add/merge keyword results
  keywordResults.forEach(result => {
    if (combinedMap.has(result.app_id)) {
      const existing = combinedMap.get(result.app_id);
      existing.keyword_relevance = result.keyword_score;
      existing.matched_concepts = result.matched_keywords || [];
    } else {
      combinedMap.set(result.app_id, {
        ...result,
        semantic_similarity: 0,
        keyword_relevance: result.keyword_score,
        matched_concepts: result.matched_keywords || []
      });
    }
  });
  
  // Calculate final scores with intent awareness
  const finalResults: SmartSearchResult[] = [];
  
  for (const [appId, result] of combinedMap) {
    // Calculate intent match score
    const intentMatchScore = calculateAppIntentMatch(result, intent);
    
    // Calculate final score with intent emphasis
    const finalScore = 
      (result.semantic_similarity * 0.4) +
      (result.keyword_relevance * 0.3) +
      (intentMatchScore * 0.3);
    
    // Generate explanation
    const explanation = generateExplanation(result, intent, finalScore);
    
    finalResults.push({
      app_id: result.app_id,
      app_data: {
        name: result.app_name,
        category: result.category,
        rating: result.rating,
        icon_url: result.icon_url,
        description: result.description
      },
      relevance_score: result.relevance_score || finalScore,
      intent_match_score: intentMatchScore,
      semantic_similarity: result.semantic_similarity,
      keyword_relevance: result.keyword_relevance,
      final_score: finalScore,
      explanation,
      matched_concepts: result.matched_concepts
    });
  }
  
  // Sort by final score and assign ranks
  return finalResults
    .sort((a, b) => b.final_score - a.final_score)
    .slice(0, limit)
    .map((result, index) => ({
      ...result,
      rank: index + 1
    }));
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

function calculateIntentRelevance(app: any, intent: QueryIntent): number {
  let boost = 0;
  
  const text = `${app.title} ${app.description}`.toLowerCase();
  
  // Check for main topic mentions
  if (text.includes(intent.main_topic.toLowerCase())) {
    boost += 0.3;
  }
  
  // Check for key concepts
  for (const concept of intent.key_concepts) {
    if (text.includes(concept.toLowerCase())) {
      boost += 0.1;
    }
  }
  
  return Math.min(boost, 0.6); // Cap the boost
}

function calculateTopicRelevance(app: any, mainTopic: string, searchFocus: string[]): number {
  const text = `${app.title} ${app.description}`.toLowerCase();
  let score = 0;
  
  // High score for main topic in title
  if (app.title.toLowerCase().includes(mainTopic.toLowerCase())) {
    score += 0.8;
  }
  
  // Medium score for main topic in description
  if (app.description && app.description.toLowerCase().includes(mainTopic.toLowerCase())) {
    score += 0.4;
  }
  
  // Small scores for focus keywords
  for (const keyword of searchFocus) {
    if (text.includes(keyword.toLowerCase())) {
      score += 0.1;
    }
  }
  
  return score;
}

function calculateAppIntentMatch(app: any, intent: QueryIntent): number {
  let score = 0;
  
  const text = `${app.app_name} ${app.description}`.toLowerCase();
  
  // Strong match for main topic
  if (text.includes(intent.main_topic.toLowerCase())) {
    score += 0.8;
  }
  
  // Medium match for key concepts
  for (const concept of intent.key_concepts) {
    if (text.includes(concept.toLowerCase())) {
      score += 0.2;
    }
  }
  
  return Math.min(score, 1.0);
}

function generateExplanation(result: any, intent: QueryIntent, score: number): string {
  const reasons = [];
  
  if (result.semantic_similarity > 0.6) {
    reasons.push('high semantic similarity');
  }
  
  if (result.topic_match) {
    reasons.push(`matches main topic "${intent.main_topic}"`);
  }
  
  if (result.matched_concepts && result.matched_concepts.length > 0) {
    reasons.push(`keyword matches: ${result.matched_concepts.slice(0, 2).join(', ')}`);
  }
  
  if (result.rating > 4.0) {
    reasons.push('highly rated');
  }
  
  return reasons.length > 0 ? `Recommended because: ${reasons.join(', ')}` : 'General relevance match';
}

function extractMainTopic(query: string): string {
  const words = query.toLowerCase().split(/\s+/);
  const topics = ['plant', 'fitness', 'finance', 'health', 'music', 'photo', 'game'];
  
  for (const topic of topics) {
    if (words.some(word => word.includes(topic))) {
      return topic;
    }
  }
  
  return words.find(word => word.length > 4) || 'general';
}

function extractKeywords(query: string): string[] {
  const stopWords = new Set(['i', 'wish', 'there', 'were', 'that', 'help', 'me', 'how', 'to', 'the', 'a', 'an', 'and', 'or', 'but', 'apps']);
  
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}