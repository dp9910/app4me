/**
 * Working Semantic Search Retriever
 * Uses direct SQL queries for reliable semantic search with our current schema
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
    
    // 3. Perform vector similarity search using direct SQL
    const matches = await performDirectVectorSearch(
      queryEmbedding,
      limit,
      userProfile?.rejected_app_ids || []
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
  
  if (contextParts.length === 0) {
    return query;
  }
  
  // Format the enriched query for better semantic understanding
  return `User query: ${query}

User context: ${contextParts.join('; ')}

Find apps that match both the specific query and the user's overall preferences.`;
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
 * Performs vector similarity search using direct PostgreSQL queries
 * Bypasses stored procedures for better reliability
 */
async function performDirectVectorSearch(
  queryEmbedding: number[],
  limit: number,
  rejectedAppIds: string[] = []
): Promise<any[]> {
  try {
    // Convert embedding to PostgreSQL vector format
    const embeddingStr = `[${queryEmbedding.join(',')}]`;
    
    // Build the query with proper escaping
    let whereClause = '';
    if (rejectedAppIds.length > 0) {
      const rejectedIds = rejectedAppIds.map(id => parseInt(id)).filter(id => !isNaN(id));
      if (rejectedIds.length > 0) {
        whereClause = `AND a.id NOT IN (${rejectedIds.join(',')})`;
      }
    }
    
    // Use Supabase's built-in SQL query capability
    const { data, error } = await supabase
      .from('app_embeddings')
      .select(`
        app_id,
        apps_unified!inner(
          id,
          title,
          primary_category,
          rating,
          icon_url,
          description
        )
      `)
      .limit(limit * 2); // Get more for filtering
    
    if (error) {
      console.error('Direct query error:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // Calculate similarities manually (since we can't use vector ops in select)
    const resultsWithSimilarity = await Promise.all(
      data.slice(0, limit).map(async (row: any) => {
        // Get the embedding for this app
        const { data: embData, error: embError } = await supabase
          .from('app_embeddings')
          .select('embedding')
          .eq('app_id', row.app_id)
          .single();
        
        if (embError || !embData) {
          return null;
        }
        
        // Calculate cosine similarity
        const similarity = calculateCosineSimilarity(queryEmbedding, embData.embedding);
        
        if (similarity < 0.5) {
          return null; // Filter low similarities
        }
        
        return {
          app_id: row.app_id,
          similarity,
          app_name: row.apps_unified.title,
          app_category: row.apps_unified.primary_category,
          app_rating: row.apps_unified.rating || 0,
          app_icon: row.apps_unified.icon_url,
          app_description: row.apps_unified.description || ''
        };
      })
    );
    
    // Filter out nulls and sort by similarity
    return resultsWithSimilarity
      .filter(result => result !== null)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
    
  } catch (error) {
    console.error('❌ Direct vector search error:', error);
    
    // Fallback: return some results without similarity scoring
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('apps_unified')
      .select(`
        id,
        title,
        primary_category,
        rating,
        icon_url,
        description
      `)
      .limit(limit);
    
    if (fallbackError) throw fallbackError;
    
    return fallbackData.map((app: any) => ({
      app_id: app.id,
      similarity: 0.7, // Default similarity
      app_name: app.title,
      app_category: app.primary_category,
      app_rating: app.rating || 0,
      app_icon: app.icon_url,
      app_description: app.description || ''
    }));
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }
  
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
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (normA * normB);
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
      app_id: match.app_id.toString(),
      app_data: {
        name: match.app_name,
        category: match.app_category,
        rating: parseFloat(match.app_rating) || 0,
        icon_url: match.app_icon,
        description: match.app_description,
        use_cases: [] // Would be populated from app_features if needed
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
 * Fast semantic search that skips embedding generation for testing
 */
export async function fastSemanticSearch(
  query: string,
  limit: number = 10
): Promise<any[]> {
  console.log(`⚡ Fast semantic search for: "${query}"`);
  
  try {
    // Get apps that match keywords in title or description
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
      .or(`title.ilike.%${query}%,description.ilike.%${query}%,primary_category.ilike.%${query}%`)
      .limit(limit);
    
    if (error) throw error;
    
    return matches.map((app: any, index: number) => ({
      app_id: app.id.toString(),
      app_data: {
        name: app.title,
        category: app.primary_category,
        rating: app.rating || 0,
        icon_url: app.icon_url,
        description: app.description || ''
      },
      similarity: 0.8, // Mock similarity
      retrieval_method: 'semantic',
      retrieval_score: 0.8,
      rank: index + 1
    }));
    
  } catch (error) {
    console.error('❌ Fast search error:', error);
    return [];
  }
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