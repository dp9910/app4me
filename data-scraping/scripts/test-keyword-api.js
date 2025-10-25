// Test the keyword retriever through the API endpoint
const https = require('https');

async function testKeywordAPI() {
  console.log('🧪 Testing keyword retriever through API...');
  
  const testCases = [
    {
      name: 'Budget/Finance Apps',
      query: 'budget expense tracking money management',
      method: 'basic'
    },
    {
      name: 'Health/Fitness Apps with Intent',
      query: 'apps to help me stay healthy and exercise',
      method: 'intent',
      userIntent: 'problem_solving'
    },
    {
      name: 'Enhanced Productivity Search',
      query: 'productivity organize tasks',
      method: 'enhanced',
      preferredCategories: ['Productivity', 'Business']
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n🔍 Testing: ${testCase.name}`);
    console.log(`Query: "${testCase.query}"`);
    
    try {
      const response = await fetch('http://localhost:3000/api/test-keyword', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: testCase.query,
          method: testCase.method,
          userIntent: testCase.userIntent,
          preferredCategories: testCase.preferredCategories,
          limit: 5
        })
      });
      
      if (!response.ok) {
        console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
        continue;
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ Found ${data.results_count} results`);
        
        data.recommendations.slice(0, 3).forEach((app, i) => {
          console.log(`${i+1}. ${app.name} (${app.category})`);
          console.log(`   Score: ${app.keyword_score} | Matched: ${app.matched_keywords.slice(0, 3).join(', ')}`);
        });
      } else {
        console.error('❌ API Error:', data.error);
      }
      
    } catch (error) {
      console.error('❌ Request failed:', error.message);
      
      if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch')) {
        console.log('📝 Note: Next.js dev server needs to be running for API tests');
        console.log('   Run: npm run dev');
        break;
      }
    }
  }
}

testKeywordAPI();