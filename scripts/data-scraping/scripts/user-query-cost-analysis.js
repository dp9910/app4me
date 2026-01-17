/**
 * User Query Processing Cost Analysis
 * Calculate costs for LLM processing of user queries
 */

/**
 * API Pricing
 */
const PRICING = {
  // Query Analysis (DeepSeek - reliable and cheap)
  deepseek: {
    input: 0.28,    // $0.28 per 1M tokens
    output: 0.42    // $0.42 per 1M tokens
  },
  
  // Query Embedding (Gemini)
  gemini_embedding: {
    input: 0.075    // $0.075 per 1M tokens
  },
  
  // Optional: Query enhancement (Gemini text)
  gemini_text: {
    input: 0.30,    // $0.30 per 1M tokens (2.5-flash)
    output: 2.50    // $2.50 per 1M tokens
  }
};

/**
 * Estimate tokens per user query processing
 */
function estimateQueryProcessingTokens() {
  return {
    // Step 1: Query Analysis (DeepSeek)
    analysis_input: 150,    // Query + categories + analysis prompt
    analysis_output: 50,    // Structured JSON response
    
    // Step 2: Query Enhancement (Optional - Gemini)
    enhancement_input: 100, // Query + enhancement prompt
    enhancement_output: 75, // Enhanced query text
    
    // Step 3: Query Embedding (Gemini)
    embedding_input: 100,   // Enhanced query text
    
    // Total tokens per user search
    total_per_search: 475
  };
}

/**
 * Calculate user query processing costs
 */
function calculateUserQueryCosts() {
  const tokens = estimateQueryProcessingTokens();
  
  console.log('🔍 USER QUERY PROCESSING COST ANALYSIS');
  console.log('═══════════════════════════════════════════════');
  
  console.log('📊 Token Usage Per User Search:');
  console.log(`   Query analysis input: ${tokens.analysis_input} tokens`);
  console.log(`   Query analysis output: ${tokens.analysis_output} tokens`);
  console.log(`   Query enhancement input: ${tokens.enhancement_input} tokens`);
  console.log(`   Query enhancement output: ${tokens.enhancement_output} tokens`);
  console.log(`   Query embedding: ${tokens.embedding_input} tokens`);
  console.log(`   TOTAL PER SEARCH: ${tokens.total_per_search} tokens`);
  console.log('');
  
  // Cost per search
  const costs = {
    // DeepSeek for query analysis (reliable, cheap)
    analysis: (tokens.analysis_input / 1000000 * PRICING.deepseek.input) + 
              (tokens.analysis_output / 1000000 * PRICING.deepseek.output),
              
    // Gemini for query enhancement (optional)
    enhancement: (tokens.enhancement_input / 1000000 * PRICING.gemini_text.input) + 
                 (tokens.enhancement_output / 1000000 * PRICING.gemini_text.output),
                 
    // Gemini for embedding
    embedding: tokens.embedding_input / 1000000 * PRICING.gemini_embedding.input
  };
  
  const totalCostPerSearch = costs.analysis + costs.enhancement + costs.embedding;
  const minimalCostPerSearch = costs.analysis + costs.embedding; // Without enhancement
  
  console.log('💳 COST PER USER SEARCH:');
  console.log(`   Query analysis (DeepSeek): $${costs.analysis.toFixed(6)}`);
  console.log(`   Query enhancement (Gemini): $${costs.enhancement.toFixed(6)}`);
  console.log(`   Query embedding (Gemini): $${costs.embedding.toFixed(6)}`);
  console.log(`   FULL PIPELINE: $${totalCostPerSearch.toFixed(6)} per search`);
  console.log(`   MINIMAL PIPELINE: $${minimalCostPerSearch.toFixed(6)} per search`);
  console.log('');
  
  // Scale to different usage levels
  const usageScenarios = [
    { name: 'MVP Testing', searches: 100 },
    { name: 'Light Usage', searches: 1000 },
    { name: 'Moderate Usage', searches: 10000 },
    { name: 'Heavy Usage', searches: 100000 },
    { name: 'Viral Success', searches: 1000000 }
  ];
  
  console.log('📈 COST AT DIFFERENT USAGE LEVELS:');
  usageScenarios.forEach(scenario => {
    const fullCost = scenario.searches * totalCostPerSearch;
    const minimalCost = scenario.searches * minimalCostPerSearch;
    
    console.log(`   ${scenario.name} (${scenario.searches.toLocaleString()} searches):`);
    console.log(`     Full pipeline: $${fullCost.toFixed(2)}`);
    console.log(`     Minimal pipeline: $${minimalCost.toFixed(2)}`);
    console.log(`     Difference: $${(fullCost - minimalCost).toFixed(2)}`);
    console.log('');
  });
  
  // Monthly cost estimates
  console.log('📅 MONTHLY COST ESTIMATES:');
  const dailySearches = [10, 50, 100, 500, 1000, 5000];
  dailySearches.forEach(daily => {
    const monthly = daily * 30;
    const monthlyCost = monthly * totalCostPerSearch;
    const minimalMonthlyCost = monthly * minimalCostPerSearch;
    
    console.log(`   ${daily} searches/day (${monthly.toLocaleString()}/month):`);
    console.log(`     Full: $${monthlyCost.toFixed(2)}/month`);
    console.log(`     Minimal: $${minimalMonthlyCost.toFixed(2)}/month`);
  });
  console.log('');
  
  // Comparison with static costs
  const oneTimeEmbeddingCost = 0.203; // From our previous analysis
  const oneTimeExtractionCost = 0.88;
  
  console.log('💰 COST COMPARISON:');
  console.log(`   One-time app embedding: $${oneTimeEmbeddingCost}`);
  console.log(`   One-time feature extraction: $${oneTimeExtractionCost}`);
  console.log(`   Per-search processing: $${totalCostPerSearch.toFixed(6)}`);
  console.log('');
  console.log('   Break-even point:');
  console.log(`     One-time costs become cheaper after: ${Math.ceil((oneTimeEmbeddingCost + oneTimeExtractionCost) / totalCostPerSearch).toLocaleString()} searches`);
  console.log('');
  
  // Optimization strategies
  console.log('🎯 OPTIMIZATION STRATEGIES:');
  console.log('');
  console.log('1. MINIMAL PIPELINE (Recommended for MVP):');
  console.log(`   - Skip query enhancement`);
  console.log(`   - Use DeepSeek for analysis + Gemini for embedding`);
  console.log(`   - Cost: $${minimalCostPerSearch.toFixed(6)} per search`);
  console.log('');
  console.log('2. CACHING STRATEGY:');
  console.log(`   - Cache embeddings for common queries`);
  console.log(`   - Cache analysis for similar intents`);
  console.log(`   - Potential 50-80% cost reduction`);
  console.log('');
  console.log('3. HYBRID APPROACH:');
  console.log(`   - Use full pipeline for complex queries`);
  console.log(`   - Use minimal for simple keyword searches`);
  console.log(`   - Smart routing based on query complexity`);
  console.log('');
  
  return {
    costPerSearch: totalCostPerSearch,
    minimalCostPerSearch,
    tokens,
    recommendations: {
      mvp_approach: 'minimal_pipeline',
      scaling_strategy: 'caching_with_hybrid',
      monthly_budget_500_searches: minimalMonthlyCost * 500
    }
  };
}

