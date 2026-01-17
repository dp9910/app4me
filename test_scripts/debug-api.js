// Debug the API issue
const { smartHybridRetrieval } = require('./src/lib/recommendation/retrievers/smart-hybrid-retriever.ts');

async function debugAPI() {
  try {
    console.log('🔍 Testing smart hybrid retrieval...');
    
    const query = "i wish there was a app that taught me how to take care of plants";
    const candidates = await smartHybridRetrieval(query, 20);
    
    console.log(`Found ${candidates.length} candidates:`);
    candidates.slice(0, 5).forEach((app, i) => {
      console.log(`${i+1}. ${app.app_data.name} (${app.app_data.category}) - Score: ${app.final_score}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugAPI();