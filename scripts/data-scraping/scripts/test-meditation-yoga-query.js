// Test the smart hybrid retriever with meditation and yoga query
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testMeditationYogaQuery() {
  console.log('🧘 Testing Smart Hybrid Retriever with Meditation & Yoga Query...');
  
  const query = "apps that could help me teach meditation and yoga";
  console.log(`\nQuery: "${query}"`);
  
  try {
    // Step 1: Analyze query intent using Gemini 2.0
    console.log('\n1. Analyzing query intent with Gemini 2.0...');
    const queryIntent = await analyzeQueryIntent(query);
    console.log(`🎯 Main Topic: ${queryIntent.main_topic}`);
    console.log(`🎯 User Need: ${queryIntent.user_need}`);
    console.log(`🎯 Intent Type: ${queryIntent.intent_type}`);
    console.log(`🎯 Key Concepts: ${queryIntent.key_concepts.join(', ')}`);
    console.log(`🎯 Search Focus: ${queryIntent.search_focus.join(', ')}`);
    console.log(`🎯 Semantic Query: "${queryIntent.semantic_query}"`);
    
    // Step 2: Generate semantic embedding
    console.log('\n2. Generating semantic embedding...');
    const queryEmbedding = await generateQueryEmbedding(queryIntent.semantic_query);
    console.log(`✅ Generated ${queryEmbedding.length}-dimensional embedding`);
    
    // Step 3: Perform smart semantic search
    console.log('\n3. Performing smart semantic search...');
    const semanticResults = await performSmartSemanticSearch(queryEmbedding, queryIntent, 10);
    console.log(`🧠 Semantic results: ${semanticResults.length}`);
    
    if (semanticResults.length > 0) {
      console.log('Top semantic matches:');
      semanticResults.slice(0, 5).forEach((app, i) => {
        console.log(`  ${i+1}. ${app.app_name} (${app.category})`);
        console.log(`     Similarity: ${app.semantic_similarity.toFixed(3)} | Intent: ${app.intent_match.toFixed(3)} | Total: ${app.relevance_score.toFixed(3)}`);
      });
    }
    
    // Step 4: Perform focused keyword search for meditation/yoga
    console.log('\n4. Performing focused keyword search...');
    const keywordResults = await performFocusedKeywordSearch(
      queryIntent.search_focus,
      queryIntent.main_topic,
      15
    );
    console.log(`🔑 Keyword results: ${keywordResults.length}`);
    
    if (keywordResults.length > 0) {
      console.log('Top keyword matches:');
      keywordResults.slice(0, 8).forEach((app, i) => {
        console.log(`  ${i+1}. ${app.app_name} (${app.category})`);
        console.log(`     Score: ${app.keyword_score.toFixed(3)} | Topic Match: ${app.topic_match}`);
        if (app.matched_keywords) {
          console.log(`     Keywords: ${app.matched_keywords.join(', ')}`);
        }
      });
    }
    
    // Step 5: Combine with intent-aware ranking
    console.log('\n5. Combining results with intent-aware ranking...');
    const finalResults = await combineWithIntentRanking(
      semanticResults,
      keywordResults,
      queryIntent,
      10
    );
    
    // Step 6: Display final smart recommendations
    console.log('\n🧘 SMART MEDITATION & YOGA RECOMMENDATIONS:');
    console.log('=' * 70);
    
    if (finalResults.length > 0) {
      finalResults.forEach((app, i) => {
        console.log(`${i+1}. ${app.app_data.name} (${app.app_data.category})`);
        console.log(`   Final Score: ${app.final_score.toFixed(3)} | Rank: ${app.rank}`);
        console.log(`   Semantic: ${app.semantic_similarity.toFixed(3)} | Keyword: ${app.keyword_relevance.toFixed(3)} | Intent: ${app.intent_match_score.toFixed(3)}`);
        console.log(`   ${app.explanation}`);
        console.log(`   Description: ${app.app_data.description.substring(0, 120)}...`);
        if (app.matched_concepts.length > 0) {
          console.log(`   Matched: ${app.matched_concepts.join(', ')}`);
        }
        console.log('');
      });
      
      // Analytics
      console.log('\n📊 Search Analytics:');
      const categories = [...new Set(finalResults.map(r => r.app_data.category))];
      console.log(`   Categories found: ${categories.join(', ')}`);
      
      const hasSemanticAndKeyword = finalResults.filter(r => r.semantic_similarity > 0 && r.keyword_relevance > 0).length;
      const semanticOnly = finalResults.filter(r => r.semantic_similarity > 0 && r.keyword_relevance === 0).length;
      const keywordOnly = finalResults.filter(r => r.semantic_similarity === 0 && r.keyword_relevance > 0).length;
      
      console.log(`   Found by both methods: ${hasSemanticAndKeyword}`);
      console.log(`   Found by semantic only: ${semanticOnly}`);
      console.log(`   Found by keyword only: ${keywordOnly}`);
      
    } else {
      console.log('❌ No relevant apps found');
      
      // Fallback: Check what meditation/yoga apps exist
      console.log('\n🔍 Checking what meditation/yoga apps exist...');
      await checkMeditationYogaApps();
    }
    
    console.log('\n✅ Smart meditation & yoga query test completed!');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

async function analyzeQueryIntent(query) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    const prompt = `Analyze this app search query and extract the user's intent:

Query: "${query}"

Return JSON with:
- main_topic: The primary subject/domain (e.g., "meditation", "fitness", "finance")
- user_need: What the user wants to accomplish
- intent_type: "learn", "solve", "discover", "manage", or "entertainment"
- key_concepts: Array of 3-5 core concepts related to the main topic
- search_focus: Array of 3-5 specific keywords to prioritize in search
- semantic_query: A refined search query that emphasizes the main topic

Focus on what the user REALLY wants, not just the words they used.

Example:
Query: "apps that could help me teach meditation and yoga"
Response: {
  "main_topic": "meditation",
  "user_need": "teach meditation and yoga practices",
  "intent_type": "learn",
  "key_concepts": ["meditation instruction", "yoga teaching", "mindfulness education", "breathing techniques", "wellness coaching"],
  "search_focus": ["meditation", "yoga", "mindfulness", "teach", "instructor"],
  "semantic_query": "meditation yoga teaching instructor apps mindfulness"
}

Return ONLY the JSON object:`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from LLM response');
    }
    
    return JSON.parse(jsonMatch[0]);
    
  } catch (error) {
    console.error('⚠️ Intent analysis failed:', error);
    
    // Fallback intent analysis
    return {
      main_topic: "meditation",
      user_need: "teach meditation and yoga",
      intent_type: "learn",
      key_concepts: ["meditation", "yoga", "mindfulness", "teaching", "wellness"],
      search_focus: ["meditation", "yoga", "mindfulness", "teach", "instructor"],
      semantic_query: "meditation yoga teaching apps"
    };
  }
}

