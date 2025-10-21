const { GoogleGenerativeAI } = require('@google/generative-ai')
require('dotenv').config({ path: '.env.local' })

const apiKey = process.env.GEMINI_API_KEY

if (!apiKey || apiKey === 'your-gemini-api-key-here') {
  console.error('❌ GEMINI_API_KEY not found or not configured in .env.local')
  process.exit(1)
}

console.log('🤖 Testing Gemini AI connection...')
console.log('🔑 API Key found:', apiKey.substring(0, 10) + '...')

const genAI = new GoogleGenerativeAI(apiKey)

async function testGemini() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    // Test 1: Basic text generation
    console.log('\n📝 Test 1: Basic text generation')
    const prompt1 = 'Generate 3 popular mobile app recommendations for fitness enthusiasts. Return in JSON format with name, category, and description fields.'
    
    const result1 = await model.generateContent(prompt1)
    const response1 = result1.response.text()
    
    console.log('✅ Response received:', response1.substring(0, 200) + '...')

    // Test 2: App recommendation prompt
    console.log('\n🎯 Test 2: App recommendation test')
    const prompt2 = `
Generate 3 app recommendations for someone who:
- Lifestyle: Active, Busy professional
- Goals: Improve productivity and health
- Device: iOS

Return JSON array with fields: name, category, description, rating, price, recommendationReason

Return only valid JSON array.
`

    const result2 = await model.generateContent(prompt2)
    const response2 = result2.response.text()
    
    console.log('✅ Recommendation response:', response2.substring(0, 300) + '...')

    // Try to parse the JSON
    try {
      let cleanText = response2.trim()
      cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '')
      
      const parsed = JSON.parse(cleanText)
      console.log('✅ JSON parsing successful!')
      console.log('📱 Sample app:', parsed[0])
    } catch (parseError) {
      console.log('⚠️ JSON parsing failed, but AI is responding')
    }

    console.log('\n🎉 Gemini AI is working correctly!')
    console.log('✅ Ready for app recommendations')

  } catch (error) {
    console.error('❌ Gemini test failed:', error.message)
    
    if (error.message.includes('API_KEY_INVALID')) {
      console.error('🔑 API key is invalid. Please check your Gemini API key.')
    } else if (error.message.includes('quota') || error.message.includes('limit')) {
      console.error('📊 API quota exceeded. Please check your Gemini billing.')
    } else {
      console.error('🌐 Network or service error. Please try again.')
    }
  }
}

testGemini()