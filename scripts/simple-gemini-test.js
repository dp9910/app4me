const { GoogleGenerativeAI } = require('@google/generative-ai')
require('dotenv').config({ path: '.env.local' })

const apiKey = process.env.GEMINI_API_KEY

console.log('🤖 Simple Gemini test...')
console.log('🔑 API Key:', apiKey ? `${apiKey.substring(0, 12)}...` : 'NOT FOUND')

const genAI = new GoogleGenerativeAI(apiKey)

async function testSimple() {
  const modelNames = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro',
    'gemini-1.0-pro',
    'models/gemini-1.5-flash',
    'models/gemini-pro'
  ]

  for (const modelName of modelNames) {
    try {
      console.log(`\n🧪 Testing model: ${modelName}`)
      
      const model = genAI.getGenerativeModel({ model: modelName })
      const result = await model.generateContent('Say hello and recommend 1 productivity app')
      const response = result.response.text()
      
      console.log(`✅ SUCCESS with ${modelName}!`)
      console.log('📱 Response:', response.substring(0, 150) + '...')
      return modelName // Return the working model
      
    } catch (error) {
      console.log(`❌ ${modelName} failed: ${error.message.substring(0, 80)}...`)
    }
  }
  
  console.log('\n💥 No models worked')
}

testSimple()