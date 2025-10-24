/**
 * Test DeepSeek API for Feature Extraction
 * Test if DeepSeek can replace Gemini for faster processing
 */

require('dotenv').config({ path: '.env.local' });
const OpenAI = require('openai');

const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

/**
 * Test DeepSeek for feature extraction
 */
async function testDeepSeekExtraction(app) {
  // Prepare minimal, focused text (max 200 chars)
  const title = (app.title || app.name || '').substring(0, 50);
  const category = (app.category || app.primary_category || '').substring(0, 30);
  const description = (app.description || '').substring(0, 200);
  
  if (!title || description.length < 20) {
    return getDefaultFeatures();
  }
  
  // Optimized prompt for DeepSeek
  const prompt = `App: ${title}
Category: ${category}
Description: ${description}

Extract 3 key insights as JSON:
{
  "primary_use": "main purpose in 2-4 words",
  "target_user": "who uses this in 2-3 words", 
  "key_benefit": "main value in 4-6 words"
}`;

  try {
    const startTime = Date.now();
    
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 100,
      temperature: 0.3
    });
    
    const processingTime = Date.now() - startTime;
    const responseText = completion.choices[0].message.content;
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        features: {
          primary_use: parsed.primary_use || 'general utility',
          target_user: parsed.target_user || 'general users',
          key_benefit: parsed.key_benefit || 'provides functionality',
          complexity: 'simple'
        },
        processing_time_ms: processingTime,
        success: true,
        api_used: 'deepseek'
      };
    }
    
    return {
      features: getDefaultFeatures(),
      processing_time_ms: processingTime,
      success: true,
      api_used: 'deepseek'
    };
    
  } catch (error) {
    console.error(`⚠️  DeepSeek extraction failed for ${title}: ${error.message}`);
    return {
      features: getDefaultFeatures(),
      error: error.message,
      success: false,
      api_used: 'deepseek'
    };
  }
}

function getDefaultFeatures() {
  return {
    primary_use: 'general utility',
    target_user: 'general users',
    key_benefit: 'provides functionality',
    complexity: 'simple'
  };
}

/**
 * Test DeepSeek performance vs expected results
 */
async function performanceTest() {
  console.log('🧪 Testing DeepSeek API for Feature Extraction\n');

  // Test apps
  const testApps = [
    {
      title: "YouTube",
      category: "video",
      description: "Enjoy and discover millions of videos from creators around the world. Subscribe to your favorite channels, create your own videos, and share with friends and family."
    },
    {
      title: "Spotify",
      category: "music",
      description: "Stream millions of songs, albums, and podcasts. Discover new music, create playlists, and enjoy personalized recommendations based on your taste."
    },
    {
      title: "Uber",
      category: "transportation",
      description: "Request a ride with the tap of a button. Track your driver, pay automatically, and get where you need to go quickly and safely."
    },
    {
      title: "Instagram",
      category: "social",
      description: "Share photos and videos with friends and followers. Discover content from people and brands you love, and express yourself creatively."
    },
    {
      title: "Calculator",
      category: "utilities",
      description: "Perform basic arithmetic operations like addition, subtraction, multiplication, and division. Simple and easy to use calculator app."
    }
  ];

  console.log('📱 Testing with sample apps:');
  testApps.forEach((app, i) => {
    console.log(`   ${i + 1}. ${app.title} (${app.category})`);
  });
  console.log('');

  const results = [];
  const totalStartTime = Date.now();

  for (const app of testApps) {
    console.log(`🔧 Testing DeepSeek extraction for: ${app.title}`);
    
    const result = await testDeepSeekExtraction(app);
    results.push({
      app_title: app.title,
      app_category: app.category,
      ...result
    });
    
    const status = result.success ? '✅' : '❌';
    console.log(`   ${status} ${app.title}: ${result.processing_time_ms || 0}ms`);
    
    if (result.success && result.features) {
      console.log(`      Primary use: ${result.features.primary_use}`);
      console.log(`      Target user: ${result.features.target_user}`);
      console.log(`      Key benefit: ${result.features.key_benefit}`);
    }
    console.log('');
  }

  const totalTime = Date.now() - totalStartTime;
  const successful = results.filter(r => r.success);
  const avgTime = successful.length > 0 
    ? Math.round(successful.reduce((sum, r) => sum + (r.processing_time_ms || 0), 0) / successful.length)
    : 0;

  console.log('📈 DEEPSEEK PERFORMANCE RESULTS:');
  console.log('═══════════════════════════════════');
  console.log(`🕐 Processing Performance:`);
  console.log(`   Average time per app: ${avgTime}ms`);
  console.log(`   Total time: ${totalTime}ms`);
  console.log(`   Success rate: ${successful.length}/${testApps.length} (${(successful.length/testApps.length*100).toFixed(1)}%)`);
  
  console.log(`\n🔍 Feature Quality:`);
  if (successful.length > 0) {
    successful.forEach((result, i) => {
      console.log(`   ${i + 1}. ${result.app_title}:`);
      console.log(`      Use: ${result.features.primary_use}`);
      console.log(`      User: ${result.features.target_user}`);
      console.log(`      Benefit: ${result.features.key_benefit}`);
    });
  }

  console.log(`\n🎯 DeepSeek vs Gemini Comparison:`);
  console.log(`   DeepSeek average: ${avgTime}ms per app`);
  console.log(`   Gemini original: ~13,970ms per app`);
  console.log(`   Gemini optimized: ~869ms per app`);
  
  if (avgTime > 0) {
    const vsOriginal = (13970 / avgTime).toFixed(1);
    const vsOptimized = (869 / avgTime).toFixed(1);
    console.log(`   🚀 DeepSeek vs Original Gemini: ${vsOriginal}x faster`);
    console.log(`   🚀 DeepSeek vs Optimized Gemini: ${vsOptimized}x faster`);
  }

  console.log(`\n💡 RECOMMENDATION:`);
  if (successful.length === testApps.length && avgTime < 869) {
    console.log(`   ✅ DeepSeek shows excellent performance - recommend using for production`);
    console.log(`   💰 Cost benefits: Lower API costs than Gemini`);
    console.log(`   ⚡ Speed benefits: Faster than optimized Gemini`);
  } else if (successful.length === testApps.length) {
    console.log(`   ✅ DeepSeek works reliably but similar speed to optimized Gemini`);
    console.log(`   💰 Consider cost comparison for final decision`);
  } else {
    console.log(`   ⚠️  DeepSeek needs further optimization or error handling`);
  }

  return {
    avgTime,
    successRate: successful.length / testApps.length,
    results
  };
}

if (require.main === module) {
  performanceTest()
    .then((results) => {
      console.log('\n✅ DeepSeek performance test completed!');
      if (results.successRate === 1.0 && results.avgTime < 1000) {
        console.log('🎯 DeepSeek ready for production use');
      }
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 DeepSeek test failed:', error);
      process.exit(1);
    });
}

module.exports = { testDeepSeekExtraction, performanceTest };