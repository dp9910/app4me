/**
 * Embedding Cost Analysis for Gemini gemini-embedding-001
 * Calculate costs for embedding our complete app dataset
 */

/**
 * Gemini Embedding Pricing (per 1M tokens)
 */
const GEMINI_EMBEDDING_PRICING = {
  input: 0.075,  // $0.075 per 1M tokens
  batch_available: true,
  free_tier: false // Not available on free tier
};

/**
 * Estimate embedding text size for each app
 */
function estimateEmbeddingTokens() {
  // Text we'll embed for each app (optimized for search)
  const embeddingText = {
    title: 25,           // "YouTube - Watch, Upload and Share Videos"
    category: 15,        // "Video Players & Editors"
    description: 200,    // First 200 chars of description
    keywords: 50,        // Top TF-IDF keywords joined
    llm_summary: 75,     // LLM-generated summary/benefits
    developer: 15,       // Developer name
    // Total per app
  };
  
  const tokensPerApp = Object.values(embeddingText).reduce((sum, tokens) => sum + tokens, 0);
  
  return {
    breakdown: embeddingText,
    tokensPerApp,
    totalFields: Object.keys(embeddingText).length
  };
}

/**
 * Calculate total embedding costs
 */
function calculateEmbeddingCosts() {
  const tokenEstimate = estimateEmbeddingTokens();
  
  // Dataset sizes (from our current extractions)
  const datasets = {
    itunes_apps: 5349,      // Total iTunes apps
    serp_apps: 1773,        // Unique SERP apps
    total: 5349 + 1773      // Combined dataset
  };
  
  console.log('🔢 EMBEDDING COST ANALYSIS: Gemini gemini-embedding-001');
  console.log('═══════════════════════════════════════════════════════════');
  
  console.log('📊 Token Usage Per App:');
  Object.entries(tokenEstimate.breakdown).forEach(([field, tokens]) => {
    console.log(`   ${field}: ${tokens} tokens`);
  });
  console.log(`   TOTAL PER APP: ${tokenEstimate.tokensPerApp} tokens`);
  console.log('');
  
  console.log('📱 Dataset Sizes:');
  console.log(`   iTunes apps: ${datasets.itunes_apps.toLocaleString()}`);
  console.log(`   SERP apps: ${datasets.serp_apps.toLocaleString()}`);
  console.log(`   Total apps: ${datasets.total.toLocaleString()}`);
  console.log('');
  
  // Calculate total tokens needed
  const totalTokens = datasets.total * tokenEstimate.tokensPerApp;
  const tokensInMillions = totalTokens / 1000000;
  
  console.log('🔢 Total Token Requirements:');
  console.log(`   Total tokens needed: ${totalTokens.toLocaleString()} tokens`);
  console.log(`   Tokens in millions: ${tokensInMillions.toFixed(3)}M tokens`);
  console.log('');
  
  // Calculate costs
  const embeddingCost = tokensInMillions * GEMINI_EMBEDDING_PRICING.input;
  const costPerApp = embeddingCost / datasets.total;
  
  console.log('💳 GEMINI EMBEDDING COSTS:');
  console.log(`   Price per 1M tokens: $${GEMINI_EMBEDDING_PRICING.input}`);
  console.log(`   Total embedding cost: $${embeddingCost.toFixed(3)}`);
  console.log(`   Cost per app: $${costPerApp.toFixed(6)}`);
  console.log(`   Free tier available: ${GEMINI_EMBEDDING_PRICING.free_tier ? 'Yes' : 'No'}`);
  console.log('');
  
  // Compare with feature extraction costs
  const featureExtractionCost = 0.88; // Our estimated max cost
  const totalProjectCost = embeddingCost + featureExtractionCost;
  
  console.log('📈 TOTAL PROJECT COSTS:');
  console.log(`   Feature extraction: $${featureExtractionCost.toFixed(2)}`);
  console.log(`   Embedding generation: $${embeddingCost.toFixed(3)}`);
  console.log(`   TOTAL PROCESSING: $${totalProjectCost.toFixed(3)}`);
  console.log('');
  
  // Monthly costs for re-processing
  console.log('🔄 MAINTENANCE COSTS:');
  console.log(`   Re-embedding all apps: $${embeddingCost.toFixed(3)}`);
  console.log(`   New app embedding (per 100): $${(costPerApp * 100).toFixed(4)}`);
  console.log(`   New app embedding (per 1000): $${(costPerApp * 1000).toFixed(3)}`);
  console.log('');
  
  // Performance estimates
  console.log('⚡ PERFORMANCE ESTIMATES:');
  console.log(`   Embedding requests needed: ${datasets.total.toLocaleString()}`);
  console.log(`   Estimated processing time: ~${Math.ceil(datasets.total / 60)} minutes (1 req/sec)`);
  console.log(`   Batch processing available: ${GEMINI_EMBEDDING_PRICING.batch_available ? 'Yes' : 'No'}`);
  console.log('');
  
  // Cost comparison scenarios
  console.log('💰 COST SCENARIOS:');
  
  // Scenario 1: MVP Launch
  const mvpCost = embeddingCost;
  console.log(`   1. MVP Launch (current dataset): $${mvpCost.toFixed(3)}`);
  
  // Scenario 2: Monthly updates
  const monthlyNewApps = 1000; // Estimated new apps per month
  const monthlyCost = costPerApp * monthlyNewApps;
  console.log(`   2. Monthly updates (${monthlyNewApps.toLocaleString()} new apps): $${monthlyCost.toFixed(3)}/month`);
  
  // Scenario 3: Full re-processing quarterly
  const quarterlyCost = embeddingCost;
  console.log(`   3. Quarterly full re-processing: $${quarterlyCost.toFixed(3)}/quarter`);
  
  // Scenario 4: Scale to 100k apps
  const scaledApps = 100000;
  const scaledTokens = scaledApps * tokenEstimate.tokensPerApp;
  const scaledCost = (scaledTokens / 1000000) * GEMINI_EMBEDDING_PRICING.input;
  console.log(`   4. Scale to ${scaledApps.toLocaleString()} apps: $${scaledCost.toFixed(2)}`);
  console.log('');
  
  // Recommendations
  console.log('🎯 RECOMMENDATIONS:');
  console.log(`   ✅ Embeddings are very affordable: $${embeddingCost.toFixed(3)} for ${datasets.total.toLocaleString()} apps`);
  console.log(`   ✅ Cost scales linearly: $${costPerApp.toFixed(6)} per app`);
  console.log(`   ⚠️  No free tier: Requires paid Gemini API access`);
  
  if (embeddingCost < 1.0) {
    console.log(`   🏆 WINNER: Very cost-effective for semantic search capabilities`);
  }
  
  if (embeddingCost < featureExtractionCost) {
    console.log(`   💡 Embeddings cost less than feature extraction!`);
  } else {
    console.log(`   💡 Embeddings cost more than feature extraction`);
  }
  
  console.log('');
  console.log('📋 IMPLEMENTATION PLAN:');
  console.log(`   1. Generate embeddings for ${datasets.total.toLocaleString()} apps ($${embeddingCost.toFixed(3)})`);
  console.log(`   2. Store in app_embeddings table`);
  console.log(`   3. Implement cosine similarity search`);
  console.log(`   4. Set up incremental embedding for new apps`);
  
  return {
    tokensPerApp: tokenEstimate.tokensPerApp,
    totalApps: datasets.total,
    totalCost: embeddingCost,
    costPerApp,
    totalProjectCost,
    recommendations: {
      costEffective: embeddingCost < 1.0,
      cheaperThanExtraction: embeddingCost < featureExtractionCost,
      scalable: true
    }
  };
}

