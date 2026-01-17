const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testDuplicateLogic() {
  console.log('🧪 Testing duplicate detection logic...\n');
  
  // Test apps from iTunes search
  const testApps = [
    {
      title: 'Khan Academy',
      bundle_id: 'org.khanacademy.Khan-Academy'
    },
    {
      title: 'Khan Academy Kids', 
      bundle_id: 'org.khanacademy.Khan-Kids'
    },
    {
      title: 'New Chemistry App',
      bundle_id: 'com.new.chemistry'
    }
  ];
  
  // Get existing apps from database
  console.log('📊 Fetching existing apps from database...');
  const { data: existingApps, error } = await supabase
    .from('apps_unified')
    .select('bundle_id, title');
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log(`Found ${existingApps.length} existing apps\n`);
  
  // Create sets for duplicate checking
  const existingBundleIds = new Set();
  const existingTitles = new Set();
  
  existingApps.forEach(app => {
    if (app.bundle_id) {
      existingBundleIds.add(app.bundle_id);
    }
    if (app.title) {
      existingTitles.add(app.title.toLowerCase().replace(/[^a-z0-9]/g, ''));
    }
  });
  
  console.log('🔍 Testing each app:');
  
  testApps.forEach((app, i) => {
    const bundleKey = app.bundle_id;
    const titleKey = app.title?.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    const bundleExists = bundleKey && existingBundleIds.has(bundleKey);
    const titleExists = titleKey && existingTitles.has(titleKey);
    const isExisting = bundleExists || titleExists;
    
    console.log(`\n${i + 1}. Testing: "${app.title}"`);
    console.log(`   Bundle ID: ${bundleKey}`);
    console.log(`   Title key: ${titleKey}`);
    console.log(`   Bundle exists: ${bundleExists}`);
    console.log(`   Title exists: ${titleExists}`);
    console.log(`   Is duplicate: ${isExisting ? '✅ YES' : '❌ NO'}`);
    
    if (isExisting) {
      console.log(`   → Would skip this app`);
    } else {
      console.log(`   → Would process this app`);
    }
  });
  
  // Test specific Khan Academy lookup
  console.log('\n🎯 Direct Khan Academy lookup:');
  const khanExists = existingBundleIds.has('org.khanacademy.Khan-Academy');
  const khanTitleExists = existingTitles.has('khanacademy');
  console.log(`Khan Academy bundle exists: ${khanExists}`);
  console.log(`Khan Academy title exists: ${khanTitleExists}`);
}

testDuplicateLogic().catch(console.error);