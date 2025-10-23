const https = require('https');
const fs = require('fs');

// Apple RSS feed endpoints to analyze
const rssFeeds = [
  {
    name: 'Top Free Apps - US',
    url: 'https://rss.applemarketingtools.com/api/v2/us/apps/top-free/25/apps.json',
    type: 'top-free'
  },
  {
    name: 'Top Paid Apps - US', 
    url: 'https://rss.applemarketingtools.com/api/v2/us/apps/top-paid/25/apps.json',
    type: 'top-paid'
  },
  {
    name: 'New Apps We Love - US',
    url: 'https://rss.applemarketingtools.com/api/v2/us/apps/new-apps-we-love/25/apps.json',
    type: 'new-apps'
  }
];

// Function to fetch data from URL
function fetchData(url) {
  return new Promise((resolve, reject) => {
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

async function analyzeAppleRSSFeeds() {
  console.log('='.repeat(80));
  console.log('🍎 Apple RSS Feed Data Analysis');
  console.log('='.repeat(80));
  
  const allFeedData = [];
  const allApps = [];
  
  for (const feed of rssFeeds) {
    try {
      console.log(`\n📡 Fetching ${feed.name}...`);
      console.log(`URL: ${feed.url}`);
      
      const data = await fetchData(feed.url);
      
      if (!data.feed || !data.feed.results) {
        console.log(`❌ No results found in ${feed.name}`);
        continue;
      }
      
      console.log(`✅ Success! Found ${data.feed.results.length} apps`);
      
      // Analyze feed metadata
      console.log(`\n📊 Feed Metadata for ${feed.name}:`);
      console.log('─'.repeat(50));
      console.log(`Title: ${data.feed.title}`);
      console.log(`Author: ${data.feed.author?.name || data.feed.author}`);
      console.log(`Country: ${data.feed.country}`);
      console.log(`Updated: ${data.feed.updated}`);
      console.log(`Copyright: ${data.feed.copyright}`);
      console.log(`ID: ${data.feed.id}`);
      
      // Process apps from this feed
      const processedApps = data.feed.results.map((app, index) => ({
        feedType: feed.type,
        feedName: feed.name,
        rank: index + 1,
        id: app.id,
        name: app.name,
        artistName: app.artistName,
        artworkUrl100: app.artworkUrl100,
        genres: app.genres || [],
        kind: app.kind,
        releaseDate: app.releaseDate,
        url: app.url,
        contentAdvisoryRating: app.contentAdvisoryRating,
        copyright: app.copyright,
        description: app.description,
        price: app.price,
        currency: app.currency,
        bundleId: app.bundleId
      }));
      
      allFeedData.push({
        feedInfo: feed,
        feedMetadata: data.feed,
        apps: processedApps
      });
      
      allApps.push(...processedApps);
      
      // Show sample app from this feed
      if (processedApps.length > 0) {
        const sampleApp = processedApps[0];
        console.log(`\n📱 Sample App (#1 in ${feed.name}):`);
        console.log('─'.repeat(30));
        console.log(`Name: ${sampleApp.name}`);
        console.log(`Artist: ${sampleApp.artistName}`);
        console.log(`ID: ${sampleApp.id}`);
        console.log(`Kind: ${sampleApp.kind}`);
        console.log(`Genres: ${sampleApp.genres.map(g => g.name || g).join(', ')}`);
        console.log(`Price: ${sampleApp.price ? `${sampleApp.currency || '$'}${sampleApp.price}` : 'Free/N/A'}`);
        console.log(`Release Date: ${sampleApp.releaseDate ? new Date(sampleApp.releaseDate).toDateString() : 'N/A'}`);
        console.log(`Rating: ${sampleApp.contentAdvisoryRating || 'N/A'}`);
      }
      
    } catch (error) {
      console.log(`❌ Error fetching ${feed.name}: ${error.message}`);
    }
  }
  
  // Overall Analysis
  console.log('\n' + '='.repeat(80));
  console.log('📊 OVERALL ANALYSIS');
  console.log('='.repeat(80));
  
  console.log(`\n📈 Summary Statistics:`);
  console.log('─'.repeat(30));
  console.log(`Total Feeds Processed: ${allFeedData.length}/${rssFeeds.length}`);
  console.log(`Total Apps Collected: ${allApps.length}`);
  console.log(`Unique Apps: ${new Set(allApps.map(app => app.id)).size}`);
  
  // Genre analysis
  const allGenres = {};
  allApps.forEach(app => {
    app.genres.forEach(genre => {
      const genreName = genre.name || genre;
      allGenres[genreName] = (allGenres[genreName] || 0) + 1;
    });
  });
  
  console.log(`\n📁 Genre Distribution (Top 10):`);
  console.log('─'.repeat(40));
  Object.entries(allGenres)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .forEach(([genre, count]) => {
      console.log(`${genre.padEnd(30)} ${count} apps`);
    });
  
  // Feed type analysis
  const feedTypes = {};
  allApps.forEach(app => {
    feedTypes[app.feedType] = (feedTypes[app.feedType] || 0) + 1;
  });
  
  console.log(`\n📡 Apps by Feed Type:`);
  console.log('─'.repeat(30));
  Object.entries(feedTypes).forEach(([type, count]) => {
    console.log(`${type.padEnd(20)} ${count} apps`);
  });
  
  // Data completeness analysis
  console.log(`\n🔍 Data Completeness:`);
  console.log('─'.repeat(30));
  console.log(`Apps with Price: ${allApps.filter(app => app.price !== undefined).length}`);
  console.log(`Apps with Description: ${allApps.filter(app => app.description).length}`);
  console.log(`Apps with Artwork: ${allApps.filter(app => app.artworkUrl100).length}`);
  console.log(`Apps with Bundle ID: ${allApps.filter(app => app.bundleId).length}`);
  console.log(`Apps with Content Rating: ${allApps.filter(app => app.contentAdvisoryRating).length}`);
  
  // Available fields analysis
  console.log(`\n📋 Available Fields (from first app):`);
  console.log('─'.repeat(50));
  if (allApps.length > 0) {
    const firstApp = allApps[0];
    Object.keys(firstApp).forEach((field, index) => {
      const value = firstApp[field];
      const type = Array.isArray(value) ? 'array' : typeof value;
      const hasValue = value !== null && value !== undefined && value !== '';
      const status = hasValue ? '✅' : '❌';
      console.log(`${(index + 1).toString().padStart(2)}: ${field.padEnd(25)} (${type.padEnd(8)}) ${status}`);
    });
  }
  
  // Database-ready format
  console.log(`\n🗄️ Database Schema Recommendation:`);
  console.log('─'.repeat(50));
  const dbFields = {
    'Core Fields': ['source', 'feed_type', 'app_id', 'app_name', 'artist_name'],
    'Display': ['artwork_url_100', 'description'],
    'Classification': ['genres', 'kind', 'content_rating'],
    'Commercial': ['price', 'currency'],
    'Technical': ['bundle_id', 'release_date'],
    'Links': ['store_url'],
    'Metadata': ['rank', 'feed_name', 'copyright']
  };
  
  Object.entries(dbFields).forEach(([category, fields]) => {
    console.log(`\n${category}:`);
    fields.forEach(field => {
      console.log(`  📄 ${field}`);
    });
  });
  
  // Generate database-ready format
  const dbReadyApps = allApps.slice(0, 5).map(app => ({
    source: 'apple_rss',
    feed_type: app.feedType,
    app_id: app.id,
    app_name: app.name,
    artist_name: app.artistName,
    artwork_url_100: app.artworkUrl100,
    genres: app.genres,
    kind: app.kind,
    content_rating: app.contentAdvisoryRating,
    price: app.price,
    currency: app.currency,
    bundle_id: app.bundleId,
    release_date: app.releaseDate,
    store_url: app.url,
    rank: app.rank,
    feed_name: app.feedName,
    copyright: app.copyright,
    description: app.description
  }));
  
  console.log(`\n🔧 Database-Ready Format (First 5 Apps):`);
  console.log('─'.repeat(50));
  console.log(JSON.stringify(dbReadyApps, null, 2));
  
  // Save data to files
  try {
    fs.writeFileSync('apple_rss_all_data.json', JSON.stringify(allFeedData, null, 2));
    fs.writeFileSync('apple_rss_processed_apps.json', JSON.stringify(allApps, null, 2));
    fs.writeFileSync('apple_rss_database_ready.json', JSON.stringify(dbReadyApps, null, 2));
    
    console.log('\n📁 Files Generated:');
    console.log('  ✅ apple_rss_all_data.json - Complete RSS feed data');
    console.log('  ✅ apple_rss_processed_apps.json - All processed apps');
    console.log('  ✅ apple_rss_database_ready.json - Database-ready format');
    
  } catch (error) {
    console.log(`❌ Error saving files: ${error.message}`);
  }
}

// Run the analysis
analyzeAppleRSSFeeds().catch(error => {
  console.error('❌ Analysis failed:', error.message);
});