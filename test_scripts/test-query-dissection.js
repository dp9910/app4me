// Test query dissection and keyword extraction
import OpenAI from 'openai';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

// Initialize clients
const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Test query
const testQuery = "app to take care of plants";

async function extractKeywordsAndIntent(query) {
  console.log('🔍 Extracting keywords and intent from:', query);
  
  const prompt = `Analyze this user query for app recommendations and extract structured information.

USER QUERY: "${query}"

Extract:
1. Primary intent (what the user wants to do)
2. Keywords for semantic search (important nouns, verbs, concepts)
3. App categories that would be relevant
4. User need type (learning, productivity, entertainment, etc.)

Return JSON:
{
  "primary_intent": "brief description of what user wants",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "relevant_categories": ["category1", "category2"],
  "need_type": "learning|productivity|entertainment|lifestyle|health|etc",
  "search_terms": ["term1", "term2", "term3"]
}

Return ONLY the JSON:`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: "You are an expert at understanding user intent for app recommendations. Respond only with valid JSON." },
        { role: "user", content: prompt }
      ],
      model: "deepseek-chat",
      temperature: 0.1,
      max_tokens: 500
    });

    const text = completion.choices[0].message.content?.trim() || '';
    
    // Handle markdown code blocks
    let jsonText = text;
    if (text.includes('```json')) {
      const codeBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1];
      }
    }
    
    const parsed = JSON.parse(jsonText);
    console.log('✅ Extracted intent and keywords:', parsed);
    return parsed;
    
  } catch (error) {
    console.error('❌ Error extracting keywords:', error.message);
    return null;
  }
}

async function searchByKeywords(keywords, limit = 10) {
  console.log('🔎 Searching database for keywords:', keywords);
  
  try {
    // Search in app titles and descriptions using correct schema
    const { data: apps, error } = await supabase
      .from('apps_unified')
      .select('id, title, primary_category, rating, description')
      .or(`title.ilike.%${keywords[0]}%,description.ilike.%${keywords[0]}%,title.ilike.%${keywords[1] || 'garden'}%,description.ilike.%${keywords[1] || 'garden'}%`)
      .limit(limit);

    if (error) {
      console.error('❌ Database search error:', error);
      return [];
    }

    console.log(`✅ Found ${apps?.length || 0} apps from keyword search`);
    
    // Score results based on keyword relevance
    const scoredApps = apps?.map(app => {
      let score = 0;
      const searchText = `${app.title} ${app.description}`.toLowerCase();
      
      keywords.forEach(keyword => {
        if (searchText.includes(keyword.toLowerCase())) {
          score += 1;
          // Bonus for keyword in title
          if (app.title.toLowerCase().includes(keyword.toLowerCase())) {
            score += 0.5;
          }
        }
      });
      
      return {
        ...app,
        keyword_score: score,
        matched_keywords: keywords.filter(k => searchText.includes(k.toLowerCase()))
      };
    }) || [];
    
    // Sort by score
    scoredApps.sort((a, b) => b.keyword_score - a.keyword_score);
    
    return scoredApps;
    
  } catch (error) {
    console.error('❌ Search error:', error.message);
    return [];
  }
}

async function searchByEmbeddings(searchTerms, limit = 10) {
  console.log('🧠 Searching embeddings for terms:', searchTerms);
  
  try {
    // First, let's check what embeddings we have
    const { data: embeddingSample, error: sampleError } = await supabase
      .from('app_embeddings')
      .select('app_id, embedding')
      .limit(1);
      
    if (sampleError) {
      console.error('❌ Error checking embeddings:', sampleError);
      return [];
    }
    
    if (!embeddingSample || embeddingSample.length === 0) {
      console.log('⚠️ No embeddings found in database');
      return [];
    }
    
    console.log('✅ Embeddings table exists, found sample app_id:', embeddingSample[0].app_id);
    
    // For now, let's do a simpler search using the apps table
    // We'll implement proper embedding similarity search later
    const combinedQuery = searchTerms.join(' ');
    
    const { data: apps, error } = await supabase
      .from('apps_unified')
      .select('id, title, primary_category, rating, description')
      .textSearch('title', combinedQuery)
      .limit(limit);

    if (error) {
      console.error('❌ Text search error:', error);
      // Fallback to simple LIKE search
      return await searchByKeywords(searchTerms, limit);
    }

    console.log(`✅ Found ${apps?.length || 0} apps from text search`);
    return apps || [];
    
  } catch (error) {
    console.error('❌ Embedding search error:', error.message);
    return [];
  }
}

