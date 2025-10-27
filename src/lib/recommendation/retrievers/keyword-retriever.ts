/**
 * Keyword Matching Retriever with TF-IDF + Taxonomy
 * Provides precision matching for app recommendations
 * Part of the multi-signal recommendation system
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export interface KeywordSearchResult {
  app_id: string;
  app_data: {
    name: string;
    category: string;
    rating: number;
    icon_url: string;
    description: string;
    use_cases?: string[];
  };
  keyword_score: number;
  matched_keywords: string[];
  retrieval_method: 'keyword';
  retrieval_score: number;
  rank?: number;
}

export interface ExtractedKeyword {
  keyword: string;
  weight: number;
  intent_type?: 'functional' | 'emotional' | 'contextual';
  category?: string;
}

/**
 * Main keyword retrieval function
 * Extracts keywords and performs TF-IDF based matching
 */
export async function keywordRetrieval(
  query: string, 
  limit: number = 30
): Promise<KeywordSearchResult[]> {
  console.log(`🔍 Keyword retrieval for: "${query}" (limit: ${limit})`);
  
  try {
    // 1. Extract keywords from query using LLM
    const extractedKeywords = await extractKeywords(query);
    console.log(`🔑 Extracted ${extractedKeywords.length} keywords:`, extractedKeywords.map(k => k.keyword));
    
    // 2. Map keywords to taxonomy for enhanced matching
    const taxonomyKeywords = await mapToTaxonomy(extractedKeywords);
    console.log(`📚 Mapped to ${taxonomyKeywords.length} taxonomy keywords`);
    
    // 3. Perform TF-IDF based search
    const matches = await performTFIDFSearch(taxonomyKeywords, limit);
    console.log(`📊 Found ${matches.length} keyword matches`);
    
    // 4. Process and rank results
    const results = processKeywordResults(matches, extractedKeywords);
    
    return results;
    
  } catch (error) {
    console.error('❌ Keyword retrieval error:', error);
    throw error;
  }
}

/**
 * Extracts keywords from query using Gemini LLM
 */
async function extractKeywords(query: string): Promise<ExtractedKeyword[]> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `Extract important keywords from this app search query. Focus on actionable terms, functionality, and user needs.

Query: "${query}"

Return JSON array of objects with:
- keyword: the extracted keyword/phrase
- weight: importance weight (0.1 to 1.0)
- intent_type: "functional" (what the app does), "emotional" (how user feels), or "contextual" (when/where used)

Focus on:
- Action words (track, manage, create, etc.)
- Object words (budget, photos, music, etc.) 
- Context words (mobile, daily, work, etc.)
- Problem words (stress, organize, learn, etc.)

Return ONLY a JSON array, maximum 8 keywords:`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    
    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('⚠️ Could not extract JSON from LLM response, using fallback');
      return fallbackKeywordExtraction(query);
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate and clean the results
    return parsed
      .filter((item: any) => item.keyword && item.weight)
      .map((item: any) => ({
        keyword: item.keyword.toLowerCase().trim(),
        weight: Math.min(1.0, Math.max(0.1, parseFloat(item.weight))),
        intent_type: ['functional', 'emotional', 'contextual'].includes(item.intent_type) 
          ? item.intent_type 
          : 'functional'
      }));
      
  } catch (error) {
    console.error('⚠️ LLM keyword extraction failed:', error);
    return fallbackKeywordExtraction(query);
  }
}

/**
 * Fallback keyword extraction using simple text processing
 */
function fallbackKeywordExtraction(query: string): ExtractedKeyword[] {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'i', 'me', 'my', 'we', 'us', 'our']);
  
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
  
  const keywords: ExtractedKeyword[] = [];
  
  // Add original words
  words.forEach((word, index, array) => {
    keywords.push({
      keyword: word,
      weight: Math.max(0.3, 1.0 - (index / array.length) * 0.5),
      intent_type: 'functional' as const
    });
  });
  
  // Add stemmed versions for better TF-IDF matching
  words.forEach((word, index, array) => {
    const stemmed = stemWord(word);
    if (stemmed !== word && stemmed.length > 2) {
      keywords.push({
        keyword: stemmed,
        weight: Math.max(0.2, 0.8 - (index / array.length) * 0.4), // Slightly lower weight for stemmed
        intent_type: 'functional' as const
      });
    }
  });
  
  return keywords;
}

/**
 * Simple stemming function for better TF-IDF matching
 */
