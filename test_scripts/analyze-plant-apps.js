const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function getPlantAppsDetailed() {
  try {
    console.log('🌱 Getting ALL apps with plant/garden keywords...\n');
    
    const { data, error } = await supabase
      .from('apps_unified')
      .select('id, title, primary_category, rating, description')
      .or('title.ilike.%plant%,title.ilike.%garden%,description.ilike.%plant%,description.ilike.%garden%')
      .order('rating', { ascending: false });
    
    if (error) throw error;
    
    // Categorize apps
    const actualPlantCare = [];
    const gardenGames = [];
    const other = [];
    
    data.forEach(app => {
      const title = app.title?.toLowerCase() || '';
      const desc = app.description?.toLowerCase() || '';
      
      // Real plant care apps
      if (
        title.includes('planta') ||
        title.includes('plant care') ||
        title.includes('plant & garden') ||
        title.includes('flora') ||
        (title.includes('plant') && !title.includes('vs') && !title.includes('game')) ||
        desc.includes('watering') ||
        desc.includes('plant care') ||
        desc.includes('houseplant') ||
        desc.includes('botanical')
      ) {
        actualPlantCare.push(app);
      }
      // Garden design/match games
      else if (
        title.includes('garden') && (title.includes('design') || title.includes('match') || title.includes('game')) ||
        title.includes('lilys garden') ||
        title.includes('garden affairs') ||
        title.includes('garden joy')
      ) {
        gardenGames.push(app);
      } else {
        other.push(app);
      }
    });
    
    console.log('🎯 ACTUAL PLANT CARE APPS:');
    console.log('='.repeat(50));
    actualPlantCare.forEach((app, i) => {
      console.log(`${i+1}. ${app.title} (${app.primary_category}) - ${app.rating}⭐`);
      console.log(`   ID: ${app.id}`);
    });
    
    console.log(`\n🎮 GARDEN DESIGN/MATCH GAMES (${gardenGames.length}):`);
    console.log('='.repeat(50));
    gardenGames.slice(0, 10).forEach((app, i) => {
      console.log(`${i+1}. ${app.title} (${app.primary_category}) - ${app.rating}⭐`);
    });
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`- Actual plant care apps: ${actualPlantCare.length}`);
    console.log(`- Garden games: ${gardenGames.length}`);
    console.log(`- Other matches: ${other.length}`);
    console.log(`- Total: ${data.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

getPlantAppsDetailed();