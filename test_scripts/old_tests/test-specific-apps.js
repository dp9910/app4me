const ContextualProblemSolver = require('./contextual-problem-solver.js');

async function testSpecificApps() {
  try {
    const solver = new ContextualProblemSolver();
    const query = "plant care";
    
    console.log('='.repeat(80));
    console.log(`Testing similarity for specific plant care apps`);
    console.log('='.repeat(80));
    
    // Generate embedding for query
    const embeddingResponse = await solver.embeddingModel.embedContent(query);
    const queryEmbedding = embeddingResponse.embedding.values;
    console.log(`Generated query embedding with ${queryEmbedding.length} dimensions`);
    
    // Test specific apps
    const testApps = [
      { id: 25094, title: 'Plant Smart: Plant Care Guide' },
      { id: 25070, title: 'PlantFun: Plant ID & Care' },
      { id: 25096, title: 'Plant Care - Save Plant' },
      { id: 26367, title: 'Cheerful Plants' }  // This one was found in embedding search
    ];
    
    for (const testApp of testApps) {
      console.log(`\nTesting: ${testApp.title} (ID: ${testApp.id})`);
      
      // Get the embedding for this app
      const { data: embeddingData, error: embeddingError } = await solver.supabase
        .from('new_embeddings')
        .select('embedding')
        .eq('app_id', testApp.id)
        .single();
      
      if (embeddingError) {
        console.log(`  ❌ Error getting embedding: ${embeddingError.message}`);
        continue;
      }
      
      if (!embeddingData || !embeddingData.embedding) {
        console.log(`  ❌ No embedding found`);
        continue;
      }
      
      let appEmbedding = embeddingData.embedding;
      if (typeof appEmbedding === 'string' && appEmbedding.startsWith('[')) {
        appEmbedding = JSON.parse(appEmbedding);
      }
      
      const similarity = solver.cosineSimilarity(queryEmbedding, appEmbedding);
      console.log(`  Similarity score: ${similarity.toFixed(4)}`);
      
      if (similarity > 0.25) {
        console.log(`  ✅ Would pass threshold (0.25)`);
      } else {
        console.log(`  ❌ Would NOT pass threshold (0.25) - THIS IS THE PROBLEM!`);
      }
      
      // Also get app details for context
      const { data: appData, error: appError } = await solver.supabase
        .from('apps_unified')
        .select('title, description, developer, primary_category')
        .eq('id', testApp.id)
        .single();
      
      if (appData) {
        console.log(`  Category: ${appData.primary_category}`);
        console.log(`  Developer: ${appData.developer}`);
        console.log(`  Description: "${(appData.description || '').substring(0, 100)}..."`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
}

testSpecificApps();