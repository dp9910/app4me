/**
 * Test script to validate semantic search quality and accuracy
 * Tests various query types and measures search performance
 */

import { semanticSearch, getSearchAnalytics } from '../../src/lib/search/semantic-search.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Test queries with expected categories/types
const testQueries = [
  { 
    query: "track expenses and manage budget", 
    expectedCategories: ["Finance", "Productivity"],
    description: "Financial management"
  },
  { 
    query: "workout routines and fitness tracking", 
    expectedCategories: ["Health & Fitness", "Sports"],
    description: "Fitness apps"
  },
  { 
    query: "edit photos and apply filters", 
    expectedCategories: ["Photo & Video", "Graphics & Design"],
    description: "Photo editing"
  },
  { 
    query: "learn new languages", 
    expectedCategories: ["Education", "Reference"],
    description: "Language learning"
  },
  { 
    query: "meditation and mindfulness", 
    expectedCategories: ["Health & Fitness", "Lifestyle"],
    description: "Wellness apps"
  },
  { 
    query: "social media posting and scheduling", 
    expectedCategories: ["Social Networking", "Productivity"],
    description: "Social media tools"
  },
  { 
    query: "password manager and security", 
    expectedCategories: ["Utilities", "Productivity"],
    description: "Security apps"
  },
  { 
    query: "music streaming and playlists", 
    expectedCategories: ["Music", "Entertainment"],
    description: "Music apps"
  },
  { 
    query: "navigation and GPS directions", 
    expectedCategories: ["Navigation", "Travel"],
    description: "Navigation apps"
  },
  { 
    query: "weather forecast and alerts", 
    expectedCategories: ["Weather", "Utilities"],
    description: "Weather apps"
  }
];

// Advanced test queries with context
const contextualQueries = [
  {
    query: "I eat out a lot and need to manage my spending",
    userContext: { 
      lifestyle: ["foodie", "social"], 
      preferredCategories: ["Finance"] 
    },
    expectedCategories: ["Finance"],
    description: "Expense tracking with lifestyle context"
  },
  {
    query: "productivity app for remote work",
    userContext: { 
      lifestyle: ["remote worker", "professional"],
      preferredCategories: ["Productivity", "Business"]
    },
    expectedCategories: ["Productivity", "Business"],
    description: "Work productivity with context"
  }
];

