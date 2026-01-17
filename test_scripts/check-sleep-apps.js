const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkSleepApps() {
  console.log('🔍 Checking sleep apps in database...');
  
  // Check for sleep-related apps in titles
  const { data: sleepTitles, error: titleError } = await supabase
    .from('apps_unified')
    .select('id, title, primary_category, rating')
    .or('title.ilike.%sleep%,title.ilike.%insomnia%,title.ilike.%pillow%,title.ilike.%bedtime%,title.ilike.%dream%')
    .order('rating', { ascending: false });
  
  if (!titleError && sleepTitles) {
    console.log('\n📱 Sleep apps by TITLE:');
    sleepTitles.slice(0, 10).forEach((app, i) => {
      console.log(`${i+1}. ${app.title} (${app.primary_category || 'Unknown'}) - Rating: ${app.rating}`);
    });
    console.log(`\nTotal sleep apps by title: ${sleepTitles.length}`);
    
    // Check how many have embeddings
    const sleepIds = sleepTitles.map(app => app.id);
    const { data: withEmbeddings } = await supabase
      .from('new_embeddings')
      .select('app_id')
      .in('app_id', sleepIds);
    
    console.log(`\n🧠 Sleep apps WITH embeddings: ${withEmbeddings?.length || 0}/${sleepIds.length}`);
    
    if (withEmbeddings && withEmbeddings.length > 0) {
      console.log('Sleep apps with embeddings:');
      const appsWithEmbeddings = sleepTitles.filter(app => 
        withEmbeddings.some(emb => emb.app_id === app.id)
      );
      appsWithEmbeddings.slice(0, 5).forEach((app, i) => {
        console.log(`  ${i+1}. ${app.title}`);
      });
    }
  } else {
    console.log('Error or no sleep apps found:', titleError?.message);
  }
}

checkSleepApps().catch(console.error);