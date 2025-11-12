require('dotenv').config({ path: '.env.local' });

async function comparePipelines() {
  console.log('🔬 PIPELINE COMPARISON ANALYSIS\n');
  console.log('================================================================================');
  
  const query = "i am planning to buy a new house, any last minute advice on checklist";
  
  console.log(`Query: "${query}"\n`);
  
  // Test 1: Original Pipeline Keywords
  console.log('📋 STEP 1: Check Original Pipeline AI Analysis');
  console.log('================================================================================');
  
  const { MasterPipeline } = require('./scripts/master-pipeline.js');
  const originalPipeline = new MasterPipeline();
  
  try {
    const originalResult = await originalPipeline.runPipeline(query, {
      limit: 3,
      saveIntermediateFiles: false,
      showDetailedLogs: false
    });
    
    console.log('✅ Original Pipeline Success:', !!originalResult.final_results);
    console.log('📊 Results Count:', originalResult.final_results?.results?.length || 0);
    
    if (originalResult.final_results?.results?.length > 0) {
      console.log('\n🏆 Original Pipeline Top Results:');
      originalResult.final_results.results.slice(0, 3).forEach((app, i) => {
        console.log(`   ${i+1}. ${app.title} (${app.primary_category || 'Unknown'}) - ${app.rating}⭐`);
        console.log(`      Keywords: ${app.matched_keywords?.join(', ') || 'N/A'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Original pipeline failed:', error.message);
  }
  
  console.log('\n================================================================================');
  console.log('📋 STEP 2: Check TypeScript Pipeline via API');
  console.log('================================================================================');
  
  try {
    // Test TypeScript pipeline through API
    const response = await fetch('http://localhost:3001/api/search/intent-driven', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit: 3 })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const tsResult = await response.json();
    
    console.log('✅ TypeScript Pipeline Success:', tsResult.success);
    console.log('📊 Results Count:', tsResult.results?.length || 0);
    
    if (tsResult.results?.length > 0) {
      console.log('\n🏆 TypeScript Pipeline Top Results:');
      tsResult.results.slice(0, 3).forEach((app, i) => {
        console.log(`   ${i+1}. ${app.app_data.name} (${app.app_data.category}) - ${app.app_data.rating}⭐`);
        console.log(`      Match: ${app.match_reason}`);
      });
    }
    
    // Compare AI Analysis
    console.log('\n🧠 AI Analysis Comparison:');
    console.log('================================================================================');
    if (tsResult.contextual_analysis) {
      console.log('TypeScript Query Type:', tsResult.contextual_analysis.query_type);
      console.log('TypeScript Keywords:', tsResult.contextual_analysis.weighted_keywords?.slice(0, 3).map(k => k.term));
      console.log('TypeScript Strategy:', tsResult.contextual_analysis.search_strategy?.substring(0, 100) + '...');
    }
    
  } catch (error) {
    console.error('❌ TypeScript pipeline failed:', error.message);
  }
}

comparePipelines().catch(console.error);