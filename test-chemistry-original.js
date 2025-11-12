const { MasterPipeline } = require('./scripts/master-pipeline.js');
require('dotenv').config({ path: '.env.local' });

async function testChemistryOriginal() {
  console.log('🔬 Testing ORIGINAL master-pipeline.js with chemistry query...\n');
  
  const query = "app to teach me chemistry";
  
  try {
    const pipeline = new MasterPipeline();
    const result = await pipeline.runPipeline(query, {
      limit: 5,
      saveIntermediateFiles: false,
      showDetailedLogs: false
    });

    console.log('\n📊 ORIGINAL PIPELINE RESULTS:');
    console.log('Success:', result.success);
    console.log('Error:', result.error);
    console.log('Results count:', result.final_results?.results?.length || 0);
    
    if (result.final_results?.results?.length > 0) {
      console.log('\nTop 5 apps from ORIGINAL:');
      result.final_results.results.slice(0, 5).forEach((app, i) => {
        console.log(`${i+1}. ${app.title} (${app.primary_category}) - ${app.rating}⭐ (${app.rating_count} reviews)`);
      });
    }

  } catch (error) {
    console.error('❌ Original pipeline error:', error);
  }
}

testChemistryOriginal().catch(console.error);