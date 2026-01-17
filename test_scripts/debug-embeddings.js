const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkOverlap() {
  console.log('🔍 Checking app_id overlap...');
  
  // Get all app_ids from each table
  const { data: featuresData } = await supabase
    .from('app_features')
    .select('app_id')
    .order('app_id', { ascending: true });
    
  const { data: embeddingsData } = await supabase
    .from('app_embeddings')
    .select('app_id')
    .order('app_id', { ascending: true });
    
  console.log('Features app_id range:', featuresData[0]?.app_id, 'to', featuresData[featuresData.length-1]?.app_id);
  console.log('Embeddings app_id range:', embeddingsData[0]?.app_id, 'to', embeddingsData[embeddingsData.length-1]?.app_id);
  
  // Check for actual overlaps
  const featuresSet = new Set(featuresData.map(f => f.app_id));
  const embeddingsSet = new Set(embeddingsData.map(e => e.app_id));
  
  const overlap = [];
  const missingEmbeddings = [];
  
  for (const id of featuresSet) {
    if (embeddingsSet.has(id)) {
      overlap.push(id);
    } else {
      missingEmbeddings.push(id);
    }
  }
  
  console.log('Actual overlap count:', overlap.length);
  console.log('Apps with features but missing embeddings:', missingEmbeddings.length);
  console.log('First 10 missing:', missingEmbeddings.slice(0, 10));
  
  // Check if any embeddings exist for apps not in features
  const orphanEmbeddings = [];
  for (const id of embeddingsSet) {
    if (!featuresSet.has(id)) {
      orphanEmbeddings.push(id);
    }
  }
  
  console.log('Orphan embeddings (no features):', orphanEmbeddings.length);
}

checkOverlap();