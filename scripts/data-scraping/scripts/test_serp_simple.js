const https = require('https');
require('dotenv').config({ path: '.env.local' });

const SERP_API_KEY = process.env.SERPAPI_KEY;

// Test with a very specific app name
const params = new URLSearchParams({
  engine: 'apple_app_store',
  term: 'Instagram',
  country: 'us',
  lang: 'en-us',
  num: '5',
  api_key: SERP_API_KEY
});

const url = `https://serpapi.com/search?${params.toString()}`;

console.log('🔍 Testing SERP API with specific search...');
console.log('Search term: Instagram');

https.get(url, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const jsonData = JSON.parse(data);
      
      console.log('\n📊 Response Structure:');
      console.log('Top-level keys:', Object.keys(jsonData));
      
      console.log('\n🔍 Search Metadata:');
      if (jsonData.search_metadata) {
        console.log('- ID:', jsonData.search_metadata.id);
        console.log('- Status:', jsonData.search_metadata.status);
        console.log('- Time taken:', jsonData.search_metadata.total_time_taken);
      }
      
      console.log('\n📱 Apps Found:');
      if (jsonData.apps) {
        console.log('- Count:', jsonData.apps.length);
        if (jsonData.apps.length > 0) {
          const firstApp = jsonData.apps[0];
          console.log('- First app structure:', Object.keys(firstApp));
          console.log('- First app details:');
          console.log('  Title:', firstApp.title);
          console.log('  Developer:', firstApp.developer);
          console.log('  Bundle ID:', firstApp.bundle_id);
          console.log('  Price:', firstApp.price);
          console.log('  Rating:', firstApp.rating);
        }
      } else {
        console.log('- No apps array found');
        console.log('- Available keys:', Object.keys(jsonData));
      }
      
      // Save raw response for inspection
      require('fs').writeFileSync('serp_raw_response.json', JSON.stringify(jsonData, null, 2));
      console.log('\n📁 Saved raw response to serp_raw_response.json');
      
    } catch (error) {
      console.error('❌ Error parsing JSON:', error.message);
      console.log('Raw response:', data.substring(0, 500));
    }
  });
}).on('error', (error) => {
  console.error('❌ Request error:', error.message);
});