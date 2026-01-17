/**
 * Test the pure semantic search module
 */

require('dotenv').config({ path: '.env.local' });
const SemanticSearch = require('./src/lib/semantic-search');

async function testPureSemanticModule() {
  try {
    console.log('🧪 Testing Pure Semantic Search Module');
    console.log('=' .repeat(60));
    
    const semanticSearch = new SemanticSearch();
    
    // Test the problematic sleep query
    const query = 'i cant sleep properly, maybe too much coffee or phone';
    console.log(`\nQuery: "${query}"\n`);
    
    // Test with different parameters
    const results = await semanticSearch.search(query, {
      limit: 15,
      threshold: 0.3,
      maxApps: 1000  // Search through more apps
    });
    
    console.log('\n' + '=' .repeat(60));
    console.log('📊 PURE SEMANTIC MODULE RESULTS');
    console.log('=' .repeat(60));
    console.log(`Found ${results.length} apps:\n`);
    
    if (results.length > 0) {
      results.forEach((app, i) => {
        const sleepRelated = app.title.toLowerCase().includes('sleep') ||
                           app.title.toLowerCase().includes('pillow') ||
                           app.description?.toLowerCase().includes('sleep');
        
        const indicator = sleepRelated ? '🛌' : '  ';
        console.log(`${indicator} ${i+1}. ${app.title}`);
        console.log(`     Category: ${app.primary_category || 'Unknown'}`);
        console.log(`     Similarity: ${app.similarity_score.toFixed(4)}`);
        console.log(`     Rating: ${app.rating || 'N/A'}`);
        console.log('');
      });
      
      // Check if top sleep apps are found
      const topSleepApps = [
        'Pillow: Sleep Tracker',
        'Simple Habit Sleep, Meditation', 
        'Meditopia: Sleep, Meditation'
      ];
      
      console.log('🔍 Checking for top sleep apps:');
      topSleepApps.forEach(appName => {
        const found = results.find(r => r.title === appName);
        if (found) {
          console.log(`   ✅ ${appName} - Position ${results.indexOf(found) + 1} (${found.similarity_score.toFixed(4)})`);
        } else {
          console.log(`   ❌ ${appName} - NOT FOUND`);
        }
      });
      
    } else {
      console.log('❌ No results found');
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Also test specific app similarities
async function testSpecificSimilarities() {
  try {
    console.log('\n🎯 Testing Specific App Similarities');
    console.log('=' .repeat(60));
    
    const semanticSearch = new SemanticSearch();
    const query = 'i cant sleep properly, maybe too much coffee or phone';
    
    // Get IDs of specific sleep apps first
    const { data: sleepApps } = await semanticSearch.supabase
      .from('apps_unified')
      .select('id, title')
      .in('title', [
        'Pillow: Sleep Tracker',
        'Simple Habit Sleep, Meditation',
        'Meditopia: Sleep, Meditation',
        'Aura: Meditation & Sleep, CBT'
      ]);
    
    console.log(`\nTesting similarity for ${sleepApps?.length || 0} specific apps:\n`);
    
    for (const app of sleepApps || []) {
      const similarity = await semanticSearch.getSimilarity(query, app.id);
      console.log(`📱 ${app.title}`);
      console.log(`   Similarity: ${similarity.toFixed(4)}`);
      console.log('');
    }
    
  } catch (error) {
    console.error('💥 Specific similarity test failed:', error.message);
  }
}

// Run tests
testPureSemanticModule()
  .then(() => testSpecificSimilarities());