async function generateQueryEmbedding(query) {
  const embeddingModel = genAI.getGenerativeModel({ 
    model: 'text-embedding-004' 
  });
  
  const result = await embeddingModel.embedContent(query);
  return result.embedding.values;
}

async function performSmartSemanticSearch(queryEmbedding, intent, limit) {
  try {
    const { data: appsWithEmbeddings, error } = await supabase
      .from('app_embeddings')
      .select(`
        app_id,
        embedding,
        apps_unified!inner(
          id,
          title,
          primary_category,
          rating,
          icon_url,
          description
        )
      `)
      .limit(150);
    
    if (error) throw error;
    
    const results = [];
    
    for (const app of appsWithEmbeddings) {
      if (!app.embedding) continue;
      
      const similarity = calculateCosineSimilarity(queryEmbedding, app.embedding);
      const intentBoost = calculateIntentRelevance(app.apps_unified, intent);
      const relevanceScore = similarity + intentBoost;
      
      if (relevanceScore > 0.4) {
        results.push({
          app_id: app.app_id.toString(),
          app_name: app.apps_unified.title,
          category: app.apps_unified.primary_category,
          rating: app.apps_unified.rating || 0,
          description: app.apps_unified.description || '',
          icon_url: app.apps_unified.icon_url,
          semantic_similarity: similarity,
          intent_match: intentBoost,
          relevance_score: relevanceScore,
          source: 'semantic'
        });
      }
    }
    
    return results
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, limit);
    
  } catch (error) {
    console.error('❌ Smart semantic search error:', error);
    return [];
  }
}

