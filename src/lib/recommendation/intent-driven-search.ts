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

// IMPROVED SEARCH - Step by step with filtering
async function improvedPlantCareSearch() {
  console.log('🚀 === IMPROVED PLANT CARE SEARCH WITH FILTERING ===');
  const query = "find apps that help me with plant care";
  
  try {
    const allResults = [];
    
    // Step 1: Smart keyword search with exclusions
    console.log('\n📍 STEP 1: Smart keyword search (excluding games and irrelevant apps)');
    
    const { data: smartResults, error } = await supabase
      .from('apps_unified')
      .select('id, title, primary_category, rating, description')
      .or('title.ilike.%plant care%,title.ilike.%planta%,description.ilike.%plant care%,description.ilike.%watering plants%')
      .not('title', 'ilike', '%zombies%')  // Exclude zombie games
      .not('title', 'ilike', '%focus plant%')  // Exclude focus apps
      .not('primary_category', 'eq', 'Games')  // Exclude games
      .limit(10);
    
    if (!error && smartResults) {
      console.log(`🎯 Found ${smartResults.length} relevant plant apps:`);
      smartResults.forEach((app, i) => {
        console.log(`  ${i+1}. ${app.title} (${app.primary_category}) - Rating: ${app.rating}`);
        allResults.push({
          ...app,
          relevance_score: 8,
          search_method: 'smart_keyword',
          matched_keywords: ['plant care']
        });
      });
    }
    
    // Step 2: Feature-based search
    console.log('\n📍 STEP 2: Feature-based search');
    
    const { data: featureResults, error: featureError } = await supabase
      .from('app_features')
      .select(`
        app_id,
        primary_use_case,
        target_user,
        key_benefit,
        apps_unified!inner(id, title, primary_category, rating, description)
      `)
      .or('primary_use_case.ilike.%plant care%,target_user.ilike.%plant lovers%,key_benefit.ilike.%plant health%')
      .limit(5);
    
    if (!featureError && featureResults) {
      console.log(`🌱 Found ${featureResults.length} apps via features:`);
      featureResults.forEach((feature, i) => {
        const app = Array.isArray(feature.apps_unified) ? feature.apps_unified[0] : feature.apps_unified;
        console.log(`  ${i+1}. ${app.title} (${app.primary_category})`);
        console.log(`     → Use case: ${feature.primary_use_case}`);
        
        // Add to results if not already included
        if (!allResults.find(r => r.id === app.id)) {
          allResults.push({
            ...app,
            relevance_score: 9,
            search_method: 'features',
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
    
    // Step 3: Apply smart filtering to remove false positives
    console.log('\n📍 STEP 3: Applying smart filters');
    
    const filteredResults = allResults.filter(app => {
      const title = app.title.toLowerCase();
      const category = app.primary_category?.toLowerCase() || '';
      
      // Exclude obvious false positives
      if (title.includes('zombies') || title.includes('zombie')) return false;
      if (title.includes('focus plant') || title.includes('forest')) return false;
      if (category === 'games') return false;
      if (title.includes('vs.') || title.includes('versus')) return false;
      
      return true;
    });
    
    console.log(`🧹 Filtered from ${allResults.length} to ${filteredResults.length} results`);
    
    // Step 4: Final ranked results
    console.log('\n📍 STEP 4: Final ranked results for plant care:');
    const finalResults = filteredResults
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, 5);
    
    finalResults.forEach((app, i) => {
      console.log(`  ${i+1}. ${app.title} (${app.primary_category}) - Score: ${app.relevance_score}`);
      console.log(`     Method: ${app.search_method}, Rating: ${app.rating}`);
      if (app.feature_match) {
        console.log(`     Feature: ${app.feature_match.use_case}`);
      }
    });
    
    console.log(`\n✅ SUCCESS: Found ${finalResults.length} highly relevant plant care apps!`);
    return finalResults;
    
  } catch (error) {
    console.error('❌ Improved search failed:', error);
    return [];
  }
}

// Removed automatic test execution to prevent interference with main search

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
 * Main intent-driven search function - Simplified approach based on smart-hybrid-retriever
 */
export async function intentDrivenSearch(
  query: string,
  limit: number = 20
): Promise<IntentDrivenResult[]> {
  console.log(`🧠 Starting simplified LLM-powered search for: "${query}"`);
  
  try {
    // Step 1: Simple LLM Intent Analysis (like smart-hybrid-retriever)
    console.log('🤔 Step 1: Analyzing query intent...');
    const queryIntent = await analyzeSimpleIntent(query);
    console.log(`🎯 Intent: ${queryIntent.main_topic} (${queryIntent.intent_type})`);
    console.log(`🔍 Focus: ${queryIntent.search_focus.join(', ')}`);
    
    // Step 2: Semantic Search with actual vector similarity
    console.log('🧮 Step 2: Semantic search with embeddings...');
    const semanticResults = await performSimpleSemanticSearch(queryIntent, limit * 2);
    console.log(`✨ Found ${semanticResults.length} semantic results`);
    
    // Step 3: Focused keyword search
    console.log('🔍 Step 3: Focused keyword search...');
    const keywordResults = await performSimpleKeywordSearch(queryIntent, limit * 2);
    console.log(`📝 Found ${keywordResults.length} keyword results`);
    
    // Step 4: Combine and rank results
    console.log('🚀 Step 4: Combining and ranking results...');
    const finalResults = await combineSimpleResults(semanticResults, keywordResults, queryIntent, limit);
    
    console.log(`✅ Simplified search completed: ${finalResults.length} final results`);
    return finalResults;
    
  } catch (error) {
    console.error('❌ Simplified search error:', error);
    throw error;
  }
}

/**
 * Simple Intent Analysis (based on smart-hybrid-retriever pattern)
 */
async function analyzeSimpleIntent(query: string): Promise<{
  main_topic: string;
  user_need: string;
  intent_type: 'learn' | 'solve' | 'discover' | 'manage' | 'entertainment';
  key_concepts: string[];
  search_focus: string[];
  semantic_query: string;
}> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
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
Query: "app to take care of plants"
Response: {
  "main_topic": "plants",
  "user_need": "learn plant care and gardening",
  "intent_type": "manage",
  "key_concepts": ["plant care", "gardening", "watering", "plant health", "growth"],
  "search_focus": ["plant", "care", "garden", "water", "grow"],
  "semantic_query": "plant care management and gardening apps"
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
    console.error('⚠️ Simple intent analysis failed:', error);
    
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
 * Simple Semantic Search (like smart-hybrid-retriever)
 */
async function performSimpleSemanticSearch(
  intent: any,
  limit: number
): Promise<any[]> {
  try {
    // Generate query embedding
    const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await embeddingModel.embedContent(intent.semantic_query);
    const queryEmbedding = result.embedding.values;
    
    if (queryEmbedding.length !== 768) {
      throw new Error(`Invalid embedding dimensions: ${queryEmbedding.length}, expected 768`);
    }
    
    // Get apps with embeddings (smaller sample for speed)
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
      .limit(150); // Reduced sample size for better performance
    
    if (error) throw error;
    
    const results = [];
    
    for (const app of appsWithEmbeddings) {
      if (!app.embedding) continue;
      
      try {
        // Parse embedding and calculate cosine similarity
        const appEmbedding = JSON.parse(app.embedding);
        if (!Array.isArray(appEmbedding) || appEmbedding.length !== 768) continue;
        
        const similarity = calculateCosineSimilarity(queryEmbedding, appEmbedding);
        
        // Intent relevance boost
        const appData = Array.isArray(app.apps_unified) ? app.apps_unified[0] : app.apps_unified;
        const intentBoost = calculateSimpleIntentRelevance(appData, intent);
        
        // Combined relevance score
        const relevanceScore = similarity + intentBoost;
        
        if (relevanceScore > 0.4) { // Higher threshold for relevance
          results.push({
            id: app.app_id.toString(),
            title: appData?.title || '',
            primary_category: appData?.primary_category || '',
            rating: appData?.rating || 0,
            description: appData?.description || '',
            icon_url: appData?.icon_url || null,
            relevance_score: relevanceScore,
            search_method: 'semantic',
            matched_keywords: [],
            semantic_similarity: similarity,
            intent_boost: intentBoost
          });
        }
      } catch (parseError) {
        // Skip apps with parsing errors
        continue;
      }
    }
    
    // Sort by relevance and return top results
    return results
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, limit);
    
  } catch (error) {
    console.error('❌ Simple semantic search error:', error);
    return [];
  }
}

/**
 * Simple Keyword Search (focused on main topic)
 */
async function performSimpleKeywordSearch(
  intent: any,
  limit: number
): Promise<any[]> {
  try {
    // Build search for main topic and focus keywords
    const searchTerms = [intent.main_topic, ...intent.search_focus];
    const searchQueries = searchTerms.map(term => 
      `title.ilike.%${term}%,description.ilike.%${term}%`
    ).join(',');
    
    console.log(`🔍 Searching for keywords: ${searchTerms.join(', ')}`);
    
    const { data: topicApps, error } = await supabase
      .from('apps_unified')
      .select(`
        id,
        title,
        primary_category,
        rating,
        icon_url,
        description
      `)
      .or(searchQueries)
      .limit(50);
    
    if (error) throw error;
    
    console.log(`📱 Found ${topicApps.length} apps from keyword search`);
    
    const results = [];
    
    // Score apps based on topic relevance
    topicApps.forEach(app => {
      const topicRelevance = calculateSimpleTopicRelevance(app, intent.main_topic, intent.search_focus);
      
      results.push({
        id: app.id.toString(),
        title: app.title,
        primary_category: app.primary_category,
        rating: app.rating || 0,
        description: app.description || '',
        icon_url: app.icon_url,
        relevance_score: topicRelevance,
        search_method: 'keyword',
        matched_keywords: searchTerms.filter(term => 
          app.title.toLowerCase().includes(term.toLowerCase()) ||
          app.description?.toLowerCase().includes(term.toLowerCase())
        ),
        keyword_score: topicRelevance
      });
    });
    
    return results
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, limit);
    
  } catch (error) {
    console.error('❌ Simple keyword search error:', error);
    return [];
  }
}

/**
 * Simple Results Combination
 */
async function combineSimpleResults(
  semanticResults: any[],
  keywordResults: any[],
  intent: any,
  limit: number
): Promise<IntentDrivenResult[]> {
  const combinedMap = new Map<string, any>();
  
  // Add semantic results
  semanticResults.forEach(result => {
    combinedMap.set(result.id, {
      ...result,
      semantic_similarity: result.semantic_similarity || 0,
      keyword_relevance: 0
    });
  });
  
  // Add/merge keyword results
  keywordResults.forEach(result => {
    if (combinedMap.has(result.id)) {
      const existing = combinedMap.get(result.id);
      existing.keyword_relevance = result.keyword_score;
      existing.matched_keywords = [...(existing.matched_keywords || []), ...(result.matched_keywords || [])];
    } else {
      combinedMap.set(result.id, {
        ...result,
        semantic_similarity: 0,
        keyword_relevance: result.keyword_score || result.relevance_score
      });
    }
  });
  
  // Calculate final scores (like smart-hybrid-retriever)
  const finalResults: IntentDrivenResult[] = [];
  
  for (const [appId, result] of Array.from(combinedMap)) {
    // Simple scoring: 40% semantic + 40% keyword + 20% rating
    const finalScore = 
      (result.semantic_similarity * 0.4) +
      (result.keyword_relevance * 0.4) +
      ((result.rating / 5.0) * 0.2);
    
    finalResults.push({
      app_id: result.id,
      app_data: {
        name: result.title,
        category: result.primary_category,
        rating: result.rating,
        icon_url: result.icon_url,
        description: result.description
      },
      relevance_score: finalScore,
      match_reason: generateSimpleMatchReason(result, intent),
      matched_keywords: result.matched_keywords || [],
      search_method: result.search_method
    });
  }
  
  // Sort by final score
  return finalResults
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, limit);
}

/**
 * Helper functions
 */
function calculateSimpleIntentRelevance(app: any, intent: any): number {
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

function calculateSimpleTopicRelevance(app: any, mainTopic: string, searchFocus: string[]): number {
  const title = app.title.toLowerCase();
  const description = (app.description || '').toLowerCase();
  let score = 0;
  
  // Very high score for exact topic match in title
  if (title.includes(mainTopic.toLowerCase())) {
    score += 1.0;
  }
  
  // High score for topic in description
  if (description.includes(mainTopic.toLowerCase())) {
    score += 0.6;
  }
  
  // Score for focus keywords
  for (const keyword of searchFocus) {
    const keywordLower = keyword.toLowerCase();
    if (title.includes(keywordLower)) {
      score += 0.8; // Higher weight for title matches
    } else if (description.includes(keywordLower)) {
      score += 0.3; // Medium weight for description matches
    }
  }
  
  return score;
}

function generateSimpleMatchReason(result: any, intent: any): string {
  const reasons = [];
  
  if (result.semantic_similarity > 0.6) {
    reasons.push('high semantic similarity');
  }
  
  if (result.keyword_relevance > 0.8) {
    reasons.push(`matches main topic "${intent.main_topic}"`);
  }
  
  if (result.matched_keywords && result.matched_keywords.length > 0) {
    reasons.push(`keyword matches: ${result.matched_keywords.slice(0, 2).join(', ')}`);
  }
  
  if (result.rating > 4.0) {
    reasons.push('highly rated');
  }
  
  return reasons.length > 0 ? reasons.join(', ') : 'General relevance match';
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

/**
 * Legacy: Step 1: Enhanced LLM Intent Classification and Smart Filtering
 */
async function analyzeIntentAndFilter(query: string): Promise<{
  intent: UserIntent;
  shouldExclude: (app: any) => boolean;
  relevanceBoost: (app: any) => number;
}> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `You are an expert at understanding app search intent and filtering irrelevant results.

USER QUERY: "${query}"

TASK 1: Analyze what the user ACTUALLY wants (not just keywords):
- Are they looking for tools to DO something or just games/entertainment?
- Do they want functional apps or decorative/design apps?
- What's their primary goal?

TASK 2: Identify apps to EXCLUDE to avoid false positives:
- Games that use keywords but aren't tools (like "Plants vs Zombies" for plant care)
- Design/art apps when user wants functional tools
- Food delivery apps when searching for other topics
- Entertainment apps when looking for productivity tools

TASK 3: Identify relevance boosters:
- What categories are most relevant?
- What features make an app highly relevant?
- What keywords in titles/descriptions indicate true relevance?

Return JSON:
{
  "user_intent": {
    "primary_goal": "what the user wants to accomplish",
    "app_type": "specific type of functional app needed",
    "functional_keywords": ["keywords indicating real functionality"],
    "avoid_entertainment": true/false,
    "avoid_games": true/false,
    "avoid_design_only": true/false,
    "target_categories": ["most relevant categories"],
    "exclude_categories": ["categories to avoid"],
    "confidence": 0.1-1.0
  },
  "exclusion_rules": {
    "exclude_if_title_contains": ["words that indicate irrelevant apps"],
    "exclude_if_category_is": ["categories to completely avoid"],
    "exclude_if_description_contains": ["description patterns to avoid"],
    "exclude_games_unless": ["exceptions for game exclusion"]
  },
  "relevance_boosters": {
    "high_relevance_title_words": ["words in title that indicate perfect match"],
    "high_relevance_categories": ["categories that get priority"],
    "functionality_indicators": ["description words that indicate real utility"],
    "target_user_signals": ["words indicating target audience match"]
  }
}

Be VERY specific about excluding irrelevant results. For plant care, exclude games, design apps, food delivery, etc.`;

    const result = await model.generateContent(prompt);
    const content = result.response.text();
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from LLM response');
    }
    
    const analysis = JSON.parse(jsonMatch[0]);
    console.log('🧠 LLM Intent Analysis:', JSON.stringify(analysis.user_intent, null, 2));
    
    // Create exclusion function
    const shouldExclude = (app: any): boolean => {
      const title = app.title?.toLowerCase() || '';
      const category = app.primary_category?.toLowerCase() || '';
      const description = app.description?.toLowerCase() || '';
      
      // Check title exclusions
      if (analysis.exclusion_rules.exclude_if_title_contains?.some((word: string) => 
        title.includes(word.toLowerCase()))) {
        return true;
      }
      
      // Check category exclusions
      if (analysis.exclusion_rules.exclude_if_category_is?.some((cat: string) => 
        category.includes(cat.toLowerCase()))) {
        return true;
      }
      
      // Check description exclusions
      if (analysis.exclusion_rules.exclude_if_description_contains?.some((word: string) => 
        description.includes(word.toLowerCase()))) {
        return true;
      }
      
      return false;
    };
    
    // Create relevance boost function
    const relevanceBoost = (app: any): number => {
      let boost = 0;
      const title = app.title?.toLowerCase() || '';
      const category = app.primary_category?.toLowerCase() || '';
      const description = app.description?.toLowerCase() || '';
      
      // High relevance title words
      analysis.relevance_boosters.high_relevance_title_words?.forEach((word: string) => {
        if (title.includes(word.toLowerCase())) {
          boost += 3;
        }
      });
      
      // High relevance categories
      analysis.relevance_boosters.high_relevance_categories?.forEach((cat: string) => {
        if (category.includes(cat.toLowerCase())) {
          boost += 2;
        }
      });
      
      // Functionality indicators
      analysis.relevance_boosters.functionality_indicators?.forEach((word: string) => {
        if (description.includes(word.toLowerCase())) {
          boost += 1;
        }
      });
      
      return boost;
    };
    
    return {
      intent: analysis.user_intent,
      shouldExclude,
      relevanceBoost
    };
    
  } catch (error) {
    console.error('⚠️ LLM intent analysis failed:', error);
    
    // Fallback
    return {
      intent: {
        primary_goal: 'Find relevant apps',
        app_type: 'general',
        functional_keywords: extractKeywords(query),
        avoid_entertainment: false,
        avoid_games: false,
        avoid_design_only: false,
        target_categories: ['Lifestyle', 'Productivity'],
        exclude_categories: [],
        confidence: 0.3
      },
      shouldExclude: () => false,
      relevanceBoost: () => 0
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
 * Enhanced Feature-Based Search using app_features table
 */
async function enhancedFeatureSearch(
  query: string,
  intent: any,
  limit: number
): Promise<any[]> {
  try {
    console.log('🌟 Searching app_features table with LLM-enhanced queries...');
    
    // Generate feature-specific search terms using LLM
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const featurePrompt = `Based on this user query: "${query}"
    
Generate specific search terms for app features database with these fields:
- primary_use_case: What the app is primarily used for
- target_user: Who the app is designed for  
- key_benefit: Main benefit/value proposition
- keywords_tfidf: Important keywords with scores

Return JSON with specific search terms:
{
  "use_case_terms": ["specific use case terms"],
  "target_user_terms": ["target user types"],
  "benefit_terms": ["key benefits to search for"],
  "tfidf_keywords": ["important keywords for TF-IDF matching"]
}

For plant care: focus on "plant care", "watering", "gardening", "plant lovers", "plant health", etc.`;

    const featureResult = await model.generateContent(featurePrompt);
    const featureContent = featureResult.response.text();
    
    let featureTerms;
    try {
      const jsonMatch = featureContent.match(/\{[\s\S]*\}/);
      featureTerms = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      featureTerms = null;
    }
    
    if (!featureTerms) {
      // Fallback terms
      featureTerms = {
        use_case_terms: ['plant care', 'garden', 'watering'],
        target_user_terms: ['plant lovers', 'gardeners'],
        benefit_terms: ['plant health', 'care tracking'],
        tfidf_keywords: ['plant', 'care', 'water', 'garden']
      };
    }
    
    console.log('🎯 Feature search terms:', featureTerms);
    
    // Build comprehensive feature search
    const searchConditions = [];
    
    // Primary use case search
    featureTerms.use_case_terms?.forEach((term: string) => {
      searchConditions.push(`primary_use_case.ilike.%${term}%`);
    });
    
    // Target user search
    featureTerms.target_user_terms?.forEach((term: string) => {
      searchConditions.push(`target_user.ilike.%${term}%`);
    });
    
    // Key benefit search
    featureTerms.benefit_terms?.forEach((term: string) => {
      searchConditions.push(`key_benefit.ilike.%${term}%`);
    });
    
    if (searchConditions.length === 0) {
      return [];
    }
    
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
      .or(searchConditions.join(','))
      .limit(limit);
    
    if (featureError || !featureMatches) {
      console.warn('⚠️ Feature search failed:', featureError);
      return [];
    }
    
    const results = [];
    featureMatches.forEach(feature => {
      const appData = Array.isArray(feature.apps_unified) ? feature.apps_unified[0] : feature.apps_unified;
      
      if (appData) {
        // Calculate feature relevance score
        let featureScore = 5; // Base score
        
        // Boost for exact use case matches
        featureTerms.use_case_terms?.forEach((term: string) => {
          if (feature.primary_use_case?.toLowerCase().includes(term.toLowerCase())) {
            featureScore += 4;
          }
        });
        
        // Boost for target user matches
        featureTerms.target_user_terms?.forEach((term: string) => {
          if (feature.target_user?.toLowerCase().includes(term.toLowerCase())) {
            featureScore += 3;
          }
        });
        
        // Boost for benefit matches
        featureTerms.benefit_terms?.forEach((term: string) => {
          if (feature.key_benefit?.toLowerCase().includes(term.toLowerCase())) {
            featureScore += 2;
          }
        });
        
        // TF-IDF keyword scoring
        if (feature.keywords_tfidf?.keywords) {
          featureTerms.tfidf_keywords?.forEach((keyword: string) => {
            const score = feature.keywords_tfidf.keywords[keyword.toLowerCase()];
            if (score) {
              featureScore += parseFloat(score) * 3;
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
          search_method: 'enhanced_features',
          matched_keywords: [],
          feature_details: {
            use_case: feature.primary_use_case,
            target_user: feature.target_user,
            key_benefit: feature.key_benefit,
            tfidf_score: feature.keywords_tfidf
          }
        });
      }
    });
    
    return results.sort((a, b) => b.relevance_score - a.relevance_score);
    
  } catch (error) {
    console.error('❌ Enhanced feature search error:', error);
    return [];
  }
}

/**
 * Enhanced Semantic Search using embeddings with LLM query optimization
 */
async function enhancedSemanticSearch(
  query: string,
  intent: any,
  limit: number
): Promise<any[]> {
  try {
    console.log('🧠 Enhanced semantic search with query optimization...');
    
    // Generate optimized semantic queries using LLM
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const semanticPrompt = `User wants: "${query}"
    
Generate 3 optimized semantic search queries that would find the most relevant apps:
1. One focused on the main functionality
2. One focused on user benefits  
3. One focused on specific use cases

Return JSON:
{
  "primary_query": "main functionality focused query",
  "benefit_query": "user benefit focused query", 
  "usecase_query": "specific use case focused query"
}

For plant care example:
- primary: "app for taking care of plants and monitoring plant health"
- benefit: "help users keep their plants healthy and thriving"
- usecase: "watering reminders and plant care tracking tools"`;

    const semanticResult = await model.generateContent(semanticPrompt);
    const semanticContent = semanticResult.response.text();
    
    let semanticQueries;
    try {
      const jsonMatch = semanticContent.match(/\{[\s\S]*\}/);
      semanticQueries = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      semanticQueries = null;
    }
    
    if (!semanticQueries) {
      // Fallback to original query
      semanticQueries = {
        primary_query: query,
        benefit_query: query,
        usecase_query: query
      };
    }
    
    console.log('🎯 Semantic queries:', semanticQueries);
    
    // Generate embeddings for all three queries
    const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    
    const allResults = [];
    const queries = [semanticQueries.primary_query, semanticQueries.benefit_query, semanticQueries.usecase_query];
    
    for (let i = 0; i < queries.length; i++) {
      const searchQuery = queries[i];
      
      try {
        const embResult = await embeddingModel.embedContent(searchQuery);
        const queryEmbedding = embResult.embedding.values;
        
        if (queryEmbedding.length === 768) {
          // Get sample of embeddings for similarity search
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
            .limit(200); // Larger sample for better discovery
          
          if (!embError && embeddingMatches) {
            const similarities = [];
            
            embeddingMatches.forEach(embMatch => {
              try {
                const appData = Array.isArray(embMatch.apps_unified) ? embMatch.apps_unified[0] : embMatch.apps_unified;
                
                if (appData) {
                  const appEmbedding = JSON.parse(embMatch.embedding);
                  
                  if (Array.isArray(appEmbedding) && appEmbedding.length === queryEmbedding.length) {
                    const similarity = calculateCosineSimilarity(queryEmbedding, appEmbedding);
                    
                    similarities.push({
                      id: appData.id,
                      title: appData.title,
                      primary_category: appData.primary_category,
                      rating: appData.rating,
                      icon_url: appData.icon_url,
                      description: appData.description,
                      similarity: similarity,
                      query_type: ['primary', 'benefit', 'usecase'][i],
                      search_query: searchQuery
                    });
                  }
                }
              } catch (parseError) {
                // Skip apps with parsing errors
              }
            });
            
            // Sort by similarity and take top matches
            similarities.sort((a, b) => b.similarity - a.similarity);
            
            // Add top matches with boosted scoring for better queries
            similarities.slice(0, Math.ceil(limit / 3)).forEach((result, index) => {
              const baseScore = 6; // Base semantic score
              const similarityBonus = result.similarity * 5; // Up to 5 bonus points
              const queryTypeBonus = i === 0 ? 2 : i === 1 ? 1 : 0; // Primary query gets highest boost
              const relevanceScore = baseScore + similarityBonus + queryTypeBonus;
              
              allResults.push({
                id: result.id,
                title: result.title,
                primary_category: result.primary_category,
                rating: result.rating,
                icon_url: result.icon_url,
                description: result.description,
                relevance_score: relevanceScore,
                search_method: 'enhanced_semantic',
                matched_keywords: [],
                semantic_details: {
                  similarity: result.similarity,
                  query_type: result.query_type,
                  search_query: result.search_query
                }
              });
            });
          }
        }
      } catch (queryError) {
        console.warn(`⚠️ Semantic query ${i + 1} failed:`, queryError.message);
      }
    }
    
    // Deduplicate and return top results
    const deduplicatedMap = new Map();
    allResults.forEach(result => {
      const existing = deduplicatedMap.get(result.id);
      if (!existing || result.relevance_score > existing.relevance_score) {
        deduplicatedMap.set(result.id, result);
      }
    });
    
    return Array.from(deduplicatedMap.values())
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, limit);
    
  } catch (error) {
    console.error('❌ Enhanced semantic search error:', error);
    return [];
  }
}

/**
 * Step 2: Targeted database search based on intent (Legacy - now used as backup)
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
      const searchQuery = intent.user_goal || intent.primary_goal || 'plant care app';
      const embResult = await embeddingModel.embedContent(searchQuery);
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
  // Deduplicate by app title (keep highest scoring version of each app)
  const deduplicatedMap = new Map();
  refinedResults.forEach(result => {
    const title = result.title?.toLowerCase().trim();
    if (!title) return;
    
    const existing = deduplicatedMap.get(title);
    const currentScore = result.final_relevance_score || result.relevance_score || 0;
    
    if (!existing || currentScore > (existing.final_relevance_score || existing.relevance_score || 0)) {
      deduplicatedMap.set(title, result);
    }
  });
  
  // Sort by final relevance score and limit results
  const sortedResults = Array.from(deduplicatedMap.values())
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