export async function testSearchQuality() {
  console.log('🧪 Testing Semantic Search Quality\n');
  console.log('='.repeat(60));
  
  // Check if embeddings exist
  const coverage = await checkEmbeddingCoverage();
  console.log(`📊 Embedding coverage: ${coverage.embedded}/${coverage.total} (${coverage.percentage}%)`);
  
  if (coverage.embedded === 0) {
    console.log('❌ No embeddings found! Run embedding generation first.');
    return;
  }
  
  console.log('\n🔍 Running basic search tests...\n');
  
  let totalTests = 0;
  let passedTests = 0;
  const results = [];
  
  // Test basic queries
  for (const test of testQueries) {
    totalTests++;
    const result = await runSingleTest(test);
    results.push(result);
    
    if (result.passed) passedTests++;
    
    console.log(`${result.passed ? '✅' : '❌'} ${test.description}`);
    console.log(`   Query: "${test.query}"`);
    console.log(`   Top result: ${result.topResult?.name || 'No results'} (${result.topResult?.category || 'N/A'})`);
    console.log(`   Similarity: ${result.topResult?.similarity_score?.toFixed(3) || 'N/A'}`);
    console.log(`   Expected: ${test.expectedCategories.join(' or ')}`);
    console.log(`   Match: ${result.categoryMatch ? 'YES' : 'NO'}\n`);
  }
  
  console.log('\n🧠 Running contextual search tests...\n');
  
  // Test contextual queries
  for (const test of contextualQueries) {
    totalTests++;
    const result = await runContextualTest(test);
    results.push(result);
    
    if (result.passed) passedTests++;
    
    console.log(`${result.passed ? '✅' : '❌'} ${test.description}`);
    console.log(`   Query: "${test.query}"`);
    console.log(`   Context: ${JSON.stringify(test.userContext)}`);
    console.log(`   Top result: ${result.topResult?.name || 'No results'} (${result.topResult?.category || 'N/A'})`);
    console.log(`   Similarity: ${result.topResult?.similarity_score?.toFixed(3) || 'N/A'}\n`);
  }
  
  // Performance tests
  console.log('⚡ Running performance tests...\n');
  const perfResults = await runPerformanceTests();
  
  // Summary
  console.log('='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passedTests}/${totalTests} (${(passedTests/totalTests*100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${totalTests - passedTests}`);
  console.log(`⚡ Avg search time: ${perfResults.avgSearchTime}ms`);
  console.log(`📈 Avg similarity score: ${perfResults.avgSimilarity.toFixed(3)}`);
  console.log(`📋 Avg results per query: ${perfResults.avgResultCount.toFixed(1)}`);
  
  // Detailed analysis
  console.log('\n📈 DETAILED ANALYSIS');
  console.log('='.repeat(60));
  
  const categoryAccuracy = analyzeCategoryAccuracy(results);
  console.log(`🎯 Category accuracy: ${categoryAccuracy.toFixed(1)}%`);
  
  const qualityDistribution = analyzeQualityDistribution(results);
  console.log('🏆 Match quality distribution:');
  Object.entries(qualityDistribution).forEach(([quality, count]) => {
    console.log(`   ${quality}: ${count} (${(count/results.length*100).toFixed(1)}%)`);
  });
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS');
  console.log('='.repeat(60));
  
  if (passedTests / totalTests < 0.7) {
    console.log('⚠️  Search accuracy is below 70%. Consider:');
    console.log('   - Improving embedding text generation');
    console.log('   - Adjusting similarity thresholds');
    console.log('   - Adding more training data');
  } else if (passedTests / totalTests >= 0.85) {
    console.log('🎉 Excellent search accuracy! Consider:');
    console.log('   - Adding more complex test cases');
    console.log('   - Implementing user feedback learning');
    console.log('   - Optimizing performance further');
  } else {
    console.log('👍 Good search accuracy. Consider:');
    console.log('   - Fine-tuning similarity thresholds');
    console.log('   - Adding user context features');
    console.log('   - Monitoring real user queries');
  }
  
  console.log('\n✅ Search quality testing complete!\n');
  
  return {
    totalTests,
    passedTests,
    accuracy: passedTests / totalTests,
    performance: perfResults,
    results
  };
}

async function runSingleTest(test) {
  try {
    const startTime = Date.now();
    const searchResults = await semanticSearch(test.query, {
      limit: 10,
      threshold: 0.5,
      includeInsights: false
    });
    const searchTime = Date.now() - startTime;
    
    const topResult = searchResults[0];
    const categoryMatch = topResult && test.expectedCategories.some(cat => 
      topResult.category.toLowerCase().includes(cat.toLowerCase()) ||
      cat.toLowerCase().includes(topResult.category.toLowerCase())
    );
    
    return {
      test,
      topResult,
      allResults: searchResults,
      categoryMatch,
      passed: categoryMatch && topResult?.similarity_score >= 0.6,
      searchTime,
      resultCount: searchResults.length
    };
  } catch (error) {
    console.error(`Error testing "${test.query}":`, error);
    return {
      test,
      topResult: null,
      allResults: [],
      categoryMatch: false,
      passed: false,
      searchTime: 0,
      resultCount: 0,
      error: error.message
    };
  }
}

async function runContextualTest(test) {
  try {
    const startTime = Date.now();
    const searchResults = await semanticSearch(test.query, {
      limit: 10,
      threshold: 0.5,
      userContext: test.userContext,
      includeInsights: false
    });
    const searchTime = Date.now() - startTime;
    
    const topResult = searchResults[0];
    const categoryMatch = topResult && test.expectedCategories.some(cat => 
      topResult.category.toLowerCase().includes(cat.toLowerCase()) ||
      cat.toLowerCase().includes(topResult.category.toLowerCase())
    );
    
    return {
      test,
      topResult,
      allResults: searchResults,
      categoryMatch,
      passed: categoryMatch && topResult?.similarity_score >= 0.5, // Lower threshold for contextual
      searchTime,
      resultCount: searchResults.length
    };
  } catch (error) {
    console.error(`Error testing contextual "${test.query}":`, error);
    return {
      test,
      topResult: null,
      allResults: [],
      categoryMatch: false,
      passed: false,
      searchTime: 0,
      resultCount: 0,
      error: error.message
    };
  }
}

async function runPerformanceTests() {
  const testQueries = [
    "budget app",
    "photo editor", 
    "fitness tracker",
    "music player",
    "weather app"
  ];
  
  const times = [];
  const similarities = [];
  const resultCounts = [];
  
  for (const query of testQueries) {
    const startTime = Date.now();
    const results = await semanticSearch(query, { limit: 5 });
    const searchTime = Date.now() - startTime;
    
    times.push(searchTime);
    if (results.length > 0) {
      similarities.push(results[0].similarity_score);
      resultCounts.push(results.length);
    }
  }
  
  return {
    avgSearchTime: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
    maxSearchTime: Math.max(...times),
    minSearchTime: Math.min(...times),
    avgSimilarity: similarities.reduce((a, b) => a + b, 0) / similarities.length,
    avgResultCount: resultCounts.reduce((a, b) => a + b, 0) / resultCounts.length
  };
}

async function checkEmbeddingCoverage() {
  const { count: total } = await supabase
    .from('apps_unified')
    .select('*', { count: 'exact', head: true });
  
  const { count: embedded } = await supabase
    .from('app_embeddings')
    .select('*', { count: 'exact', head: true });
  
  return {
    total: total || 0,
    embedded: embedded || 0,
    percentage: total > 0 ? ((embedded || 0) / total * 100).toFixed(1) : '0.0'
  };
}

function analyzeCategoryAccuracy(results) {
  const correctCategories = results.filter(r => r.categoryMatch).length;
  return (correctCategories / results.length) * 100;
}

function analyzeQualityDistribution(results) {
  const distribution = { excellent: 0, good: 0, fair: 0, weak: 0, poor: 0 };
  
  results.forEach(result => {
    if (result.topResult?.similarity_score) {
      const score = result.topResult.similarity_score;
      if (score >= 0.85) distribution.excellent++;
      else if (score >= 0.75) distribution.good++;
      else if (score >= 0.65) distribution.fair++;
      else if (score >= 0.50) distribution.weak++;
      else distribution.poor++;
    }
  });
  
  return distribution;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testSearchQuality()
    .then(results => {
      console.log('🎯 Final accuracy:', (results.accuracy * 100).toFixed(1) + '%');
      process.exit(results.accuracy >= 0.7 ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test error:', error);
      process.exit(1);
    });
}