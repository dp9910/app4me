// Test the app fetcher service
const { appFetcher } = require('../src/lib/services/app-fetcher.ts')

async function testAppFetcher() {
  console.log('🧪 Testing App Fetcher Service...')
  
  try {
    // Test 1: Search for productivity apps
    console.log('\n📱 Test 1: Searching for productivity apps...')
    const productivityApps = await appFetcher.searchApps('productivity', {
      limit: 5,
      priceRange: 'all',
      minRating: 4.0
    })
    
    console.log(`✅ Found ${productivityApps.length} productivity apps`)
    console.log('📱 Sample app:', {
      name: productivityApps[0]?.trackName,
      developer: productivityApps[0]?.artistName,
      price: productivityApps[0]?.price,
      isFree: productivityApps[0]?.isFree,
      rating: productivityApps[0]?.averageUserRating,
      category: productivityApps[0]?.category
    })

    // Test 2: Get apps for user preferences
    console.log('\n🎯 Test 2: Getting apps for user preferences...')
    const userApps = await appFetcher.getAppsForUserPreferences({
      lifestyle: ['active', 'busy'],
      goals: ['productivity', 'health'],
      budget: 'free',
      categories: ['health-fitness', 'productivity']
    })
    
    console.log(`✅ Found ${userApps.length} apps for user preferences`)
    console.log('📱 Categories found:', [...new Set(userApps.map(app => app.category))])
    console.log('💰 Price range:', {
      free: userApps.filter(app => app.isFree).length,
      paid: userApps.filter(app => !app.isFree).length
    })

    // Test 3: Multiple categories
    console.log('\n📂 Test 3: Fetching from multiple categories...')
    const multiCategoryApps = await appFetcher.fetchAppsFromCategories([
      'health fitness',
      'entertainment',
      'finance'
    ], { limit: 3 })
    
    console.log(`✅ Found ${multiCategoryApps.length} apps across categories`)
    const categoryCounts = multiCategoryApps.reduce((acc, app) => {
      acc[app.category] = (acc[app.category] || 0) + 1
      return acc
    }, {})
    console.log('📊 Category distribution:', categoryCounts)

    console.log('\n🎉 All tests completed successfully!')
    console.log('🚀 App fetcher service is ready!')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// For testing in Node.js environment, we need to polyfill fetch
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch')
}

testAppFetcher()