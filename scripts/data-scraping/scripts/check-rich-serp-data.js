/**
 * Check for SERP apps with rich data (icons, screenshots, etc.)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class RichDataChecker {
  async checkRichData() {
    console.log('🔍 Checking for SERP apps with rich data...\n');

    try {
      // Check original serp_apps for rich data
      await this.checkOriginalSerpApps();
      
      // Check serp_unique_apps for rich data
      await this.checkUniqueSerpApps();
      
      // Find specific examples with rich data
      await this.findRichDataExamples();

    } catch (error) {
      console.error('❌ Rich data check failed:', error);
    }
  }

  async checkOriginalSerpApps() {
    console.log('📊 Checking original serp_apps table for rich data...');

    const { data: richApps, error } = await supabase
      .from('serp_apps')
      .select('bundle_id, title, icon_url, version, age_rating, screenshots')
      .not('icon_url', 'is', null)
      .limit(10);

    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
      return;
    }

    console.log(`   📱 Apps with icon URLs in serp_apps: ${richApps.length}`);
    
    if (richApps.length > 0) {
      console.log(`   📋 Sample rich apps:`);
      richApps.slice(0, 3).forEach((app, i) => {
        console.log(`     ${i + 1}. ${app.title} (${app.bundle_id})`);
        console.log(`        Icon: ${app.icon_url ? 'Yes' : 'No'}`);
        console.log(`        Version: ${app.version || 'null'}`);
        console.log(`        Age Rating: ${app.age_rating || 'null'}`);
        console.log(`        Screenshots: ${app.screenshots ? 'Yes' : 'No'}`);
      });
    }
  }

  async checkUniqueSerpApps() {
    console.log('\n📊 Checking serp_unique_apps table for rich data...');

    const { data: richApps, error } = await supabase
      .from('serp_unique_apps')
      .select('bundle_id, title, icon_url, version, age_rating, screenshots')
      .not('icon_url', 'is', null)
      .limit(10);

    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
      return;
    }

    console.log(`   📱 Apps with icon URLs in serp_unique_apps: ${richApps.length}`);
    
    if (richApps.length > 0) {
      console.log(`   📋 Sample rich unique apps:`);
      richApps.slice(0, 3).forEach((app, i) => {
        console.log(`     ${i + 1}. ${app.title} (${app.bundle_id})`);
        console.log(`        Icon: ${app.icon_url ? 'Yes' : 'No'}`);
        console.log(`        Version: ${app.version || 'null'}`);
        console.log(`        Age Rating: ${app.age_rating || 'null'}`);
        console.log(`        Screenshots: ${app.screenshots ? 'Yes' : 'No'}`);
      });
    }
  }

  async findRichDataExamples() {
    console.log('\n🔍 Looking for specific examples with rich data...');

    // Check for the X (Twitter) app example you showed
    const { data: xApp, error: xError } = await supabase
      .from('serp_apps')
      .select('*')
      .eq('title', 'X')
      .limit(1);

    if (!xError && xApp.length > 0) {
      const app = xApp[0];
      console.log(`   📱 Found X (Twitter) app:`);
      console.log(`     Bundle ID: ${app.bundle_id}`);
      console.log(`     Title: ${app.title}`);
      console.log(`     Icon URL: ${app.icon_url || 'null'}`);
      console.log(`     Version: ${app.version || 'null'}`);
      console.log(`     Age Rating: ${app.age_rating || 'null'}`);
      console.log(`     Screenshots: ${app.screenshots ? 'Has data' : 'null'}`);
      
      // Check if this app is in unique table
      const { data: uniqueX, error: uniqueError } = await supabase
        .from('serp_unique_apps')
        .select('*')
        .eq('bundle_id', app.bundle_id)
        .limit(1);

      if (!uniqueError) {
        if (uniqueX.length > 0) {
          const uniqueApp = uniqueX[0];
          console.log(`\n   🎯 Same app in serp_unique_apps:`);
          console.log(`     Icon URL: ${uniqueApp.icon_url || 'null'}`);
          console.log(`     Version: ${uniqueApp.version || 'null'}`);
          console.log(`     Age Rating: ${uniqueApp.age_rating || 'null'}`);
        } else {
          console.log(`\n   ❌ X app not found in serp_unique_apps (not in unique 814)`);
        }
      }
    }

    // Look for any apps with actual data
    console.log('\n🔍 Searching for any SERP apps with complete data...');
    
    const { data: completeApps, error: completeError } = await supabase
      .from('serp_apps')
      .select('bundle_id, title, icon_url, version, age_rating, price_value')
      .not('icon_url', 'is', null)
      .not('version', 'is', null)
      .not('age_rating', 'is', null)
      .limit(5);

    if (!completeError && completeApps.length > 0) {
      console.log(`   📱 Found ${completeApps.length} apps with complete data:`);
      completeApps.forEach((app, i) => {
        console.log(`     ${i + 1}. ${app.title} (${app.bundle_id})`);
        console.log(`        Icon: ✅, Version: ${app.version}, Age: ${app.age_rating}, Price: ${app.price_value}`);
      });
    } else {
      console.log(`   ❌ No apps found with complete icon/version/age data`);
    }
  }
}

async function main() {
  const checker = new RichDataChecker();
  await checker.checkRichData();
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Rich data check completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Check failed:', error);
      process.exit(1);
    });
}

module.exports = { RichDataChecker };