/**
 * Advanced Semantic Search Retriever
 * Implements state-of-the-art semantic search using Gemini embeddings
 * Part of the multi-signal recommendation system
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export interface UserProfile {
  lifestyle_tags?: string[];
  preferred_use_cases?: string[];
  preferred_categories?: string[];
  preferred_complexity?: 'beginner' | 'intermediate' | 'advanced';
  rejected_app_ids?: string[];
  liked_app_ids?: string[];
  viewed_app_ids?: string[];
}

export interface SemanticSearchResult {
  app_id: string;
  app_data: {
    name: string;
    category: string;
    rating: number;
    icon_url: string;
    description: string;
    use_cases?: string[];
  };
  similarity: number;
  retrieval_method: 'semantic';
  retrieval_score: number;
  rank?: number;
}

/**
 * Main semantic retrieval function
 * Enriches query with user context and performs vector similarity search
 */
export async function semanticRetrieval(
  query: string, 
  userProfile?: UserProfile, 
  limit: number = 30
): Promise<SemanticSearchResult[]> {
  console.log(`🔍 Semantic retrieval for: "${query}" (limit: ${limit})`);
  
  try {
    // 1. Enrich query with user context
    const enrichedQuery = enrichQueryWithContext(query, userProfile);
    console.log(`🧠 Enriched query: "${enrichedQuery}"`);
    
    // 2. Generate query embedding
    const queryEmbedding = await generateQueryEmbedding(enrichedQuery);
    console.log(`✅ Generated query embedding (${queryEmbedding.length} dimensions)`);
    
    // 3. Perform vector similarity search
    const matches = await vectorSimilaritySearch(
      queryEmbedding,
      userProfile?.rejected_app_ids || [],
      limit
    );
    
    console.log(`📊 Found ${matches.length} semantic matches`);
    
    // 4. Process and rank results
    const results = processSemanticResults(matches, query, userProfile);
    
    return results;
    
  } catch (error) {
    console.error('❌ Semantic retrieval error:', error);
    throw error;
  }
}

/**
 * Enriches user query with personal context for better matching
 */
function enrichQueryWithContext(query: string, userProfile?: UserProfile): string {
  if (!userProfile) {
    return query;
  }
  
  const contextParts: string[] = [];
  
  // Add lifestyle context
  if (userProfile.lifestyle_tags && userProfile.lifestyle_tags.length > 0) {
    contextParts.push(`User lifestyle: ${userProfile.lifestyle_tags.join(', ')}`);
  }
  
  // Add preferred use cases from history
  if (userProfile.preferred_use_cases && userProfile.preferred_use_cases.length > 0) {
    contextParts.push(`User interests: ${userProfile.preferred_use_cases.slice(0, 5).join(', ')}`);
  }
  
  // Add complexity preference
  if (userProfile.preferred_complexity) {
    contextParts.push(`Complexity preference: ${userProfile.preferred_complexity}`);
  }
  
  // Add category preferences
  if (userProfile.preferred_categories && userProfile.preferred_categories.length > 0) {
    contextParts.push(`Preferred categories: ${userProfile.preferred_categories.join(', ')}`);
  }
  
  if (contextParts.length === 0) {
    return query;
  }
  
  // Format the enriched query for better semantic understanding
  return `User query: ${query}

User context: ${contextParts.join('; ')}

Find apps that match both the specific query and the user's overall preferences and lifestyle.`;
}

/**
 * Generates high-quality embedding for the query using Gemini
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
 * Performs vector similarity search using Supabase's pgvector
 */
async function vectorSimilaritySearch(
  queryEmbedding: number[],
  rejectedAppIds: string[],
  limit: number
): Promise<any[]> {
  const { data: matches, error } = await supabase.rpc('search_apps_by_embedding', {
    query_embedding: queryEmbedding,
    match_threshold: 0.5,
    match_count: limit
  });
  
  if (error) {
    console.error('Vector search error:', error);
    throw new Error(`Vector search failed: ${error.message}`);
  }
  
  return matches || [];
}

/**
 * Processes raw vector search results into structured format
 */
function processSemanticResults(
  matches: any[],
  originalQuery: string,
  userProfile?: UserProfile
): SemanticSearchResult[] {
  return matches
    .filter(match => match.similarity > 0.5) // Filter weak matches
    .map((match, index) => ({
      app_id: match.app_id,
      app_data: {
        name: match.app_name,
        category: match.app_category,
        rating: parseFloat(match.app_rating) || 0,
        icon_url: match.app_icon,
        description: match.app_description,
        use_cases: match.app_data?.use_cases || []
      },
      similarity: parseFloat(match.similarity),
      retrieval_method: 'semantic' as const,
      retrieval_score: parseFloat(match.similarity),
      rank: index + 1
    }))
    .sort((a, b) => {
      // Enhanced ranking with user preference boost
      let scoreA = a.similarity;
      let scoreB = b.similarity;
      
      // Boost apps in preferred categories
      if (userProfile?.preferred_categories?.includes(a.app_data.category)) {
        scoreA += 0.05;
      }
      if (userProfile?.preferred_categories?.includes(b.app_data.category)) {
        scoreB += 0.05;
      }
      
      // Boost highly rated apps slightly
      if (a.app_data.rating > 4.0) scoreA += 0.02;
      if (b.app_data.rating > 4.0) scoreB += 0.02;
      
      return scoreB - scoreA;
    });
}

