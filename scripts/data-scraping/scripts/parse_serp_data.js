const https = require('https');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

// SERP API configuration
const SERP_API_KEY = process.env.SERPAPI_KEY;

if (!SERP_API_KEY) {
  console.error('❌ SERPAPI_KEY not found in environment variables');
  process.exit(1);
}

// Search queries to test SERP API capabilities
const searchQueries = [
  {
    name: 'Productivity Apps',
    term: 'productivity',
    type: 'keyword'
  },
  {
    name: 'Social Media Apps',
    term: 'social media',
    type: 'keyword'
  },
  {
    name: 'Photo Apps',
    term: 'photo editor',
    type: 'keyword'
  },
  {
    name: 'Fitness Apps',
    term: 'fitness',
    type: 'keyword'
  }
];

// Function to fetch data from SERP API
function fetchSerpData(query) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      engine: 'apple_app_store',
      term: query.term,
      country: 'us',
      lang: 'en-us',
      num: '15',
      api_key: SERP_API_KEY
    });

    const url = `https://serpapi.com/search?${params.toString()}`;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(new Error(`Failed to parse JSON: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

async function analyzeSerpData() {
  console.log('='.repeat(80));
  console.log('🔍 SERP API Apple App Store Data Analysis');
  console.log('='.repeat(80));
  
  const allSearchData = [];
  const allApps = [];
  
  for (const query of searchQueries) {
    try {
      console.log(`\n🔍 Searching for: ${query.name} ("${query.term}")...`);
      
      const data = await fetchSerpData(query);
      
      console.log(`✅ Search successful!`);
      console.log(`📊 Search Metadata:`);
      console.log(`  - Search ID: ${data.search_metadata?.id || 'N/A'}`);
      console.log(`  - Status: ${data.search_metadata?.status || 'N/A'}`);
      console.log(`  - Time taken: ${data.search_metadata?.total_time_taken || 'N/A'}s`);
      console.log(`  - Created at: ${data.search_metadata?.created_at || 'N/A'}`);
      
      if (!data.apps || data.apps.length === 0) {
        console.log(`⚠️ No apps found for ${query.name}`);
        continue;
      }
      
      console.log(`📱 Apps found: ${data.apps.length}`);
      
      // Process apps from this search
      const processedApps = data.apps.map((app, index) => ({
        queryName: query.name,
        queryTerm: query.term,
        rank: index + 1,
        title: app.title || '',
        bundleId: app.bundle_id || '',
        version: app.version || '',
        description: (app.description || '').substring(0, 200) + (app.description?.length > 200 ? '...' : ''),
        price: app.price || null,
        formattedPrice: app.formatted_price || app.price || 'Free',
        currency: app.currency || 'USD',
        developer: app.developer || '',
        developerUrl: app.developer_url || '',
        rating: app.rating || null,
        ratingCount: app.rating_count || null,
        icon: app.icon || '',
        screenshots: app.screenshots || [],
        ageRating: app.age_rating || '',
        genres: app.genres || [],
        languagesSupported: app.languages_supported || [],
        deviceCompatibility: app.device_compatibility || [],
        size: app.size || '',
        releaseDate: app.release_date || '',
        lastUpdated: app.last_updated || '',
        categoryId: app.category_id || '',
        category: app.category || '',
        appStoreUrl: app.app_store_url || '',
        inAppPurchases: app.in_app_purchases || false,
        contentAdvisory: app.content_advisory || [],
        whatIsNew: app.what_is_new || '',
        minimumOsVersion: app.minimum_os_version || ''
      }));
      
      allSearchData.push({
        queryInfo: query,
        searchMetadata: data.search_metadata,
        searchParameters: data.search_parameters,
        apps: processedApps
      });
      
      allApps.push(...processedApps);
      
      // Show sample app from this search
      if (processedApps.length > 0) {
        const sampleApp = processedApps[0];
        console.log(`\n📱 Sample App (#1 for "${query.term}"):`);
        console.log('─'.repeat(40));
        console.log(`Title: ${sampleApp.title}`);
        console.log(`Developer: ${sampleApp.developer}`);
        console.log(`Bundle ID: ${sampleApp.bundleId}`);
        console.log(`Category: ${sampleApp.category}`);
        console.log(`Price: ${sampleApp.formattedPrice}`);
        console.log(`Rating: ${sampleApp.rating ? `${sampleApp.rating} ⭐ (${sampleApp.ratingCount} reviews)` : 'No rating'}`);
        console.log(`Version: ${sampleApp.version}`);
        console.log(`Age Rating: ${sampleApp.ageRating}`);
        console.log(`Size: ${sampleApp.size}`);
        console.log(`Languages: ${sampleApp.languagesSupported.length} supported`);
        console.log(`Screenshots: ${sampleApp.screenshots.length} available`);
      }
      
    } catch (error) {
      console.log(`❌ Error searching for ${query.name}: ${error.message}`);
    }
  }
  
  // Overall Analysis
  console.log('\n' + '='.repeat(80));
  console.log('📊 OVERALL ANALYSIS');
  console.log('='.repeat(80));
  
  console.log(`\n📈 Summary Statistics:`);
  console.log('─'.repeat(30));
  console.log(`Total Searches Performed: ${allSearchData.length}/${searchQueries.length}`);
  console.log(`Total Apps Collected: ${allApps.length}`);
  console.log(`Unique Apps: ${new Set(allApps.map(app => app.bundleId)).size}`);
  
  // Category analysis
  const allCategories = {};
  allApps.forEach(app => {
    if (app.category) {
      allCategories[app.category] = (allCategories[app.category] || 0) + 1;
    }
  });
  
  console.log(`\n📁 Category Distribution (Top 10):`);
  console.log('─'.repeat(40));
  Object.entries(allCategories)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .forEach(([category, count]) => {
      console.log(`${category.padEnd(30)} ${count} apps`);
    });
  
  // Developer analysis
  const allDevelopers = {};
  allApps.forEach(app => {
    if (app.developer) {
      allDevelopers[app.developer] = (allDevelopers[app.developer] || 0) + 1;
    }
  });
  
  console.log(`\n👨‍💻 Top Developers (Top 10):`);
  console.log('─'.repeat(40));
  Object.entries(allDevelopers)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .forEach(([developer, count]) => {
      console.log(`${developer.padEnd(30)} ${count} apps`);
    });
  
  // Price analysis
  const freeApps = allApps.filter(app => app.price === null || app.price === 0);
  const paidApps = allApps.filter(app => app.price !== null && app.price > 0);
  
  console.log(`\n💰 Price Distribution:`);
  console.log('─'.repeat(30));
  console.log(`Free Apps: ${freeApps.length}`);
  console.log(`Paid Apps: ${paidApps.length}`);
  
  // Rating analysis
  const ratedApps = allApps.filter(app => app.rating !== null);
  const avgRating = ratedApps.reduce((sum, app) => sum + app.rating, 0) / ratedApps.length;
  
  console.log(`\n⭐ Rating Analysis:`);
  console.log('─'.repeat(30));
  console.log(`Apps with Ratings: ${ratedApps.length}/${allApps.length}`);
  console.log(`Average Rating: ${avgRating.toFixed(2)}`);
  
  // Data completeness analysis
  console.log(`\n🔍 Data Completeness:`);
  console.log('─'.repeat(30));
  console.log(`Apps with Description: ${allApps.filter(app => app.description && app.description !== '').length}`);
  console.log(`Apps with Screenshots: ${allApps.filter(app => app.screenshots.length > 0).length}`);
  console.log(`Apps with Version Info: ${allApps.filter(app => app.version).length}`);
  console.log(`Apps with Size Info: ${allApps.filter(app => app.size).length}`);
  console.log(`Apps with Age Rating: ${allApps.filter(app => app.ageRating).length}`);
  console.log(`Apps with Genres: ${allApps.filter(app => app.genres.length > 0).length}`);
  console.log(`Apps with Developer URL: ${allApps.filter(app => app.developerUrl).length}`);
  
  // Available fields analysis
  console.log(`\n📋 Available Fields (from first app):`);
  console.log('─'.repeat(50));
  if (allApps.length > 0) {
    const firstApp = allApps[0];
    Object.keys(firstApp).forEach((field, index) => {
      const value = firstApp[field];
      const type = Array.isArray(value) ? `array[${value.length}]` : typeof value;
      const hasValue = value !== null && value !== undefined && value !== '' && 
                      (Array.isArray(value) ? value.length > 0 : true);
      const status = hasValue ? '✅' : '❌';
      console.log(`${(index + 1).toString().padStart(2)}: ${field.padEnd(25)} (${type.padEnd(12)}) ${status}`);
    });
  }
  
  // Database-ready format
  console.log(`\n🗄️ Database Schema Recommendation:`);
  console.log('─'.repeat(50));
  const dbFields = {
    'Core Fields': ['source', 'query_term', 'rank', 'title', 'bundle_id'],
    'Developer Info': ['developer', 'developer_url'],
    'Pricing': ['price', 'formatted_price', 'currency'],
    'Ratings': ['rating', 'rating_count'],
    'Technical': ['version', 'size', 'minimum_os_version'],
    'Classification': ['category', 'category_id', 'genres', 'age_rating'],
    'Content': ['description', 'what_is_new'],
    'Media': ['icon_url', 'screenshots'],
    'Compatibility': ['device_compatibility', 'languages_supported'],
    'Dates': ['release_date', 'last_updated'],
    'Features': ['in_app_purchases', 'content_advisory'],
    'Links': ['app_store_url']
  };
  
  Object.entries(dbFields).forEach(([category, fields]) => {
    console.log(`\n${category}:`);
    fields.forEach(field => {
      console.log(`  📄 ${field}`);
    });
  });
  
  // Generate database-ready format
  const dbReadyApps = allApps.slice(0, 5).map(app => ({
    source: 'serp_api',
    query_term: app.queryTerm,
    rank: app.rank,
    title: app.title,
    bundle_id: app.bundleId,
    developer: app.developer,
    developer_url: app.developerUrl,
    price: app.price,
    formatted_price: app.formattedPrice,
    currency: app.currency,
    rating: app.rating,
    rating_count: app.ratingCount,
    version: app.version,
    size: app.size,
    minimum_os_version: app.minimumOsVersion,
    category: app.category,
    category_id: app.categoryId,
    genres: app.genres,
    age_rating: app.ageRating,
    description: app.description,
    what_is_new: app.whatIsNew,
    icon_url: app.icon,
    screenshots: app.screenshots,
    device_compatibility: app.deviceCompatibility,
    languages_supported: app.languagesSupported,
    release_date: app.releaseDate,
    last_updated: app.lastUpdated,
    in_app_purchases: app.inAppPurchases,
    content_advisory: app.contentAdvisory,
    app_store_url: app.appStoreUrl
  }));
  
  console.log(`\n🔧 Database-Ready Format (First 5 Apps):`);
  console.log('─'.repeat(50));
  console.log(JSON.stringify(dbReadyApps, null, 2));
  
  // Save data to files
  try {
    fs.writeFileSync('serp_all_data.json', JSON.stringify(allSearchData, null, 2));
    fs.writeFileSync('serp_processed_apps.json', JSON.stringify(allApps, null, 2));
    fs.writeFileSync('serp_database_ready.json', JSON.stringify(dbReadyApps, null, 2));
    
    console.log('\n📁 Files Generated:');
    console.log('  ✅ serp_all_data.json - Complete SERP search data');
    console.log('  ✅ serp_processed_apps.json - All processed apps');
    console.log('  ✅ serp_database_ready.json - Database-ready format');
    
  } catch (error) {
    console.log(`❌ Error saving files: ${error.message}`);
  }
}

// Run the analysis
analyzeSerpData().catch(error => {
  console.error('❌ Analysis failed:', error.message);
});