const https = require('https');

// Test a single iTunes RSS endpoint
const testUrl = 'https://itunes.apple.com/us/rss/topfreeapplications/limit=3/json';

https.get(testUrl, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const jsonData = JSON.parse(data);
      console.log('✅ iTunes RSS Test Successful');
      console.log('Feed structure:', Object.keys(jsonData));
      
      if (jsonData.feed && jsonData.feed.entry) {
        console.log('✅ Found entries:', jsonData.feed.entry.length);
        
        // Test our data processing logic
        const firstApp = jsonData.feed.entry[0];
        console.log('\n📱 First App Raw Structure:');
        console.log('- Name:', firstApp['im:name']);
        console.log('- Artist:', firstApp['im:artist']);
        console.log('- Price:', firstApp['im:price']);
        console.log('- Category:', firstApp.category);
        
        // Process like our API does
        const processedApp = {
          id: String(firstApp.id?.attributes?.['im:id'] || firstApp.id || ''),
          name: String(firstApp['im:name']?.label || firstApp.title?.label || firstApp.name || ''),
          artistName: String(firstApp['im:artist']?.label || firstApp.artist?.label || firstApp.artistName || ''),
          artworkUrl100: String(firstApp['im:image']?.[2]?.label || firstApp['im:image']?.[1]?.label || firstApp['im:image']?.[0]?.label || ''),
          summary: String(firstApp.summary?.label || firstApp.description || ''),
          category: String(firstApp.category?.attributes?.term || firstApp.category?.label || ''),
          releaseDate: String(firstApp['im:releaseDate']?.attributes?.label || firstApp.releaseDate || ''),
          url: String(firstApp.link?.attributes?.href || firstApp.url || ''),
          contentRating: String(firstApp['im:contentType']?.attributes?.term || ''),
          rights: String(firstApp.rights?.label || ''),
          price: String(firstApp['im:price']?.label || firstApp.price || ''),
          bundleId: String(firstApp['im:bundleId']?.label || firstApp.bundleId || '')
        };
        
        console.log('\n🔧 Processed App:');
        console.log('- ID:', processedApp.id);
        console.log('- Name:', processedApp.name);
        console.log('- Artist:', processedApp.artistName);
        console.log('- Category:', processedApp.category);
        console.log('- Price:', processedApp.price);
        console.log('- Summary length:', processedApp.summary.length);
        
        // Check for any remaining objects
        const hasObjects = Object.values(processedApp).some(value => 
          typeof value === 'object' && value !== null
        );
        
        if (hasObjects) {
          console.log('❌ Warning: Still contains objects!');
        } else {
          console.log('✅ All fields are primitives');
        }
        
      } else {
        console.log('❌ No entries found in feed');
      }
      
    } catch (error) {
      console.log('❌ Error parsing JSON:', error.message);
    }
  });
}).on('error', (error) => {
  console.log('❌ Request error:', error.message);
});