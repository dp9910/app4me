/**
 * Test Script: Debug Pipeline Steps
 * 
 * This script allows for step-by-step execution and debugging of the search pipeline,
 * using a hardcoded LLM analysis result to ensure reproducible tests.
 */

const KeywordProcessor = require('./scripts/step2-keyword-processing.js');
const DatabaseFilter = require('./scripts/step3-database-filtering.js');
const SemanticSearchFiltered = require('./scripts/step4-semantic-search.js');
const fs = require('fs');

// Hardcoded data from the user's prompt
const testQuery = "new in town, how to make friends easily and get to know the place. i am not that outgoing";
const testAnalysis = {
  "query_type": "social_integration",
  "user_situation": "The user is new to a town, wants to make friends and explore the area, but is not naturally outgoing, presenting a social challenge.",
  "root_cause": "Lack of existing social network, unfamiliarity with the local environment, and introverted personality traits contribute to the user's difficulty in making friends and getting to know the town.",
  "urgency": "short-term",
  "weighted_keywords": {
    "PROBLEM": {
      "weight": 1,
      "keywords": ["make friends", "new in town", "not outgoing", "lonely", "social anxiety"]
    },
    "SOLUTION": {
      "weight": 0.9,
      "keywords": ["meet people", "social events", "local groups", "find activities", "explore town"]
    },
    "CAUSE": {
      "weight": 0.7,
      "keywords": ["introverted", "shyness", "lack of confidence", "new environment", "socially awkward"]
    },
    "CONTEXT": {
      "weight": 0.5,
      "keywords": ["social networking", "local guide", "event planning", "community building", "city exploration"]
    }
  },
  "search_strategy": "The most effective search strategy would prioritize 'problem' keywords like 'make friends' and 'new in town' combined with 'solution' keywords such as 'meet people', 'local groups', and 'nearby events'."
};

async function runStepByStepTest() {
  console.log('🚀 STARTING STEP-BY-STEP PIPELINE TEST 🚀');
  console.log(`Query: "${testQuery}"\n`);

  // --- STEP 2: KEYWORD PROCESSING ---
  console.log('=' .repeat(80));
  console.log('🔍 STEP 2: KEYWORD PROCESSING');
  console.log('=' .repeat(80));
  
  const keywordProcessor = new KeywordProcessor();
  const keywordData = keywordProcessor.processAnalysis(testAnalysis);
  
  console.log('\n✅ Step 2 Complete. Output:');
  console.log(JSON.stringify(keywordData.search_terms, null, 2));

  if (keywordData.search_terms.high_priority.length === 0) {
    console.error('\n❌ CRITICAL ERROR: High priority keywords are empty. Test cannot continue.');
    return;
  }

  // --- STEP 3: DATABASE FILTERING ---
  console.log('\n' + '=' .repeat(80));
  console.log('🗃️ STEP 3: DATABASE FILTERING');
  console.log('=' .repeat(80));

  const databaseFilter = new DatabaseFilter();
  const candidatesData = await databaseFilter.filterApps(keywordData);
  const candidates = candidatesData.candidates || [];

  console.log(`\n✅ Step 3 Complete. Found ${candidates.length} candidate apps.`);
  
  if (candidates.length === 0) {
    console.error('\n❌ CRITICAL ERROR: No candidate apps found. Test cannot continue.');
    return;
  }

  console.log('\n--- Top 10 Candidates from Database ---');
  candidates.slice(0, 10).forEach((app, i) => {
    console.log(`${i + 1}. ${app.title} (Priority: ${app.priority_level}, Source: ${app.source}, Rating: ${app.rating})`);
  });

  // --- STEP 4: SEMANTIC SEARCH ---
  console.log('\n' + '=' .repeat(80));
  console.log('🎯 STEP 4: SEMANTIC SEARCH');
  console.log('=' .repeat(80));

  const semanticSearch = new SemanticSearchFiltered();
  const finalResultsData = await semanticSearch.searchCandidates(candidatesData, testQuery);
  const finalResults = finalResultsData.results || [];

  console.log(`\n✅ Step 4 Complete. Final list has ${finalResults.length} apps.`);
  console.log('\n--- Final Top 10 Ranked Apps ---');
  finalResults.slice(0, 10).forEach((app, i) => {
    console.log(`${i + 1}. ${app.title} (Similarity: ${app.similarity_score.toFixed(4)})`);
  });

  // --- ANALYSIS ---
  console.log('\n' + '=' .repeat(80));
  console.log('📊 FINAL ANALYSIS');
  console.log('=' .repeat(80));

  const topCandidateTitles = candidates.slice(0, 5).map(a => a.title);
  const finalTitles = finalResults.map(a => a.title);

  console.log('\nDid the top candidates from Step 3 survive?');
  topCandidateTitles.forEach(title => {
    const oldIndex = candidates.findIndex(a => a.title === title) + 1;
    const newIndex = finalTitles.indexOf(title);
    if (newIndex !== -1) {
      console.log(`  ✅ "${title}" (was #${oldIndex}) is now #${newIndex + 1} in the final list.`);
    } else {
      console.log(`  ❌ "${title}" (was #${oldIndex}) was REMOVED from the final list.`);
    }
  });
}

runStepByStepTest().catch(console.error);