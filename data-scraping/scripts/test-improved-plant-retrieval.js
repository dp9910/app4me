// Test the improved plant care retrieval system
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testImprovedPlantRetrieval() {
  console.log('🌱 Testing Improved Plant Care Retrieval System...');
  
  const query = "apps to help me learn plant care";
  console.log(`\nQuery: "${query}"`);
  
  try {
    // Step 1: Analyze query intent
    console.log('\n1. Analyzing query intent...');
    const queryIntent = await analyzeQueryIntent(query);
    console.log(`🎯 Main Topic: ${queryIntent.main_topic}`);
    console.log(`🎯 User Need: ${queryIntent.user_need}`);
    console.log(`🎯 Key Concepts: ${queryIntent.key_concepts.join(', ')}`);
    console.log(`🎯 Search Focus: ${queryIntent.search_focus.join(', ')}`);
    
    // Step 2: Test improved keyword search
    console.log('\n2. Testing improved keyword search...');
    const keywordResults = await performImprovedKeywordSearch(
      queryIntent.search_focus,
      queryIntent.main_topic,
      20
    );
    
    console.log(`\n🔑 Found ${keywordResults.length} apps via keyword search:`);
    if (keywordResults.length > 0) {
      keywordResults.slice(0, 10).forEach((app, i) => {
        console.log(`  ${i+1}. ${app.app_name} (${app.category}) - Score: ${app.keyword_score.toFixed(3)}`);
        if (app.matched_keywords && app.matched_keywords.length > 0) {
          console.log(`     Keywords: ${app.matched_keywords.join(', ')}`);
        }
      });
      
      // Check if we found the key plant apps
      const plantApps = keywordResults.filter(app => 
        app.app_name.toLowerCase().includes('planta') ||
        app.app_name.toLowerCase().includes('garden') ||
        app.app_name.toLowerCase().includes('flora') ||
        app.app_name.toLowerCase().includes('plant')
      );
      
      console.log(`\n🌿 Plant-specific apps found: ${plantApps.length}`);
      plantApps.forEach((app, i) => {
        console.log(`  ${i+1}. ${app.app_name} - Score: ${app.keyword_score.toFixed(3)}`);
      });
    }
    
    console.log('\n✅ Improved plant retrieval test completed!');
    
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
- main_topic: The primary subject/domain (e.g., "plant", "fitness", "finance")
- user_need: What the user wants to accomplish
- intent_type: "learn", "solve", "discover", "manage", or "entertainment"
- key_concepts: Array of 3-5 core concepts related to the main topic
- search_focus: Array of 3-5 specific keywords to prioritize in search
- semantic_query: A refined search query that emphasizes the main topic

Focus on what the user REALLY wants, not just the words they used.

Return ONLY the JSON object:`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from LLM response');
    }
    
    return JSON.parse(jsonMatch[0]);
    
  } catch (error) {
    console.error('⚠️ Intent analysis failed:', error);
    
    // Fallback for plant care
    return {
      main_topic: "plant",
      user_need: "learn plant care and gardening",
      intent_type: "learn",
      key_concepts: ["plant care", "gardening", "botany", "plant health", "watering"],
      search_focus: ["plant", "garden", "care", "grow", "flora"],
      semantic_query: "plant care gardening apps learn how to grow plants"
    };
  }
}

async function performImprovedKeywordSearch(searchFocus, mainTopic, limit) {
  try {
    // Build comprehensive search for main topic and related terms
    const searchTerms = [mainTopic, ...searchFocus];
    const searchQueries = searchTerms.map(term => 
      `title.ilike.%${term}%,description.ilike.%${term}%`
    ).join(',');
    
    console.log(`🔍 Searching for keywords: ${searchTerms.join(', ')}`);
    
    const { data: topicApps, error: topicError } = await supabase
      .from('apps_unified')
      .select(`
        id,
        title,
        primary_category,
        rating,
        icon_url,
        description
      `)
      .or(searchQueries)
      .limit(50);
    
    if (topicError) throw topicError;
    
    console.log(`📱 Found ${topicApps.length} apps from direct keyword search`);
    
    const results = [];
    
    // Score apps based on relevance
    topicApps.forEach(app => {
      const relevanceScore = calculateTopicRelevance(app, mainTopic, searchFocus);
      const matchedKeywords = getMatchedKeywords(app, searchTerms);
      
      if (relevanceScore > 0) {
        results.push({
          app_id: app.id.toString(),
          app_name: app.title,
          category: app.primary_category,
          rating: app.rating || 0,
          description: app.description || '',
          icon_url: app.icon_url,
          keyword_score: relevanceScore,
          matched_keywords: matchedKeywords,
          topic_match: true,
          source: 'keyword_topic'
        });
      }
    });
    
    return results
      .sort((a, b) => b.keyword_score - a.keyword_score)
      .slice(0, limit);
    
  } catch (error) {
    console.error('❌ Improved keyword search error:', error);
    return [];
  }
}

function calculateTopicRelevance(app, mainTopic, searchFocus) {
  const title = app.title.toLowerCase();
  const description = (app.description || '').toLowerCase();
  let score = 0;
  
  // Very high score for exact topic match in title
  if (title.includes(mainTopic.toLowerCase())) {
    score += 1.0;
  }
  
  // High score for topic in description
  if (description.includes(mainTopic.toLowerCase())) {
    score += 0.6;
  }
  
  // Score for focus keywords with priority weighting
  for (const keyword of searchFocus) {
    const keywordLower = keyword.toLowerCase();
    if (title.includes(keywordLower)) {
      score += 0.8; // Higher weight for title matches
    } else if (description.includes(keywordLower)) {
      score += 0.3; // Medium weight for description matches
    }
  }
  
  // Boost for apps that are clearly about the main topic
  const topicBoosts = {
    'plant': ['planta', 'garden', 'flora', 'botanical', 'everyscan'],
    'meditation': ['calm', 'headspace', 'insight', 'mindfulness', 'zen'],
    'fitness': ['nike', 'adidas', 'fitbit', 'strava', 'myfitnesspal'],
    'finance': ['chase', 'bank', 'invest', 'mint', 'robinhood']
  };
  
  const boostWords = topicBoosts[mainTopic.toLowerCase()] || [];
  for (const boostWord of boostWords) {
    if (title.includes(boostWord)) {
      score += 0.5;
    }
  }
  
  return score;
}

function getMatchedKeywords(app, searchTerms) {
  const text = `${app.title} ${app.description}`.toLowerCase();
  const matched = [];
  
  for (const term of searchTerms) {
    if (text.includes(term.toLowerCase())) {
      matched.push(term);
    }
  }
  
  return matched;
}

testImprovedPlantRetrieval().catch(console.error);