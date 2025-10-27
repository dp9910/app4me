/**
 * Intent-Driven Search Pipeline
 * 1. LLM analyzes user intent and determines what they're looking for
 * 2. LLM generates specific database search strategies
 * 3. Targeted database search with specific app names and keywords
 * 4. Semantic refinement using embeddings
 * 5. Final ranking and selection of top results
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export interface UserIntent {
  user_goal: string;
  app_type: string;
  specific_features: string[];
  avoid_categories: string[];
  search_terms: {
    app_names: string[];
    exact_keywords: string[];
    category_keywords: string[];
  };
  confidence: number;
}

export interface SearchOptimization {
  search_focus: 'exact_apps' | 'keywords' | 'features' | 'semantic' | 'hybrid';
  exact_app_names: string[];
  title_keywords: string[];
  description_keywords: string[];
  feature_filters: {
    use_case_keywords: string[];
    target_user_keywords: string[];
    benefit_keywords: string[];
  };
  semantic_query: string;
  category_hints: string[];
  exclude_categories: string[];
  priority_weights: {
    exact_names: number;
    features: number;
    titles: number;
    semantics: number;
    descriptions: number;
    categories: number;
  };
}

export interface IntentDrivenResult {
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
  search_method: string;
}

/**
 * Main intent-driven search function
 */
export async function intentDrivenSearch(
  query: string,
  limit: number = 20
): Promise<IntentDrivenResult[]> {
  console.log(`🧠 Starting intent-driven search for: "${query}"`);
  
  try {
    // Step 1: Analyze user intent with LLM
    console.log('🤔 Step 1: Understanding user intent...');
    const userIntent = await analyzeUserIntent(query);
    console.log(`✅ User intent:`, JSON.stringify(userIntent, null, 2));
    
    // Step 2: Targeted database search based on intent
    console.log('🎯 Step 2: Searching database with specific terms...');
    const targetedResults = await performTargetedSearch(userIntent, limit * 3);
    console.log(`📱 Found ${targetedResults.length} targeted results`);
    
    // Step 3: Semantic refinement using embeddings
    console.log('🧮 Step 3: Semantic refinement with embeddings...');
    const refinedResults = await semanticRefinement(query, targetedResults, userIntent);
    console.log(`✨ Refined to ${refinedResults.length} semantic results`);
    
    // Step 4: Final ranking and selection
    const finalResults = await finalRankingAndSelection(refinedResults, userIntent, limit);
    
    console.log(`✅ Intent-driven search completed: ${finalResults.length} final results`);
    return finalResults;
    
  } catch (error) {
    console.error('❌ Intent-driven search error:', error);
    throw error;
  }
}

/**
 * Step 1: Get search optimization strategy from LLM
 */
async function getSearchOptimization(query: string): Promise<SearchOptimization> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `You are an expert mobile app discovery assistant that optimizes database searches.

DATABASE SCHEMA: Our unified_apps table contains app_name, description, category, rating; app_embeddings table has semantic vectors; app_features table has primary_use_case, target_user, key_benefit, and TF-IDF keywords.

SEARCH ALGORITHM: Uses 6-layer search: (1) exact app name matching, (2) title keywords, (3) description keywords, (4) app features matching, (5) embedding similarity, (6) category fallback.

USER QUERY: "${query}"

OUTPUT the optimal search strategy as JSON:
{
  "search_focus": "primary search approach (exact_apps|keywords|features|semantic|hybrid)",
  "exact_app_names": ["specific app names to search for"],
  "title_keywords": ["most important keywords for app titles"],
  "description_keywords": ["keywords for app descriptions"],
  "feature_filters": {
    "use_case_keywords": ["keywords for primary_use_case field"],
    "target_user_keywords": ["keywords for target_user field"],
    "benefit_keywords": ["keywords for key_benefit field"]
  },
  "semantic_query": "optimized query for embedding similarity",
  "category_hints": ["relevant app categories"],
  "exclude_categories": ["categories to avoid"],
  "priority_weights": {
    "exact_names": 10,
    "features": 8,
    "titles": 7,
    "semantics": 6,
    "descriptions": 5,
    "categories": 3
  }
}`;

    const result = await model.generateContent(prompt);
    const content = result.response.text();
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from LLM response');
    }
    
    const optimization = JSON.parse(jsonMatch[0]);
    console.log('✅ Search optimization generated');
    
    return optimization;
    
  } catch (error) {
    console.error('⚠️ Search optimization failed, using fallback:', error);
    
    // Fallback optimization
    return {
      search_focus: 'hybrid',
      exact_app_names: [],
      title_keywords: extractKeywords(query),
      description_keywords: extractKeywords(query),
      feature_filters: {
        use_case_keywords: extractKeywords(query),
        target_user_keywords: [],
        benefit_keywords: []
      },
      semantic_query: query,
      category_hints: ['Lifestyle', 'Productivity'],
      exclude_categories: [],
      priority_weights: {
        exact_names: 10,
        features: 8,
        titles: 7,
        semantics: 6,
        descriptions: 5,
        categories: 3
      }
    };
  }
}

