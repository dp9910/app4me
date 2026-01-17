const { MasterPipeline } = require('./scripts/master-pipeline.js');
require('dotenv').config({ path: '.env.local' });

async function testOriginalPipeline() {
  console.log('🔬 Testing ORIGINAL master-pipeline.js...\n');
  
  const query = "i am planning to buy a new house, any last minute advice on checklist";
  
  try {
    const pipeline = new MasterPipeline();
    const result = await pipeline.runPipeline(query, {
      limit: 5,
      saveIntermediateFiles: false,
      showDetailedLogs: true
    });

    console.log('\n📊 ORIGINAL PIPELINE RESULTS:');
    console.log('Success:', result.success);
    console.log('Error:', result.error);
    console.log('Results count:', result.final_results?.results?.length || 0);
    
    if (result.final_results?.results?.length > 0) {
      console.log('\nTop 3 apps from ORIGINAL:');
      result.final_results.results.slice(0, 3).forEach((app, i) => {
        console.log(`${i+1}. ${app.title} (${app.primary_category}) - ${app.rating}⭐`);
      });
    }

    // Check LLM analysis
    if (result.steps?.llm_analysis?.result) {
      console.log('\n🧠 AI Analysis from ORIGINAL:');
      console.log('Query type:', result.steps.llm_analysis.result.query_type);
      console.log('Weighted keywords:', result.steps.llm_analysis.result.weighted_keywords?.slice(0, 3));
    }

  } catch (error) {
    console.error('❌ Original pipeline error:', error);
  }
}

testOriginalPipeline().catch(console.error);