/**
 * Gets user profile for personalization
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error || !profile) {
      console.log(`No profile found for user: ${userId}`);
      return null;
    }
    
    return {
      lifestyle_tags: profile.lifestyle_tags || [],
      preferred_use_cases: profile.preferred_use_cases || [],
      preferred_categories: profile.preferred_categories || [],
      preferred_complexity: profile.preferred_complexity || 'intermediate',
      rejected_app_ids: profile.rejected_app_ids || [],
      liked_app_ids: profile.liked_app_ids || [],
      viewed_app_ids: profile.viewed_app_ids || []
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

/**
 * Builds anonymous profile from questionnaire data
 */
export async function buildAnonymousProfile(
  lifestyle?: string[],
  improve?: string[],
  wishText?: string
): Promise<UserProfile> {
  const profile: UserProfile = {
    lifestyle_tags: lifestyle || [],
    preferred_use_cases: improve || [],
    preferred_categories: [],
    preferred_complexity: 'intermediate',
    rejected_app_ids: [],
    liked_app_ids: [],
    viewed_app_ids: []
  };
  
  // Extract potential categories from wish text
  if (wishText) {
    const categories = extractCategoriesFromText(wishText);
    profile.preferred_categories = categories;
  }
  
  return profile;
}

/**
 * Extracts potential app categories from free text using simple keyword matching
 */
function extractCategoriesFromText(text: string): string[] {
  const categoryKeywords = {
    'Productivity': ['productive', 'organize', 'task', 'work', 'efficiency', 'planning'],
    'Health & Fitness': ['health', 'fitness', 'exercise', 'workout', 'diet', 'wellness'],
    'Finance': ['money', 'budget', 'banking', 'invest', 'expense', 'financial'],
    'Social': ['social', 'friends', 'chat', 'messaging', 'communication'],
    'Entertainment': ['entertainment', 'games', 'music', 'video', 'movies', 'fun'],
    'Education': ['learn', 'education', 'study', 'language', 'skill', 'knowledge'],
    'Travel': ['travel', 'navigation', 'maps', 'trip', 'booking'],
    'Photography': ['photo', 'camera', 'editing', 'picture', 'visual'],
    'Shopping': ['shopping', 'buy', 'purchase', 'deals', 'ecommerce'],
    'Utilities': ['utility', 'tool', 'calculator', 'converter', 'widget']
  };
  
  const lowerText = text.toLowerCase();
  const extractedCategories: string[] = [];
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      extractedCategories.push(category);
    }
  }
  
  return extractedCategories;
}

/**
 * Advanced semantic search with personalization features
 * Enhanced version that includes user behavior analysis
 */
export async function enhancedSemanticSearch(
  query: string,
  userProfile?: UserProfile,
  options: {
    limit?: number;
    diversityFactor?: number;
    personalizedBoost?: number;
  } = {}
): Promise<SemanticSearchResult[]> {
  const { limit = 30, diversityFactor = 0.3, personalizedBoost = 0.1 } = options;
  
  // Get base semantic results
  const results = await semanticRetrieval(query, userProfile, limit * 2);
  
  // Apply diversity filtering
  const diverseResults = applyDiversityFiltering(results, diversityFactor);
  
  // Apply personalized boosting
  const personalizedResults = applyPersonalizedBoosting(
    diverseResults, 
    userProfile, 
    personalizedBoost
  );
  
  return personalizedResults.slice(0, limit);
}

/**
 * Applies diversity filtering to prevent too many similar apps
 */
function applyDiversityFiltering(
  results: SemanticSearchResult[],
  diversityFactor: number
): SemanticSearchResult[] {
  const maxPerCategory = Math.max(2, Math.floor(results.length * 0.3));
  const categoryCounts: { [key: string]: number } = {};
  
  return results.filter(result => {
    const category = result.app_data.category;
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    
    // Keep if under category limit or very high similarity
    return categoryCounts[category] <= maxPerCategory || result.similarity >= 0.9;
  });
}

/**
 * Applies personalized boosting based on user preferences
 */
function applyPersonalizedBoosting(
  results: SemanticSearchResult[],
  userProfile?: UserProfile,
  boostFactor: number = 0.1
): SemanticSearchResult[] {
  if (!userProfile) return results;
  
  return results.map(result => {
    let boost = 0;
    
    // Boost preferred categories
    if (userProfile.preferred_categories?.includes(result.app_data.category)) {
      boost += boostFactor;
    }
    
    // Boost apps with similar use cases to user's interests
    if (userProfile.preferred_use_cases && result.app_data.use_cases) {
      const overlap = result.app_data.use_cases.filter(uc => 
        userProfile.preferred_use_cases!.some(puc => 
          uc.toLowerCase().includes(puc.toLowerCase()) ||
          puc.toLowerCase().includes(uc.toLowerCase())
        )
      ).length;
      
      if (overlap > 0) {
        boost += (overlap / result.app_data.use_cases.length) * boostFactor;
      }
    }
    
    return {
      ...result,
      retrieval_score: Math.min(1.0, result.retrieval_score + boost)
    };
  }).sort((a, b) => b.retrieval_score - a.retrieval_score);
}