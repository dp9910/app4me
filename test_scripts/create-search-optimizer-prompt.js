// Prompt template for LLM-driven search optimization

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

// Test the prompt
console.log('🎯 SEARCH OPTIMIZER PROMPT TEMPLATE:');
console.log('='.repeat(60));
console.log(SEARCH_OPTIMIZER_PROMPT);

console.log('\n📝 EXAMPLE USAGE:');
console.log('='.repeat(40));

const testQuery = "apps to take care of my plants at home";
const examplePrompt = SEARCH_OPTIMIZER_PROMPT.replace('{user_query}', testQuery);
console.log(examplePrompt);

console.log('\n🎯 EXPECTED OUTPUT FORMAT:');
console.log('='.repeat(40));
console.log(`{
  "search_focus": "hybrid",
  "exact_app_names": ["Planta", "PictureThis", "PlantNet", "GrowVeg"],
  "title_keywords": ["plant", "garden", "care", "watering"],
  "description_keywords": ["houseplant", "indoor plant", "plant care", "watering schedule"],
  "feature_filters": {
    "use_case_keywords": ["plant care", "garden management", "watering"],
    "target_user_keywords": ["plant lovers", "gardeners", "homeowners"],
    "benefit_keywords": ["plant health", "watering reminders", "plant identification"]
  },
  "semantic_query": "daily plant care and watering routine for indoor houseplants",
  "category_hints": ["Reference", "Lifestyle", "Productivity"],
  "exclude_categories": ["Games", "Entertainment", "Dating"],
  "priority_weights": {
    "exact_names": 10,
    "features": 8,
    "titles": 7,
    "semantics": 6,
    "descriptions": 5,
    "categories": 3
  }
}`);