function stemWord(word: string): string {
  // Simple rules to match the TF-IDF stemming patterns we see in the data
  let stemmed = word.toLowerCase();
  
  // Remove common suffixes
  if (stemmed.endsWith('ing')) {
    stemmed = stemmed.slice(0, -3);
  } else if (stemmed.endsWith('ed')) {
    stemmed = stemmed.slice(0, -2);
  } else if (stemmed.endsWith('er')) {
    stemmed = stemmed.slice(0, -2);
  } else if (stemmed.endsWith('s') && stemmed.length > 3) {
    stemmed = stemmed.slice(0, -1);
  }
  
  // Handle specific transformations we see in the data
  const transformations: Record<string, string> = {
    'buying': 'bui',
    'build': 'bui',
    'buy': 'bui',
    'tracking': 'track',
    'banking': 'bank',
    'management': 'manag',
    'expense': 'expens',
    'expenses': 'expens',
    'budget': 'budget', // Keep as is
    'money': 'money', // Keep as is
    'financial': 'financi',
    'finance': 'financ',
    'payment': 'payment', // Keep as is
    'payments': 'payment'
  };
  
  return transformations[word] || stemmed;
}

/**
 * Maps extracted keywords to app taxonomy for enhanced matching
 */
async function mapToTaxonomy(keywords: ExtractedKeyword[]): Promise<ExtractedKeyword[]> {
  // Built-in keyword taxonomy for app recommendations
  const keywordTaxonomy = {
    // Productivity keywords
    'productivity': { category: 'Productivity', weight: 0.9, synonyms: ['productive', 'efficiency', 'organize', 'task', 'planning'] },
    'budget': { category: 'Finance', weight: 0.95, synonyms: ['money', 'expense', 'financial', 'spending', 'cost'] },
    'health': { category: 'Health & Fitness', weight: 0.9, synonyms: ['fitness', 'wellness', 'exercise', 'diet', 'medical'] },
    'social': { category: 'Social', weight: 0.8, synonyms: ['friends', 'chat', 'messaging', 'communication', 'network'] },
    'entertainment': { category: 'Entertainment', weight: 0.8, synonyms: ['fun', 'games', 'music', 'video', 'movies'] },
    'education': { category: 'Education', weight: 0.85, synonyms: ['learn', 'study', 'language', 'skill', 'knowledge'] },
    'travel': { category: 'Travel', weight: 0.8, synonyms: ['navigation', 'maps', 'trip', 'booking', 'vacation'] },
    'photography': { category: 'Photo & Video', weight: 0.8, synonyms: ['photo', 'camera', 'editing', 'picture', 'visual'] },
    'shopping': { category: 'Shopping', weight: 0.75, synonyms: ['buy', 'purchase', 'deals', 'ecommerce', 'store'] },
    'utilities': { category: 'Utilities', weight: 0.7, synonyms: ['tool', 'calculator', 'converter', 'widget', 'utility'] },
    
    // Functional keywords
    'track': { category: 'Productivity', weight: 0.8, synonyms: ['monitor', 'log', 'record', 'follow'] },
    'manage': { category: 'Productivity', weight: 0.8, synonyms: ['organize', 'control', 'handle', 'administrate'] },
    'create': { category: 'Productivity', weight: 0.75, synonyms: ['make', 'build', 'design', 'generate'] },
    'edit': { category: 'Productivity', weight: 0.7, synonyms: ['modify', 'change', 'update', 'revise'] },
    'share': { category: 'Social', weight: 0.7, synonyms: ['send', 'distribute', 'publish', 'broadcast'] },
    'learn': { category: 'Education', weight: 0.85, synonyms: ['study', 'practice', 'master', 'understand'] },
    'exercise': { category: 'Health & Fitness', weight: 0.9, synonyms: ['workout', 'train', 'fitness', 'activity'] },
    'watch': { category: 'Entertainment', weight: 0.7, synonyms: ['view', 'stream', 'observe', 'monitor'] },
    'listen': { category: 'Music', weight: 0.8, synonyms: ['hear', 'stream', 'play', 'audio'] },
    'read': { category: 'Books', weight: 0.8, synonyms: ['browse', 'study', 'review', 'peruse'] }
  };
  
  const enhancedKeywords: ExtractedKeyword[] = [...keywords];
  
  // Add taxonomy matches
  for (const keyword of keywords) {
    const keywordText = keyword.keyword.toLowerCase();
    
    // Direct matches
    if (keywordTaxonomy[keywordText]) {
      const taxonomyEntry = keywordTaxonomy[keywordText];
      enhancedKeywords.push({
        keyword: keywordText,
        weight: Math.min(1.0, keyword.weight * taxonomyEntry.weight),
        intent_type: keyword.intent_type,
        category: taxonomyEntry.category
      });
    }
    
    // Synonym matches
    for (const [taxonomyKeyword, taxonomyData] of Object.entries(keywordTaxonomy)) {
      if (taxonomyData.synonyms.some(synonym => 
        keywordText.includes(synonym) || synonym.includes(keywordText)
      )) {
        enhancedKeywords.push({
          keyword: taxonomyKeyword,
          weight: Math.min(1.0, keyword.weight * taxonomyData.weight * 0.8), // Slight penalty for synonym match
          intent_type: keyword.intent_type,
          category: taxonomyData.category
        });
      }
    }
  }
  
  // Remove duplicates and sort by weight
  const uniqueKeywords = Array.from(
    new Map(enhancedKeywords.map(k => [k.keyword, k])).values()
  ).sort((a, b) => b.weight - a.weight);
  
  return uniqueKeywords.slice(0, 12); // Limit to top keywords
}

