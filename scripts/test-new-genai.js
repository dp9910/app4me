const { GoogleGenAI } = require("@google/genai");
require('dotenv').config({ path: '.env.local' })

console.log('🤖 Testing new Google GenAI SDK...')
console.log('🔑 API Key found:', process.env.GEMINI_API_KEY ? 'YES' : 'NO')

// The client gets the API key from the environment variable `GEMINI_API_KEY`.
const ai = new GoogleGenAI({});

async function main() {
  try {
    console.log('\n🧪 Testing gemini-2.5-flash model...')
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Explain how AI works in a few words",
    });
    
    console.log('✅ Success!')
    console.log('📱 Response:', response.text);
    
    // Test app recommendation
    console.log('\n🎯 Testing app recommendation...')
    
    const appResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate 3 mobile app recommendations for someone who wants to improve productivity. Return as JSON array with fields: name, category, description, rating, price. Return only the JSON array, no other text.`,
    });
    
    console.log('📱 App recommendations:', appResponse.text);
    
    // Try to parse JSON
    try {
      const apps = JSON.parse(appResponse.text);
      console.log('✅ JSON parsing successful!')
      console.log('📱 First app:', apps[0]);
    } catch (parseError) {
      console.log('⚠️ JSON parsing failed, but response received');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // Try alternative models
    const altModels = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
    
    for (const model of altModels) {
      try {
        console.log(`\n🧪 Trying ${model}...`);
        const response = await ai.models.generateContent({
          model: model,
          contents: "Hello, recommend 1 productivity app",
        });
        console.log(`✅ ${model} works!`);
        console.log('📱 Response:', response.text.substring(0, 100) + '...');
        break;
      } catch (altError) {
        console.log(`❌ ${model} failed: ${altError.message.substring(0, 60)}...`);
      }
    }
  }
}

main();