const ContextualProblemSolver = require('./contextual-problem-solver.js');

async function debugDuplicatesInProduction() {
  try {
    const solver = new ContextualProblemSolver();
    const query = 'Apps To Help Me With Budget';
    
    console.log('🔍 Debugging Production Duplicates: "' + query + '"');
    console.log('='.repeat(60));
    
    const results = await solver.searchBySemanticSimilarity(query, 15);
    
    console.log(`\n📊 Found ${results.length} results:\n`);
    
    // Group by title to detect duplicates
    const titleGroups = new Map();
    
    results.forEach((app, i) => {
      const title = app.title.toLowerCase().trim();
      if (!titleGroups.has(title)) {
        titleGroups.set(title, []);
      }
      titleGroups.get(title).push({
        index: i + 1,
        app_id: app.app_id,
        title: app.title,
        developer: app.developer,
        similarity: app.similarity_score?.toFixed(4) || 'N/A',
        rating: app.rating
      });
    });
    
    // Show duplicates
    console.log('🔍 DUPLICATE ANALYSIS:');
    console.log('='.repeat(40));
    
    let duplicateCount = 0;
    for (const [title, apps] of titleGroups) {
      if (apps.length > 1) {
        duplicateCount++;
        console.log(`\n❌ DUPLICATE #${duplicateCount}: "${apps[0].title}"`);
        apps.forEach(app => {
          console.log(`   Position ${app.index}: ID=${app.app_id}, Dev=${app.developer}, Sim=${app.similarity}`);
        });
      }
    }
    
    if (duplicateCount === 0) {
      console.log('✅ No duplicates found in this search');
    } else {
      console.log(`\n❌ Total duplicate groups found: ${duplicateCount}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

debugDuplicatesInProduction();