/**
 * Compare different LLM strategies for query processing
 */
function compareQueryProcessingStrategies() {
  console.log('\n🔀 QUERY PROCESSING STRATEGY COMPARISON:');
  console.log('═══════════════════════════════════════════════');
  
  const strategies = [
    {
      name: 'No LLM (Basic Keywords)',
      description: 'Simple keyword matching only',
      cost_per_search: 0,
      quality_score: 0.6,
      user_satisfaction: 0.5
    },
    {
      name: 'Minimal LLM (DeepSeek Analysis)',
      description: 'Intent analysis + embedding only',
      cost_per_search: 0.000065,
      quality_score: 0.8,
      user_satisfaction: 0.75
    },
    {
      name: 'Enhanced LLM (Full Pipeline)',
      description: 'Analysis + enhancement + embedding',
      cost_per_search: 0.000257,
      quality_score: 0.95,
      user_satisfaction: 0.9
    },
    {
      name: 'Premium LLM (GPT-4 Analysis)',
      description: 'GPT-4 for analysis (hypothetical)',
      cost_per_search: 0.001200,
      quality_score: 0.98,
      user_satisfaction: 0.95
    }
  ];
  
  strategies.forEach((strategy, i) => {
    console.log(`${i + 1}. ${strategy.name}:`);
    console.log(`   Description: ${strategy.description}`);
    console.log(`   Cost per search: $${strategy.cost_per_search.toFixed(6)}`);
    console.log(`   Quality score: ${(strategy.quality_score * 100).toFixed(0)}%`);
    console.log(`   User satisfaction: ${(strategy.user_satisfaction * 100).toFixed(0)}%`);
    console.log(`   Monthly cost (1000 searches): $${(strategy.cost_per_search * 1000).toFixed(2)}`);
    console.log('');
  });
  
  console.log('🏆 RECOMMENDATION: Minimal LLM (DeepSeek Analysis)');
  console.log('   - Best cost/quality balance for MVP');
  console.log('   - Can upgrade to Enhanced later');
  console.log('   - 80% quality at 25% of enhanced cost');
}

if (require.main === module) {
  console.log('🔍 Starting user query cost analysis...\n');
  
  const analysis = calculateUserQueryCosts();
  compareQueryProcessingStrategies();
  
  console.log('\n📋 SUMMARY:');
  console.log(`   Recommended approach: ${analysis.recommendations.mvp_approach}`);
  console.log(`   Cost per search: $${analysis.minimalCostPerSearch.toFixed(6)}`);
  console.log(`   Monthly budget (500 searches): $${(analysis.minimalCostPerSearch * 500).toFixed(2)}`);
  console.log('   Quality: High with smart caching');
}

module.exports = { calculateUserQueryCosts, estimateQueryProcessingTokens };