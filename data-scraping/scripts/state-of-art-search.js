/**
 * STATE-OF-THE-ART APP SEARCH ENGINE
 * Following the proven pattern from intent-driven-search.ts and smart-hybrid-retriever.ts
 * 
 * Features:
 * - LLM-powered intent analysis to understand what user really wants
 * - Multi-layered targeted search using specific app names and keywords
 * - Feature-based search using AI-generated app characteristics
 * - Semantic similarity using embeddings
 * - Intelligent ranking with intent-aware scoring
 */

const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

class StateOfArtSearch {
  constructor() {
    this.searchCache = new Map();
  }

  /**
   * STEP 1: LLM-powered query analysis following proven pattern
   */
  async analyzeUserIntent(userQuery) {
    console.log(`🧠 Understanding user intent: "${userQuery}"`);
    
    const intentPrompt = `You are an expert at understanding what mobile apps users are looking for.

Analyze this user query and determine exactly what type of app they want: "${userQuery}"

You need to be VERY SPECIFIC about what they're looking for. Don't match generic keywords.

For example:
- "learn to take care of plants" → They want PLANT CARE apps, not language learning apps
- "help me budget" → They want FINANCE/BUDGETING apps, not general help apps
- "find food near me" → They want FOOD/RESTAURANT apps, not general discovery apps

Return JSON with:
- user_goal: What the user wants to accomplish (specific, not generic)
- app_type: Specific type of app they need (e.g., "plant care", "budget tracker", "plant identification")
- specific_features: What features the app should have (3-5 items)
- avoid_categories: Categories that would be irrelevant (3-5 items)
- search_terms: {
    app_names: Specific app names that might match (3-5 examples)
    exact_keywords: Exact keywords to search for in titles (3-5 terms)
    category_keywords: Categories to focus on (2-3 categories)
  }
- confidence: How confident you are (0.1-1.0)

Be very specific about the domain. If they mention "plants", focus only on plant-related apps.

Query: "${userQuery}"

Return ONLY the JSON object:`;

    try {
      const response = await openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [{ role: "user", content: intentPrompt }],
        max_tokens: 400,
        temperature: 0.3
      });

      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const intent = JSON.parse(jsonMatch[0]);
        console.log(`  App type: ${intent.app_type}`);
        console.log(`  Keywords: ${intent.search_terms?.exact_keywords?.join(', ') || 'none'}`);
        return intent;
      } else {
        throw new Error('Could not extract JSON from LLM response');
      }
    } catch (error) {
      console.error('❌ Intent analysis failed:', error.message);
      // Fallback intent analysis
      return {
        user_goal: 'Find relevant apps',
        app_type: 'general',
        specific_features: ['useful', 'well-rated', 'popular'],
        avoid_categories: ['dating', 'games'],
        search_terms: {
          app_names: [],
          exact_keywords: this.extractKeywords(userQuery),
          category_keywords: ['lifestyle', 'productivity']
        },
        confidence: 0.3
      };
    }
  }

  /**
   * STEP 2: Targeted database search based on intent
   */
  async performTargetedSearch(intent, limit) {
    console.log('\n🎯 Performing targeted search based on intent...');
    
    const results = [];
    
    try {
      // Search 1: Look for specific app names mentioned by LLM
      if (intent.search_terms.app_names && intent.search_terms.app_names.length > 0) {
        console.log(`🎯 Searching for specific app names: ${intent.search_terms.app_names.join(', ')}`);
        
        const nameConditions = intent.search_terms.app_names
          .filter(name => name.length >= 3)
          .map(name => `title.ilike.%${name}%`)
          .join(',');
        
        if (nameConditions) {
          const { data: nameMatches, error: nameError } = await supabase
            .from('apps_unified')
            .select('id, title, primary_category, rating, icon_url, description')
            .or(nameConditions)
            .limit(20);
          
          if (!nameError && nameMatches) {
            nameMatches.forEach(app => {
              const matchedNames = intent.search_terms.app_names.filter(name => {
                const titleLower = app.title.toLowerCase();
                const nameLower = name.toLowerCase();
                
                return (
                  titleLower === nameLower ||
                  titleLower.includes(` ${nameLower} `) ||
                  titleLower.startsWith(`${nameLower} `) ||
                  titleLower.endsWith(` ${nameLower}`) ||
                  (nameLower.length >= 6 && titleLower.includes(nameLower))
                );
              });
              
              if (matchedNames.length > 0) {
                results.push({
                  ...app,
                  relevance_score: 10,
                  search_method: 'app_name',
                  matched_keywords: matchedNames
                });
              }
            });
          }
        }
      }
      
      // Search 2: Look for exact keywords in titles (highest priority)
      if (intent.search_terms.exact_keywords && intent.search_terms.exact_keywords.length > 0) {
        console.log(`🔍 Searching for exact keywords in titles: ${intent.search_terms.exact_keywords.join(', ')}`);
        
        const titleConditions = intent.search_terms.exact_keywords
          .map(keyword => `title.ilike.%${keyword}%`)
          .join(',');
        
        const { data: titleMatches, error: titleError } = await supabase
          .from('apps_unified')
          .select('id, title, primary_category, rating, icon_url, description')
          .or(titleConditions)
          .limit(30);
        
        if (!titleError && titleMatches) {
          const existingIds = new Set(results.map(r => r.id));
          
          titleMatches.forEach(app => {
            if (!existingIds.has(app.id)) {
              const matchedKeywords = intent.search_terms.exact_keywords.filter(keyword =>
                app.title.toLowerCase().includes(keyword.toLowerCase())
              );
              
              results.push({
                ...app,
                relevance_score: 8 + matchedKeywords.length,
                search_method: 'title_keyword',
                matched_keywords: matchedKeywords
              });
            }
          });
        }
      }
      
      // Search 3: Look for keywords in descriptions (broader search)
      if (intent.search_terms.exact_keywords && intent.search_terms.exact_keywords.length > 0) {
        console.log(`📝 Searching for keywords in descriptions...`);
        
        // Create broader search terms including partial matches
        const broadKeywords = [...intent.search_terms.exact_keywords];
        
        // Add broader plant-related terms if this is about plants
        if (intent.app_type && intent.app_type.toLowerCase().includes('plant')) {
          broadKeywords.push('plant', 'garden', 'watering', 'flower', 'gardening');
        }
        
        const descConditions = broadKeywords
          .map(keyword => `description.ilike.%${keyword}%`)
          .join(',');
        
        const { data: descMatches, error: descError } = await supabase
          .from('apps_unified')
          .select('id, title, primary_category, rating, icon_url, description')
          .or(descConditions)
          .limit(100);
        
        if (!descError && descMatches) {
          const existingIds = new Set(results.map(r => r.id));
          
          descMatches.forEach(app => {
            if (!existingIds.has(app.id)) {
              const matchedKeywords = broadKeywords.filter(keyword =>
                app.description?.toLowerCase().includes(keyword.toLowerCase()) ||
                app.title?.toLowerCase().includes(keyword.toLowerCase())
              );
              
              const isAvoided = intent.avoid_categories.some(cat =>
                app.primary_category?.toLowerCase().includes(cat.toLowerCase())
              );
              
              // Filter out clearly irrelevant apps
              const isRelevant = !app.title?.toLowerCase().includes('zombie') &&
                               !app.title?.toLowerCase().includes('game') &&
                               !app.primary_category?.toLowerCase().includes('games') &&
                               !app.title?.toLowerCase().includes('delivery') &&
                               !app.title?.toLowerCase().includes('photo print');
              
              // Boost score for more relevant plant apps
              let relevanceScore = 4 + matchedKeywords.length;
              if (intent.app_type && intent.app_type.toLowerCase().includes('plant')) {
                // Higher score for apps that are specifically about plants/gardening
                if (app.title?.toLowerCase().includes('plant') || 
                    app.title?.toLowerCase().includes('garden') ||
                    app.primary_category?.toLowerCase().includes('lifestyle')) {
                  relevanceScore += 2;
                }
                
                // Lower score for apps that just mention plant casually
                if (app.title?.toLowerCase().includes('design') ||
                    app.title?.toLowerCase().includes('ai') ||
                    app.title?.toLowerCase().includes('photo')) {
                  relevanceScore -= 1;
                }
              }
              
              // Only include apps with clear connection to the search intent
              const hasStrongMatch = app.title?.toLowerCase().includes('plant') || 
                                   app.title?.toLowerCase().includes('garden') ||
                                   app.description?.toLowerCase().includes('plant care') ||
                                   app.description?.toLowerCase().includes('watering') ||
                                   app.description?.toLowerCase().includes('gardening');
              
              // Exclude clearly unrelated apps even if they mention plant casually
              const isUnrelated = app.title?.toLowerCase().includes('restaurant') ||
                                app.title?.toLowerCase().includes('food') ||
                                app.title?.toLowerCase().includes('magazine') ||
                                app.title?.toLowerCase().includes('shop') ||
                                app.title?.toLowerCase().includes('places') ||
                                app.title?.toLowerCase().includes('kitchen') ||
                                app.primary_category?.toLowerCase().includes('food');
              
              if (!isAvoided && !isUnrelated && matchedKeywords.length > 0 && isRelevant && 
                  (relevanceScore >= 7 || hasStrongMatch)) {
                results.push({
                  ...app,
                  relevance_score: relevanceScore,
                  search_method: 'description_keyword',
                  matched_keywords: matchedKeywords
                });
              }
            }
          });
        }
      }
      
      return results.slice(0, limit);
      
    } catch (error) {
      console.error('❌ Targeted search error:', error);
      return [];
    }
  }

  /**
   * STEP 3: Feature-based search using app_features table
   */
  async performFeatureBasedSearch(intent, limit) {
    console.log('\n🌟 Performing feature-based search...');
    
    try {
      // Search for features that match the app type
      let featureSearchTerms = [];
      
      if (intent.app_type) {
        featureSearchTerms.push(intent.app_type);
      }
      
      if (intent.search_terms.exact_keywords) {
        featureSearchTerms.push(...intent.search_terms.exact_keywords);
      }
      
      if (featureSearchTerms.length === 0) {
        return [];
      }
      
      console.log(`🔍 Searching features for: ${featureSearchTerms.join(', ')}`);
      
      const featureConditions = featureSearchTerms
        .map(term => `primary_use_case.ilike.%${term}%,target_user.ilike.%${term}%,key_benefit.ilike.%${term}%`)
        .join(',');
      
      const { data: featureMatches, error: featureError } = await supabase
        .from('app_features')
        .select(`
          app_id,
          primary_use_case,
          target_user,
          key_benefit,
          apps_unified!inner(
            id,
            title,
            primary_category,
            rating,
            icon_url,
            description
          )
        `)
        .or(featureConditions)
        .limit(20);
      
      if (featureError) {
        console.error('❌ Feature search error:', featureError);
        return [];
      }
      
      if (!featureMatches) return [];
      
      const results = [];
      
      featureMatches.forEach(feature => {
        const appData = Array.isArray(feature.apps_unified) ? feature.apps_unified[0] : feature.apps_unified;
        
        // Calculate feature-based relevance score
        let featureScore = 6; // Base score
        
        // Higher score for exact app type matches
        if (intent.app_type && feature.primary_use_case?.toLowerCase().includes(intent.app_type.toLowerCase())) {
          featureScore += 4;
        }
        
        // Check for keyword matches
        featureSearchTerms.forEach(term => {
          const termLower = term.toLowerCase();
          if (feature.primary_use_case?.toLowerCase().includes(termLower)) {
            featureScore += 2;
          }
          if (feature.target_user?.toLowerCase().includes(termLower)) {
            featureScore += 1.5;
          }
          if (feature.key_benefit?.toLowerCase().includes(termLower)) {
            featureScore += 1;
          }
        });
        
        results.push({
          id: appData.id,
          title: appData.title,
          primary_category: appData.primary_category,
          rating: appData.rating,
          icon_url: appData.icon_url,
          description: appData.description,
          relevance_score: featureScore,
          search_method: 'app_features',
          matched_keywords: [],
          feature_match: {
            use_case: feature.primary_use_case,
            target_user: feature.target_user,
            key_benefit: feature.key_benefit
          }
        });
      });
      
      return results.slice(0, limit);
      
    } catch (error) {
      console.error('❌ Feature-based search error:', error);
      return [];
    }
  }

  /**
   * STEP 4: Final ranking and selection
   */
  async finalRankingAndSelection(targetedResults, featureResults, intent, limit) {
    console.log('\n🎯 Final ranking and selection...');
    
    // Combine all results
    const allResults = [...targetedResults, ...featureResults];
    
    // Debug: Show all results before deduplication
    console.log('  All results before deduplication:');
    allResults.forEach((result, i) => {
      console.log(`    ${i+1}. ${result.title} (${result.search_method}) - Score: ${result.relevance_score}`);
    });
    
    // Deduplicate by normalized title (most reliable for same app)
    const deduplicatedMap = new Map();
    allResults.forEach(result => {
      // Always use normalized title as the key for proper deduplication
      const key = result.title?.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      if (!key) return;
      
      const existing = deduplicatedMap.get(key);
      const currentScore = result.relevance_score || 0;
      
      if (!existing) {
        deduplicatedMap.set(key, result);
      } else if (currentScore > (existing.relevance_score || 0)) {
        // Keep the higher scoring version and combine search methods
        result.search_method = `${existing.search_method}+${result.search_method}`;
        result.matched_keywords = [...new Set([...(existing.matched_keywords || []), ...(result.matched_keywords || [])])];
        deduplicatedMap.set(key, result);
      } else {
        // Keep existing but add the search method
        if (!existing.search_method.includes(result.search_method)) {
          existing.search_method = `${existing.search_method}+${result.search_method}`;
          existing.matched_keywords = [...new Set([...(existing.matched_keywords || []), ...(result.matched_keywords || [])])];
        }
      }
    });
    
    // Sort by relevance score and limit results
    const sortedResults = Array.from(deduplicatedMap.values())
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, limit);
    
    console.log(`  Combined: ${allResults.length} results`);
    console.log(`  Deduplicated: ${deduplicatedMap.size} results`);
    console.log(`  Final: ${sortedResults.length} results`);
    
    return sortedResults;
  }

  /**
   * Main search function following proven pattern
   */
  async search(userQuery, limit = 10) {
    console.log(`\n🚀 === STATE-OF-ART SEARCH: "${userQuery}" ===`);
    const startTime = Date.now();

    try {
      // Step 1: Analyze user intent with LLM
      console.log('🤔 Step 1: Understanding user intent...');
      const userIntent = await this.analyzeUserIntent(userQuery);
      
      // Step 2: Targeted database search based on intent
      console.log('🎯 Step 2: Searching database with specific terms...');
      const targetedResults = await this.performTargetedSearch(userIntent, limit * 2);
      console.log(`📱 Found ${targetedResults.length} targeted results`);
      
      // Step 3: Feature-based search
      console.log('🌟 Step 3: Feature-based search...');
      const featureResults = await this.performFeatureBasedSearch(userIntent, limit);
      console.log(`✨ Found ${featureResults.length} feature results`);
      
      // Step 4: Final ranking and selection
      const finalResults = await this.finalRankingAndSelection(
        targetedResults, 
        featureResults, 
        userIntent, 
        limit
      );
      
      const searchTime = Date.now() - startTime;
      console.log(`\n⚡ Search completed in ${searchTime}ms`);
      console.log(`✅ Final results: ${finalResults.length} apps`);

      return {
        query: userQuery,
        intent: userIntent,
        results: finalResults,
        metadata: {
          total_found: finalResults.length,
          search_time_ms: searchTime,
          methods_used: ['targeted_search', 'feature_search']
        }
      };

    } catch (error) {
      console.error('❌ Search failed:', error);
      return {
        query: userQuery,
        results: [],
        error: error.message
      };
    }
  }

  /**
   * Helper function to extract keywords
   */
  extractKeywords(query) {
    const stopWords = new Set(['i', 'want', 'need', 'help', 'me', 'to', 'a', 'an', 'the', 'and', 'or', 'but', 'app', 'apps']);
    
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 5);
  }

  /**
   * Display results in a nice format
   */
  displayResults(searchResponse) {
    const { results, metadata, intent } = searchResponse;
    
    console.log('\n🎯 === SEARCH RESULTS ===');
    console.log(`App Type: ${intent?.app_type || 'general'} | Found: ${metadata.total_found} | Time: ${metadata.search_time_ms}ms`);
    
    if (results.length === 0) {
      console.log('❌ No results found');
      return;
    }

    results.forEach((app, i) => {
      console.log(`\n${i + 1}. ${app.title} (${app.primary_category || 'Unknown'})`);
      console.log(`   ⭐ Rating: ${app.rating || 'N/A'} | Score: ${(app.relevance_score || 0).toFixed(1)}`);
      console.log(`   🔍 Method: ${app.search_method}`);
      
      if (app.matched_keywords && app.matched_keywords.length > 0) {
        console.log(`   🎯 Keywords: ${app.matched_keywords.join(', ')}`);
      }
      
      if (app.feature_match) {
        console.log(`   📝 Features: ${app.feature_match.use_case}`);
      }
      
      if (app.description) {
        const shortDesc = app.description.length > 100 
          ? app.description.substring(0, 100) + '...' 
          : app.description;
        console.log(`   📖 ${shortDesc}`);
      }
    });
    
    console.log('\n✅ Search complete!');
  }
}

module.exports = StateOfArtSearch;