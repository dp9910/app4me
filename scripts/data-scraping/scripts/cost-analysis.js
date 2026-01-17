/**
 * Cost Analysis: DeepSeek vs Gemini for Feature Extraction
 * Calculate estimated costs for full dataset processing
 */

/**
 * DeepSeek Pricing (per 1M tokens)
 */
const DEEPSEEK_PRICING = {
  input_cache_hit: 0.028,   // $0.028 per 1M tokens
  input_cache_miss: 0.28,   // $0.28 per 1M tokens  
  output: 0.42              // $0.42 per 1M tokens
};

/**
 * Gemini Pricing 
 */
const GEMINI_PRICING = {
  flash_1_5: {
    input: 0.075,      // $0.075 per 1M tokens (1.5-flash)
    output: 0.30       // $0.30 per 1M tokens
  },
  flash_2_5: {
    input: 0.30,       // $0.30 per 1M tokens (2.5-flash)
    output: 2.50       // $2.50 per 1M tokens
  }
};

/**
 * Estimate token usage based on our prompts and responses
 */
function estimateTokenUsage() {
  // Typical app input data
  const avgTitle = 25;           // "YouTube" = ~1 token, "Instagram" = ~2 tokens
  const avgCategory = 10;        // "social media" = ~2 tokens
  const avgDescription = 150;    // 200 chars ≈ 150 tokens (rough estimate)
  const promptOverhead = 50;     // Instruction text tokens
  
  const inputTokensPerApp = avgTitle + avgCategory + avgDescription + promptOverhead;
  
  // Typical response (based on test results)
  const avgResponseTokens = 25;  // Small JSON response ≈ 25 tokens
  
  return {
    inputTokensPerApp,
    outputTokensPerApp: avgResponseTokens,
    totalTokensPerApp: inputTokensPerApp + avgResponseTokens
  };
}

/**
 * Calculate costs for different scenarios
 */
