// Simple test of DeepSeek API
const OpenAI = require('openai');
require('dotenv').config({ path: '.env.local' });

const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

async function testDeepSeekAPI() {
  console.log('🧪 Testing DeepSeek API connection...');
  
  try {
    console.log('API Key present:', !!process.env.DEEPSEEK_API_KEY);
    console.log('API Key starts with:', process.env.DEEPSEEK_API_KEY?.substring(0, 10) + '...');
    
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Say hello and tell me you're working!" }
      ],
      model: "deepseek-chat",
      temperature: 0.3,
      max_tokens: 100
    });

    console.log('✅ DeepSeek API Response:');
    console.log(completion.choices[0].message.content);
    
    // Test JSON generation
    console.log('\n🧪 Testing JSON generation...');
    
    const jsonTest = await openai.chat.completions.create({
      messages: [
        { role: "system", content: "You are an API that responds only with valid JSON." },
        { role: "user", content: `Return a JSON array with 2 test apps:
[
  {
    "app_id": "1",
    "relevance_score": 8.5,
    "personalized_oneliner": "Perfect for students - helps with learning",
    "match_explanation": "Great educational tool",
    "confidence": 0.9
  },
  {
    "app_id": "2", 
    "relevance_score": 7.2,
    "personalized_oneliner": "Perfect for professionals - boosts productivity",
    "match_explanation": "Excellent work organization",
    "confidence": 0.8
  }
]

Return ONLY the JSON array:` }
      ],
      model: "deepseek-chat",
      temperature: 0.1,
      max_tokens: 500
    });

    console.log('✅ JSON Test Response:');
    console.log(jsonTest.choices[0].message.content);
    
    // Try to parse it
    const jsonContent = jsonTest.choices[0].message.content?.trim() || '';
    const jsonMatch = jsonContent.match(/\[[\s\S]*\]/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('✅ Successfully parsed JSON:', parsed.length, 'items');
    } else {
      console.log('❌ Could not find JSON in response');
    }
    
  } catch (error) {
    console.error('❌ DeepSeek API Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testDeepSeekAPI();