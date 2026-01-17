/**
 * Test Hard/Ambiguous Query for Enhanced Search
 * Testing challenging queries that require semantic understanding
 */

const StateOfArtSearch = require('./data-scraping/scripts/state-of-art-search.js');

async function testHardQuery() {
  console.log('🔥 === TESTING HARD/AMBIGUOUS QUERIES ===\n');
  
  const search = new StateOfArtSearch();
  
  // These are challenging queries that don't mention specific app types
  // but describe problems that apps could solve
  const hardQueries = [
    "I procrastinate everything and it's ruining my life",
    "I feel overwhelmed and need help organizing my thoughts",
    "something to help me when I'm nervous about public speaking", 
    "I always forget things and it's causing problems at work",
    "help me stop wasting time on my phone and social media",
    "I'm bad at staying in touch with people I care about"
  ];
  
  for (const query of hardQueries) {
    console.log(`\n${'='.repeat(100)}`);
    console.log(`🎯 CHALLENGING QUERY: "${query}"`);
    console.log(`${'='.repeat(100)}`);
    
    console.log(`\n🤔 Why this is hard:`);
    if (query.includes('procrastinate')) {
      console.log(`   • No apps will have "procrastinate" or "ruining my life" in titles`);
      console.log(`   • Needs to understand: procrastination → productivity, habits, focus, time management`);
      console.log(`   • Should find: task managers, habit trackers, focus apps, productivity tools`);
    } else if (query.includes('overwhelmed')) {
      console.log(`   • "Overwhelmed" and "organizing thoughts" are abstract concepts`);
      console.log(`   • Should find: note-taking apps, mind mapping, journaling, meditation`);
    } else if (query.includes('nervous')) {
      console.log(`   • "Nervous about public speaking" is very specific context`);
      console.log(`   • Should find: presentation apps, confidence building, speech practice`);
    } else if (query.includes('forget')) {
      console.log(`   • "Forget things" could mean many different types of apps`);
      console.log(`   • Should find: reminders, note-taking, task management, calendar apps`);
    } else if (query.includes('wasting time')) {
      console.log(`   • "Wasting time on phone" needs behavioral understanding`);
      console.log(`   • Should find: screen time trackers, app blockers, focus apps, digital wellness`);
    } else if (query.includes('staying in touch')) {
      console.log(`   • "Bad at staying in touch" is about relationship management`);
      console.log(`   • Should find: contact managers, reminder apps, social networking tools`);
    }
    
    try {
      const startTime = Date.now();
      const results = await search.search(query, 8);
      const endTime = Date.now();
      
      console.log(`\n📊 === RESULTS ===`);
      console.log(`Time: ${endTime - startTime}ms`);
      console.log(`Found: ${results.results?.length || 0} apps`);
      
      if (results.results && results.results.length > 0) {
        console.log(`\n🎯 Top Results:`);
        results.results.forEach((app, i) => {
          console.log(`\n${i + 1}. ${app.title}`);
          console.log(`   📱 ${app.primary_category || 'Unknown'} | ⭐ ${app.rating || 'N/A'} | 🔢 ${(app.relevance_score || 0).toFixed(1)}`);
          console.log(`   🔍 ${app.search_method}`);
          
          if (app.semantic_similarity) {
            console.log(`   🧠 Semantic: ${(app.semantic_similarity * 100).toFixed(1)}%`);
          }
          
          if (app.description) {
            const shortDesc = app.description.length > 100 
              ? app.description.substring(0, 100) + '...' 
              : app.description;
            console.log(`   📖 ${shortDesc}`);
          }
        });
        
        // Analyze if results make sense
        console.log(`\n🤖 Analysis:`);
        const categories = results.results.map(r => r.primary_category).filter(c => c);
        const uniqueCategories = [...new Set(categories)];
        console.log(`   Categories found: ${uniqueCategories.join(', ')}`);
        
        const hasSemanticResults = results.results.some(r => r.semantic_similarity);
        console.log(`   Semantic matches: ${hasSemanticResults ? '✅ Yes' : '❌ None'}`);
        
        const hasMultipleMethods = results.results.some(r => r.search_method.includes('+'));
        console.log(`   Multi-method results: ${hasMultipleMethods ? '✅ Yes' : '❌ None'}`);
        
      } else {
        console.log('\n❌ No results found - this is concerning for such a broad query!');
      }
      
      // Show intent understanding
      if (results.intent) {
        console.log(`\n🧠 Intent Understanding:`);
        console.log(`   Understood as: ${results.intent.app_type}`);
        console.log(`   Goal: ${results.intent.user_goal}`);
        if (results.intent.search_terms?.exact_keywords) {
          console.log(`   Keywords extracted: ${results.intent.search_terms.exact_keywords.join(', ')}`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Search failed: ${error.message}`);
    }
  }
  
  console.log(`\n\n🎉 === HARD QUERY TESTING COMPLETE ===`);
  console.log(`\n💡 Key Insights:`);
  console.log(`✅ These queries test the algorithm's ability to:`);
  console.log(`   • Understand emotional/abstract language`);
  console.log(`   • Map problems to solution categories`);
  console.log(`   • Find relevant apps without exact keyword matches`);
  console.log(`   • Use semantic similarity for concept matching`);
  console.log(`\n🔍 Success indicators:`);
  console.log(`   • Diverse, relevant app categories`);
  console.log(`   • High-scoring results that actually solve the problem`);
  console.log(`   • Semantic matches showing conceptual understanding`);
}

// Run the test
if (require.main === module) {
  testHardQuery().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

module.exports = { testHardQuery };