// Debug DeepSeek neural re-ranking performance
import OpenAI from 'openai';
import { config } from 'dotenv';

config({ path: '.env.local' });

const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// Test data
const testBatch = [
  {
    app_id: "1234567890",
    app_data: {
      name: "PlantIn",
      category: "Lifestyle",
      rating: 4.6,
      description: "Plant care made easy with AI plant identification and care guidance"
    },
    final_score: 0.85,
    matched_concepts: ['plant', 'care', 'garden']
  },
  {
    app_id: "0987654321", 
    app_data: {
      name: "Garden Tags",
      category: "Social",
      rating: 4.3,
      description: "Social network for gardeners to share tips and get plant advice"
    },
    final_score: 0.72,
    matched_concepts: ['garden', 'social', 'tips']
  }
];

const userContext = {
  query: "i wish there was a app that taught me how to take care of plants",
  lifestyle_tags: ['green_living'],
  preferred_use_cases: ['learning', 'gardening'],
  preferred_complexity: 'beginner'
};

async function testDeepSeekPerformance() {
  console.log('🔍 Testing DeepSeek API performance...');
  
  const startTime = Date.now();
  
  try {
    const prompt = `You are an expert app recommendation AI. Re-rank these apps based on relevance to the user's specific needs and context.

USER CONTEXT:
Query: "${userContext.query}"
Lifestyle: ${userContext.lifestyle_tags?.join(', ') || 'general user'}
Interests: ${userContext.preferred_use_cases?.slice(0, 5).join(', ') || 'general'}
Experience level: ${userContext.preferred_complexity || 'any level'}
Context: ${userContext.current_context || 'general usage'}

CANDIDATE APPS:
${testBatch.map((app, idx) => `
${idx + 1}. ${app.app_data.name}
   Category: ${app.app_data.category}
   Rating: ${app.app_data.rating}/5
   Description: ${app.app_data.description?.substring(0, 120) || 'No description'}...
   Current score: ${app.final_score.toFixed(3)}
   Found via: ${app.matched_concepts?.join(', ') || 'general search'}
`).join('\n')}

TASK:
For each app, provide:
1. relevance_score (0-10): How well it matches the user's query and context
2. personalized_oneliner: A compelling one-liner in format "Perfect for [user situation] - [specific benefit]"
3. match_explanation: Why this app is relevant (max 25 words)
4. confidence: How confident you are in this recommendation (0-1)

Return JSON array:
[
  {
    "app_id": "${testBatch[0]?.app_id}",
    "relevance_score": 8.5,
    "personalized_oneliner": "Perfect for busy professionals - streamlines daily task management with AI-powered prioritization",
    "match_explanation": "Combines productivity features with intelligent automation for efficient workflow management",
    "confidence": 0.9
  }
]

Return ONLY the JSON array with ${testBatch.length} objects:`;

    console.log('📊 Sending request to DeepSeek...');
    
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: "You are an expert app recommendation AI. Respond only with valid JSON arrays." },
        { role: "user", content: prompt }
      ],
      model: "deepseek-chat",
      temperature: 0.3,
      max_tokens: 2000
    });

    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`⏱️  Request completed in ${duration}ms (${(duration/1000).toFixed(2)}s)`);
    
    const text = completion.choices[0].message.content?.trim() || '';
    console.log('📝 Raw response:', text);
    
    // Handle markdown code blocks from DeepSeek
    let jsonText = text;
    if (text.includes('```json')) {
      const codeBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1];
      }
    }
    
    // Extract JSON from response
    const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from LLM response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    console.log('✅ Parsed successfully:', parsed);
    
    return {
      duration,
      success: true,
      results: parsed
    };
    
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.error('❌ Error:', error.message);
    console.error(`⏱️  Failed after ${duration}ms (${(duration/1000).toFixed(2)}s)`);
    
    return {
      duration,
      success: false,
      error: error.message
    };
  }
}

async function runPerformanceTest() {
  console.log('🚀 Starting DeepSeek performance analysis...\n');
  
  const tests = [];
  
  // Run 3 test calls to measure average performance
  for (let i = 1; i <= 3; i++) {
    console.log(`--- Test ${i}/3 ---`);
    const result = await testDeepSeekPerformance();
    tests.push(result);
    console.log('');
    
    // Wait 1 second between tests
    if (i < 3) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Calculate statistics
  const successfulTests = tests.filter(t => t.success);
  const failedTests = tests.filter(t => !t.success);
  
  console.log('📊 PERFORMANCE SUMMARY:');
  console.log(`✅ Successful: ${successfulTests.length}/${tests.length}`);
  console.log(`❌ Failed: ${failedTests.length}/${tests.length}`);
  
  if (successfulTests.length > 0) {
    const durations = successfulTests.map(t => t.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    
    console.log(`⏱️  Average duration: ${avgDuration.toFixed(0)}ms (${(avgDuration/1000).toFixed(2)}s)`);
    console.log(`⏱️  Min duration: ${minDuration}ms (${(minDuration/1000).toFixed(2)}s)`);
    console.log(`⏱️  Max duration: ${maxDuration}ms (${(maxDuration/1000).toFixed(2)}s)`);
    
    if (avgDuration > 10000) {
      console.log('⚠️  WARNING: Average response time > 10 seconds');
      console.log('💡 Recommendations:');
      console.log('   - Reduce batch size from 8 to 3-4 apps');
      console.log('   - Add timeout (5-10 seconds)'); 
      console.log('   - Implement request caching');
      console.log('   - Use async processing for large batches');
    }
  }
  
  if (failedTests.length > 0) {
    console.log('❌ Failure reasons:');
    failedTests.forEach((test, i) => {
      console.log(`   ${i+1}. ${test.error}`);
    });
  }
}

runPerformanceTest().catch(console.error);