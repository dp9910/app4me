const OpenAI = require('openai');
require('dotenv').config({ path: '.env.local' });

const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

async function testDeepSeekDetailed() {
  console.log('🧪 Testing DeepSeek API with full contextual prompt...');
  
  const userQuery = "cant sleep, too much coffee";
  
  const contextPrompt = `Is this query a PROBLEM (personal issue) or GENERAL (app category)?
Query: "${userQuery}"

PROBLEM = "can't sleep", "stressed", "budget mess"  
GENERAL = "fitness apps", "photo apps"

Return: {"query_type": "problem"} or {"query_type": "general"}`;

  try {
    console.log('🔍 Making API call with 10 second timeout...');
    const startTime = Date.now();
    
    const response = await Promise.race([
      openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [{ role: "user", content: contextPrompt }],
        max_tokens: 50,
        temperature: 0.3
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('API timeout after 10 seconds')), 10000)
      )
    ]);

    const endTime = Date.now();
    console.log(`✅ API call successful in ${endTime - startTime}ms`);
    
    const content = response.choices[0].message.content;
    console.log('📝 Response:', content);
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('✅ Parsed JSON successfully:', parsed);
    } else {
      console.log('❌ Could not find JSON in response');
    }
    
  } catch (error) {
    console.error('❌ API call failed:', error.message);
  }
}

testDeepSeekDetailed();