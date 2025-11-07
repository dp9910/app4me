const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

async function testGeminiAPI() {
  console.log('🧪 Testing Gemini API connection...');
  console.log(`API Key present: ${!!process.env.GEMINI_API_KEY}`);
  
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const testPrompt = `Analyze this problem: "cant sleep, too much coffee"

You are an app guidance counselor. Provide 4-step guidance.

Return JSON:
{
  "query_type": "problem",
  "analysis": {
    "user_situation": "what user is experiencing",
    "root_cause": "likely cause", 
    "urgency": "immediate|short-term|long-term"
  },
  "solution_steps": [
    {"step": 1, "step_name": "Track", "focus": "understand problem", "search_terms": ["keyword1", "keyword2"]},
    {"step": 2, "step_name": "Relief", "focus": "immediate help", "search_terms": ["keyword1", "keyword2"]},
    {"step": 3, "step_name": "Habits", "focus": "build habits", "search_terms": ["keyword1", "keyword2"]},
    {"step": 4, "step_name": "Progress", "focus": "monitor progress", "search_terms": ["keyword1", "keyword2"]}
  ]
}`;

  try {
    console.log('Making Gemini API call...');
    const startTime = Date.now();
    
    const result = await Promise.race([
      model.generateContent({
        contents: [{ role: "user", parts: [{ text: testPrompt }] }],
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.3
        }
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Gemini API timeout after 10 seconds')), 10000)
      )
    ]);

    const endTime = Date.now();
    console.log(`✅ Gemini API call successful in ${endTime - startTime}ms`);
    
    const content = result.response.text();
    console.log('Response:', content);
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('✅ Parsed JSON successfully:', parsed);
    }
    
  } catch (error) {
    console.error('❌ Gemini API call failed:', error.message);
  }
}

testGeminiAPI();