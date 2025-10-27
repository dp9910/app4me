/**
 * Search Optimizer - Uses LLM to optimize search strategy
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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

const SEARCH_OPTIMIZER_PROMPT = `You are an expert mobile app discovery assistant that optimizes database searches.

DATABASE SCHEMA: Our unified_apps table contains app_name, description, category, rating; app_embeddings table has semantic vectors; app_features table has primary_use_case, target_user, key_benefit, and TF-IDF keywords.

SEARCH ALGORITHM: Uses 6-layer search: (1) exact app name matching, (2) title keywords, (3) description keywords, (4) app features matching, (5) embedding similarity, (6) category fallback.

USER QUERY: "{user_query}"

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

/**
 * Get search optimization strategy from LLM
 */
export async function getSearchOptimization(query: string): Promise<SearchOptimization> {
  try {
    console.log(`🧠 Optimizing search strategy for: "${query}"`);
    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = SEARCH_OPTIMIZER_PROMPT.replace('{user_query}', query);
    
    const result = await model.generateContent(prompt);
    const content = result.response.text();
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from LLM response');
    }
    
    const optimization = JSON.parse(jsonMatch[0]);
    console.log(`✅ Search optimization: focus=${optimization.search_focus}, apps=${optimization.exact_app_names?.length || 0}, keywords=${optimization.title_keywords?.length || 0}`);
    
    return optimization;
    
  } catch (error) {
    console.error('⚠️ Search optimization failed, using fallback:', error);
    
    // Fallback optimization
    const basicKeywords = extractBasicKeywords(query);
    return {
      search_focus: 'hybrid',
      exact_app_names: [],
      title_keywords: basicKeywords,
      description_keywords: basicKeywords,
      feature_filters: {
        use_case_keywords: basicKeywords,
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

function extractBasicKeywords(query: string): string[] {
  const stopWords = new Set(['i', 'want', 'need', 'help', 'me', 'to', 'a', 'an', 'the', 'and', 'or', 'but', 'app', 'apps']);
  
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 5);
}