/**
 * Performs TF-IDF based search using our app features
 */
async function performTFIDFSearch(
  keywords: ExtractedKeyword[], 
  limit: number
): Promise<any[]> {
  try {
    // Get apps that have TF-IDF keywords matching our search keywords
    const keywordTexts = keywords.map(k => k.keyword);
    const keywordWeights = keywords.map(k => k.weight);
    
    console.log('Searching for keywords:', keywordTexts);
    
    // Query apps with TF-IDF features
    const { data: appsWithFeatures, error } = await supabase
      .from('app_features')
      .select(`
        app_id,
        keywords_tfidf,
        primary_use_case,
        target_user,
        key_benefit,
        apps_unified!inner(
          id,
          title,
          primary_category,
          rating,
          icon_url,
          description
        )
      `)
      .limit(limit * 3); // Get more for scoring
    
    if (error) {
      console.error('❌ TF-IDF search error:', error);
      throw error;
    }
    
    if (!appsWithFeatures || appsWithFeatures.length === 0) {
      console.log('⚠️ No apps with features found, using fallback search');
      return await fallbackKeywordSearch(keywordTexts, limit);
    }
    
    // Score apps based on TF-IDF keyword matches
    const scoredApps = appsWithFeatures
      .map(app => {
        const tfidfKeywords = app.keywords_tfidf || {};
        let totalScore = 0;
        const matchedKeywords: string[] = [];
        
        // Extract keywords and categories from TF-IDF data structure
        const keywordsTfidf = tfidfKeywords?.keywords || {};
        const categoriesTfidf = tfidfKeywords?.categories || {};
        
        // Calculate TF-IDF score for each search keyword
        for (let i = 0; i < keywordTexts.length; i++) {
          const keyword = keywordTexts[i];
          const weight = keywordWeights[i];
          
          // Check for exact match in keywords
          if (keywordsTfidf[keyword]) {
            const tfidfScore = parseFloat(keywordsTfidf[keyword]);
            totalScore += tfidfScore * weight;
            matchedKeywords.push(keyword);
          }
          
          // Check for exact match in categories (with higher weight)
          if (categoriesTfidf[keyword]) {
            const tfidfScore = parseFloat(categoriesTfidf[keyword]);
            if (!isNaN(tfidfScore)) {
              totalScore += tfidfScore * weight * 1.2; // Boost category matches
              matchedKeywords.push(`category:${keyword}`);
            }
          }
          
          // Check for partial matches in keywords
          const partialKeywordMatches = Object.keys(keywordsTfidf).filter(tfidfKey =>
            tfidfKey.includes(keyword) || keyword.includes(tfidfKey)
          );
          
          for (const match of partialKeywordMatches) {
            const tfidfScore = parseFloat(keywordsTfidf[match]);
            totalScore += tfidfScore * weight * 0.7; // Penalty for partial match
            matchedKeywords.push(match);
          }
          
          // Check for partial matches in categories
          const partialCategoryMatches = Object.keys(categoriesTfidf).filter(tfidfKey =>
            tfidfKey.includes(keyword) || keyword.includes(tfidfKey)
          );
          
          for (const match of partialCategoryMatches) {
            const tfidfScore = parseFloat(categoriesTfidf[match]);
            if (!isNaN(tfidfScore)) {
              totalScore += tfidfScore * weight * 0.8; // Less penalty for category partial match
              matchedKeywords.push(`category:${match}`);
            }
          }
        }
        
        // Boost score based on app quality
        const appData = Array.isArray(app.apps_unified) ? app.apps_unified[0] : app.apps_unified;
        const qualityBoost = (appData?.rating || 0) / 5.0 * 0.1;
        totalScore += qualityBoost;
        
        return {
          app_id: app.app_id,
          keyword_score: totalScore,
          matched_keywords: Array.from(new Set(matchedKeywords)), // Remove duplicates
          app_name: appData?.title || '',
          app_category: appData?.primary_category || '',
          app_rating: appData?.rating || 0,
          app_icon: appData?.icon_url || null,
          app_description: appData?.description || '',
          primary_use_case: app.primary_use_case,
          target_user: app.target_user,
          key_benefit: app.key_benefit
        };
      })
      .filter(app => app.keyword_score > 0.1) // Filter apps with very low scores
      .sort((a, b) => b.keyword_score - a.keyword_score)
      .slice(0, limit);
    
    console.log(`✅ TF-IDF search found ${scoredApps.length} scored matches`);
    return scoredApps;
    
  } catch (error) {
    console.error('❌ TF-IDF search failed:', error);
    // Fallback to simple keyword search
    return await fallbackKeywordSearch(keywords.map(k => k.keyword), limit);
  }
}