function calculateCosts() {
  const tokens = estimateTokenUsage();
  
  // Dataset sizes
  const remainingItunesApps = 5349 - 135; // 5,214 remaining
  const serpApps = 1773;
  const totalApps = remainingItunesApps + serpApps; // 6,987 total
  
  console.log('💰 COST ANALYSIS: DeepSeek vs Gemini');
  console.log('═══════════════════════════════════════════');
  
  console.log('📊 Token Usage Estimates:');
  console.log(`   Input tokens per app: ${tokens.inputTokensPerApp}`);
  console.log(`   Output tokens per app: ${tokens.outputTokensPerApp}`);
  console.log(`   Total tokens per app: ${tokens.totalTokensPerApp}`);
  console.log('');
  
  console.log('📱 Dataset Sizes:');
  console.log(`   Remaining iTunes apps: ${remainingItunesApps.toLocaleString()}`);
  console.log(`   SERP apps: ${serpApps.toLocaleString()}`);
  console.log(`   Total apps to process: ${totalApps.toLocaleString()}`);
  console.log('');
  
  // Calculate total tokens
  const totalInputTokens = totalApps * tokens.inputTokensPerApp;
  const totalOutputTokens = totalApps * tokens.outputTokensPerApp;
  
  console.log('🔢 Total Token Requirements:');
  console.log(`   Total input tokens: ${(totalInputTokens / 1000000).toFixed(2)}M tokens`);
  console.log(`   Total output tokens: ${(totalOutputTokens / 1000000).toFixed(2)}M tokens`);
  console.log('');
  
  // DeepSeek costs (assuming mostly cache misses for first run)
  const deepseekInputCost = (totalInputTokens / 1000000) * DEEPSEEK_PRICING.input_cache_miss;
  const deepseekOutputCost = (totalOutputTokens / 1000000) * DEEPSEEK_PRICING.output;
  const deepseekTotal = deepseekInputCost + deepseekOutputCost;
  
  // DeepSeek costs with cache hits (if we re-run similar apps)
  const deepseekInputCostCached = (totalInputTokens / 1000000) * DEEPSEEK_PRICING.input_cache_hit;
  const deepseekTotalCached = deepseekInputCostCached + deepseekOutputCost;
  
  // Gemini 1.5-flash costs (lower cost, lower quota)
  const gemini15InputCost = (totalInputTokens / 1000000) * GEMINI_PRICING.flash_1_5.input;
  const gemini15OutputCost = (totalOutputTokens / 1000000) * GEMINI_PRICING.flash_1_5.output;
  const gemini15Total = gemini15InputCost + gemini15OutputCost;
  
  // Gemini 2.5-flash costs (higher cost, higher quota)
  const gemini25InputCost = (totalInputTokens / 1000000) * GEMINI_PRICING.flash_2_5.input;
  const gemini25OutputCost = (totalOutputTokens / 1000000) * GEMINI_PRICING.flash_2_5.output;
  const gemini25Total = gemini25InputCost + gemini25OutputCost;
  
  console.log('💳 DEEPSEEK COSTS:');
  console.log(`   Input cost (cache miss): $${deepseekInputCost.toFixed(2)}`);
  console.log(`   Input cost (cache hit): $${deepseekInputCostCached.toFixed(2)}`);
  console.log(`   Output cost: $${deepseekOutputCost.toFixed(2)}`);
  console.log(`   Total (first run): $${deepseekTotal.toFixed(2)}`);
  console.log(`   Total (with caching): $${deepseekTotalCached.toFixed(2)}`);
  console.log('');
  
  console.log('💳 GEMINI 1.5-FLASH COSTS (Lower quota):');
  console.log(`   Input cost: $${gemini15InputCost.toFixed(2)}`);
  console.log(`   Output cost: $${gemini15OutputCost.toFixed(2)}`);
  console.log(`   Total: $${gemini15Total.toFixed(2)}`);
  console.log('');
  
  console.log('💳 GEMINI 2.5-FLASH COSTS (Higher quota):');
  console.log(`   Input cost: $${gemini25InputCost.toFixed(2)}`);
  console.log(`   Output cost: $${gemini25OutputCost.toFixed(2)}`);
  console.log(`   Total: $${gemini25Total.toFixed(2)}`);
  console.log('');
  
  // Savings analysis
  const savingsVsGemini15 = gemini15Total - deepseekTotal;
  const savingsVsGemini25 = gemini25Total - deepseekTotal;
  const savingsVsGemini15Cached = gemini15Total - deepseekTotalCached;
  const savingsVsGemini25Cached = gemini25Total - deepseekTotalCached;
  
  console.log('📈 COST COMPARISON:');
  console.log(`   Gemini 1.5-flash: $${gemini15Total.toFixed(2)}`);
  console.log(`   Gemini 2.5-flash: $${gemini25Total.toFixed(2)}`);
  console.log(`   DeepSeek: $${deepseekTotal.toFixed(2)}`);
  console.log(`   DeepSeek (cached): $${deepseekTotalCached.toFixed(2)}`);
  console.log('');
  console.log('💰 SAVINGS vs Gemini 1.5-flash:');
  console.log(`   DeepSeek saves: $${savingsVsGemini15.toFixed(2)} (${(savingsVsGemini15/gemini15Total*100).toFixed(1)}%)`);
  console.log(`   DeepSeek cached saves: $${savingsVsGemini15Cached.toFixed(2)} (${(savingsVsGemini15Cached/gemini15Total*100).toFixed(1)}%)`);
  console.log('');
  console.log('💰 SAVINGS vs Gemini 2.5-flash:');
  console.log(`   DeepSeek saves: $${savingsVsGemini25.toFixed(2)} (${(savingsVsGemini25/gemini25Total*100).toFixed(1)}%)`);
  console.log(`   DeepSeek cached saves: $${savingsVsGemini25Cached.toFixed(2)} (${(savingsVsGemini25Cached/gemini25Total*100).toFixed(1)}%)`);
  console.log('');
  
  // Performance vs Cost analysis
  console.log('⚡ PERFORMANCE vs COST:');
  console.log(`   Gemini 1.5-flash: 869ms/app, $${gemini15Total.toFixed(2)} total`);
  console.log(`   Gemini 2.5-flash: 869ms/app, $${gemini25Total.toFixed(2)} total`);
  console.log(`   DeepSeek: 2,643ms/app, $${deepseekTotal.toFixed(2)} total`);
  console.log('');
  
  // Time estimates
  const geminiTimeHours = (totalApps * 869) / 1000 / 60 / 60;
  const deepseekTimeHours = (totalApps * 2643) / 1000 / 60 / 60;
  
  console.log('⏰ TIME ESTIMATES:');
  console.log(`   Gemini: ${geminiTimeHours.toFixed(1)} hours`);
  console.log(`   DeepSeek: ${deepseekTimeHours.toFixed(1)} hours`);
  console.log(`   ⏱️  Time difference: ${(deepseekTimeHours - geminiTimeHours).toFixed(1)} extra hours with DeepSeek`);
  console.log('');
  
  // Recommendations
  console.log('🎯 RECOMMENDATIONS:');
  console.log('');
  console.log('🥇 GEMINI 1.5-FLASH:');
  console.log(`   ✅ Cheapest: $${gemini15Total.toFixed(2)}`);
  console.log(`   ✅ Fastest: ${geminiTimeHours.toFixed(1)} hours`);
  console.log(`   ❌ Quota limited (may hit rate limits)`);
  console.log('');
  console.log('🥈 DEEPSEEK:');
  console.log(`   ✅ Reliable: No quota issues`);
  console.log(`   ✅ Good cost: $${deepseekTotal.toFixed(2)} (cached: $${deepseekTotalCached.toFixed(2)})`);
  console.log(`   ❌ Slower: ${deepseekTimeHours.toFixed(1)} hours`);
  console.log('');
  console.log('🥉 GEMINI 2.5-FLASH:');
  console.log(`   ✅ Higher quota (2.74K TPM)`);
  console.log(`   ✅ Fast: ${geminiTimeHours.toFixed(1)} hours`);
  console.log(`   ❌ Most expensive: $${gemini25Total.toFixed(2)}`);
  console.log('');
  
  if (savingsVsGemini25 > 0) {
    console.log(`🏆 WINNER: DeepSeek saves $${savingsVsGemini25.toFixed(2)} vs Gemini 2.5-flash`);
  } else {
    console.log(`💭 DECISION: Pay $${Math.abs(savingsVsGemini25).toFixed(2)} extra for ${(deepseekTimeHours - geminiTimeHours).toFixed(1)} hours faster?`);
  }
  
  return {
    deepseekTotal,
    deepseekTotalCached,
    geminiTotal,
    savingsVsGemini,
    geminiTimeHours,
    deepseekTimeHours,
    totalApps
  };
}