/**
 * Legacy: Analyze user intent with LLM (keeping for backward compatibility)
 */
async function analyzeUserIntent(query: string): Promise<UserIntent> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `You are an expert at understanding what mobile apps users are looking for.

Analyze this user query and determine exactly what type of app they want: "${query}"

You need to be VERY SPECIFIC about what they're looking for. Don't match generic keywords.

For example:
- "learn to take care of plants" → They want PLANT CARE apps, not language learning apps
- "help me budget" → They want FINANCE/BUDGETING apps, not general help apps
- "find food near me" → They want FOOD/RESTAURANT apps, not general discovery apps

Return JSON with:
- user_goal: What the user wants to accomplish (specific, not generic)
- app_type: Specific type of app they need (e.g., "plant care", "budget tracker", "plant identification")
- specific_features: What features the app should have (3-5 items)
- avoid_categories: Categories that would be irrelevant (3-5 items)
- search_terms: {
    app_names: Specific app names that might match (3-5 examples)
    exact_keywords: Exact keywords to search for in titles (3-5 terms)
    category_keywords: Categories to focus on (2-3 categories)
  }
- confidence: How confident you are (0.1-1.0)

Be very specific about the domain. If they mention "plants", focus only on plant-related apps.

Query: "${query}"

Return ONLY the JSON object:`;

    const result = await model.generateContent(prompt);
    const content = result.response.text();
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from LLM response');
    }
    
    const intent = JSON.parse(jsonMatch[0]);
    console.log('✅ LLM intent analysis successful');
    
    return intent;
    
  } catch (error) {
    console.error('⚠️ LLM intent analysis failed:', error);
    
    // Fallback intent analysis
    return {
      user_goal: 'Find relevant apps',
      app_type: 'general',
      specific_features: ['useful', 'well-rated', 'popular'],
      avoid_categories: ['dating', 'games'],
      search_terms: {
        app_names: [],
        exact_keywords: extractKeywords(query),
        category_keywords: ['lifestyle', 'productivity']
      },
      confidence: 0.3
    };
  }
}

/**
 * Step 2: Targeted database search based on intent
 */
