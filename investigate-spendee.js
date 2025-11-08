const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function investigateSpendeeApp() {
  try {
    console.log('🔍 Investigating: Spendee Budget App & Planner');
    console.log('='.repeat(60));
    
    // Search for all variations of Spendee
    const { data: spendeeApps, error } = await supabase
      .from('apps_unified')
      .select('id, title, developer, icon_url, bundle_id, primary_category, rating')
      .ilike('title', '%spendee%');
    
    if (error) {
      console.error('❌ Database error:', error);
      return;
    }
    
    console.log(`📊 Found ${spendeeApps.length} Spendee-related apps:\n`);
    
    if (spendeeApps.length === 0) {
      console.log('❌ No Spendee apps found in database');
      return;
    }
    
    spendeeApps.forEach((app, i) => {
      console.log(`${i+1}. ${app.title}`);
      console.log(`   ID: ${app.id}`);
      console.log(`   Developer: ${app.developer || 'N/A'}`);
      console.log(`   Bundle ID: ${app.bundle_id || 'N/A'}`);
      console.log(`   Category: ${app.primary_category || 'N/A'}`);
      console.log(`   Rating: ${app.rating || 'N/A'}`);
      console.log(`   Icon URL: ${app.icon_url || '❌ MISSING'}`);
      console.log('');
    });
    
    // Check for exact duplicates by title
    const titleGroups = new Map();
    spendeeApps.forEach(app => {
      const normalizedTitle = app.title.toLowerCase().trim();
      if (!titleGroups.has(normalizedTitle)) {
        titleGroups.set(normalizedTitle, []);
      }
      titleGroups.get(normalizedTitle).push(app);
    });
    
    console.log('🔍 DUPLICATE ANALYSIS:');
    console.log('='.repeat(40));
    
    let duplicateCount = 0;
    for (const [title, apps] of titleGroups) {
      if (apps.length > 1) {
        duplicateCount++;
        console.log(`\n❌ DUPLICATE GROUP #${duplicateCount}: "${apps[0].title}"`);
        apps.forEach(app => {
          console.log(`   ID ${app.id}: Bundle=${app.bundle_id || 'N/A'}, Icon=${app.icon_url ? 'YES' : 'NO'}`);
        });
      }
    }
    
    if (duplicateCount === 0) {
      console.log('✅ No duplicate titles found');
    } else {
      console.log(`\n❌ Found ${duplicateCount} duplicate title groups`);
    }
    
    // Check icon URL patterns
    console.log('\n🖼️ ICON URL ANALYSIS:');
    console.log('='.repeat(40));
    
    const withIcons = spendeeApps.filter(app => app.icon_url);
    const withoutIcons = spendeeApps.filter(app => !app.icon_url);
    
    console.log(`Apps with icons: ${withIcons.length}`);
    console.log(`Apps without icons: ${withoutIcons.length}`);
    
    if (withIcons.length > 0) {
      console.log('\nSample icon URLs:');
      withIcons.slice(0, 3).forEach(app => {
        console.log(`  ${app.title}: ${app.icon_url.substring(0, 80)}...`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

investigateSpendeeApp();