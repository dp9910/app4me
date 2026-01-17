// Test the neural re-ranking system with DeepSeek LLM
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

async function testNeuralReranker() {
  console.log('🧠 Testing Neural Re-Ranking System with DeepSeek LLM...');
  
  const testCases = [
    {
      name: 'Plant Care Learning',
      query: 'apps to help me learn plant care',
      userContext: {
        lifestyle_tags: ['student', 'nature_lover'],
        preferred_use_cases: ['learning', 'gardening'],
        preferred_complexity: 'beginner',
        current_context: 'home'
      }
    },
    {
      name: 'Professional Productivity',
      query: 'productivity apps for work organization',
      userContext: {
        lifestyle_tags: ['professional', 'busy'],
        preferred_use_cases: ['task_management', 'organization'],
        preferred_complexity: 'advanced',
        current_context: 'work'
      }
    },
    {
      name: 'Meditation & Wellness',
      query: 'meditation and mindfulness apps',
      userContext: {
        lifestyle_tags: ['wellness_focused', 'stress_management'],
        preferred_use_cases: ['meditation', 'relaxation'],
        preferred_complexity: 'intermediate',
        current_context: 'evening'
      }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🧪 Test Case: ${testCase.name}`);
    console.log(`Query: "${testCase.query}"`);
    console.log(`User Profile: ${JSON.stringify(testCase.userContext, null, 2)}`);
    console.log(`${'='.repeat(70)}`);
    
    try {
      // Step 1: Get initial candidates using our smart hybrid retriever
      console.log('\n1. Getting initial candidates...');
      const candidates = await getInitialCandidates(testCase.query, 12);
      console.log(`📊 Retrieved ${candidates.length} initial candidates`);
      
      if (candidates.length > 0) {
        console.log('Top candidates before re-ranking:');
        candidates.slice(0, 5).forEach((app, i) => {
          console.log(`  ${i+1}. ${app.app_name} (${app.category}) - Score: ${app.score.toFixed(3)}`);
        });
      }
      
      // Step 2: Apply neural re-ranking
      console.log('\n2. Applying neural re-ranking with DeepSeek...');
      const userContextWithQuery = {
        ...testCase.userContext,
        query: testCase.query
      };
      const rerankedResults = await neuralRerank(candidates, userContextWithQuery);
      
      // Step 3: Display results
      console.log('\n🎯 NEURAL RE-RANKING RESULTS:');
      if (rerankedResults.length > 0) {
        rerankedResults.slice(0, 6).forEach((result, i) => {
          console.log(`${i+1}. ${result.app_name} (${result.category})`);
          console.log(`   Final Score: ${result.final_score.toFixed(3)} | LLM Confidence: ${result.llm_confidence.toFixed(2)}`);
          console.log(`   📝 ${result.personalized_oneliner}`);
          console.log(`   💡 ${result.match_explanation}`);
          console.log(`   📊 Breakdown: Retrieval(${result.score_breakdown.retrieval_score.toFixed(2)}) + LLM(${result.score_breakdown.llm_score.toFixed(2)}) + Confidence(${result.score_breakdown.confidence_boost.toFixed(2)})`);
          console.log('');
        });
        
        // Analytics
        console.log('\n📈 Re-ranking Analytics:');
        const avgConfidence = rerankedResults.reduce((sum, r) => sum + r.llm_confidence, 0) / rerankedResults.length;
        const highConfidenceCount = rerankedResults.filter(r => r.llm_confidence > 0.8).length;
        const positionChanges = calculatePositionChanges(candidates, rerankedResults);
        
        console.log(`   Average LLM confidence: ${avgConfidence.toFixed(2)}`);
        console.log(`   High confidence recommendations: ${highConfidenceCount}/${rerankedResults.length}`);
        console.log(`   Position changes: ${positionChanges.significant} significant moves`);
        console.log(`   Top app changed: ${positionChanges.topChanged ? 'Yes' : 'No'}`);
        
      } else {
        console.log('❌ No results after re-ranking');
      }
      
    } catch (error) {
      console.error(`❌ Test case "${testCase.name}" failed:`, error.message);
    }
  }
  
  console.log('\n✅ Neural re-ranking test completed!');
}

async function getInitialCandidates(query, limit) {
  // Use improved keyword search to get realistic candidates
  try {
    const queryIntent = await analyzeQueryIntentFallback(query);
    const searchTerms = [queryIntent.main_topic, ...queryIntent.search_focus];
    const searchQueries = searchTerms.map(term => 
      `title.ilike.%${term}%,description.ilike.%${term}%`
    ).join(',');
    
    const { data: apps, error } = await supabase
      .from('apps_unified')
      .select('id, title, primary_category, rating, icon_url, description')
      .or(searchQueries)
      .limit(limit * 2); // Get more to filter
    
    if (error) throw error;
    
    // Score and rank the apps
    const scoredApps = apps.map(app => {
      const relevanceScore = calculateRelevanceScore(app, queryIntent.main_topic, queryIntent.search_focus);
      return {
        app_id: app.id.toString(),
        app_name: app.title,
        category: app.primary_category,
        rating: app.rating || 0,
        description: app.description || '',
        icon_url: app.icon_url,
        score: relevanceScore,
        retrieval_methods: ['improved_keyword'],
        matched_concepts: getMatchedKeywords(app, searchTerms)
      };
    });
    
    return scoredApps
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
  } catch (error) {
    console.error('Error getting initial candidates:', error);
    return [];
  }
}

function analyzeQueryIntentFallback(query) {
  // Simple fallback intent analysis
  const lowQuery = query.toLowerCase();
  
  if (lowQuery.includes('plant') || lowQuery.includes('garden')) {
    return {
      main_topic: "plant",
      search_focus: ["plant", "garden", "care", "grow", "flora"]
    };
  } else if (lowQuery.includes('productiv')) {
    return {
      main_topic: "productivity",
      search_focus: ["productivity", "task", "planner", "organize", "focus"]
    };
  } else if (lowQuery.includes('meditat') || lowQuery.includes('mindful')) {
    return {
      main_topic: "meditation",
      search_focus: ["meditation", "mindfulness", "calm", "relax", "zen"]
    };
  }
  
  return {
    main_topic: extractMainKeyword(query),
    search_focus: [extractMainKeyword(query)]
  };
}

function calculateRelevanceScore(app, mainTopic, searchFocus) {
  const title = app.title.toLowerCase();
  const description = (app.description || '').toLowerCase();
  let score = 0;
  
  // High score for main topic in title
  if (title.includes(mainTopic.toLowerCase())) {
    score += 0.8;
  }
  
  // Medium score for main topic in description
  if (description.includes(mainTopic.toLowerCase())) {
    score += 0.4;
  }
  
  // Score for focus keywords
  for (const keyword of searchFocus) {
    if (title.includes(keyword.toLowerCase())) {
      score += 0.6;
    } else if (description.includes(keyword.toLowerCase())) {
      score += 0.2;
    }
  }
  
  // Quality boost
  score += (app.rating || 0) / 5.0 * 0.1;
  
  return Math.min(score, 1.0);
}

function getMatchedKeywords(app, searchTerms) {
  const text = `${app.title} ${app.description}`.toLowerCase();
  return searchTerms.filter(term => text.includes(term.toLowerCase()));
}

function extractMainKeyword(query) {
  // Extract main keyword for search
  const stopWords = new Set(['apps', 'help', 'me', 'for', 'to', 'and', 'the', 'a']);
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));
  return words[0] || 'app';
}

async function neuralRerank(candidates, userContext) {
  if (candidates.length === 0) return [];
  
  // Process in batches
  const batchSize = 6;
  const results = [];
  
  for (let i = 0; i < Math.min(candidates.length, 12); i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);
    
    const prompt = `You are an expert app recommendation AI. Re-rank these apps based on relevance to the user's specific needs and context.

USER CONTEXT:
Query: "${userContext.query || 'general search'}"
Lifestyle: ${userContext.lifestyle_tags?.join(', ') || 'general user'}
Interests: ${userContext.preferred_use_cases?.join(', ') || 'general'}
Experience level: ${userContext.preferred_complexity || 'any level'}
Context: ${userContext.current_context || 'general usage'}

CANDIDATE APPS:
${batch.map((app, idx) => `
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
${batch.map((app, idx) => `  {
    "app_id": "${app.app_id}",
    "relevance_score": 8.5,
    "personalized_oneliner": "Perfect for [user situation] - [specific benefit]",
    "match_explanation": "Brief explanation why this app is relevant",
    "confidence": 0.9
  }`).join(',\n')}
]

Return ONLY the JSON array with ${batch.length} objects using the exact app_ids shown above:`;

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

      const text = completion.choices[0].message.content?.trim() || '';
      
      // Handle markdown code blocks from DeepSeek
      let jsonText = text;
      if (text.includes('```json')) {
        const codeBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          jsonText = codeBlockMatch[1];
        }
      }
      
      const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error('❌ Could not extract JSON from LLM response');
        throw new Error('Could not extract JSON from LLM response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Merge with original candidates
      for (const reranked of parsed) {
        const original = batch.find(c => c.app_id === reranked.app_id);
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
    } catch (error) {
      console.error('Re-ranking batch error:', error.message);
      console.error('Full error:', error);
      
      // Fallback: use original scores
      results.push(...batch.map(c => ({
        ...c,
        llm_relevance_score: 5.0,
        personalized_oneliner: `Great ${c.category.toLowerCase()} app for your needs`,
        match_explanation: `Relevant to your search query`,
        llm_confidence: 0.5,
        final_score: c.score,
        score_breakdown: {
          retrieval_score: c.score,
          llm_score: 0.5,
          confidence_boost: 0
        }
      })));
    }
  }
  
  return results.sort((a, b) => b.final_score - a.final_score);
}

function calculatePositionChanges(original, reranked) {
  let significantChanges = 0;
  const topChanged = original[0]?.app_id !== reranked[0]?.app_id;
  
  for (let i = 0; i < Math.min(original.length, reranked.length); i++) {
    const originalApp = original[i];
    const newPosition = reranked.findIndex(r => r.app_id === originalApp.app_id);
    
    if (newPosition !== -1 && Math.abs(i - newPosition) >= 2) {
      significantChanges++;
    }
  }
  
  return {
    significant: significantChanges,
    topChanged: topChanged
  };
}

testNeuralReranker();