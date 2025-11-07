const ContextualProblemSolver = require('./contextual-problem-solver.js');

async function testAPIResponse() {
  console.log('🧪 Testing API response structure for problem query...');
  
  try {
    const solver = new ContextualProblemSolver();
    const searchResponse = await solver.solveUserQuery("I feel lonely and want to make new friends");
    
    console.log('\n📊 Raw solver response:');
    console.log('Query Type:', searchResponse.query_type);
    console.log('Analysis exists:', !!searchResponse.analysis);
    console.log('Solution steps:', searchResponse.solution_steps?.length || 0);
    console.log('Total apps:', searchResponse.total_apps);
    console.log('Solution Steps with Apps:', JSON.stringify(searchResponse.solution_steps, null, 2));
    
    // Now simulate the API formatting
    console.log('\n🔧 Testing API route formatting...');
    
    if (searchResponse.query_type === 'problem') {
      const contextualAnalysis = {
        query_type: searchResponse.query_type,
        user_situation: searchResponse.analysis?.user_situation,
        root_cause: searchResponse.analysis?.root_cause,
        urgency: searchResponse.analysis?.urgency,
        emotional_state: searchResponse.analysis?.emotional_state,
        solution_steps: searchResponse.solution_steps?.map((step) => ({
          step_number: step.step,
          step_name: step.step_name,
          focus: step.focus,
          app_count: step.apps?.length || 0
        }))
      };
      
      console.log('\n✅ Contextual analysis object:');
      console.log(JSON.stringify(contextualAnalysis, null, 2));
      
      if (contextualAnalysis.query_type === 'problem' && contextualAnalysis.solution_steps) {
        console.log('\n✅ This should trigger the contextual analysis page!');
      } else {
        console.log('\n❌ Problem with contextual analysis structure');
      }
    } else {
      console.log('\n❌ Expected problem query but got:', searchResponse.query_type);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAPIResponse();