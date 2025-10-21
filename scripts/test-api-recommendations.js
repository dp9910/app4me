const fetch = require('node-fetch')

async function testRecommendationsAPI() {
  console.log('🧪 Testing /api/recommendations endpoint...')
  
  try {
    // Test 1: POST with preferences
    console.log('\n📱 Test 1: POST with user preferences')
    const postResponse = await fetch('http://localhost:3000/api/recommendations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        preferences: {
          lifestyle: ['Active', 'Tech-savvy'],
          goals: ['Improve productivity', 'Stay healthy'],
          deviceType: 'ios',
          budget: 'medium'
        }
      })
    })
    
    const postResult = await postResponse.json()
    console.log('✅ POST Response status:', postResponse.status)
    console.log('📊 Recommendations count:', postResult.count)
    console.log('📱 Sample app:', postResult.recommendations?.[0]?.name)
    
    // Test 2: GET with query
    console.log('\n🔍 Test 2: GET with search query')
    const getResponse = await fetch('http://localhost:3000/api/recommendations?q=fitness%20tracking%20apps')
    
    const getResult = await getResponse.json()
    console.log('✅ GET Response status:', getResponse.status)
    console.log('📊 Search results count:', getResult.count)
    console.log('📱 Sample app:', getResult.recommendations?.[0]?.name)
    
    // Test 3: Search improvement
    console.log('\n⚡ Test 3: Search improvement API')
    const improveResponse = await fetch('http://localhost:3000/api/improve-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'apps for work'
      })
    })
    
    const improveResult = await improveResponse.json()
    console.log('✅ Improve Response status:', improveResponse.status)
    console.log('🔍 Original:', improveResult.originalQuery)
    console.log('⚡ Improved:', improveResult.improvedQuery)
    
    console.log('\n🎉 All API tests completed!')
    
  } catch (error) {
    console.error('❌ API test error:', error.message)
  }
}

testRecommendationsAPI()