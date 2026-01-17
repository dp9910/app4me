const ContextualProblemSolver = require('./contextual-problem-solver.js');

async function testContextualSolver() {
  console.log('🧪 Testing Contextual Problem Solver...');
  
  try {
    const solver = new ContextualProblemSolver();
    console.log('✅ Solver instance created');
    
    // Test with a simple problem query
    console.log('\n🔍 Testing problem query: "cant sleep, too much coffee"');
    const startTime = Date.now();
    
    const result = await solver.solveUserQuery("cant sleep, too much coffee");
    
    const endTime = Date.now();
    console.log(`✅ Query completed in ${endTime - startTime}ms`);
    
    console.log('\n📊 Results:');
    console.log(`Query Type: ${result.query_type}`);
    console.log(`Total Apps: ${result.total_apps}`);
    
    if (result.query_type === 'problem' && result.solution_steps) {
      console.log('\n📋 Solution Steps:');
      result.solution_steps.forEach(step => {
        console.log(`  Step ${step.step}: ${step.step_name} - ${step.apps?.length || 0} apps`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testContextualSolver();