/**
 * Calculate costs for just remaining iTunes apps
 */
function calculateItunesOnlyCosts() {
  const tokens = estimateTokenUsage();
  const remainingApps = 5349 - 135; // 5,214 remaining
  
  console.log('📱 REMAINING ITUNES APPS ONLY:');
  console.log('═══════════════════════════════════');
  
  const totalInputTokens = remainingApps * tokens.inputTokensPerApp;
  const totalOutputTokens = remainingApps * tokens.outputTokensPerApp;
  
  const deepseekCost = ((totalInputTokens / 1000000) * DEEPSEEK_PRICING.input_cache_miss) + 
                       ((totalOutputTokens / 1000000) * DEEPSEEK_PRICING.output);
  const geminiCost = ((totalInputTokens / 1000000) * GEMINI_PRICING.input) + 
                     ((totalOutputTokens / 1000000) * GEMINI_PRICING.output);
  
  const timeGemini = (remainingApps * 869) / 1000 / 60 / 60;
  const timeDeepSeek = (remainingApps * 2643) / 1000 / 60 / 60;
  
  console.log(`   Apps to process: ${remainingApps.toLocaleString()}`);
  console.log(`   Gemini: $${geminiCost.toFixed(2)}, ${timeGemini.toFixed(1)} hours`);
  console.log(`   DeepSeek: $${deepseekCost.toFixed(2)}, ${timeDeepSeek.toFixed(1)} hours`);
  console.log(`   💰 Savings with DeepSeek: $${(geminiCost - deepseekCost).toFixed(2)}`);
  console.log('');
  
  return { deepseekCost, geminiCost, remainingApps, timeGemini, timeDeepSeek };
}

if (require.main === module) {
  console.log('🧮 Starting cost analysis...\n');
  
  const fullAnalysis = calculateCosts();
  console.log('\n' + '='.repeat(50) + '\n');
  const itunesAnalysis = calculateItunesOnlyCosts();
  
  console.log('📋 SUMMARY:');
  console.log(`   For ${fullAnalysis.totalApps.toLocaleString()} total apps: DeepSeek saves $${fullAnalysis.savingsVsGemini.toFixed(2)}`);
  console.log(`   For ${itunesAnalysis.remainingApps.toLocaleString()} iTunes apps: DeepSeek saves $${(itunesAnalysis.geminiCost - itunesAnalysis.deepseekCost).toFixed(2)}`);
  console.log(`   Time trade-off: ${(fullAnalysis.deepseekTimeHours - fullAnalysis.geminiTimeHours).toFixed(1)} extra hours with DeepSeek`);
}

module.exports = { calculateCosts, calculateItunesOnlyCosts, estimateTokenUsage };