async function performFocusedKeywordSearch(searchFocus, mainTopic, limit) {
  try {
    // Search for apps mentioning meditation, yoga, or mindfulness
    const topics = ['meditation', 'yoga', 'mindfulness', 'zen', 'calm'];
    const topicQueries = topics.map(topic => 
      `title.ilike.%${topic}%,description.ilike.%${topic}%`
    ).join(',');
    
    const { data: topicApps, error: topicError } = await supabase
      .from('apps_unified')
      .select('id, title, primary_category, rating, icon_url, description')
      .or(topicQueries)
      .limit(20);
    
    if (topicError) throw topicError;
    
    console.log(`   Found ${topicApps.length} apps mentioning meditation/yoga/mindfulness topics`);
    
    const results = [];
    
    // Score topic-focused apps highly
    topicApps.forEach(app => {
      const topicRelevance = calculateMeditationYogaRelevance(app, searchFocus);
      
      results.push({
        app_id: app.id.toString(),
        app_name: app.title,
        category: app.primary_category,
        rating: app.rating || 0,
        description: app.description || '',
        icon_url: app.icon_url,
        keyword_score: topicRelevance + 0.5,
        topic_match: true,
        matched_keywords: getMatchedMeditationKeywords(app, topics),
        source: 'keyword_topic'
      });
    });
    
    return results
      .sort((a, b) => b.keyword_score - a.keyword_score)
      .slice(0, limit);
    
  } catch (error) {
    console.error('❌ Focused keyword search error:', error);
    return [];
  }
}

function calculateMeditationYogaRelevance(app, searchFocus) {
  const text = `${app.title} ${app.description}`.toLowerCase();
  let score = 0;
  
  // High score for meditation/yoga in title
  if (app.title.toLowerCase().includes('meditation') || 
      app.title.toLowerCase().includes('yoga') ||
      app.title.toLowerCase().includes('mindfulness')) {
    score += 1.0;
  }
  
  // Medium score for these terms in description
  const wellnessTerms = ['meditation', 'yoga', 'mindfulness', 'zen', 'calm', 'relax', 'breathe'];
  for (const term of wellnessTerms) {
    if (text.includes(term)) {
      score += 0.2;
    }
  }
  
  // Bonus for teaching/instructor keywords
  const teachingTerms = ['teach', 'instructor', 'guide', 'learn', 'tutorial'];
  for (const term of teachingTerms) {
    if (text.includes(term)) {
      score += 0.3;
    }
  }
  
  return score;
}

function getMatchedMeditationKeywords(app, topics) {
  const text = `${app.title} ${app.description}`.toLowerCase();
  const matched = [];
  
  for (const topic of topics) {
    if (text.includes(topic)) {
      matched.push(topic);
    }
  }
  
  // Add teaching keywords if found
  const teachingTerms = ['teach', 'instructor', 'guide'];
  for (const term of teachingTerms) {
    if (text.includes(term)) {
      matched.push(term);
    }
  }
  
  return matched;
}

