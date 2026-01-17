const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

async function testSearchOptimizer() {
  try {
    console.log('🧠 Testing Search Optimizer Prompt...\n');
    
    const testQueries = [
      "apps to take care of my plants at home",
      "help me build better daily habits",
      "find restaurants nearby with good food",
      "budget tracking and expense management",
      "meditation and mindfulness for stress relief"
    ];
    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    for (const query of testQueries) {
      console.log(`🎯 QUERY: "${query}"`);
      console.log('='.repeat(60));
      
      const prompt = SEARCH_OPTIMIZER_PROMPT.replace('{user_query}', query);
      
      try {
        const result = await model.generateContent(prompt);
        const content = result.response.text();
        
        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const optimization = JSON.parse(jsonMatch[0]);
          
          console.log('📊 OPTIMIZATION STRATEGY:');
          console.log(`Focus: ${optimization.search_focus}`);
          console.log(`App Names: ${optimization.exact_app_names?.join(', ') || 'none'}`);
          console.log(`Title Keywords: ${optimization.title_keywords?.join(', ') || 'none'}`);
          console.log(`Feature Use Cases: ${optimization.feature_filters?.use_case_keywords?.join(', ') || 'none'}`);
          console.log(`Semantic Query: ${optimization.semantic_query || 'none'}`);
          console.log(`Categories: ${optimization.category_hints?.join(', ') || 'none'}`);
          console.log(`Exclude: ${optimization.exclude_categories?.join(', ') || 'none'}`);
          
        } else {
          console.log('❌ Could not extract JSON from LLM response');
          console.log('Raw response:', content.substring(0, 200) + '...');
        }
        
      } catch (error) {
        console.log(`❌ Error processing query: ${error.message}`);
      }
      
      console.log('\n' + '='.repeat(80) + '\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testSearchOptimizer();