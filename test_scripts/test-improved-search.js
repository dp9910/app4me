/**
 * Test the improved search algorithm specifically for plant care queries
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testImprovedSearch() {
  console.log('🌱 Testing improved search algorithm for plant care...');
  
  const testQueries = [
    "looking for apps that will help me take care of my plant",
    "i wish there were apps that help me teach how to take care of plants",
    "plant care apps for beginners",
    "garden design and planning tools",
    "apps to identify plants and flowers"
  ];
  
  for (const query of testQueries) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔍 Testing query: "${query}"`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      // Test the API endpoint
      const response = await fetch('http://localhost:3001/api/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          preferences: {
            interests: ['gardening', 'plants'],
            categories: ['lifestyle', 'education']
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.recommendations) {
        console.log(`✅ Found ${data.recommendations.length} recommendations`);
        
        // Display top 5 results
        data.recommendations.slice(0, 5).forEach((app, index) => {
          console.log(`\n${index + 1}. ${app.app_data.name}`);
          console.log(`   Category: ${app.app_data.category}`);
          console.log(`   Rating: ${app.app_data.rating}/5`);
          console.log(`   Score: ${app.final_score.toFixed(3)}`);
          console.log(`   Methods: ${app.search_methods?.join(', ') || 'N/A'}`);
          console.log(`   Keywords: ${app.matched_concepts?.join(', ') || 'N/A'}`);
          console.log(`   Reason: ${app.match_explanation}`);
          console.log(`   One-liner: ${app.personalized_oneliner}`);
        });
        
        // Check for plant-specific apps in results
        const plantApps = data.recommendations.filter(app => {
          const name = app.app_data.name.toLowerCase();
          const category = app.app_data.category.toLowerCase();
          return name.includes('plant') || name.includes('garden') || name.includes('flora') ||
                 category.includes('design') && (name.includes('garden') || name.includes('landscape'));
        });
        
        console.log(`\n🌿 Plant-specific apps found: ${plantApps.length}/${data.recommendations.length}`);
        
        if (plantApps.length > 0) {
          console.log('Top plant apps:');
          plantApps.slice(0, 3).forEach((app, index) => {
            console.log(`   ${index + 1}. ${app.app_data.name} (Score: ${app.final_score.toFixed(3)})`);
          });
        }
        
      } else {
        console.log('❌ No recommendations returned');
        console.log('Response:', data);
      }
      
    } catch (error) {
      console.error(`❌ Error testing query: ${error.message}`);
      
      // Fallback: Check what plant apps exist in database
      console.log('\n🔍 Checking database for plant apps...');
      await checkPlantAppsInDatabase();
    }
  }
  
  console.log('\n🌿 Improved search test completed!');
}

async function checkPlantAppsInDatabase() {
  try {
    const { data: plantApps, error } = await supabase
      .from('apps_unified')
      .select('title, primary_category, rating, description')
      .or('title.ilike.%plant%,title.ilike.%garden%,title.ilike.%flora%,description.ilike.%plant%,description.ilike.%garden%')
      .order('rating', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    console.log(`📊 Found ${plantApps.length} plant-related apps in database:`);
    plantApps.forEach((app, index) => {
      console.log(`   ${index + 1}. ${app.title} (${app.primary_category}) - ${app.rating}/5`);
      if (app.description) {
        console.log(`      ${app.description.substring(0, 80)}...`);
      }
    });
    
  } catch (error) {
    console.error('Error checking plant apps:', error);
  }
}

// Run the test
testImprovedSearch().catch(console.error);