async function combineWithIntentRanking(semanticResults, keywordResults, intent, limit) {
  const combinedMap = new Map();
  
  // Add semantic results
  semanticResults.forEach(result => {
    combinedMap.set(result.app_id, {
      ...result,
      semantic_similarity: result.semantic_similarity || 0,
      keyword_relevance: 0,
      matched_concepts: []
    });
  });
  
  // Add/merge keyword results  
  keywordResults.forEach(result => {
    if (combinedMap.has(result.app_id)) {
      const existing = combinedMap.get(result.app_id);
      existing.keyword_relevance = result.keyword_score;
      existing.matched_concepts = result.matched_keywords || [];
    } else {
      combinedMap.set(result.app_id, {
        ...result,
        semantic_similarity: 0,
        keyword_relevance: result.keyword_score,
        matched_concepts: result.matched_keywords || []
      });
    }
  });
  
  const finalResults = [];
  
  for (const [appId, result] of combinedMap) {
    const intentMatchScore = calculateAppIntentMatch(result, intent);
    
    const finalScore = 
      (result.semantic_similarity * 0.4) +
      (result.keyword_relevance * 0.3) +
      (intentMatchScore * 0.3);
    
    const explanation = generateExplanation(result, intent);
    
    finalResults.push({
      app_data: {
        name: result.app_name,
        category: result.category,
        rating: result.rating,
        icon_url: result.icon_url,
        description: result.description
      },
      semantic_similarity: result.semantic_similarity,
      keyword_relevance: result.keyword_relevance,
      intent_match_score: intentMatchScore,
      final_score: finalScore,
      explanation,
      matched_concepts: result.matched_concepts,
      rank: 0
    });
  }
  
  return finalResults
    .sort((a, b) => b.final_score - a.final_score)
    .slice(0, limit)
    .map((result, index) => ({
      ...result,
      rank: index + 1
    }));
}

// Helper functions
function calculateCosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0, normA = 0, normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  return (normA === 0 || normB === 0) ? 0 : dotProduct / (normA * normB);
}

function calculateIntentRelevance(app, intent) {
  let boost = 0;
  const text = `${app.title} ${app.description}`.toLowerCase();
  
  if (text.includes(intent.main_topic.toLowerCase())) {
    boost += 0.3;
  }
  
  for (const concept of intent.key_concepts) {
    if (text.includes(concept.toLowerCase())) {
      boost += 0.1;
    }
  }
  
  return Math.min(boost, 0.6);
}

function calculateAppIntentMatch(app, intent) {
  let score = 0;
  const text = `${app.app_name} ${app.description}`.toLowerCase();
  
  if (text.includes(intent.main_topic.toLowerCase())) {
    score += 0.8;
  }
  
  for (const concept of intent.key_concepts) {
    if (text.includes(concept.toLowerCase())) {
      score += 0.2;
    }
  }
  
  return Math.min(score, 1.0);
}

function generateExplanation(result, intent) {
  const reasons = [];
  
  if (result.semantic_similarity > 0.6) {
    reasons.push('high semantic similarity');
  }
  
  if (result.topic_match) {
    reasons.push(`matches main topic "${intent.main_topic}"`);
  }
  
  if (result.matched_concepts && result.matched_concepts.length > 0) {
    reasons.push(`contains: ${result.matched_concepts.slice(0, 3).join(', ')}`);
  }
  
  if (result.rating > 4.0) {
    reasons.push('highly rated');
  }
  
  return reasons.length > 0 ? reasons.join(', ') : 'general relevance';
}

async function checkMeditationYogaApps() {
  const { data: apps, error } = await supabase
    .from('apps_unified')
    .select('title, primary_category, description')
    .or('title.ilike.%meditation%,title.ilike.%yoga%,title.ilike.%mindfulness%,description.ilike.%meditation%,description.ilike.%yoga%')
    .limit(10);
  
  if (error) {
    console.error('Error checking meditation/yoga apps:', error);
    return;
  }
  
  if (apps.length > 0) {
    console.log(`Found ${apps.length} meditation/yoga apps in database:`);
    apps.forEach((app, i) => {
      console.log(`  ${i+1}. ${app.title} (${app.primary_category})`);
    });
  } else {
    console.log('No meditation/yoga apps found in database');
  }
}

testMeditationYogaQuery();