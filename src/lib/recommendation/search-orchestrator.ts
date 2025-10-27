/**
 * Streamlined Search Orchestrator
 * 1. DeepSeek intent analysis & keyword extraction
 * 2. Focused database search using extracted keywords  
 * 3. Vector search only on pre-filtered results
 * 4. Final ranking and results
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export interface SearchIntent {
  user_goal: string;
  main_keywords: string[];
  secondary_keywords: string[];
  app_categories: string[];
  search_strategy: 'specific' | 'broad' | 'exploratory';
  confidence: number;
}

export interface StreamlinedSearchResult {
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
}

/**
 * Main streamlined search function
 */
export async function streamlinedSearch(
  query: string,
  limit: number = 20
): Promise<StreamlinedSearchResult[]> {
  console.log(`🚀 Starting streamlined search for: "${query}"`);
  
  try {
    // Step 1: Analyze intent and extract keywords using Gemini 2.5 Flash
    console.log('🧠 Step 1: Analyzing intent with Gemini 2.5 Flash...');
    const searchIntent = await analyzeIntentWithGemini(query);
    console.log(`✅ Intent analysis complete:`, searchIntent);
    
    if (!searchIntent || !searchIntent.main_keywords) {
      console.error('❌ Invalid search intent returned');
      return [];
    }
    
    // Step 2: Focused database search using extracted keywords
    console.log('🔍 Step 2: Focused database search...');
    const keywordMatches = await focusedDatabaseSearch(
      searchIntent.main_keywords,
      searchIntent.secondary_keywords,
      searchIntent.app_categories,
      limit * 3 // Get more for vector refinement
    );
    console.log(`📱 Found ${keywordMatches.length} keyword matches`);
    
    if (keywordMatches.length === 0) {
      console.log('⚠️ No keyword matches found, returning empty results');
      return [];
    }
    
    // Step 3: Apply vector search only on pre-filtered results (if we have enough)
    let finalResults = keywordMatches;
    if (keywordMatches.length > 10) {
      console.log('🎯 Step 3: Refining with vector search...');
      finalResults = await vectorRefineResults(query, keywordMatches, limit);
      console.log(`✨ Vector refinement complete: ${finalResults.length} results`);
    }
    
    // Step 4: Final ranking and formatting
    const rankedResults = rankAndFormatResults(finalResults, searchIntent, limit);
    
    console.log(`✅ Streamlined search complete: ${rankedResults.length} final results`);
    return rankedResults;
    
  } catch (error) {
    console.error('❌ Streamlined search error:', error);
    throw error;
  }
}

/**
 * Step 1: Analyze user intent and extract keywords using Gemini 2.5 Flash
 */
async function analyzeIntentWithGemini(query: string): Promise<SearchIntent> {
  try {
    console.log('🤖 Calling Gemini 2.5 Flash for intent analysis...');
    
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `You are an expert at analyzing user queries for app recommendations. 

Your job is to understand what the user really wants and extract the MOST SPECIFIC keywords for their exact need.

IMPORTANT: Focus on the MAIN TOPIC/DOMAIN, not generic action words like "learn", "help", "teach".

Examples:
- "learn to take care of plants" → main_keywords: ["plant", "garden", "care", "watering", "botanical"]
- "help me learn Spanish" → main_keywords: ["Spanish", "language", "translation", "vocabulary"] 
- "teach me to cook" → main_keywords: ["cooking", "recipe", "kitchen", "chef"]

Analyze the user's intent and return JSON with:
- user_goal: What the user wants to accomplish (1 sentence)
- main_keywords: PRIMARY DOMAIN-SPECIFIC KEYWORDS (3-5 terms about the main topic, NOT generic words like "learn", "help", "teach")
- secondary_keywords: Supporting domain keywords (3-5 related terms in the same domain)
- app_categories: Likely app categories to focus on (2-4 categories)
- search_strategy: "specific" (exact match), "broad" (category exploration), or "exploratory" (discovery)
- confidence: How confident you are in the analysis (0.1-1.0)

Query: "${query}"

Return ONLY the JSON object:`;

    const result = await model.generateContent(prompt);
    const content = result.response.text();
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from Gemini response');
    }
    
    const intent = JSON.parse(jsonMatch[0]);
    console.log('✅ Gemini analysis successful');
    
    return intent;
    
  } catch (error) {
    console.error('⚠️ Intent analysis failed, using fallback:', error);
    
    // Fallback intent analysis with domain detection
    const domainKeywords = extractDomainSpecificKeywords(query);
    return {
      user_goal: 'Find relevant apps',
      main_keywords: domainKeywords.main,
      secondary_keywords: domainKeywords.secondary,
      app_categories: domainKeywords.categories,
      search_strategy: 'broad' as const,
      confidence: 0.5
    };
  }
}

/**
 * Step 2: Focused database search using extracted keywords
 */