async function performTargetedSearch(
  intent: UserIntent,
  limit: number
): Promise<any[]> {
  try {
    const results = [];
    
    // Search 1: Look for specific app names mentioned by LLM
    if (intent.search_terms.app_names.length > 0) {
      console.log(`🎯 Searching for specific app names: ${intent.search_terms.app_names.join(', ')}`);
      
      // Use more precise matching for app names - require word boundaries or exact matches
      const nameConditions = intent.search_terms.app_names
        .filter(name => name.length >= 3) // Only search for names with 3+ characters to avoid partial matches
        .map(name => `title.ilike.%${name}%`)
        .join(',');
      
      if (nameConditions) {
        const { data: nameMatches, error: nameError } = await supabase
          .from('apps_unified')
          .select(`
            id,
            title,
            primary_category,
            rating,
            icon_url,
            description
          `)
          .or(nameConditions)
          .limit(20);
        
        if (!nameError && nameMatches) {
          nameMatches.forEach(app => {
            // Only include if it's a good match (not just substring)
            const matchedNames = intent.search_terms.app_names.filter(name => {
              const titleLower = app.title.toLowerCase();
              const nameLower = name.toLowerCase();
              
              // Very strict matching to avoid false positives like "Everand" matching "Vera"
              return (
                // Exact match
                titleLower === nameLower ||
                // Name appears as complete word
                titleLower.includes(` ${nameLower} `) ||
                titleLower.startsWith(`${nameLower} `) ||
                titleLower.endsWith(` ${nameLower}`) ||
                // Name matches first part before colon/dash exactly
                titleLower.split(':')[0].trim().toLowerCase() === nameLower ||
                titleLower.split('-')[0].trim().toLowerCase() === nameLower ||
                // Only allow substring matching for longer, more specific names (6+ chars)
                (nameLower.length >= 6 && titleLower.includes(nameLower))
              );
            });
            
            if (matchedNames.length > 0) {
              results.push({
                ...app,
                relevance_score: 10, // High score for specific app name matches
                search_method: 'app_name',
                matched_keywords: matchedNames
              });
            }
          });
        }
      }
    }
    
    // Search 2: Look for exact keywords in titles (highest priority)
    if (intent.search_terms.exact_keywords.length > 0) {
      console.log(`🔍 Searching for exact keywords in titles: ${intent.search_terms.exact_keywords.join(', ')}`);
      
      const titleConditions = intent.search_terms.exact_keywords
        .map(keyword => `title.ilike.%${keyword}%`)
        .join(',');
      
      const { data: titleMatches, error: titleError } = await supabase
        .from('apps_unified')
        .select(`
          id,
          title,
          primary_category,
          rating,
          icon_url,
          description
        `)
        .or(titleConditions)
        .limit(30);
      
      if (!titleError && titleMatches) {
        const existingIds = new Set(results.map(r => r.id));
        
        titleMatches.forEach(app => {
          if (!existingIds.has(app.id)) {
            const matchedKeywords = intent.search_terms.exact_keywords.filter(keyword =>
              app.title.toLowerCase().includes(keyword.toLowerCase())
            );
            
            results.push({
              ...app,
              relevance_score: 8 + matchedKeywords.length, // High score for title matches
              search_method: 'title_keyword',
              matched_keywords: matchedKeywords
            });
          }
        });
      }
    }
    
    // Search 3: Look for keywords in descriptions (medium priority)
    if (intent.search_terms.exact_keywords.length > 0) {
      console.log(`📝 Searching for keywords in descriptions...`);
      
      const descConditions = intent.search_terms.exact_keywords
        .map(keyword => `description.ilike.%${keyword}%`)
        .join(',');
      
      const { data: descMatches, error: descError } = await supabase
        .from('apps_unified')
        .select(`
          id,
          title,
          primary_category,
          rating,
          icon_url,
          description
        `)
        .or(descConditions)
        .limit(50);
      
      if (!descError && descMatches) {
        const existingIds = new Set(results.map(r => r.id));
        
        descMatches.forEach(app => {
          if (!existingIds.has(app.id)) {
            const matchedKeywords = intent.search_terms.exact_keywords.filter(keyword =>
              app.description?.toLowerCase().includes(keyword.toLowerCase())
            );
            
            // Filter out apps from avoided categories
            const isAvoided = intent.avoid_categories.some(cat =>
              app.primary_category?.toLowerCase().includes(cat.toLowerCase())
            );
            
            if (!isAvoided && matchedKeywords.length > 0) {
              results.push({
                ...app,
                relevance_score: 5 + matchedKeywords.length, // Medium score for description matches
                search_method: 'description_keyword',
                matched_keywords: matchedKeywords
              });
            }
          }
        });
      }
    }
    
    // Search 4: Feature-based search using app_features table (for plant queries)
    if (intent.app_type && intent.app_type.toLowerCase().includes('plant')) {
      console.log(`🌱 Searching by app features for plant care apps...`);
      
      const { data: featureMatches, error: featureError } = await supabase
        .from('app_features')
        .select(`
          app_id,
          primary_use_case,
          target_user,
          key_benefit,
          keywords_tfidf,
          apps_unified!inner(
            id,
            title,
            primary_category,
            rating,
            icon_url,
            description
          )
        `)
        .or('primary_use_case.ilike.%plant care%,primary_use_case.ilike.%garden%,primary_use_case.ilike.%sprinkler%,target_user.ilike.%plant lovers%,key_benefit.ilike.%plants%')
        .limit(20);
      
      if (!featureError && featureMatches) {
        const existingIds = new Set(results.map(r => r.id));
        
        featureMatches.forEach(feature => {
          const appData = Array.isArray(feature.apps_unified) ? feature.apps_unified[0] : feature.apps_unified;
          
          if (!existingIds.has(appData.id)) {
            // Calculate feature-based relevance score
            let featureScore = 2; // Base score
            
            // Higher score for actual plant care use cases
            if (feature.primary_use_case?.toLowerCase().includes('plant care')) {
              featureScore += 4;
            }
            if (feature.target_user?.toLowerCase().includes('plant lovers')) {
              featureScore += 3;
            }
            if (feature.key_benefit?.toLowerCase().includes('plants')) {
              featureScore += 2;
            }
            
            // Check for plant-related keywords in TF-IDF
            if (feature.keywords_tfidf?.keywords) {
              const plantKeywords = ['plant', 'planta', 'care', 'water', 'garden'];
              plantKeywords.forEach(keyword => {
                if (feature.keywords_tfidf.keywords[keyword]) {
                  featureScore += parseFloat(feature.keywords_tfidf.keywords[keyword]) * 5;
                }
              });
            }
            
            results.push({
              id: appData.id,
              title: appData.title,
              primary_category: appData.primary_category,
              rating: appData.rating,
              icon_url: appData.icon_url,
              description: appData.description,
              relevance_score: featureScore,
              search_method: 'app_features',
              matched_keywords: [],
              feature_match: {
                use_case: feature.primary_use_case,
                target_user: feature.target_user,
                key_benefit: feature.key_benefit
              }
            });
          }
        });
      }
    }
    
    // Search 5: Embedding similarity search (semantic discovery)
    console.log(`🧠 Searching by embedding similarity for semantic matches...`);
    try {
      // Generate query embedding
      const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const embResult = await embeddingModel.embedContent(query);
      const queryEmbedding = embResult.embedding.values;
      
      if (queryEmbedding.length === 768) {
        // Get embeddings for apps not already found
        const existingIds = new Set(results.map(r => r.id));
        
        const { data: embeddingMatches, error: embError } = await supabase
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
          .limit(100); // Balanced sample for performance vs discovery
        
        if (!embError && embeddingMatches) {
          const embeddingResults = [];
          
          embeddingMatches.forEach(embMatch => {
            try {
              const appData = Array.isArray(embMatch.apps_unified) ? embMatch.apps_unified[0] : embMatch.apps_unified;
              
              if (!existingIds.has(appData.id)) {
                // Parse embedding and calculate similarity
                const appEmbedding = JSON.parse(embMatch.embedding);
                
                if (Array.isArray(appEmbedding) && appEmbedding.length === queryEmbedding.length) {
                  const similarity = calculateCosineSimilarity(queryEmbedding, appEmbedding);
                  
                  embeddingResults.push({
                    id: appData.id,
                    title: appData.title,
                    primary_category: appData.primary_category,
                    rating: appData.rating,
                    icon_url: appData.icon_url,
                    description: appData.description,
                    similarity: similarity,
                    appData: appData
                  });
                }
              }
            } catch (parseError) {
              // Skip apps with parsing errors
            }
          });
          
          // Sort by similarity and take top matches
          embeddingResults.sort((a, b) => b.similarity - a.similarity);
          
          // Add top 10 embedding matches with competitive scoring
          embeddingResults.slice(0, 10).forEach((embResult, index) => {
            // More aggressive scoring to compete with keyword matches
            // Top similarity gets score of 8, decreasing for lower ranks
            const baseScore = Math.max(4, 8 - (index * 0.3));
            const similarityBonus = embResult.similarity * 4; // Up to 4 bonus points
            const relevanceScore = baseScore + similarityBonus;
            
            results.push({
              id: embResult.id,
              title: embResult.title,
              primary_category: embResult.primary_category,
              rating: embResult.rating,
              icon_url: embResult.icon_url,
              description: embResult.description,
              relevance_score: relevanceScore,
              search_method: 'embedding_similarity',
              matched_keywords: [],
              embedding_similarity: embResult.similarity
            });
          });
          
          console.log(`✨ Found ${embeddingMatches.filter(e => {
            try {
              const appData = Array.isArray(e.apps_unified) ? e.apps_unified[0] : e.apps_unified;
              return !existingIds.has(appData.id);
            } catch { return false; }
          }).length} potential embedding matches`);
        }
      }
    } catch (embeddingError) {
      console.warn('⚠️ Embedding similarity search failed:', embeddingError.message);
    }
    
    // Search 6: Category-based search (lower priority)
    if (intent.search_terms.category_keywords.length > 0) {
      console.log(`📂 Searching by categories: ${intent.search_terms.category_keywords.join(', ')}`);
      
      const categoryConditions = intent.search_terms.category_keywords
        .map(category => `primary_category.ilike.%${category}%`)
        .join(',');
      
      const { data: categoryMatches, error: categoryError } = await supabase
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
        .limit(30);
      
      if (!categoryError && categoryMatches) {
        const existingIds = new Set(results.map(r => r.id));
        
        categoryMatches.forEach(app => {
          if (!existingIds.has(app.id)) {
            results.push({
              ...app,
              relevance_score: 3 + (app.rating || 0) / 5, // Lower score for category matches
              search_method: 'category',
              matched_keywords: []
            });
          }
        });
      }
    }
    
    // Sort by relevance score and return top results
    return results
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, limit);
    
  } catch (error) {
    console.error('❌ Targeted search error:', error);
    return [];
  }
}

