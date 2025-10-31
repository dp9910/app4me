const fs = require('fs');

async function testDuplicateWithLocalBackup() {
  console.log('🧪 Testing duplicate detection with local backup...\n');
  
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
  
  // Load local backup
  console.log('📊 Loading apps_unified backup...');
  const backupPath = './data-scraping/table-backups/apps_unified_2025-10-31T16-33-58-923Z.json';
  
  if (!fs.existsSync(backupPath)) {
    console.error('❌ Backup file not found:', backupPath);
    return;
  }
  
  const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
  const existingApps = backupData.data || backupData;
  
  console.log(`Found ${existingApps.length} existing apps in backup\n`);
  
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
  
  // Show some examples of what's in the backup
  console.log('\n📄 Sample apps from backup:');
  const khanApps = existingApps.filter(app => 
    app.title?.toLowerCase().includes('khan') || 
    app.bundle_id?.includes('khanacademy')
  );
  
  khanApps.forEach(app => {
    console.log(`- "${app.title}" | Bundle: ${app.bundle_id}`);
  });
}

testDuplicateWithLocalBackup().catch(console.error);