// Test searching for plant-related apps
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function findPlantApps() {
  console.log('🌱 Searching for plant/garden/botany apps...');
  
  const plantTerms = [
    'plant', 'garden', 'flower', 'tree', 'leaf', 'grow', 'seed', 'soil', 
    'water', 'botanical', 'botany', 'greenhouse', 'lawn', 'landscape',
    'flora', 'cactus', 'herb', 'vegetation'
  ];
  
  const allPlantApps = new Map();
  
  for (const term of plantTerms) {
    console.log(`\n--- Searching for "${term}" ---`);
    
    const { data: apps, error } = await supabase
      .from('apps_unified')
      .select('id, title, primary_category, description')
      .or(`title.ilike.%${term}%,description.ilike.%${term}%`)
      .limit(10);
    
    if (error) {
      console.error('Error:', error);
      continue;
    }
    
    if (apps.length > 0) {
      console.log(`Found ${apps.length} apps with "${term}":`);
      apps.forEach((app, i) => {
        console.log(`  ${i+1}. ${app.title} (${app.primary_category})`);
        
        // Add to unique collection
        if (!allPlantApps.has(app.id)) {
          allPlantApps.set(app.id, {
            ...app,
            matchedTerms: [term]
          });
        } else {
          allPlantApps.get(app.id).matchedTerms.push(term);
        }
      });
    } else {
      console.log(`No apps found with "${term}"`);
    }
  }
  
  console.log('\n🌿 SUMMARY: All unique plant-related apps found:');
  console.log('=' * 60);
  
  const uniqueApps = Array.from(allPlantApps.values());
  if (uniqueApps.length > 0) {
    uniqueApps.forEach((app, i) => {
      console.log(`${i+1}. ${app.title} (${app.primary_category})`);
      console.log(`   Terms: ${app.matchedTerms.join(', ')}`);
      console.log(`   Description: ${app.description?.substring(0, 100)}...`);
      console.log('');
    });
    
    console.log(`\n✅ Total unique plant-related apps: ${uniqueApps.length}`);
  } else {
    console.log('❌ No plant-related apps found in database');
  }
}

findPlantApps().catch(console.error);