/**
 * Step 3: Semantic refinement using embeddings
 */
async function semanticRefinement(
  query: string,
  targetedResults: any[],
  intent: UserIntent
): Promise<any[]> {
  try {
    if (targetedResults.length === 0) {
      return [];
    }
    
    // Generate query embedding
    const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await embeddingModel.embedContent(query);
    const queryEmbedding = result.embedding.values;
    
    if (queryEmbedding.length !== 768) {
      console.warn('⚠️ Invalid embedding dimensions, skipping semantic refinement');
      return targetedResults;
    }
    
    // Get embeddings for the targeted results
    const appIds = targetedResults.map(r => r.id);
    const { data: embeddings, error } = await supabase
      .from('app_embeddings')
      .select('app_id, embedding')
      .in('app_id', appIds);
    
    if (error) {
      console.warn('⚠️ Could not fetch embeddings, using targeted results');
      return targetedResults;
    }
    
    // Calculate semantic similarity for each app
    const embeddingMap = new Map(embeddings.map(e => [e.app_id.toString(), e.embedding]));
    
    return targetedResults.map(result => {
      const appEmbedding = embeddingMap.get(result.id.toString());
      let semanticScore = 0;
      
      if (appEmbedding) {
        semanticScore = calculateCosineSimilarity(queryEmbedding, appEmbedding);
      }
      
      return {
        ...result,
        semantic_similarity: semanticScore,
        final_relevance_score: result.relevance_score + (semanticScore * 5) // Boost with semantic similarity
      };
    });
    
  } catch (error) {
    console.error('❌ Semantic refinement error:', error);
    return targetedResults;
  }
}

