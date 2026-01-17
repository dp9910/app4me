/**
 * Test Gemini API key functionality
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

async function testGeminiAPI() {
  console.log('🧪 Testing Gemini API connection...\n');
  
  try {
    // Check if API key is loaded
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ GEMINI_API_KEY not found in environment variables');
      return;
    }
    
    console.log(`📋 API Key loaded: ${apiKey.substring(0, 20)}...`);
    
    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    // Simple test prompt
    const prompt = `Analyze this test app:
    
App: YouTube
Category: Entertainment
Description: Watch videos, music, and live streams

Extract and return ONLY valid JSON:
{
  "primary_use_case": "video streaming",
  "complexity_level": "beginner"
}`;

    console.log('🔄 Making API call to Gemini...');
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    console.log('✅ API call successful!');
    console.log('📝 Response:');
    console.log(responseText);
    
    // Try to parse JSON
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('\n✅ JSON parsing successful:');
        console.log(JSON.stringify(parsed, null, 2));
      } catch (parseError) {
        console.log('\n⚠️  JSON parsing failed:', parseError.message);
      }
    } else {
      console.log('\n⚠️  No JSON found in response');
    }
    
  } catch (error) {
    console.error('❌ Gemini API test failed:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error details:', error.details);
  }
}

testGeminiAPI();