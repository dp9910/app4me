const fs = require('fs');

// Read the apps file
const appsData = JSON.parse(fs.readFileSync('data-scraping/new-apps/unique-apps-starbucks-2025-11-04T02-31-27-760Z.json', 'utf8'));
const featuresData = JSON.parse(fs.readFileSync('data-scraping/new-features/features-starbucks-2025-11-04T02-34-06-899Z.json', 'utf8'));

console.log('📋 Apps file structure:');
console.log('Keys:', Object.keys(appsData));
console.log('Number of apps:', appsData.apps ? appsData.apps.length : 'No apps key');

console.log('\n📋 Features file structure:');
console.log('Keys:', Object.keys(featuresData));
console.log('Number of features:', featuresData.features ? featuresData.features.length : 'No features key');

// Get bundle_ids from both
const appBundleIds = appsData.apps ? appsData.apps.map(app => app.bundle_id) : [];
const featureBundleIds = featuresData.features ? featuresData.features.map(f => f.bundle_id) : [];

console.log('\n🔍 Bundle ID comparison:');
console.log('Apps bundle_ids (first 5):', appBundleIds.slice(0, 5));
console.log('Features bundle_ids (first 5):', featureBundleIds.slice(0, 5));

// Check which feature bundle_ids are NOT in apps
const missingInApps = featureBundleIds.filter(id => !appBundleIds.includes(id));
console.log('\n❌ Features bundle_ids missing from apps:', missingInApps.length);
if (missingInApps.length > 0) {
  console.log('Missing bundle_ids:', missingInApps);
}

// Check which app bundle_ids are NOT in features
const missingInFeatures = appBundleIds.filter(id => !featureBundleIds.includes(id));
console.log('\n📋 Apps bundle_ids missing from features:', missingInFeatures.length);
if (missingInFeatures.length > 0) {
  console.log('Missing in features (first 10):', missingInFeatures.slice(0, 10));
}