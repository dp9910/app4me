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
    
    // Extract keywords for general search
    const keywords = this.extractKeywords(userQuery);
    const results = await this.searchByKeywords(keywords, 15);
    
    return {
      query_type: 'general',
      results,
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
   * Search apps by semantic similarity using JavaScript-based calculation
   */
  async searchBySemanticSimilarity(queryText, limit) {
    console.log(`🔍 DEBUG: Starting searchBySemanticSimilarity with query: ${queryText}`);
    try {
      // 1. Generate embedding for the query text
      const embeddingResponse = await this.embeddingModel.embedContent(queryText);
      const queryEmbedding = embeddingResponse.embedding.values;
      console.log(`🔍 DEBUG: Generated embedding with ${queryEmbedding.length} dimensions`);

      // 2. Get all embeddings from new_embeddings table
      const { data: allEmbeddings, error: fetchError } = await this.supabase
        .from('new_embeddings')
        .select('app_id, embedding');

      if (fetchError) {
        throw new Error(`Error fetching embeddings: ${fetchError.message}`);
      }

      console.log(`🔍 DEBUG: Fetched ${allEmbeddings.length} embeddings`);

      // 3. Calculate similarities in JavaScript
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

      // 4. Sort by similarity and get top results
      similarities.sort((a, b) => b.similarity - a.similarity);
      const topSimilarities = similarities.slice(0, limit);

      if (topSimilarities.length === 0) {
        return [];
      }

      // 5. Get app details
      const appIds = topSimilarities.map(s => s.app_id);
      const { data: appDetails, error: detailsError } = await this.supabase
        .from('apps_unified')
        .select('id, title, developer, description, rating, icon_url, price, primary_category')
        .in('id', appIds);

      if (detailsError) {
        throw new Error(`Error fetching app details: ${detailsError.message}`);
      }

      // 6. Fetch app features for additional context
      const { data: features, error: featuresError } = await this.supabase
        .from('app_features')
        .select('app_id, primary_use_case, key_benefit')
        .in('app_id', appIds);

      if (featuresError) {
        console.log(`⚠️ Warning: Could not fetch app features: ${featuresError.message}`);
      }

      // 7. Combine the results
      const combinedResults = topSimilarities.map(sim => {
        const app = appDetails.find(a => a.id === sim.app_id);
        const appFeatures = features ? features.find(f => f.app_id === sim.app_id) : null;
        
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
          primary_use_case: appFeatures ? appFeatures.primary_use_case : null,
          key_benefit: appFeatures ? appFeatures.key_benefit : null,
          similarity_score: sim.similarity,
          relevance: sim.similarity
        };
      }).filter(Boolean);

      console.log(`🔍 DEBUG: Returning ${combinedResults.length} semantic matches`);
      return combinedResults;

    } catch (error) {
      console.error(`Semantic search failed: ${error.message}`);
      throw error;
    }
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