async function testQueryDissection() {
  console.log('🚀 Starting query dissection test...\n');
  
  // Step 1: Extract keywords and intent
  const intentData = await extractKeywordsAndIntent(testQuery);
  if (!intentData) {
    console.error('Failed to extract intent data');
    return;
  }
  
  console.log('\n📊 INTENT ANALYSIS:');
  console.log(`Primary Intent: ${intentData.primary_intent}`);
  console.log(`Keywords: ${intentData.keywords.join(', ')}`);
  console.log(`Categories: ${intentData.relevant_categories.join(', ')}`);
  console.log(`Need Type: ${intentData.need_type}`);
  console.log(`Search Terms: ${intentData.search_terms.join(', ')}`);
  
  // Step 2: Search by keywords
  console.log('\n🔍 KEYWORD SEARCH:');
  const keywordResults = await searchByKeywords(intentData.keywords, 15);
  
  if (keywordResults.length > 0) {
    console.log(`Found ${keywordResults.length} apps by keyword search:`);
    keywordResults.slice(0, 5).forEach((app, i) => {
      console.log(`${i+1}. ${app.title} (${app.primary_category}) - Score: ${app.keyword_score}`);
      console.log(`   Matched: ${app.matched_keywords.join(', ')}`);
      console.log(`   Description: ${app.description?.substring(0, 100)}...`);
      console.log('');
    });
  } else {
    console.log('❌ No apps found by keyword search');
  }
  
  // Step 3: Search by embeddings/text search
  console.log('\n🧠 SEMANTIC SEARCH:');
  const embeddingResults = await searchByEmbeddings(intentData.search_terms, 15);
  
  if (embeddingResults.length > 0) {
    console.log(`Found ${embeddingResults.length} apps by semantic search:`);
    embeddingResults.slice(0, 5).forEach((app, i) => {
      console.log(`${i+1}. ${app.title} (${app.primary_category}) - Rating: ${app.rating}`);
      console.log(`   Description: ${app.description?.substring(0, 100)}...`);
      console.log('');
    });
  } else {
    console.log('❌ No apps found by semantic search');
  }
  
  // Step 4: Combine and analyze results
  console.log('\n📈 ANALYSIS:');
  const allApps = new Map();
  
  // Add keyword results
  keywordResults.forEach(app => {
    allApps.set(app.id, {
      ...app,
      source: 'keyword',
      combined_score: app.keyword_score
    });
  });
  
  // Add/merge embedding results
  embeddingResults.forEach(app => {
    if (allApps.has(app.id)) {
      // App found in both searches - boost score
      const existing = allApps.get(app.id);
      existing.combined_score += 1;
      existing.source = 'both';
    } else {
      allApps.set(app.id, {
        ...app,
        source: 'semantic',
        combined_score: 0.5
      });
    }
  });
  
  const finalResults = Array.from(allApps.values())
    .sort((a, b) => b.combined_score - a.combined_score);
  
  console.log(`Combined results: ${finalResults.length} unique apps`);
  console.log('\nTop 5 combined results:');
  finalResults.slice(0, 5).forEach((app, i) => {
    console.log(`${i+1}. ${app.title} (${app.primary_category})`);
    console.log(`   Score: ${app.combined_score} | Source: ${app.source} | Rating: ${app.rating}`);
    console.log(`   Description: ${app.description?.substring(0, 120)}...`);
    console.log('');
  });
  
  // Check if we found relevant plant care apps (more specific search)
  const plantRelevant = finalResults.filter(app => {
    const text = `${app.title} ${app.description}`.toLowerCase();
    
    // Must contain plant-specific terms, not just generic "care"
    const hasPlantTerms = text.includes('plant') || text.includes('garden') || 
                         text.includes('botanical') || text.includes('flora') ||
                         text.includes('greenhouse') || text.includes('succulent');
    
    const hasCareTerms = text.includes('care') || text.includes('watering') || 
                        text.includes('growing') || text.includes('maintenance') ||
                        text.includes('nurture') || text.includes('cultivation');
    
    // Must have both plant terms AND care terms, or very specific plant words
    return (hasPlantTerms && hasCareTerms) || 
           text.includes('plant care') || 
           text.includes('gardening') ||
           text.includes('horticulture') ||
           text.includes('landscaping');
  });
  
  console.log(`\n🌱 PLANT RELEVANCE CHECK:`);
  console.log(`Found ${plantRelevant.length} plant-relevant apps out of ${finalResults.length} total`);
  
  if (plantRelevant.length > 0) {
    console.log('✅ SUCCESS: Found plant-relevant apps!');
    plantRelevant.slice(0, 3).forEach((app, i) => {
      console.log(`${i+1}. ${app.title} - "${app.description?.substring(0, 80)}..."`);
    });
  } else {
    console.log('❌ PROBLEM: No plant-relevant apps found');
    console.log('This explains why the recommendation system is returning irrelevant results');
    
    // Let's manually search for ANY plant-related apps in the database
    console.log('\n🔍 MANUAL PLANT SEARCH:');
    try {
      const { data: manualPlantApps, error } = await supabase
        .from('apps_unified')
        .select('id, title, primary_category, rating, description')
        .or('title.ilike.%plant%,title.ilike.%garden%,description.ilike.%plant%,description.ilike.%garden%,description.ilike.%botanical%')
        .limit(10);
        
      if (!error && manualPlantApps && manualPlantApps.length > 0) {
        console.log(`Found ${manualPlantApps.length} apps with plant-related content:`);
        manualPlantApps.forEach((app, i) => {
          const text = `${app.title} ${app.description}`.toLowerCase();
          const plantScore = (text.match(/plant|garden|botanical|flora/g) || []).length;
          console.log(`${i+1}. ${app.title} (${app.primary_category}) - Plant Score: ${plantScore}`);
          console.log(`   Description: ${app.description?.substring(0, 120)}...`);
          console.log('');
        });
      } else {
        console.log('❌ No plant-related apps found in manual search either');
        console.log('The database may not contain sufficient plant care apps');
      }
    } catch (manualError) {
      console.error('❌ Manual search error:', manualError.message);
    }
  }
}

testQueryDissection().catch(console.error);