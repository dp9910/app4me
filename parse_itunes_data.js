const fs = require('fs');

// Read the iTunes API data file
const rawData = fs.readFileSync('1.txt', 'utf8');

try {
  // Parse the JSON data
  const itunesData = JSON.parse(rawData);
  
  console.log('='.repeat(80));
  console.log('📱 iTunes API Data Analysis');
  console.log('='.repeat(80));
  
  // Basic stats
  console.log(`📊 Total Apps Found: ${itunesData.resultCount}`);
  console.log(`📋 Apps in Results Array: ${itunesData.results.length}`);
  console.log('');
  
  // Analyze first app structure
  if (itunesData.results.length > 0) {
    const firstApp = itunesData.results[0];
    console.log('🔍 Sample App Structure (First App):');
    console.log('─'.repeat(50));
    console.log(`App Name: ${firstApp.trackName}`);
    console.log(`Developer: ${firstApp.artistName}`);
    console.log(`Price: $${firstApp.price} (${firstApp.formattedPrice})`);
    console.log(`Category: ${firstApp.primaryGenreName}`);
    console.log(`Rating: ${firstApp.averageUserRating} (${firstApp.userRatingCount} reviews)`);
    console.log(`Bundle ID: ${firstApp.bundleId}`);
    console.log(`Track ID: ${firstApp.trackId}`);
    console.log(`Release Date: ${firstApp.releaseDate}`);
    console.log(`Current Version: ${firstApp.version}`);
    console.log(`File Size: ${(firstApp.fileSizeBytes / 1024 / 1024).toFixed(1)} MB`);
    console.log(`Min iOS: ${firstApp.minimumOsVersion}`);
    console.log('');
    
    // Show all available fields for the first app
    console.log('📋 All Available Fields:');
    console.log('─'.repeat(50));
    const fields = Object.keys(firstApp).sort();
    fields.forEach((field, index) => {
      const value = firstApp[field];
      const type = Array.isArray(value) ? 'array' : typeof value;
      const preview = type === 'string' && value.length > 50 ? 
        value.substring(0, 50) + '...' : 
        JSON.stringify(value);
      console.log(`${(index + 1).toString().padStart(2)}: ${field.padEnd(30)} (${type.padEnd(8)}) ${preview}`);
    });
    console.log('');
  }
  
  // Extract and categorize useful fields for database
  console.log('🗄️  Recommended Database Fields:');
  console.log('─'.repeat(50));
  
  const dbFields = {
    // Core identifiers
    'Core IDs': ['trackId', 'bundleId', 'artistId'],
    
    // Basic info
    'Basic Info': ['trackName', 'artistName', 'description', 'version', 'releaseDate'],
    
    // Pricing & category
    'Commercial': ['price', 'currency', 'formattedPrice', 'primaryGenreName', 'primaryGenreId', 'genres'],
    
    // Ratings & reviews
    'Social Proof': ['averageUserRating', 'userRatingCount', 'averageUserRatingForCurrentVersion', 'userRatingCountForCurrentVersion'],
    
    // Technical specs
    'Technical': ['minimumOsVersion', 'fileSizeBytes', 'languageCodesISO2A', 'supportedDevices'],
    
    // Media assets
    'Media': ['artworkUrl60', 'artworkUrl100', 'artworkUrl512', 'screenshotUrls', 'ipadScreenshotUrls'],
    
    // Store links
    'Links': ['trackViewUrl', 'artistViewUrl', 'sellerUrl'],
    
    // Additional metadata
    'Metadata': ['trackContentRating', 'contentAdvisoryRating', 'sellerName', 'currentVersionReleaseDate', 'releaseNotes']
  };
  
  Object.entries(dbFields).forEach(([category, fields]) => {
    console.log(`\n${category}:`);
    fields.forEach(field => {
      const hasField = itunesData.results[0] && itunesData.results[0].hasOwnProperty(field);
      const status = hasField ? '✅' : '❌';
      console.log(`  ${status} ${field}`);
    });
  });
  
  // Process all apps and show summary stats
  console.log('\n📊 All Apps Summary:');
  console.log('─'.repeat(50));
  
  const processedApps = itunesData.results.map((app, index) => ({
    index: index + 1,
    trackId: app.trackId,
    trackName: app.trackName,
    artistName: app.artistName,
    price: app.price || 0,
    isFree: (app.price || 0) === 0,
    rating: app.averageUserRating || 0,
    reviewCount: app.userRatingCount || 0,
    category: app.primaryGenreName,
    fileSize: app.fileSizeBytes ? (app.fileSizeBytes / 1024 / 1024).toFixed(1) + ' MB' : 'Unknown',
    hasDescription: !!app.description,
    hasScreenshots: !!(app.screenshotUrls && app.screenshotUrls.length > 0)
  }));
  
  // Price distribution
  const freeApps = processedApps.filter(app => app.isFree);
  const paidApps = processedApps.filter(app => !app.isFree);
  console.log(`💰 Free Apps: ${freeApps.length}`);
  console.log(`💸 Paid Apps: ${paidApps.length}`);
  
  // Category distribution
  const categories = {};
  processedApps.forEach(app => {
    categories[app.category] = (categories[app.category] || 0) + 1;
  });
  console.log('\n📁 Categories:');
  Object.entries(categories).forEach(([category, count]) => {
    console.log(`  ${category}: ${count} apps`);
  });
  
  // Rating distribution
  const ratedApps = processedApps.filter(app => app.rating > 0);
  const avgRating = ratedApps.reduce((sum, app) => sum + app.rating, 0) / ratedApps.length;
  console.log(`\n⭐ Average Rating: ${avgRating.toFixed(2)} (${ratedApps.length} apps with ratings)`);
  
  // Generate database-ready format
  console.log('\n🔧 Database-Ready Format (First 3 Apps):');
  console.log('─'.repeat(50));
  
  const dbReadyApps = itunesData.results.slice(0, 3).map(app => ({
    track_id: app.trackId,
    track_name: app.trackName,
    artist_name: app.artistName,
    description: app.description || null,
    price: app.price || 0,
    currency: app.currency || 'USD',
    is_free: (app.price || 0) === 0,
    primary_genre: app.primaryGenreName,
    average_user_rating: app.averageUserRating || null,
    user_rating_count: app.userRatingCount || null,
    artwork_url_100: app.artworkUrl100 || null,
    track_view_url: app.trackViewUrl || null,
    release_date: app.releaseDate || null,
    version: app.version || null,
    bundle_id: app.bundleId || null,
    minimum_os_version: app.minimumOsVersion || null,
    file_size_bytes: app.fileSizeBytes || null,
    seller_name: app.sellerName || null,
    content_rating: app.trackContentRating || null
  }));
  
  console.log(JSON.stringify(dbReadyApps, null, 2));
  
  // Save processed data to files
  fs.writeFileSync('processed_apps.json', JSON.stringify(processedApps, null, 2));
  fs.writeFileSync('database_ready_apps.json', JSON.stringify(dbReadyApps, null, 2));
  
  console.log('\n📁 Files Generated:');
  console.log('  ✅ processed_apps.json - Human-readable summary');
  console.log('  ✅ database_ready_apps.json - Database-ready format');
  
} catch (error) {
  console.error('❌ Error parsing iTunes data:', error.message);
}