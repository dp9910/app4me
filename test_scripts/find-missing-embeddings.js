/**
 * Find apps missing embeddings
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function findMissingEmbeddings() {
  console.log('🔍 Finding apps without embeddings...');
  
  // Get all app IDs
  const { data: allApps } = await supabase
    .from('apps_unified')
    .select('id');
    
  console.log(`📱 Total apps: ${allApps?.length || 0}`);
  
  // Get all embedding app IDs
  const { data: embeddedApps } = await supabase
    .from('app_embeddings')
    .select('app_id');
    
  console.log(`🔢 Apps with embeddings: ${embeddedApps?.length || 0}`);
  
  if (!allApps || !embeddedApps) {
    console.log('❌ Error fetching data');
    return;
  }
  
  // Find missing
  const embeddedIds = new Set(embeddedApps.map(e => e.app_id));
  const missingIds = allApps.filter(app => !embeddedIds.has(app.id)).map(app => app.id);
  
  console.log(`❓ Apps missing embeddings: ${missingIds.length}`);
  
  if (missingIds.length > 0) {
    console.log('First 10 missing app IDs:', missingIds.slice(0, 10));
    
    // Get details for some missing apps
    const { data: missingDetails } = await supabase
      .from('apps_unified')
      .select('id, title, primary_category, created_at')
      .in('id', missingIds.slice(0, 10));
      
    if (missingDetails) {
      console.log('\nMissing apps details:');
      missingDetails.forEach((app, i) => {
        console.log(`  ${i+1}. ID ${app.id}: ${app.title} (${app.primary_category || 'No category'})`);
      });
    }
  }
  
  console.log(`\n📊 Summary: ${missingIds.length} out of ${allApps.length} apps need embeddings`);
  
  // What should we generate embeddings for?
  console.log('\n🎯 === WHAT TO GENERATE EMBEDDINGS FOR ===');
  console.log('📋 Purpose: Enable semantic search to find similar apps');
  console.log('📝 Content: App metadata from apps_unified table');
  console.log('🔤 Format: `${title} ${developer} ${category} ${description}`');
  console.log('🤖 Model: text-embedding-004 (Gemini)');
  console.log('📊 Dimensions: 768');
  
  console.log('\n💡 RECOMMENDATION:');
  if (missingIds.length > 0) {
    console.log(`Generate embeddings for ${missingIds.length} missing apps first.`);
    console.log('Then test semantic search compatibility.');
    console.log('If compatibility is poor, regenerate all 8,271 existing embeddings.');
  } else {
    console.log('All apps have embeddings! The issue is compatibility.');
    console.log('Regenerate all 8,271 embeddings with current Gemini API.');
  }
  
  return missingIds.length;
}

findMissingEmbeddings().catch(console.error);