/**
 * Calculate alternative embedding strategies
 */
function calculateAlternativeStrategies() {
  console.log('\n🔀 ALTERNATIVE EMBEDDING STRATEGIES:');
  console.log('═══════════════════════════════════════════════');
  
  const baseTokensPerApp = estimateEmbeddingTokens().tokensPerApp;
  const totalApps = 5349 + 1773;
  
  // Strategy 1: Minimal embeddings (title + category only)
  const minimalTokens = 40; // title + category
  const minimalCost = (totalApps * minimalTokens / 1000000) * GEMINI_EMBEDDING_PRICING.input;
  
  console.log(`1. Minimal Strategy (title + category only):`);
  console.log(`   Tokens per app: ${minimalTokens}`);
  console.log(`   Total cost: $${minimalCost.toFixed(4)}`);
  console.log(`   Savings: $${((baseTokensPerApp * totalApps / 1000000 * GEMINI_EMBEDDING_PRICING.input) - minimalCost).toFixed(4)}`);
  console.log('');
  
  // Strategy 2: Smart chunking (description summary)
  const smartTokens = 150; // title + category + description summary
  const smartCost = (totalApps * smartTokens / 1000000) * GEMINI_EMBEDDING_PRICING.input;
  
  console.log(`2. Smart Strategy (optimized text):`);
  console.log(`   Tokens per app: ${smartTokens}`);
  console.log(`   Total cost: $${smartCost.toFixed(4)}`);
  console.log(`   Savings: $${((baseTokensPerApp * totalApps / 1000000 * GEMINI_EMBEDDING_PRICING.input) - smartCost).toFixed(4)}`);
  console.log('');
  
  // Strategy 3: Full strategy (all available text)
  const fullCost = (totalApps * baseTokensPerApp / 1000000) * GEMINI_EMBEDDING_PRICING.input;
  
  console.log(`3. Full Strategy (all features):`);
  console.log(`   Tokens per app: ${baseTokensPerApp}`);
  console.log(`   Total cost: $${fullCost.toFixed(4)}`);
  console.log('');
  
  console.log('🎯 STRATEGY RECOMMENDATION:');
  console.log(`   Start with Smart Strategy: $${smartCost.toFixed(4)} for good search quality`);
  console.log(`   Upgrade to Full Strategy: $${fullCost.toFixed(4)} for best results`);
  console.log(`   Difference: Only $${(fullCost - smartCost).toFixed(4)} more for comprehensive embeddings`);
}

if (require.main === module) {
  console.log('🔍 Starting embedding cost analysis...\n');
  
  const analysis = calculateEmbeddingCosts();
  calculateAlternativeStrategies();
  
  console.log('\n📋 SUMMARY:');
  console.log(`   ${analysis.totalApps.toLocaleString()} apps → $${analysis.totalCost.toFixed(3)} embedding cost`);
  console.log(`   Total project cost: $${analysis.totalProjectCost.toFixed(3)}`);
  console.log(`   Ready for semantic search implementation!`);
}

module.exports = { calculateEmbeddingCosts, estimateEmbeddingTokens };