async function focusedDatabaseSearch(
  mainKeywords: string[],
  secondaryKeywords: string[],
  categories: string[],
  limit: number
): Promise<any[]> {
  try {
    const allKeywords = [...mainKeywords, ...secondaryKeywords];
    const results = [];
    
    console.log(`🔍 Main keywords: ${mainKeywords.join(', ')}`);
    console.log(`🔍 Secondary keywords: ${secondaryKeywords.join(', ')}`);
    console.log(`🔍 All keywords: ${allKeywords.join(', ')}`);
    
    // Search 1: Direct matches in title/description
    console.log(`🎯 Searching for: ${mainKeywords.join(', ')}`);
    
    const titleDescConditions = allKeywords
      .map(keyword => `title.ilike.%${keyword}%,description.ilike.%${keyword}%`)
      .join(',');
    
    console.log(`🔍 Search conditions: ${titleDescConditions}`);
    
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
      .or(titleDescConditions)
      .limit(limit);
    
    if (titleError) throw titleError;
    
    // Score title matches higher
    titleMatches.forEach(app => {
      const matchedKeywords = allKeywords.filter(keyword =>
        app.title?.toLowerCase().includes(keyword.toLowerCase()) ||
        app.description?.toLowerCase().includes(keyword.toLowerCase())
      );
      
      results.push({
        ...app,
        keyword_score: matchedKeywords.length * 2, // Higher score for title/desc matches
        matched_keywords: matchedKeywords,
        match_source: 'title_description'
      });
    });
    
    // Search 2: Category matches
    if (categories.length > 0) {
      console.log(`📂 Searching categories: ${categories.join(', ')}`);
      
      const categoryConditions = categories
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
        .limit(limit / 2);
      
      if (categoryError) throw categoryError;
      
      // Add category matches (avoid duplicates)
      const existingIds = new Set(results.map(r => r.id));
      categoryMatches.forEach(app => {
        if (!existingIds.has(app.id)) {
          results.push({
            ...app,
            keyword_score: 1,
            matched_keywords: categories.filter(cat => 
              app.primary_category?.toLowerCase().includes(cat.toLowerCase())
            ),
            match_source: 'category'
          });
        }
      });
    }
    
    // Search 3: TF-IDF keyword matches (if we have app_features)
    console.log(`🔑 Searching TF-IDF features...`);
    const { data: tfidfMatches, error: tfidfError } = await supabase
      .from('app_features')
      .select(`
        app_id,
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
      .limit(100);
    
    if (!tfidfError && tfidfMatches) {
      const existingIds = new Set(results.map(r => r.id));
      
      tfidfMatches.forEach(app => {
        const appData = Array.isArray(app.apps_unified) ? app.apps_unified[0] : app.apps_unified;
        
        if (!existingIds.has(appData.id)) {
          const tfidfKeywords = app.keywords_tfidf?.keywords || {};
          let score = 0;
          const matchedKeywords = [];
          
          // Check main keywords first (higher weight)
          for (const keyword of mainKeywords) {
            if (tfidfKeywords[keyword]) {
              const tfidfScore = parseFloat(tfidfKeywords[keyword]);
              if (!isNaN(tfidfScore)) {
                score += tfidfScore * 2;
                matchedKeywords.push(keyword);
              }
            }
          }
          
          // Check secondary keywords
          for (const keyword of secondaryKeywords) {
            if (tfidfKeywords[keyword]) {
              const tfidfScore = parseFloat(tfidfKeywords[keyword]);
              if (!isNaN(tfidfScore)) {
                score += tfidfScore;
                matchedKeywords.push(keyword);
              }
            }
          }
          
          if (score > 0.1) {
            results.push({
              id: appData.id,
              title: appData.title,
              primary_category: appData.primary_category,
              rating: appData.rating,
              icon_url: appData.icon_url,
              description: appData.description,
              keyword_score: score,
              matched_keywords: matchedKeywords,
              match_source: 'tfidf'
            });
          }
        }
      });
    }
    
    // Sort by relevance score (simplified for debugging)
    console.log(`🔍 Before sorting: ${results.length} results`);
    results.forEach(r => console.log(`  - ${r.title} (score: ${r.keyword_score})`));
    
    return results
      .sort((a, b) => (b.keyword_score || 0) - (a.keyword_score || 0))
      .slice(0, limit);
    
  } catch (error) {
    console.error('❌ Focused database search error:', error);
    return [];
  }
}

/**
 * Step 3: Vector search refinement (only on pre-filtered results)
 */
async function vectorRefineResults(
  query: string,
  keywordMatches: any[],
  limit: number
): Promise<any[]> {
  try {
    // For now, just return the keyword matches
    // We can add vector search later if needed
    console.log('ℹ️ Vector refinement placeholder - returning keyword matches');
    return keywordMatches.slice(0, limit);
    
  } catch (error) {
    console.error('❌ Vector refinement error:', error);
    return keywordMatches.slice(0, limit);
  }
}

/**
 * Step 4: Final ranking and formatting
 */
function rankAndFormatResults(
  results: any[],
  intent: SearchIntent,
  limit: number
): StreamlinedSearchResult[] {
  return results
    .slice(0, limit)
    .map((result, index) => ({
      app_id: result.id?.toString() || '',
      app_data: {
        name: result.title || '',
        category: result.primary_category || '',
        rating: parseFloat(result.rating) || 0,
        icon_url: result.icon_url || '',
        description: result.description || ''
      },
      relevance_score: result.keyword_score || 0,
      match_reason: generateMatchReason(result, intent),
      matched_keywords: result.matched_keywords || []
    }));
}

/**
 * Helper functions
 */
function extractBasicKeywords(query: string): string[] {
  const stopWords = new Set(['i', 'want', 'need', 'help', 'me', 'to', 'a', 'an', 'the', 'and', 'or', 'but', 'app', 'apps', 'application', 'learn', 'teach', 'how']);
  
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 8);
}

function extractDomainSpecificKeywords(query: string): { main: string[], secondary: string[], categories: string[] } {
  const queryLower = query.toLowerCase();
  
  // Plant/Garden domain
  if (queryLower.includes('plant') || queryLower.includes('garden') || queryLower.includes('flower') || queryLower.includes('care')) {
    return {
      main: ['plant', 'garden', 'care', 'watering', 'botanical'],
      secondary: ['flora', 'greenhouse', 'soil', 'growing', 'flower', 'tree'],
      categories: ['Reference', 'Lifestyle', 'Education', 'Design']
    };
  }
  
  // Fitness domain
  if (queryLower.includes('fitness') || queryLower.includes('workout') || queryLower.includes('exercise')) {
    return {
      main: ['fitness', 'workout', 'exercise', 'training', 'health'],
      secondary: ['gym', 'cardio', 'strength', 'nutrition', 'running'],
      categories: ['Health & Fitness', 'Sports', 'Lifestyle']
    };
  }
  
  // Language learning domain
  if (queryLower.includes('language') || queryLower.includes('spanish') || queryLower.includes('french')) {
    return {
      main: ['language', 'translation', 'vocabulary', 'grammar'],
      secondary: ['spanish', 'french', 'english', 'pronunciation', 'conversation'],
      categories: ['Education', 'Reference', 'Travel']
    };
  }
  
  // Cooking domain
  if (queryLower.includes('cook') || queryLower.includes('recipe') || queryLower.includes('kitchen')) {
    return {
      main: ['cooking', 'recipe', 'kitchen', 'chef', 'food'],
      secondary: ['baking', 'ingredients', 'meal', 'cuisine', 'nutrition'],
      categories: ['Food & Drink', 'Lifestyle', 'Reference']
    };
  }
  
  // Finance domain
  if (queryLower.includes('money') || queryLower.includes('budget') || queryLower.includes('finance')) {
    return {
      main: ['finance', 'budget', 'money', 'investment', 'banking'],
      secondary: ['savings', 'expense', 'credit', 'loan', 'portfolio'],
      categories: ['Finance', 'Business', 'Productivity']
    };
  }
  
  // Productivity domain
  if (queryLower.includes('productive') || queryLower.includes('organize') || queryLower.includes('task')) {
    return {
      main: ['productivity', 'organization', 'task', 'planning', 'focus'],
      secondary: ['todo', 'schedule', 'reminder', 'goal', 'habit'],
      categories: ['Productivity', 'Business', 'Utilities']
    };
  }
  
  // Default fallback - extract actual meaningful words
  const meaningfulWords = extractBasicKeywords(query);
  return {
    main: meaningfulWords.slice(0, 5),
    secondary: meaningfulWords.slice(2, 7),
    categories: ['Productivity', 'Lifestyle', 'Utilities']
  };
}

function calculateDomainBoostedScore(result: any, intent: SearchIntent): number {
  let baseScore = result.keyword_score || 0;
  
  const text = `${result.title} ${result.description}`.toLowerCase();
  const isPlantQuery = intent.main_keywords.some(k => ['plant', 'garden', 'botanical', 'flora', 'care'].includes(k.toLowerCase()));
  
  if (isPlantQuery) {
    // Major boost for plant/garden apps
    if (result.title?.toLowerCase().includes('plant') || result.title?.toLowerCase().includes('garden')) {
      baseScore += 20;
    }
    
    // Minor penalty for language learning unless plant-related
    if (result.title?.toLowerCase().includes('language') || result.title?.toLowerCase().includes('busuu')) {
      if (!text.includes('plant') && !text.includes('garden')) {
        baseScore -= 5;
      }
    }
  }
  
  return baseScore;
}

function generateMatchReason(result: any, intent: SearchIntent): string {
  const reasons = [];
  
  if (result.match_source === 'title_description') {
    reasons.push('matches in app name/description');
  }
  
  if (result.match_source === 'category') {
    reasons.push('relevant category');
  }
  
  if (result.match_source === 'tfidf') {
    reasons.push('keyword relevance');
  }
  
  if (result.matched_keywords?.length > 0) {
    reasons.push(`keywords: ${result.matched_keywords.slice(0, 2).join(', ')}`);
  }
  
  if (result.rating > 4.0) {
    reasons.push('highly rated');
  }
  
  return reasons.length > 0 ? reasons.join(', ') : 'relevant match';
}