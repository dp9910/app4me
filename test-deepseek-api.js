const OpenAI = require('openai');
require('dotenv').config({ path: '.env.local' });

const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

async function testDeepSeekAPI() {
  console.log('🧪 Testing DeepSeek API connection...');
  console.log(`API Key present: ${!!process.env.DEEPSEEK_API_KEY}`);
  
  const testPrompt = `Analyze this user query: "cant sleep, too much coffee"

Is this a PROBLEM query or GENERAL query?

PROBLEM queries express personal issues:
- "I can't sleep, too much coffee"
- "I'm stressed at work"

GENERAL queries are requests for app categories:
- "fitness apps" 
- "budgeting apps"

Return only: {"query_type": "problem"} or {"query_type": "general"}`;

  try {
    const startTime = Date.now();
    
    console.log('Making API call...');
    const response = await Promise.race([
      openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [{ role: "user", content: testPrompt }],
        max_tokens: 100,
        temperature: 0.3
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('API timeout after 8 seconds')), 8000)
      )
    ]);

    const endTime = Date.now();
    console.log(`✅ API call successful in ${endTime - startTime}ms`);
    
    const content = response.choices[0].message.content;
    console.log('Response:', content);
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('Parsed JSON:', parsed);
    }
    
  } catch (error) {
    console.error('❌ API call failed:', error.message);
  }
}

testDeepSeekAPI();