const { GoogleGenerativeAI } = require('@google/generative-ai')
require('dotenv').config({ path: '.env.local' })

const apiKey = process.env.GEMINI_API_KEY

if (!apiKey || apiKey === 'your-gemini-api-key-here') {
  console.error('❌ GEMINI_API_KEY not found or not configured in .env.local')
  process.exit(1)
}

console.log('🤖 Listing available Gemini models...')

const genAI = new GoogleGenerativeAI(apiKey)

async function listModels() {
  try {
    const models = await genAI.listModels()
    
    console.log('\n📋 Available models:')
    models.forEach((model, index) => {
      console.log(`${index + 1}. ${model.name}`)
      console.log(`   Display Name: ${model.displayName}`)
      console.log(`   Description: ${model.description}`)
      console.log(`   Supported Methods: ${model.supportedGenerationMethods?.join(', ') || 'Unknown'}`)
      console.log('')
    })

    // Test with a known working model
    const workingModel = models.find(m => 
      m.supportedGenerationMethods?.includes('generateContent')
    )

    if (workingModel) {
      console.log(`🎯 Testing with: ${workingModel.name}`)
      
      const model = genAI.getGenerativeModel({ model: workingModel.name.replace('models/', '') })
      const result = await model.generateContent('Hello, can you help me recommend mobile apps?')
      const response = result.response.text()
      
      console.log('✅ Test successful!')
      console.log('📱 Response:', response.substring(0, 200) + '...')
    }

  } catch (error) {
    console.error('❌ Error listing models:', error.message)
  }
}

listModels()