/**
 * Step 4: Final ranking and selection
 */
async function finalRankingAndSelection(
  refinedResults: any[],
  intent: UserIntent,
  limit: number
): Promise<IntentDrivenResult[]> {
  // Sort by final relevance score
  const sortedResults = refinedResults
    .sort((a, b) => (b.final_relevance_score || b.relevance_score) - (a.final_relevance_score || a.relevance_score))
    .slice(0, limit);
  
  // Format results
  return sortedResults.map(result => ({
    app_id: result.id.toString(),
    app_data: {
      name: result.title || '',
      category: result.primary_category || '',
      rating: result.rating || 0,
      icon_url: result.icon_url || '',
      description: result.description || ''
    },
    relevance_score: result.final_relevance_score || result.relevance_score,
    match_reason: generateMatchReason(result, intent),
    matched_keywords: result.matched_keywords || [],
    search_method: result.search_method || 'unknown'
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

function generateMatchReason(result: any, intent: UserIntent): string {
  const reasons = [];
  
  if (result.search_method === 'app_name') {
    reasons.push('matches specific app name');
  } else if (result.search_method === 'title_keyword') {
    reasons.push('exact keyword match in title');
  } else if (result.search_method === 'description_keyword') {
    reasons.push('keyword match in description');
  } else if (result.search_method === 'app_features') {
    reasons.push('matches app features for plant care');
    if (result.feature_match?.use_case) {
      reasons.push(`use case: ${result.feature_match.use_case}`);
    }
    if (result.feature_match?.target_user) {
      reasons.push(`target: ${result.feature_match.target_user}`);
    }
  } else if (result.search_method === 'embedding_similarity') {
    reasons.push('semantic similarity match');
    if (result.embedding_similarity) {
      reasons.push(`similarity: ${(result.embedding_similarity * 100).toFixed(1)}%`);
    }
  } else if (result.search_method === 'category') {
    reasons.push('relevant category');
  }
  
  if (result.matched_keywords && result.matched_keywords.length > 0) {
    reasons.push(`keywords: ${result.matched_keywords.slice(0, 2).join(', ')}`);
  }
  
  if (result.semantic_similarity > 0.7) {
    reasons.push('high semantic similarity');
  }
  
  if (result.rating > 4.5) {
    reasons.push('highly rated');
  }
  
  return reasons.length > 0 ? reasons.join(', ') : 'relevant match';
}

function extractKeywords(query: string): string[] {
  const stopWords = new Set(['i', 'want', 'need', 'help', 'me', 'to', 'a', 'an', 'the', 'and', 'or', 'but', 'app', 'apps']);
  
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 5);
}