/**
 * Fallback keyword search using simple text matching
 */
async function fallbackKeywordSearch(keywords: string[], limit: number): Promise<any[]> {
  console.log('🔄 Using fallback keyword search');
  
  try {
    // Create OR conditions for title, description, and category matching
    const searchConditions = keywords
      .map(keyword => `title.ilike.%${keyword}%,description.ilike.%${keyword}%,primary_category.ilike.%${keyword}%`)
      .join(',');
    
    const { data: matches, error } = await supabase
      .from('apps_unified')
      .select(`
        id,
        title,
        primary_category,
        rating,
        icon_url,
        description
      `)
      .or(searchConditions)
      .limit(limit);
    
    if (error) throw error;
    
    return matches.map((app: any) => ({
      app_id: app.id,
      keyword_score: 0.7, // Default score
      matched_keywords: keywords.filter(keyword => 
        app.title?.toLowerCase().includes(keyword.toLowerCase()) ||
        app.description?.toLowerCase().includes(keyword.toLowerCase()) ||
        app.primary_category?.toLowerCase().includes(keyword.toLowerCase())
      ),
      app_name: app.title,
      app_category: app.primary_category,
      app_rating: app.rating || 0,
      app_icon: app.icon_url,
      app_description: app.description || ''
    }));
    
  } catch (error) {
    console.error('❌ Fallback search failed:', error);
    return [];
  }
}

/**
 * Processes keyword search results into structured format
 */
function processKeywordResults(
  matches: any[],
  originalKeywords: ExtractedKeyword[]
): KeywordSearchResult[] {
  return matches.map((match, index) => ({
    app_id: match.app_id.toString(),
    app_data: {
      name: match.app_name,
      category: match.app_category,
      rating: parseFloat(match.app_rating) || 0,
      icon_url: match.app_icon,
      description: match.app_description,
      use_cases: match.primary_use_case ? [match.primary_use_case] : []
    },
    keyword_score: parseFloat(match.keyword_score),
    matched_keywords: match.matched_keywords || [],
    retrieval_method: 'keyword' as const,
    retrieval_score: parseFloat(match.keyword_score),
    rank: index + 1
  }));
}

/**
 * Enhanced keyword search with category boosting
 */
export async function enhancedKeywordSearch(
  query: string,
  preferredCategories: string[] = [],
  options: {
    limit?: number;
    categoryBoost?: number;
    minScore?: number;
  } = {}
): Promise<KeywordSearchResult[]> {
  const { limit = 30, categoryBoost = 0.2, minScore = 0.1 } = options;
  
  // Get base keyword results
  const results = await keywordRetrieval(query, limit * 2);
  
  // Apply category boosting
  const boostedResults = results.map(result => {
    let boostedScore = result.keyword_score;
    
    // Boost if app is in preferred categories
    if (preferredCategories.includes(result.app_data.category)) {
      boostedScore += categoryBoost;
    }
    
    return {
      ...result,
      retrieval_score: boostedScore
    };
  });
  
  // Filter and sort by boosted score
  return boostedResults
    .filter(result => result.retrieval_score >= minScore)
    .sort((a, b) => b.retrieval_score - a.retrieval_score)
    .slice(0, limit);
}

/**
 * Keyword search with intent-based weighting
 */
export async function intentBasedKeywordSearch(
  query: string,
  userIntent: 'discovery' | 'specific' | 'problem_solving' = 'discovery',
  limit: number = 30
): Promise<KeywordSearchResult[]> {
  const intentWeights = {
    discovery: { functional: 0.6, emotional: 0.4, contextual: 0.8 },
    specific: { functional: 1.0, emotional: 0.3, contextual: 0.5 },
    problem_solving: { functional: 0.8, emotional: 0.6, contextual: 0.9 }
  };
  
  const weights = intentWeights[userIntent];
  
  // Extract keywords with intent weighting
  const extractedKeywords = await extractKeywords(query);
  const weightedKeywords = extractedKeywords.map(keyword => ({
    ...keyword,
    weight: keyword.weight * (weights[keyword.intent_type] || 0.7)
  }));
  
  // Map to taxonomy
  const taxonomyKeywords = await mapToTaxonomy(weightedKeywords);
  
  // Perform search
  const matches = await performTFIDFSearch(taxonomyKeywords, limit);
  
  return processKeywordResults(matches, extractedKeywords);
}