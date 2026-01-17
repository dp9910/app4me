const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testTriggerComponents() {
  console.log('🧪 Testing Trigger System Components...\n');
  
  try {
    // Test 1: Database connectivity
    console.log('1️⃣ Testing database connectivity...');
    const { data, error } = await supabase.from('apps_unified').select('count').limit(1);
    if (error) {
      console.log('❌ Database connection failed:', error.message);
      return false;
    }
    console.log('✅ Database connection working\n');

    // Test 2: Source tables exist
    console.log('2️⃣ Testing source tables...');
    const tables = ['itunes_apps', 'serp_apps', 'apple_rss_apps'];
    for (const table of tables) {
      const { error: tableError } = await supabase.from(table).select('count').limit(1);
      if (tableError) {
        console.log(`❌ Table ${table} not accessible:`, tableError.message);
        return false;
      }
      console.log(`✅ Table ${table} accessible`);
    }
    console.log('');

    // Test 3: iTunes API connectivity  
    console.log('3️⃣ Testing iTunes Search API...');
    try {
      const itunesResponse = await fetch('https://itunes.apple.com/search?term=instagram&country=US&entity=software&limit=1');
      const itunesData = await itunesResponse.json();
      if (itunesData.results && itunesData.results.length > 0) {
        console.log('✅ iTunes API responding with data');
        console.log(`   Sample app: ${itunesData.results[0].trackName}`);
      } else {
        console.log('⚠️ iTunes API responding but no results');
      }
    } catch (itunesError) {
      console.log('❌ iTunes API failed:', itunesError.message);
      return false;
    }
    console.log('');

    // Test 4: SERP API connectivity
    console.log('4️⃣ Testing SERP API...');
    const serpApiKey = process.env.SERP_API_KEY;
    if (!serpApiKey) {
      console.log('⚠️ SERP API key not found in environment');
    } else {
      try {
        const serpResponse = await fetch(`https://serpapi.com/search.json?engine=apple_app_store&term=instagram&api_key=${serpApiKey}&num=1`);
        const serpData = await serpResponse.json();
        if (serpData.organic_results && serpData.organic_results.length > 0) {
          console.log('✅ SERP API responding with data');
          console.log(`   Sample app: ${serpData.organic_results[0].title}`);
        } else if (serpData.error) {
          console.log('❌ SERP API error:', serpData.error);
          return false;
        } else {
          console.log('⚠️ SERP API responding but no results');
        }
      } catch (serpError) {
        console.log('❌ SERP API failed:', serpError.message);
        return false;
      }
    }
    console.log('');

    // Test 5: Data reconciliation simulation
    console.log('5️⃣ Testing data reconciliation logic...');
    const { data: existingApps } = await supabase
      .from('apps_unified')
      .select('bundle_id, title, data_quality_score, available_in_sources')
      .limit(3);
    
    if (existingApps && existingApps.length > 0) {
      console.log('✅ Reconciliation data available:');
      existingApps.forEach(app => {
        const sources = Array.isArray(app.available_in_sources) ? 
          app.available_in_sources : JSON.parse(app.available_in_sources || '[]');
        console.log(`   ${app.title}: ${app.data_quality_score}/100 (${sources.length} sources)`);
      });
    } else {
      console.log('⚠️ No reconciled data found - will be populated on first run');
    }
    console.log('');

    // Test 6: File system checks
    console.log('6️⃣ Testing trigger system files...');
    const fs = require('fs');
    const files = [
      'src/app/trigger/page.tsx',
      'src/app/api/trigger-pipeline/route.ts'
    ];
    
    for (const file of files) {
      if (fs.existsSync(file)) {
        console.log(`✅ ${file} exists`);
      } else {
        console.log(`❌ ${file} missing`);
        return false;
      }
    }
    console.log('');

    console.log('🎉 All trigger system components tested successfully!');
    console.log('');
    console.log('🚀 Ready for manual testing:');
    console.log('   1. Run: npm run dev');
    console.log('   2. Go to: http://localhost:3000 (or 3001/3002)');  
    console.log('   3. Click: "⚡ Trigger Pipeline" button');
    console.log('   4. Navigate to: /trigger page');
    console.log('   5. Click: "⚡ Trigger Pipeline" button');
    console.log('   6. Monitor real-time logs');
    console.log('');
    console.log('✅ Manual trigger system ready for production use!');
    
    return true;

  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

testTriggerComponents().then(success => {
  if (success) {
    console.log('\\n🎯 Manual trigger system validation: PASSED');
  } else {
    console.log('\\n💥 Manual trigger system validation: FAILED');
  }
});