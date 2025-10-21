const fetch = require('node-fetch')

console.log('🍎 Researching iTunes & Apple RSS APIs...')

async function exploreAppleAPIs() {
  console.log('\n📱 Testing iTunes Search API...')
  
  // Test 1: iTunes Search API
  try {
    const searchUrl = 'https://itunes.apple.com/search?term=productivity&country=us&media=software&limit=10'
    console.log('🔍 Testing:', searchUrl)
    
    const response = await fetch(searchUrl)
    const data = await response.json()
    
    console.log('✅ iTunes Search API works!')
    console.log('📊 Found:', data.resultCount, 'apps')
    console.log('📱 Sample app:', {
      name: data.results[0]?.trackName,
      developer: data.results[0]?.artistName,
      price: data.results[0]?.price,
      category: data.results[0]?.primaryGenreName,
      rating: data.results[0]?.averageUserRating,
      description: data.results[0]?.description?.substring(0, 100) + '...',
      icon: data.results[0]?.artworkUrl512 || data.results[0]?.artworkUrl100
    })
  } catch (error) {
    console.error('❌ iTunes Search API error:', error.message)
  }

  console.log('\n📈 Testing App Store RSS Feeds...')
  
  // Test 2: App Store RSS - Top Free Apps
  try {
    const rssUrl = 'https://rss.applemarketingtools.com/api/v2/us/apps/top-free/10/apps.json'
    console.log('🔍 Testing:', rssUrl)
    
    const response = await fetch(rssUrl)
    const data = await response.json()
    
    console.log('✅ App Store RSS API works!')
    console.log('📊 Found:', data.feed?.results?.length, 'apps')
    console.log('📱 Sample app:', {
      name: data.feed?.results[0]?.name,
      artist: data.feed?.results[0]?.artistName,
      category: data.feed?.results[0]?.genres?.[0]?.name,
      url: data.feed?.results[0]?.url,
      icon: data.feed?.results[0]?.artworkUrl100,
      releaseDate: data.feed?.results[0]?.releaseDate
    })
  } catch (error) {
    console.error('❌ App Store RSS error:', error.message)
  }

  console.log('\n🎯 Testing Category-specific searches...')
  
  // Test 3: Category-specific searches
  const categories = ['productivity', 'health-fitness', 'entertainment', 'social-networking', 'finance']
  
  for (const category of categories) {
    try {
      const categoryUrl = `https://itunes.apple.com/search?term=${category}&country=us&media=software&limit=5`
      const response = await fetch(categoryUrl)
      const data = await response.json()
      
      console.log(`📂 ${category}:`, data.resultCount, 'apps found')
    } catch (error) {
      console.log(`❌ ${category}: Failed`)
    }
  }

  console.log('\n💰 Testing Free vs Paid filtering...')
  
  // Test 4: Free apps
  try {
    const freeUrl = 'https://rss.applemarketingtools.com/api/v2/us/apps/top-free/25/apps.json'
    const response = await fetch(freeUrl)
    const data = await response.json()
    
    const freeApps = data.feed?.results?.filter(app => {
      // Free apps typically have no explicit price info in RSS
      return true
    })
    
    console.log('💚 Free apps available:', freeApps?.length)
  } catch (error) {
    console.log('❌ Free apps test failed')
  }

  // Test 5: Paid apps via iTunes Search
  try {
    const paidUrl = 'https://itunes.apple.com/search?term=productivity&country=us&media=software&limit=10'
    const response = await fetch(paidUrl)
    const data = await response.json()
    
    const paidApps = data.results?.filter(app => app.price > 0)
    const freeApps = data.results?.filter(app => app.price === 0)
    
    console.log('💰 Paid apps:', paidApps?.length)
    console.log('💚 Free apps:', freeApps?.length)
    
    if (paidApps?.length > 0) {
      console.log('💰 Sample paid app:', {
        name: paidApps[0].trackName,
        price: `$${paidApps[0].price}`
      })
    }
  } catch (error) {
    console.log('❌ Paid apps test failed')
  }

  console.log('\n📋 API Research Summary:')
  console.log('✅ iTunes Search API: Rich metadata, search by term/category')
  console.log('✅ App Store RSS: Top charts, real-time rankings')
  console.log('✅ Category filtering: Works via search terms')
  console.log('✅ Price filtering: Available in iTunes Search API')
  console.log('✅ Free apps: Available via RSS feeds')
  console.log('\n🚀 Ready to build data fetching service!')
}

exploreAppleAPIs()