const { MasterPipeline } = require('./src/lib/search/index.ts');

async function testTypescriptPipeline() {
  console.log('🔬 Testing TYPESCRIPT pipeline...\n');
  
  const query = "i am planning to buy a new house, any last minute advice on checklist";
  
  try {
    const pipeline = new MasterPipeline();
    const result = await pipeline.runPipeline(query, {
      limit: 5,
      saveIntermediateFiles: false,
      showDetailedLogs: true
    });

    console.log('\n📊 TYPESCRIPT PIPELINE RESULTS:');
    console.log('Success:', result.success);
    console.log('Error:', result.error);
    console.log('Results count:', result.final_results?.results?.length || 0);
    
    if (result.final_results?.results?.length > 0) {
      console.log('\nTop 3 apps from TYPESCRIPT:');
      result.final_results.results.slice(0, 3).forEach((app, i) => {
        console.log(`${i+1}. ${app.title} (${app.primary_category}) - ${app.rating}⭐`);
      });
    }

    // Check steps
    if (result.steps) {
      console.log('\n🔍 TypeScript Pipeline Steps:');
      console.log('LLM Analysis:', !!result.steps.llm_analysis);
      console.log('Keyword Processing:', !!result.steps.keyword_processing);
      console.log('Database Search:', !!result.steps.database_search);
      
      if (result.steps.llm_analysis) {
        console.log('\n🧠 AI Analysis from TYPESCRIPT:');
        console.log('Query type:', result.steps.llm_analysis.result?.query_type);
        console.log('Keywords:', result.steps.llm_analysis.result?.weighted_keywords?.slice(0, 3));
      }
    }

  } catch (error) {
    console.error('❌ TypeScript pipeline error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testTypescriptPipeline().catch(console.error);