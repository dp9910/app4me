const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

async function testIntentAnalysis() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const query = "apps to take care of my plants at home";
    
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

    console.log('🤔 Testing intent analysis for:', query);
    console.log('📤 Sending prompt to Gemini...\n');
    
    const result = await model.generateContent(prompt);
    const content = result.response.text();
    
    console.log('📥 Raw Gemini response:');
    console.log(content);
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from LLM response');
    }
    
    const intent = JSON.parse(jsonMatch[0]);
    console.log('✅ Parsed intent:');
    console.log(JSON.stringify(intent, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testIntentAnalysis();