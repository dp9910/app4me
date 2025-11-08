// Test the API endpoint for duplicates
async function testAPIDuplicates() {
  try {
    const response = await fetch('http://localhost:3000/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'Apps To Help Me With Budget',
        limit: 15
      })
    });

    const data = await response.json();
    
    console.log('🧪 Testing API Endpoint for Duplicates');
    console.log('='.repeat(50));
    console.log(`Found ${data.apps?.length || 0} apps`);
    
    if (data.apps) {
      // Check for duplicates
      const titleGroups = new Map();
      
      data.apps.forEach((app, i) => {
        const title = app.title.toLowerCase().trim();
        if (!titleGroups.has(title)) {
          titleGroups.set(title, []);
        }
        titleGroups.get(title).push({
          index: i + 1,
          id: app.id,
          title: app.title,
          relevance: app.relevance_score
        });
      });
      
      // Show duplicates
      let duplicateCount = 0;
      console.log('\n📊 Duplicate Analysis:');
      
      for (const [title, apps] of titleGroups) {
        if (apps.length > 1) {
          duplicateCount++;
          console.log(`\n❌ DUPLICATE #${duplicateCount}: "${apps[0].title}"`);
          apps.forEach(app => {
            console.log(`   Position ${app.index}: ID=${app.id}, Score=${app.relevance}`);
          });
        }
      }
      
      if (duplicateCount === 0) {
        console.log('✅ SUCCESS: No duplicates found in API response!');
      } else {
        console.log(`\n❌ Found ${duplicateCount} duplicate groups in API response`);
      }
      
      console.log('\n📋 All Results:');
      data.apps.forEach((app, i) => {
        console.log(`${i+1}. ${app.title}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

testAPIDuplicates();