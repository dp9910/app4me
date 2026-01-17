// Test just plant care neural re-ranking with debugging
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testPlantReranking() {
  console.log('🌱 Testing Plant Care Neural Re-Ranking (Debug Mode)...');
  
  const testCase = {
    query: 'apps to help me learn plant care',
    userContext: {
      lifestyle_tags: ['student', 'nature_lover'],
      preferred_use_cases: ['learning', 'gardening'],
      preferred_complexity: 'beginner',
      current_context: 'home'
    }
  };
  
  try {
    // Step 1: Get realistic plant candidates
    console.log('\n1. Getting plant care candidates...');
    const candidates = await getPlantCandidates(6);
    
    console.log(`📊 Retrieved ${candidates.length} plant candidates:`);
    candidates.forEach((app, i) => {
      console.log(`  ${i+1}. ${app.app_name} (${app.category}) - Score: ${app.score.toFixed(3)}`);
    });
    
    if (candidates.length === 0) {
      console.log('❌ No candidates found!');
      return;
    }
    
    // Step 2: Test neural re-ranking
    console.log('\n2. Testing neural re-ranking...');
    const userContextWithQuery = {
      ...testCase.userContext,
      query: testCase.query
    };
    
    const rerankedResults = await neuralRerankDebug(candidates, userContextWithQuery);
    
    console.log(`\n🎯 Re-ranking results: ${rerankedResults.length} apps`);
    if (rerankedResults.length > 0) {
      rerankedResults.forEach((result, i) => {
        console.log(`${i+1}. ${result.app_name} - Final Score: ${result.final_score.toFixed(3)}`);
        console.log(`   📝 ${result.personalized_oneliner}`);
        console.log(`   💡 ${result.match_explanation}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

async function getPlantCandidates(limit) {
  // Search specifically for plant-related apps
  const { data: apps, error } = await supabase
    .from('apps_unified')
    .select('id, title, primary_category, rating, icon_url, description')
    .or('title.ilike.%plant%,description.ilike.%plant%,title.ilike.%garden%,description.ilike.%garden%,title.ilike.%planta%,description.ilike.%planta%')
    .limit(10);
  
  if (error) throw error;
  
  return apps.slice(0, limit).map((app, index) => ({
    app_id: app.id.toString(),
    app_name: app.title,
    category: app.primary_category,
    rating: app.rating || 0,
    description: app.description || '',
    icon_url: app.icon_url,
    score: Math.max(0.5, 1.0 - (index * 0.1)),
    retrieval_methods: ['plant_search'],
    matched_concepts: ['plant', 'garden']
  }));
}

async function neuralRerankDebug(candidates, userContext) {
  console.log('\n🔧 Debug: Starting neural re-ranking...');
  console.log(`User context: ${JSON.stringify(userContext, null, 2)}`);
  
  const prompt = `You are an expert app recommendation AI. Re-rank these apps based on relevance to the user's specific needs and context.

USER CONTEXT:
Query: "${userContext.query || 'general search'}"
Lifestyle: ${userContext.lifestyle_tags?.join(', ') || 'general user'}
Interests: ${userContext.preferred_use_cases?.join(', ') || 'general'}
Experience level: ${userContext.preferred_complexity || 'any level'}
Context: ${userContext.current_context || 'general usage'}

CANDIDATE APPS:
${candidates.map((app, idx) => `
${idx + 1}. ${app.app_name}
   Category: ${app.category}
   Rating: ${app.rating}/5
   Description: ${(app.description || '').substring(0, 120)}...
   Current score: ${app.score.toFixed(3)}
`).join('\n')}

TASK:
For each app, provide:
1. relevance_score (0-10): How well it matches the user's query and context
2. personalized_oneliner: A compelling one-liner in format "Perfect for [user situation] - [specific benefit]"
3. match_explanation: Why this app is relevant (max 25 words)
4. confidence: How confident you are in this recommendation (0-1)

Consider:
- Direct relevance to the query
- Alignment with user's lifestyle and interests  
- App quality and user ratings
- Uniqueness of the solution

Return JSON array with these exact app_ids:
[
${candidates.map((app, idx) => `  {
    "app_id": "${app.app_id}",
    "relevance_score": 8.5,
    "personalized_oneliner": "Perfect for plant care beginners - [benefit]",
    "match_explanation": "Brief explanation",
    "confidence": 0.9
  }`).join(',\n')}
]

Return ONLY the JSON array with ${candidates.length} objects using the exact app_ids shown above:`;

  console.log('\n📤 Sending prompt to DeepSeek...');
  console.log('Prompt length:', prompt.length);
  
  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: "You are an expert app recommendation AI. Respond only with valid JSON arrays." },
        { role: "user", content: prompt }
      ],
      model: "deepseek-chat",
      temperature: 0.3,
      max_tokens: 2000
    });

    console.log('✅ Got DeepSeek response');
    const text = completion.choices[0].message.content?.trim() || '';
    console.log('📥 Raw response:', text.substring(0, 200) + '...');
    
    // Handle markdown code blocks from DeepSeek
    let jsonText = text;
    if (text.includes('```json')) {
      const codeBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1];
        console.log('✂️ Extracted from markdown block');
      }
    }
    
    const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('❌ Could not extract JSON array from response');
      console.log('Response text:', text);
      throw new Error('Could not extract JSON from LLM response');
    }
    
    console.log('🔍 Found JSON array, parsing...');
    const parsed = JSON.parse(jsonMatch[0]);
    console.log(`✅ Parsed ${parsed.length} items from DeepSeek`);
    
    // Merge with original candidates
    const results = [];
    for (const reranked of parsed) {
      const original = candidates.find(c => c.app_id === reranked.app_id);
      if (original) {
        const llm_score = reranked.relevance_score / 10;
        const confidence_boost = reranked.confidence > 0.8 ? 0.1 : 0;
        const final_score = (0.3 * original.score) + (0.7 * llm_score) + confidence_boost;
        
        results.push({
          ...original,
          llm_relevance_score: reranked.relevance_score,
          personalized_oneliner: reranked.personalized_oneliner,
          match_explanation: reranked.match_explanation,
          llm_confidence: reranked.confidence,
          final_score: final_score,
          score_breakdown: {
            retrieval_score: original.score,
            llm_score: llm_score,
            confidence_boost: confidence_boost
          }
        });
      }
    }
    
    console.log(`🔄 Merged ${results.length} results with original candidates`);
    return results.sort((a, b) => b.final_score - a.final_score);
    
  } catch (error) {
    console.error('❌ Neural re-ranking error:', error.message);
    throw error;
  }
}

testPlantReranking().catch(console.error);