/**
 * Contextual Problem-Solving Query System
 * Acts as an app guidance counselor - detects problems and provides step-by-step solutions
 */

const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
require('dotenv').config({ path: '.env.local' });

class ContextualProblemSolver {
  constructor() {
    // Initialize clients in constructor to avoid blocking module loading
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Use DeepSeek for quick classification
    this.openai = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY,
    });

    // Use Gemini Flash for detailed analysis (faster)
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.geminiModel = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // Use Gemini for embeddings
    this.embeddingModel = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
  }

  /**
   * STEP 1: Analyze query to detect if it's a problem that needs guidance
   */
  async analyzeQueryContext(userQuery) {
    console.log('🧠 DEBUG: Starting analyzeQueryContext...');
    console.log('🧠 Analyzing query for guidance counseling...\n');
    
    // Quick check for problem vs general query
    const quickPrompt = `Is this query a PROBLEM (personal issue) or GENERAL (app category)?
Query: "${userQuery}"

PROBLEM = "can't sleep", "stressed", "budget mess"  
GENERAL = "fitness apps", "photo apps"

Return: {"query_type": "problem"} or {"query_type": "general"}`;

    try {
      console.log('🧠 DEBUG: About to make DeepSeek API call...');
      const startTime = Date.now();
      
      const response = await Promise.race([
        this.openai.chat.completions.create({
          model: "deepseek-chat",
          messages: [{ role: "user", content: quickPrompt }],
          max_tokens: 50,
          temperature: 0.3
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Context analysis timeout')), 5000)
        )
      ]);

      const apiTime = Date.now() - startTime;
      console.log(`🧠 DEBUG: DeepSeek API call completed in ${apiTime}ms`);
      
      const content = response.choices[0].message.content;
      console.log(`🧠 DEBUG: Response received: ${content.substring(0, 100)}...`);
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        console.log('🧠 DEBUG: Parsing JSON response...');
        const quickAnalysis = JSON.parse(jsonMatch[0]);
        
        console.log('📋 Query Analysis:');
        console.log(`Query Type: ${quickAnalysis.query_type}`);
        
        // If it's a problem query, get detailed analysis
        if (quickAnalysis.query_type === 'problem') {
          console.log('🧠 DEBUG: Getting detailed problem analysis...');
          const detailedAnalysis = await this.getDetailedProblemAnalysis(userQuery);
          console.log('🧠 DEBUG: Detailed analysis completed successfully');
          return detailedAnalysis;
        } else {
          // For general queries, return simple analysis
          const analysis = {
            query_type: 'general',
            analysis: {
              user_situation: `Looking for ${userQuery} apps`,
              root_cause: null,
              urgency: null
            }
          };
          console.log('🧠 DEBUG: General query analysis completed');
          return analysis;
        }
      } else {
        throw new Error('Could not extract JSON from response');
      }
    } catch (error) {
      console.error('❌ Context analysis failed:', error.message);
      return null;
    }
  }

  /**
   * Get detailed problem analysis for any type of problem
   */
  async getDetailedProblemAnalysis(userQuery) {
    console.log('🧠 DEBUG: Starting detailed problem analysis...');
    
    const detailedPrompt = `You are an expert app guidance counselor. Analyze this user's problem: "${userQuery}"

Create a personalized 4-step solution plan with relevant app search terms for each step.

Step 1: UNDERSTAND - Help user track/understand the root cause
Step 2: IMMEDIATE - Provide immediate relief or symptom management  
Step 3: BUILD - Develop long-term habits and lifestyle changes
Step 4: MAINTAIN - Monitor progress and prevent relapse

For each step, provide 2-3 specific search terms that would find the most helpful apps.
Be creative and specific - think about what apps would actually help at each stage.

Return JSON:
{
  "query_type": "problem",
  "analysis": {
    "user_situation": "detailed description of what user is experiencing",
    "root_cause": "intelligent analysis of likely underlying causes",
    "urgency": "immediate|short-term|long-term"
  },
  "solution_steps": [
    {"step": 1, "step_name": "Understand", "focus": "specific focus for this problem", "search_terms": ["specific_term1", "specific_term2"]},
    {"step": 2, "step_name": "Relief", "focus": "immediate help strategy", "search_terms": ["relief_term1", "relief_term2"]},
    {"step": 3, "step_name": "Build", "focus": "habit building approach", "search_terms": ["habit_term1", "habit_term2"]},
    {"step": 4, "step_name": "Maintain", "focus": "progress monitoring strategy", "search_terms": ["tracking_term1", "tracking_term2"]}
  ]
}

Provide intelligent, specific search terms that would actually find helpful apps for this exact problem.`;

    try {
      console.log('🧠 DEBUG: Making detailed analysis API call with Gemini...');
      const startTime = Date.now();
      
      const result = await Promise.race([
        this.geminiModel.generateContent({
          contents: [{ role: "user", parts: [{ text: detailedPrompt }] }],
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.3
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Detailed analysis timeout')), 8000)
        )
      ]);

      const apiTime = Date.now() - startTime;
      console.log(`🧠 DEBUG: Gemini detailed analysis API call completed in ${apiTime}ms`);
      
      const content = result.response.text();
      console.log(`🧠 DEBUG: Detailed response received: ${content.substring(0, 100)}...`);
      
      // Handle both plain JSON and JSON in code blocks
      let jsonMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      let jsonText;
      
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      } else {
        const plainMatch = content.match(/\{[\s\S]*\}/);
        jsonText = plainMatch ? plainMatch[0] : null;
      }
      
      if (jsonText) {
        console.log('🧠 DEBUG: Parsing detailed JSON response...');
        console.log('🧠 DEBUG: JSON text to parse:', jsonText.substring(0, 200) + '...');
        
        try {
          const analysis = JSON.parse(jsonText);
          
          console.log('📋 Detailed Analysis:');
          console.log(`User Situation: ${analysis.analysis.user_situation}`);
          console.log(`Root Cause: ${analysis.analysis.root_cause}`);
          console.log(`Solution Steps: ${analysis.solution_steps.length}`);
          
          return analysis;
        } catch (parseError) {
          console.error('🧠 DEBUG: JSON parse error:', parseError.message);
          console.log('🧠 DEBUG: Full JSON text:', jsonText);
          throw new Error('Failed to parse Gemini response JSON');
        }
      } else {
        throw new Error('Could not extract JSON from detailed response');
      }
    } catch (error) {
      console.error('❌ Detailed analysis failed:', error.message);
      
      // Fallback: create simple problem analysis using keywords
      const keywords = this.extractKeywords(userQuery);
      return {
        query_type: 'problem',
        analysis: {
          user_situation: `Experiencing issues with ${keywords.join(', ')}`,
          root_cause: 'Various lifestyle or behavioral factors',
          urgency: 'short-term'
        },
        solution_steps: [
          { step: 1, step_name: 'Track', focus: 'Track and understand the issue', search_terms: keywords.slice(0, 2).concat(['tracker']) },
          { step: 2, step_name: 'Relief', focus: 'Get immediate help', search_terms: keywords.slice(0, 2).concat(['help']) },
          { step: 3, step_name: 'Habits', focus: 'Build better habits', search_terms: ['habit', 'routine'].concat(keywords.slice(0, 1)) },
          { step: 4, step_name: 'Progress', focus: 'Monitor your progress', search_terms: ['progress', 'tracker'].concat(keywords.slice(0, 1)) }
        ]
      };
    }
  }

  /**
   * STEP 2: Search for apps based on solution steps
   */
  async searchForApps(analysis, userQuery) {
    console.log('🔍 DEBUG: Starting searchForApps...');
    console.log('🔍 Searching for guidance apps...\n');
    
    if (analysis.query_type === 'general') {
      console.log('🔍 DEBUG: Handling as general query...');
      return await this.handleGeneralQuery(userQuery);
    } else {
      console.log('🔍 DEBUG: Handling as problem query...');
      return await this.handleProblemQuery(analysis, userQuery);
    }
  }

  /**
   * Handle general app search requests
   */
  async handleGeneralQuery(userQuery) {
    console.log('ℹ️ GENERAL SEARCH MODE\n');
    
    // Try semantic search first for better relevance
    let results = [];
    
    try {
      console.log(`🔍 Searching semantically for: "${userQuery}"`);
      results = await this.searchBySemanticSimilarity(userQuery, 12);
      
      if (results.length > 0) {
        console.log(`✅ Found ${results.length} semantic matches`);
        return {
          query_type: 'general',
          results: results.map(app => ({
            ...app,
            source: 'semantic_match',
            relevance_score: app.similarity_score * 10,
            search_term: userQuery
          })),
          total_apps: results.length
        };
      } else {
        console.log('⚠️ No semantic results found, trying keyword fallback...');
      }
    } catch (error) {
      console.log(`❌ Semantic search failed: ${error.message}`);
      console.log('🔄 Falling back to keyword search...');
    }
    
    // Fallback to keyword search if semantic fails or returns no results
    console.log('🔤 Using keyword search as fallback');
    const keywords = this.extractKeywords(userQuery);
    results = await this.searchByKeywords(keywords, 15);
    
    return {
      query_type: 'general',
      results: results.map(app => ({
        ...app,
        source: 'keyword_match',
        relevance_score: app.relevance * 10,
        search_term: userQuery
      })),
      total_apps: results.length
    };
  }

  /**
   * Handle problem queries with step-by-step app recommendations
   */
  async handleProblemQuery(analysis, userQuery) {
    console.log('🚨 GUIDANCE COUNSELOR MODE\n');
    
    const allResults = [];
    
    for (const step of analysis.solution_steps) {
      console.log(`STEP ${step.step}: ${step.step_name.toUpperCase()} - ${step.focus}`);
      console.log('=' .repeat(60));
      
      // Search for apps for this specific step
      const stepResults = await this.searchForStep(step);
      
      if (stepResults.length > 0) {
        console.log(`✅ Found ${stepResults.length} apps for ${step.step_name}`);
        allResults.push({
          step: step.step,
          step_name: step.step_name,
          focus: step.focus,
          apps: stepResults
        });
      } else {
        console.log(`⚠️ No apps found for ${step.step_name}`);
      }
      console.log('');
    }
    
    return {
      query_type: 'problem',
      analysis: analysis.analysis,
      solution_steps: allResults,
      total_apps: allResults.reduce((sum, step) => sum + step.apps.length, 0)
    };
  }

  /**
   * Search for apps for a specific solution step using semantic search
   */
  async searchForStep(step) {
    console.log(`  🔍 Searching semantically for: "${step.focus}"`);
    try {
      const results = await this.searchBySemanticSimilarity(step.focus, 3);
      if (results.length > 0) {
        console.log(`    ✅ Found ${results.length} matches`);
        return results.map(app => ({
          ...app,
          source: 'semantic_match',
          relevance_score: app.similarity_score * 10, // Scale to 0-10
          search_term: step.focus
        }));
      }
      return [];
    } catch (error) {
      console.log(`    ❌ Error searching semantically: ${error.message}`);
      // Fallback to keyword search if semantic fails
      console.log('    🔄 Falling back to keyword search...');
      const coreKeywords = this.extractCoreKeywords(step.search_terms);
      const searchTerms = coreKeywords.slice(0, 2);
      const results = [];
      for (const term of searchTerms) {
        const matches = await this.searchByKeywords([term], 3);
        if (matches.length > 0) {
          results.push(...matches.map(app => ({
            ...app,
            source: 'keyword_match',
            relevance_score: 8,
            search_term: term
          })));
        }
      }
      const uniqueResults = this.removeDuplicates(results);
      return uniqueResults.slice(0, 3);
    }
  }

  /**
   * Search apps by hybrid approach: keyword filter first, then semantic similarity
   */
  async searchBySemanticSimilarity(queryText, limit) {
    console.log(`🔍 DEBUG: Starting hybrid search with query: ${queryText}`);
    try {
      // 1. First, get keyword-relevant apps as candidates
      const keywords = this.extractKeywords(queryText);
      console.log(`🔍 DEBUG: Extracted keywords: ${keywords.join(', ')}`);
      
      const candidateApps = await this.getKeywordCandidates(keywords, limit * 3); // Get more candidates than needed
      console.log(`🔍 DEBUG: Found ${candidateApps.length} keyword-relevant candidates`);
      
      if (candidateApps.length === 0) {
        console.log(`🔍 DEBUG: No keyword candidates found, falling back to full search`);
        return await this.searchBySemanticSimilarityFull(queryText, limit);
      }

      // 2. Generate embedding for the query text
      const embeddingResponse = await this.embeddingModel.embedContent(queryText);
      const queryEmbedding = embeddingResponse.embedding.values;
      console.log(`🔍 DEBUG: Generated embedding with ${queryEmbedding.length} dimensions`);

      // 2.5. Apply feature-based filtering
      const featureFilteredApps = await this.applyFeatureFiltering(candidateApps, queryText);
      console.log(`🔍 DEBUG: After feature filtering: ${featureFilteredApps.length} apps`);

      // 3. Get embeddings only for feature-filtered apps
      const finalCandidateIds = featureFilteredApps.map(app => app.app_id);
      const { data: candidateEmbeddings, error: fetchError } = await this.supabase
        .from('new_embeddings')
        .select('app_id, embedding')
        .in('app_id', finalCandidateIds);

      if (fetchError) {
        throw new Error(`Error fetching embeddings: ${fetchError.message}`);
      }

      console.log(`🔍 DEBUG: Fetched ${candidateEmbeddings.length} embeddings for feature-filtered candidates`);

      // 4. Calculate similarities only for candidates
      const similarities = [];
      for (const row of candidateEmbeddings) {
        try {
          let appEmbedding = row.embedding;
          if (typeof appEmbedding === 'string' && appEmbedding.startsWith('[')) {
            appEmbedding = JSON.parse(appEmbedding);
          }
          
          const similarity = this.cosineSimilarity(queryEmbedding, appEmbedding);
          // Lower threshold since these are pre-filtered candidates
          if (!isNaN(similarity) && similarity > 0.1) {
            similarities.push({ app_id: row.app_id, similarity });
          }
        } catch (err) {
          // Skip problematic embeddings
        }
      }

      // 5. Sort by similarity and get top results
      similarities.sort((a, b) => b.similarity - a.similarity);
      const topSimilarities = similarities.slice(0, limit);

      if (topSimilarities.length === 0) {
        console.log(`🔍 DEBUG: No embeddings found for candidates, returning keyword results`);
        return candidateApps.slice(0, limit).map(app => ({
          ...app,
          similarity_score: 0.5,
          relevance: 0.5
        }));
      }

      // 6. Combine with app details and apply feature-aware ranking boosts
      const detectedIntents = await this.detectQueryIntent(queryText);
      const combinedResults = topSimilarities.map(sim => {
        const candidateApp = featureFilteredApps.find(app => app.app_id === sim.app_id);
        if (!candidateApp) return null;
        
        let boostedSimilarity = sim.similarity;
        let boostReasons = [];
        
        // Apply feature-based boosts if we have intent detection
        if (detectedIntents.length > 0) {
          const boostInfo = this.calculateFeatureBoosts(candidateApp, detectedIntents, queryText);
          boostedSimilarity = sim.similarity * boostInfo.multiplier;
          boostReasons = boostInfo.reasons;
        }
        
        return {
          app_id: candidateApp.app_id,
          title: candidateApp.title,
          developer: candidateApp.developer,
          description: candidateApp.description,
          rating: candidateApp.rating,
          icon_url: candidateApp.icon_url,
          price: candidateApp.price,
          primary_category: candidateApp.primary_category,
          similarity_score: boostedSimilarity,
          relevance: boostedSimilarity,
          boost_applied: boostReasons.length > 0,
          boost_reasons: boostReasons
        };
      }).filter(Boolean);

      // Sort by boosted similarity scores
      combinedResults.sort((a, b) => b.similarity_score - a.similarity_score);

      return combinedResults;

    } catch (error) {
      console.error(`Semantic search failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get keyword-relevant apps as candidates for semantic search
   */
  async getKeywordCandidates(keywords, limit) {
    try {
      // Build search conditions
      const titleConditions = keywords.map(keyword => `title.ilike.%${keyword}%`).join(',');
      const descConditions = keywords.map(keyword => `description.ilike.%${keyword}%`).join(',');
      
      let candidates = [];
      
      // Get title matches (highest priority)
      const { data: titleMatches, error: titleError } = await this.supabase
        .from('apps_unified')
        .select('id, title, developer, primary_category, description, rating, icon_url, price')
        .or(titleConditions)
        .gte('rating', 2.0) // Basic quality filter
        .order('rating', { ascending: false })
        .limit(Math.ceil(limit * 0.7));
      
      if (!titleError && titleMatches) {
        candidates.push(...titleMatches.map(app => ({
          app_id: app.id,
          title: app.title,
          developer: app.developer,
          primary_category: app.primary_category,
          description: app.description,
          rating: app.rating,
          icon_url: app.icon_url,
          price: app.price,
          relevance: 0.9
        })));
      }
      
      // Get description matches if we need more
      if (candidates.length < limit) {
        const existingIds = candidates.map(app => app.app_id);
        const { data: descMatches, error: descError } = await this.supabase
          .from('apps_unified')
          .select('id, title, developer, primary_category, description, rating, icon_url, price')
          .or(descConditions)
          .not('id', 'in', existingIds.length > 0 ? `(${existingIds.map(id => `"${id}"`).join(',')})` : '()')
          .gte('rating', 1.5)
          .order('rating', { ascending: false })
          .limit(limit - candidates.length);
        
        if (!descError && descMatches) {
          candidates.push(...descMatches.map(app => ({
            app_id: app.id,
            title: app.title,
            developer: app.developer,
            primary_category: app.primary_category,
            description: app.description,
            rating: app.rating,
            icon_url: app.icon_url,
            price: app.price,
            relevance: 0.7
          })));
        }
      }
      
      return candidates.slice(0, limit);
      
    } catch (error) {
      console.error(`Keyword candidate search failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Fallback to full semantic search if no keyword candidates
   */
  async searchBySemanticSimilarityFull(queryText, limit) {
    // This is the old implementation for fallback
    try {
      const embeddingResponse = await this.embeddingModel.embedContent(queryText);
      const queryEmbedding = embeddingResponse.embedding.values;

      const { data: allEmbeddings, error: fetchError } = await this.supabase
        .from('new_embeddings')
        .select('app_id, embedding')
        .limit(500); // Limit for performance

      if (fetchError) {
        throw new Error(`Error fetching embeddings: ${fetchError.message}`);
      }

      const similarities = [];
      for (const row of allEmbeddings) {
        try {
          let appEmbedding = row.embedding;
          if (typeof appEmbedding === 'string' && appEmbedding.startsWith('[')) {
            appEmbedding = JSON.parse(appEmbedding);
          }
          
          const similarity = this.cosineSimilarity(queryEmbedding, appEmbedding);
          if (!isNaN(similarity) && similarity > 0.3) {
            similarities.push({ app_id: row.app_id, similarity });
          }
        } catch (err) {
          // Skip problematic embeddings
        }
      }

      similarities.sort((a, b) => b.similarity - a.similarity);
      const topSimilarities = similarities.slice(0, limit);

      if (topSimilarities.length === 0) {
        return [];
      }

      const appIds = topSimilarities.map(s => s.app_id);
      const { data: appDetails, error: detailsError } = await this.supabase
        .from('apps_unified')
        .select('id, title, developer, description, rating, icon_url, price, primary_category')
        .in('id', appIds);

      if (detailsError) {
        throw new Error(`Error fetching app details: ${detailsError.message}`);
      }

      const results = topSimilarities.map(sim => {
        const app = appDetails.find(a => a.id === sim.app_id);
        if (!app) return null;
        
        return {
          app_id: app.id,
          title: app.title,
          developer: app.developer,
          description: app.description,
          rating: app.rating,
          icon_url: app.icon_url,
          price: app.price,
          primary_category: app.primary_category,
          similarity_score: sim.similarity,
          relevance: sim.similarity
        };
      }).filter(Boolean);

      return results;

    } catch (error) {
      console.error(`Full semantic search failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Apply feature-based filtering to candidates based on query intent
   */
  async applyFeatureFiltering(candidates, queryText) {
    try {
      // Detect user intents from query
      const intents = await this.detectQueryIntent(queryText);
      console.log(`🔍 DEBUG: Detected intents: ${intents.join(', ')}`);
      
      if (intents.length === 0) {
        return candidates; // No specific intents detected, return all candidates
      }
      
      // Get candidate IDs for feature lookup
      const candidateIds = candidates.map(app => app.app_id);
      
      // Fetch features for candidates (using actual schema)
      const { data: features, error: featuresError } = await this.supabase
        .from('app_features')
        .select('app_id, primary_use_case, target_user, key_benefit, complexity, category_classification, quality_signals')
        .in('app_id', candidateIds);
      
      if (featuresError || !features) {
        console.log(`⚠️ Warning: Could not fetch features for filtering: ${featuresError?.message || 'No features found'}`);
        return candidates; // Fallback to all candidates
      }
      
      // Create feature lookup map
      const featureMap = new Map();
      features.forEach(feature => {
        featureMap.set(feature.app_id, feature);
      });
      
      // Filter candidates based on detected intents
      const filteredCandidates = candidates.filter(candidate => {
        const appFeatures = featureMap.get(candidate.app_id);
        if (!appFeatures) return true; // Keep if no features data
        
        return this.matchesIntents(appFeatures, intents, queryText);
      });
      
      console.log(`🔍 DEBUG: Feature filtering: ${candidates.length} → ${filteredCandidates.length} candidates`);
      
      // If filtering removes too many candidates, relax the filtering
      if (filteredCandidates.length < Math.max(3, candidates.length * 0.3)) {
        console.log(`🔍 DEBUG: Feature filtering too restrictive, using relaxed filtering`);
        return this.applyRelaxedFeatureFiltering(candidates, featureMap, intents, queryText);
      }
      
      return filteredCandidates;
      
    } catch (error) {
      console.error(`Feature filtering failed: ${error.message}`);
      return candidates; // Fallback to original candidates
    }
  }

  /**
   * Detect user intents from query text
   */
  async detectQueryIntent(queryText) {
    const query = queryText.toLowerCase();
    const intents = [];
    
    // Pricing intent
    if (query.match(/\b(free|no cost|without cost|gratis)\b/)) {
      intents.push('free');
    }
    if (query.match(/\b(paid|premium|pro|subscription|buy)\b/)) {
      intents.push('paid');
    }
    
    // Difficulty/Learning curve intent
    if (query.match(/\b(easy|simple|beginner|basic|straightforward|user-friendly)\b/)) {
      intents.push('easy');
    }
    if (query.match(/\b(advanced|complex|professional|expert|sophisticated)\b/)) {
      intents.push('advanced');
    }
    
    // Connectivity intent
    if (query.match(/\b(offline|without internet|no connection|no wifi|airplane mode)\b/)) {
      intents.push('offline');
    }
    
    // Social intent
    if (query.match(/\b(share|social|friends|community|collaborate|team|group)\b/)) {
      intents.push('social');
    }
    
    // Customization intent
    if (query.match(/\b(customize|personalize|configure|settings|options|flexible)\b/)) {
      intents.push('customizable');
    }
    
    // Privacy intent
    if (query.match(/\b(private|privacy|secure|confidential|anonymous)\b/)) {
      intents.push('privacy');
    }
    
    // Content type intents
    if (query.match(/\b(photo|image|picture|visual|camera)\b/)) {
      intents.push('visual');
    }
    if (query.match(/\b(text|writing|document|note|word)\b/)) {
      intents.push('text');
    }
    if (query.match(/\b(audio|music|sound|voice|podcast)\b/)) {
      intents.push('audio');
    }
    
    return intents;
  }

  /**
   * Check if app features match detected intents (updated for actual schema)
   */
  matchesIntents(features, intents, queryText) {
    for (const intent of intents) {
      switch (intent) {
        case 'free':
          // Check if primary_use_case or key_benefit mentions free
          const freeText = `${features.primary_use_case || ''} ${features.key_benefit || ''}`.toLowerCase();
          if (!freeText.includes('free') && !freeText.includes('no cost')) {
            // For now, don't filter based on free since we don't have pricing_model
            // This could be enhanced later with price data from apps_unified table
          }
          break;
          
        case 'easy':
          if (features.complexity && features.complexity.toLowerCase() !== 'simple') {
            return false;
          }
          break;
          
        case 'advanced':
          if (features.complexity && features.complexity.toLowerCase() === 'simple') {
            return false;
          }
          break;
          
        case 'social':
          // Check if primary_use_case or key_benefit mentions social features
          const socialText = `${features.primary_use_case || ''} ${features.key_benefit || ''}`.toLowerCase();
          if (!socialText.match(/\b(social|share|community|friend|collaborate|team)\b/)) {
            return false;
          }
          break;
          
        case 'visual':
          // Check if use case involves visual/photo/image content
          const visualText = `${features.primary_use_case || ''} ${features.key_benefit || ''}`.toLowerCase();
          if (!visualText.match(/\b(photo|image|picture|visual|camera|edit|filter)\b/)) {
            return false;
          }
          break;
          
        case 'audio':
          // Check if use case involves audio/music content
          const audioText = `${features.primary_use_case || ''} ${features.key_benefit || ''}`.toLowerCase();
          if (!audioText.match(/\b(music|audio|sound|voice|song|listen|play)\b/)) {
            return false;
          }
          break;
          
        case 'offline':
          // Check if key benefit mentions offline capability
          const offlineText = `${features.key_benefit || ''}`.toLowerCase();
          if (!offlineText.includes('offline') && !offlineText.includes('without internet')) {
            // For now, don't strictly filter since we don't have offline_capability field
          }
          break;
          
        // Skip filtering for other intents if we don't have the data
        default:
          break;
      }
    }
    
    return true; // Matches all intents (or no strict filtering applied)
  }

  /**
   * Apply relaxed feature filtering when strict filtering is too restrictive
   */
  applyRelaxedFeatureFiltering(candidates, featureMap, intents, queryText) {
    // Score candidates based on partial intent matching
    const scoredCandidates = candidates.map(candidate => {
      const appFeatures = featureMap.get(candidate.app_id);
      if (!appFeatures) {
        return { candidate, score: 0.5 }; // Neutral score for apps without features
      }
      
      let score = 0.5; // Base score
      let matches = 0;
      
      for (const intent of intents) {
        if (this.partiallyMatchesIntent(appFeatures, intent)) {
          matches++;
          score += 0.3; // Boost for each matching intent
        }
      }
      
      // Bonus for apps that match multiple intents
      if (matches > 1) {
        score += 0.2;
      }
      
      return { candidate, score };
    });
    
    // Sort by score and return top candidates
    scoredCandidates.sort((a, b) => b.score - a.score);
    
    // Return top 70% of candidates
    const keepCount = Math.max(5, Math.ceil(candidates.length * 0.7));
    return scoredCandidates.slice(0, keepCount).map(item => item.candidate);
  }

  /**
   * Check if features partially match intent (more lenient, updated for actual schema)
   */
  partiallyMatchesIntent(features, intent) {
    switch (intent) {
      case 'easy':
        return features.complexity && features.complexity.toLowerCase() === 'simple';
      case 'advanced':
        return features.complexity && features.complexity.toLowerCase() !== 'simple';
      case 'social':
        const socialText = `${features.primary_use_case || ''} ${features.key_benefit || ''}`.toLowerCase();
        return socialText.match(/\b(social|share|community|friend)\b/) !== null;
      case 'visual':
        const visualText = `${features.primary_use_case || ''} ${features.key_benefit || ''}`.toLowerCase();
        return visualText.match(/\b(photo|image|picture|visual|camera)\b/) !== null;
      case 'audio':
        const audioText = `${features.primary_use_case || ''} ${features.key_benefit || ''}`.toLowerCase();
        return audioText.match(/\b(music|audio|sound|voice|song)\b/) !== null;
      case 'free':
        const freeText = `${features.primary_use_case || ''} ${features.key_benefit || ''}`.toLowerCase();
        return freeText.match(/\b(free|no cost)\b/) !== null;
      default:
        return false;
    }
  }

  /**
   * Calculate feature-based ranking boosts for an app
   */
  calculateFeatureBoosts(app, intents, queryText) {
    let multiplier = 1.0;
    const reasons = [];
    
    // We need to get the app's features for boost calculation
    // Since we already fetched features in filtering, we should pass them through
    // For now, implement basic boosts based on app metadata
    
    // Quality boost based on rating
    if (app.rating && app.rating >= 4.5) {
      multiplier *= 1.1;
      reasons.push('High rating (4.5+)');
    } else if (app.rating && app.rating >= 4.0) {
      multiplier *= 1.05;
      reasons.push('Good rating (4.0+)');
    }
    
    // Category alignment boosts
    for (const intent of intents) {
      switch (intent) {
        case 'social':
          if (app.primary_category === 'Social Networking') {
            multiplier *= 1.15;
            reasons.push('Social networking app');
          }
          break;
          
        case 'visual':
          if (['Photography', 'Graphics & Design', 'Photo & Video'].includes(app.primary_category)) {
            multiplier *= 1.15;
            reasons.push('Visual/photo app category');
          }
          break;
          
        case 'audio':
          if (['Music', 'Entertainment'].includes(app.primary_category)) {
            multiplier *= 1.15;
            reasons.push('Music/audio app category');
          }
          break;
          
        case 'easy':
          // Boost apps with simpler titles (often indicates ease of use)
          if (app.title && app.title.split(' ').length <= 3) {
            multiplier *= 1.05;
            reasons.push('Simple app name');
          }
          break;
      }
    }
    
    // Title relevance boost
    const titleLower = (app.title || '').toLowerCase();
    const queryLower = queryText.toLowerCase();
    
    // Exact keyword matches in title get higher boost
    const queryWords = queryLower.split(/\s+/);
    const titleWords = titleLower.split(/\s+/);
    let exactMatches = 0;
    
    for (const queryWord of queryWords) {
      if (queryWord.length > 2 && titleWords.some(titleWord => titleWord.includes(queryWord))) {
        exactMatches++;
      }
    }
    
    if (exactMatches >= 2) {
      multiplier *= 1.1;
      reasons.push(`${exactMatches} keyword matches in title`);
    }
    
    // Cap the maximum boost to prevent over-boosting
    multiplier = Math.min(multiplier, 1.5);
    
    return {
      multiplier,
      reasons
    };
  }

  /**
   * Enhanced feature boost calculation with actual feature data
   */
  async calculateAdvancedFeatureBoosts(app, features, intents, queryText) {
    let multiplier = 1.0;
    const reasons = [];
    
    if (!features) {
      return this.calculateFeatureBoosts(app, intents, queryText);
    }
    
    // Intent-based feature boosts
    for (const intent of intents) {
      switch (intent) {
        case 'easy':
          if (features.complexity === 'simple') {
            multiplier *= 1.2;
            reasons.push('Simple complexity');
          }
          break;
          
        case 'social':
          const socialText = `${features.primary_use_case || ''} ${features.key_benefit || ''}`.toLowerCase();
          if (socialText.match(/\b(social|share|community|friend|collaborate)\b/)) {
            multiplier *= 1.2;
            reasons.push('Social features mentioned');
          }
          break;
          
        case 'visual':
          const visualText = `${features.primary_use_case || ''} ${features.key_benefit || ''}`.toLowerCase();
          if (visualText.match(/\b(photo|image|picture|visual|camera|edit)\b/)) {
            multiplier *= 1.2;
            reasons.push('Visual/photo features');
          }
          break;
          
        case 'audio':
          const audioText = `${features.primary_use_case || ''} ${features.key_benefit || ''}`.toLowerCase();
          if (audioText.match(/\b(music|audio|sound|voice|song|listen|play)\b/)) {
            multiplier *= 1.2;
            reasons.push('Audio/music features');
          }
          break;
      }
    }
    
    // Quality signals boost
    if (features.quality_signals && features.quality_signals >= 0.8) {
      multiplier *= 1.15;
      reasons.push('High quality signals');
    } else if (features.quality_signals && features.quality_signals >= 0.6) {
      multiplier *= 1.05;
      reasons.push('Good quality signals');
    }
    
    // Target user alignment
    if (features.target_user) {
      const targetLower = features.target_user.toLowerCase();
      const queryLower = queryText.toLowerCase();
      
      if (queryLower.includes('beginner') && targetLower.includes('beginner')) {
        multiplier *= 1.1;
        reasons.push('Beginner-friendly');
      }
    }
    
    // Apply base boosts from simpler method
    const baseBoost = this.calculateFeatureBoosts(app, intents, queryText);
    multiplier *= baseBoost.multiplier;
    reasons.push(...baseBoost.reasons);
    
    // Cap the maximum boost
    multiplier = Math.min(multiplier, 1.8);
    
    return {
      multiplier,
      reasons: [...new Set(reasons)] // Remove duplicates
    };
  }

  /**
   * Search apps by keywords in titles and descriptions
   */
  async searchByKeywords(keywords, limit) {
    console.log(`🔍 DEBUG: Starting searchByKeywords with keywords: ${keywords.join(', ')}`);
    try {
      // Build search conditions
      const titleConditions = keywords.map(keyword => `title.ilike.%${keyword}%`).join(',');
      const descConditions = keywords.map(keyword => `description.ilike.%${keyword}%`).join(',');
      
      let allResults = [];
      
      // Stage 1: Title matches (highest priority)
      console.log('🔍 DEBUG: About to query database for title matches...');
      const dbStartTime = Date.now();
      
      const { data: titleMatches, error: titleError } = await this.supabase
        .from('apps_unified')
        .select('id, title, developer, primary_category, description, rating, icon_url, price')
        .or(titleConditions)
        .gte('rating', 3.0) // Filter for decent ratings
        .order('rating', { ascending: false })
        .limit(Math.ceil(limit * 0.7));
      
      const dbTime = Date.now() - dbStartTime;
      console.log(`🔍 DEBUG: Database query completed in ${dbTime}ms`);
      
      if (!titleError && titleMatches) {
        console.log(`🔍 DEBUG: Found ${titleMatches.length} title matches`);
        allResults.push(...titleMatches.map(app => ({
          app_id: app.id,
          title: app.title,
          developer: app.developer,
          primary_category: app.primary_category,
          description: app.description,
          rating: app.rating,
          icon_url: app.icon_url,
          price: app.price,
          relevance: 0.9
        })));
      } else if (titleError) {
        console.log(`🔍 DEBUG: Database error: ${titleError.message}`);
      }
      
      // Stage 2: Description matches if we need more results
      if (allResults.length < limit) {
        const existingIds = allResults.map(app => app.app_id);
        const { data: descMatches, error: descError } = await this.supabase
          .from('apps_unified')
          .select('id, title, developer, primary_category, description, rating, icon_url, price')
          .or(descConditions)
          .not('id', 'in', existingIds.length > 0 ? `(${existingIds.map(id => `"${id}"`).join(',')})` : '()')
          .gte('rating', 2.5)
          .order('rating', { ascending: false })
          .limit(limit - allResults.length);
        
        if (!descError && descMatches) {
          allResults.push(...descMatches.map(app => ({
            app_id: app.id,
            title: app.title,
            developer: app.developer,
            primary_category: app.primary_category,
            description: app.description,
            rating: app.rating,
            icon_url: app.icon_url,
            price: app.price,
            relevance: 0.7
          })));
        }
      }
      
      return allResults.slice(0, limit);
      
    } catch (error) {
      console.error(`Keyword search failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Extract keywords from user query
   */
  extractKeywords(query) {
    const stopWords = new Set(['i', 'want', 'need', 'help', 'me', 'to', 'a', 'an', 'the', 'and', 'or', 'but', 'app', 'apps', 'for', 'cant', 'too', 'much']);
    
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 3); // Limit to 3 main keywords
  }

  /**
   * Extract core keywords from AI-generated search terms for better database matching
   */
  extractCoreKeywords(searchTerms) {
    const coreWords = [];
    const priorityWords = ['sleep', 'fitness', 'meditation', 'tracker', 'habit', 'health', 'food', 'money', 'budget', 'photo', 'music', 'work', 'productivity', 'social', 'game', 'education', 'travel', 'shopping'];
    
    for (const term of searchTerms) {
      const words = term.toLowerCase().split(/[\s_-]+/);
      
      // Add priority words first
      for (const word of words) {
        if (priorityWords.includes(word) && !coreWords.includes(word)) {
          coreWords.push(word);
        }
      }
      
      // Add other significant words
      for (const word of words) {
        if (word.length > 3 && !coreWords.includes(word) && !['tracker', 'monitor', 'diary'].includes(word)) {
          coreWords.push(word);
        }
      }
      
      if (coreWords.length >= 3) break;
    }
    
    return coreWords.slice(0, 3);
  }

  /**
   * Remove duplicate apps from results
   */
  removeDuplicates(results) {
    const seen = new Map();
    
    for (const result of results) {
      const id = result.app_id || result.id;
      if (!seen.has(id) || (result.relevance && result.relevance > (seen.get(id).relevance || 0))) {
        seen.set(id, result);
      }
    }
    
    return Array.from(seen.values());
  }

  /**
   * Filter out obviously irrelevant apps based on query context
   */
  isIrrelevantApp(app, queryText) {
    const query = queryText.toLowerCase();
    const title = (app.title || '').toLowerCase();
    const description = (app.description || '').toLowerCase();
    const category = (app.primary_category || '').toLowerCase();
    
    // Define irrelevant patterns for different query types
    const irrelevantPatterns = [
      // Chinese/Non-English apps (unless specifically searching for them)
      /[\u4e00-\u9fff]/,
      // Beauty/cosmetics apps when searching for plants/nature
      /nail|manicure|makeup|beauty|cosmetic/,
      // Network/utility apps when searching for specific domains
      /airport|utility|wi-fi|network|router/,
      // Document/office apps when searching for specific domains
      /document|office|excel|word|pdf/,
      // Photo printing when not searching for photos
      /photo.*print|print.*photo/
    ];
    
    // Check if query is about plants/gardening
    if (query.includes('plant') || query.includes('garden') || query.includes('flower')) {
      // Allow plant-related, garden, nature, education apps
      if (title.includes('plant') || title.includes('garden') || title.includes('flower') || 
          title.includes('tree') || title.includes('leaf') || title.includes('botanical') ||
          category.includes('education') || category.includes('reference')) {
        return false; // Keep relevant apps
      }
      
      // Filter out clearly unrelated apps
      if (title.includes('nail') || title.includes('airport') || title.includes('document') ||
          /[\u4e00-\u9fff]/.test(title)) {
        return true; // Remove irrelevant apps
      }
    }
    
    // General filtering for all queries
    for (const pattern of irrelevantPatterns) {
      if (pattern.test(title) || pattern.test(description)) {
        return true; // Remove if matches irrelevant pattern
      }
    }
    
    return false; // Keep by default
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Main solve function - entry point for contextual search
   */
  async solveUserQuery(userQuery) {
    console.log(`🚀 Contextual Problem Solver: "${userQuery}"\n`);
    console.log('=' .repeat(80));
    
    try {
      // Step 1: Analyze query context
      const analysis = await this.analyzeQueryContext(userQuery);
      if (!analysis) {
        // Fallback to general search if analysis fails
        const keywords = this.extractKeywords(userQuery);
        const results = await this.searchByKeywords(keywords, 15);
        return {
          query_type: 'general',
          results,
          total_apps: results.length
        };
      }
      
      console.log('=' .repeat(80));
      
      // Step 2: Search for appropriate apps
      const results = await this.searchForApps(analysis, userQuery);
      
      console.log('=' .repeat(80));
      console.log(`🎯 Total Apps Found: ${results.total_apps}`);
      
      return results;
      
    } catch (error) {
      console.error('❌ Contextual solver error:', error);
      // Fallback to simple search
      const keywords = this.extractKeywords(userQuery);
      const results = await this.searchByKeywords(keywords, 15);
      return {
        query_type: 'general',
        results,
        total_apps: results.length
      };
    }
  }
}

module.exports = ContextualProblemSolver;