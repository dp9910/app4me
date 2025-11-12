// Import dependencies for the search pipeline
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

// Types
interface SearchOptions {
  limit?: number;
  saveIntermediateFiles?: boolean;
  showDetailedLogs?: boolean;
}

interface PipelineResult {
  success: boolean;
  error?: string;
  final_results?: {
    results: any[];
  };
  steps?: any;
  total_duration?: number;
}

export class MasterPipeline {
  private openai: OpenAI | null = null;
  private genAI: any = null;
  private supabaseAdmin: any = null;

  constructor() {
    // Initialize clients with environment variables
    if (process.env.DEEPSEEK_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: 'https://api.deepseek.com/v1'
      });
    }

    if (process.env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      this.supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );
    }
  }

  async runPipeline(query: string, options: SearchOptions = {}): Promise<PipelineResult> {
    const { limit = 20, showDetailedLogs = false } = options;
    const startTime = Date.now();

    try {
      if (showDetailedLogs) {
        console.log(`🚀 Starting master pipeline for query: "${query}"`);
      }

      // Check if all services are available
      if (!this.openai || !this.genAI || !this.supabaseAdmin) {
        const missingServices = [];
        if (!this.openai) missingServices.push('DeepSeek');
        if (!this.genAI) missingServices.push('Gemini');
        if (!this.supabaseAdmin) missingServices.push('Supabase');
        
        return {
          success: false,
          error: `Missing required services: ${missingServices.join(', ')}`
        };
      }

      // Step 1: Query Analysis
      const analysisResult = await this.analyzeQuery(query, showDetailedLogs);
      if (!analysisResult.success) {
        return {
          success: false,
          error: `Query analysis failed: ${analysisResult.error}`
        };
      }

      // Step 2: Keyword Processing
      const keywordResult = await this.processKeywords(analysisResult.data, showDetailedLogs);
      if (!keywordResult.success) {
        return {
          success: false,
          error: `Keyword processing failed: ${keywordResult.error}`
        };
      }

      // Step 3: Database Search - Pass both keyword data AND original analysis with weighted keywords
      const searchData = {
        ...keywordResult.data,
        weighted_keywords: analysisResult.data.weighted_keywords
      };
      const searchResult = await this.performDatabaseSearch(searchData, limit, showDetailedLogs);
      if (!searchResult.success) {
        return {
          success: false,
          error: `Database search failed: ${searchResult.error}`
        };
      }

      // Step 4: Semantic Search with Embeddings (CRITICAL MISSING STEP!)
      const semanticResult = await this.performSemanticSearch(searchResult.data, query, showDetailedLogs);
      if (!semanticResult.success) {
        // Fall back to non-semantic results if embedding search fails
        if (showDetailedLogs) console.log('⚠️ Semantic search failed, using non-semantic results');
      }

      // Step 5: Apply Ranking
      const appsToRank = semanticResult.success ? semanticResult.data : searchResult.data;
      const rankedResults = await this.applyWeightedRanking(appsToRank, showDetailedLogs);

      const totalDuration = Date.now() - startTime;

      if (showDetailedLogs) {
        console.log(`✅ Pipeline completed in ${totalDuration}ms with ${rankedResults.length} results`);
      }

      return {
        success: true,
        final_results: {
          results: rankedResults.slice(0, limit)
        },
        steps: {
          llm_analysis: { result: analysisResult.data },
          keyword_processing: { result: keywordResult.data },
          database_search: { result: searchResult.data },
          semantic_search: semanticResult.success ? { result: { count: semanticResult.data.length } } : null
        },
        total_duration: totalDuration
      };

    } catch (error) {
      console.error('Pipeline error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async analyzeQuery(query: string, showLogs: boolean) {
    try {
      if (showLogs) console.log('🧠 Analyzing query with AI...');

      const prompt = `You are an expert app store curator helping users find the perfect apps. Analyze this app search query for a PROBLEM-BASED search.

Query: "${query}"

Your job is to understand what problem the user is facing and create smart keyword categories for effective app discovery.

CATEGORIZE KEYWORDS BY PURPOSE:

**PROBLEM Keywords (Weight 1.0 - HIGHEST PRIORITY)**
- Main issue, challenge, or pain point the user is facing
- What they're struggling with or worried about
- Examples: "buying house", "last minute", "oversight", "forgetting"

**SOLUTION Keywords (Weight 0.9 - VERY HIGH PRIORITY)** 
- Specific tools, features, or approaches that could help solve the problem
- What types of apps or functions they need
- Examples: "checklist app", "home buying checklist", "inspection checklist", "task management"

**CAUSE Keywords (Weight 0.7 - MEDIUM PRIORITY)**
- Root causes or contributing factors to their problem
- Why they're in this situation
- Examples: "stress", "time pressure", "inexperience", "complexity"

**CONTEXT Keywords (Weight 0.5 - LOW PRIORITY)**
- Related concepts and broader category terms
- Supporting information and domain context
- Examples: "real estate", "home purchase", "property", "mortgage"

THINK STRATEGICALLY:
- Problem keywords find apps that address their core issue
- Solution keywords find apps with specific helpful features  
- Cause keywords help understand why they need help
- Context keywords provide domain expertise and fallbacks

Return JSON:
{
  "query_type": "problem-based",
  "user_situation": "brief description of user's problem",
  "weighted_keywords": {
    "problem": {
      "weight": 1.0,
      "keywords": ["main", "issue", "terms"]
    },
    "solution": {
      "weight": 0.9, 
      "keywords": ["tools", "features", "approaches"]
    },
    "cause": {
      "weight": 0.7,
      "keywords": ["root", "causes", "factors"] 
    },
    "context": {
      "weight": 0.5,
      "keywords": ["domain", "related", "terms"]
    }
  },
  "search_strategy": "brief explanation of how to find the best apps using these keywords"
}

Focus on keywords that would actually find relevant apps in app stores. Think about app titles, descriptions, and features.`;

      const response = await this.openai!.chat.completions.create({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.3
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI analysis');
      }

      // Clean the content to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || content.match(/(\{[\s\S]*?\})/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      
      const analysisData = JSON.parse(jsonString);
      return { success: true, data: analysisData };

    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Analysis failed' };
    }
  }

  private async processKeywords(analysisData: any, showLogs: boolean) {
    try {
      if (showLogs) console.log('🔍 Processing weighted keywords...');

      const weightedKeywords = analysisData.weighted_keywords || {};
      
      // Extract all keywords from all categories
      const allTerms = new Set<string>();
      const primaryTerms: string[] = [];
      
      Object.values(weightedKeywords).forEach((category: any) => {
        if (category.keywords && Array.isArray(category.keywords)) {
          category.keywords.forEach((keyword: string) => {
            primaryTerms.push(keyword);
            allTerms.add(keyword);
            
            // Split multi-word terms and add individual words
            const words = keyword.toLowerCase().split(' ').filter(word => 
              word.length > 2 && !['and', 'the', 'for', 'with', 'app', 'apps'].includes(word)
            );
            words.forEach(word => allTerms.add(word));
          });
        }
      });

      const searchTerms = Array.from(allTerms);

      if (showLogs) {
        console.log(`📝 Primary terms: ${primaryTerms.slice(0, 10).join(', ')}${primaryTerms.length > 10 ? '...' : ''}`);
        console.log(`🔍 Expanded search terms: ${searchTerms.slice(0, 10).join(', ')}${searchTerms.length > 10 ? '...' : ''}`);
      }

      return {
        success: true,
        data: {
          primary_keywords: primaryTerms,
          search_terms: searchTerms,
          query_type: analysisData.query_type,
          weighted_keywords: weightedKeywords
        }
      };

    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Keyword processing failed' };
    }
  }

  private async performDatabaseSearch(keywordData: any, limit: number, showLogs: boolean) {
    try {
      if (showLogs) console.log('🗃️ Performing diversified database search...');

      // Check if we have weighted keywords from analysis (like original pipeline)
      const weightedKeywords = keywordData.weighted_keywords || {};
      
      if (Object.keys(weightedKeywords).length === 0) {
        // Fallback to simple search if no weighted keywords
        return this.performSimpleSearch(keywordData.search_terms || [], limit, showLogs);
      }

      // Use diversified search approach like original master pipeline
      const totalApps = 35;
      const quotas: Record<string, number> = {};
      
      // Calculate quotas based on category weights
      Object.entries(weightedKeywords).forEach(([category, data]: [string, any]) => {
        const weight = data.weight || 0.5;
        // Minimum 3 apps per category, scaled by weight  
        quotas[category] = Math.max(3, Math.ceil(totalApps * weight * 0.3));
      });

      if (showLogs) {
        console.log('🎯 Using DIVERSIFIED search strategy for balanced category representation');
        console.log('\n📊 Category Quotas:');
        Object.entries(quotas).forEach(([category, quota]) => {
          const keywords = weightedKeywords[category]?.keywords || [];
          console.log(`   ${category.toUpperCase()}: ${quota} apps (keywords: ${keywords.slice(0, 3).join(', ')}${keywords.length > 3 ? '...' : ''})`);
        });
      }

      // Search each category independently
      const categoryResults: Record<string, any[]> = {};
      let totalFound = 0;

      for (const [category, data] of Object.entries(weightedKeywords)) {
        if (!data || typeof data !== 'object' || !('keywords' in data)) continue;
        const categoryData = data as { keywords: string[]; weight?: number };
        if (!categoryData.keywords || !Array.isArray(categoryData.keywords) || categoryData.keywords.length === 0) continue;

        if (showLogs) {
          console.log(`\n🔍 Searching ${category.toUpperCase()} category...`);
          console.log(`   Keywords: ${categoryData.keywords.slice(0, 5).join(', ')}${categoryData.keywords.length > 5 ? '...' : ''}`);
        }

        const categoryApps = await this.searchWithKeywords(
          categoryData.keywords,
          category.toUpperCase(),
          quotas[category] || 5,
          showLogs
        );

        // Tag apps with their source category
        const taggedApps = categoryApps.map(app => ({
          ...app,
          source_category: category,
          category_weight: categoryData.weight || 0.5
        }));

        categoryResults[category] = taggedApps;
        totalFound += taggedApps.length;

        if (showLogs) {
          console.log(`   ✅ Found ${taggedApps.length}/${quotas[category]} apps for ${category.toUpperCase()}`);
        }
      }

      // Combine all category results
      const allCandidates = Object.values(categoryResults).flat();
      
      // Deduplicate and prioritize
      const uniqueCandidates = this.combineAndDeduplicate(allCandidates);

      if (showLogs) {
        console.log(`\n📊 Total unique candidate apps: ${uniqueCandidates.length}`);
        if (uniqueCandidates.length > 0) {
          console.log('\n🎯 Top candidates:');
          uniqueCandidates.slice(0, 10).forEach((app, i) => {
            console.log(`   ${i+1}. ${app.title} (${app.source || 'unknown'}) [${app.source_category}] - Rating: ${app.rating} - Cat: ${app.primary_category}`);
          });
        }
      }

      return {
        success: true,
        data: uniqueCandidates
      };

    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Database search failed' };
    }
  }

  private async performSimpleSearch(searchTerms: string[], limit: number, showLogs: boolean) {
    if (searchTerms.length === 0) {
      throw new Error('No search terms available');
    }

    // Build comprehensive search conditions for all keywords
    const searchConditions: string[] = [];
    
    searchTerms.forEach((term: string) => {
      // Clean and split multi-word terms
      const words = term.toLowerCase().split(' ').filter(word => word.length > 2);
      
      words.forEach(word => {
        // Add search conditions for each word across all fields
        searchConditions.push(`title.ilike.%${word}%`);
        searchConditions.push(`description.ilike.%${word}%`);
        searchConditions.push(`primary_category.ilike.%${word}%`);
        searchConditions.push(`developer.ilike.%${word}%`);
      });
    });

    // Remove duplicates and limit to prevent query size issues
    const uniqueConditions = Array.from(new Set(searchConditions)).slice(0, 50);
    
    if (showLogs) {
      console.log(`🔍 Fallback simple search with ${uniqueConditions.length} conditions`);
    }

    // Perform broad search
    const { data: apps, error } = await this.supabaseAdmin
      .from('apps_unified')
      .select('*')
      .or(uniqueConditions.join(','))
      .limit(limit * 4);

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    return apps || [];
  }

  private async searchWithKeywords(keywords: string[], priorityLevel: string, limit: number, showLogs: boolean) {
    if (keywords.length === 0) return [];
    
    const allResults: any[] = [];
    
    // Step 1: Search by titles (highest priority)
    const titleResults = await this.searchAppsByTitle(keywords.slice(0, 3), Math.min(limit, 15), showLogs);
    allResults.push(...titleResults.map(app => ({ ...app, source: 'title', search_priority: 3 })));
    
    // Step 2: Search by features if we don't have enough results (and app_features table exists)
    if (allResults.length < limit * 0.7) {
      const featureResults = await this.searchAppsByFeatures(keywords.slice(0, 4), Math.min(limit - allResults.length, 15), showLogs);
      allResults.push(...featureResults.map(app => ({ ...app, source: 'features', search_priority: 2 })));
    }
    
    // Step 3: Search by descriptions for non-HIGH priority categories
    if (priorityLevel !== 'HIGH' && allResults.length < limit * 0.5) {
      const descResults = await this.searchAppsByDescription(keywords.slice(0, 2), Math.min(limit - allResults.length, 10), showLogs);
      allResults.push(...descResults.map(app => ({ ...app, source: 'description', search_priority: 1 })));
    }
    
    return this.combineAndDeduplicate(allResults);
  }

  private async searchAppsByTitle(titleKeywords: string[], limit: number, showLogs: boolean) {
    if (titleKeywords.length === 0) return [];
    
    if (showLogs) console.log(`🔍 Searching app titles for: ${titleKeywords.join(', ')}`);
    
    try {
      const titleConditions = titleKeywords.map(keyword => 
        `title.ilike.%${keyword}%`
      ).join(',');
      
      const { data: titleMatches, error } = await this.supabaseAdmin
        .from('apps_unified')
        .select('id, title, developer, primary_category, description, rating, rating_count, icon_url, price')
        .or(titleConditions)
        .gte('rating', 2.0)
        .order('rating', { ascending: false })
        .limit(limit);
      
      if (error) {
        if (showLogs) console.error('❌ Title search error:', error.message);
        return [];
      }

      if (!titleMatches || titleMatches.length === 0) {
        if (showLogs) console.log('⚠️ No phrase matches found, trying individual word search for titles.');
        const individualWordConditions = titleKeywords.flatMap(keyword => 
          keyword.split(/\s+/).map(word => `title.ilike.%${word}%`)
        ).join(',');

        const { data: wordMatches, error: wordError } = await this.supabaseAdmin
          .from('apps_unified')
          .select('id, title, developer, primary_category, description, rating, rating_count, icon_url, price')
          .or(individualWordConditions)
          .gte('rating', 2.0)
          .order('rating', { ascending: false })
          .limit(limit);

        if (wordError) {
          if (showLogs) console.error('❌ Title individual word search error:', wordError.message);
          return [];
        }
        return wordMatches || [];
      }
      
      return titleMatches || [];
      
    } catch (error) {
      if (showLogs) console.error('❌ Title search failed:', error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  private async searchAppsByFeatures(featureKeywords: string[], limit: number, showLogs: boolean) {
    if (featureKeywords.length === 0) return [];
    
    if (showLogs) console.log(`🔍 Searching app features for: ${featureKeywords.slice(0, 3).join(', ')}...`);
    
    try {
      // Check if app_features table exists
      const { data: featureData, error: featureError } = await this.supabaseAdmin
        .from('app_features')
        .select('app_id, primary_use_case, key_benefit, target_user')
        .limit(1);
      
      if (featureError || !featureData || featureData.length === 0) {
        if (showLogs) console.log('⚠️ No app_features table found, skipping feature search');
        return [];
      }
      
      const featureConditions = featureKeywords.slice(0, 5).map(keyword => 
        `primary_use_case.ilike.%${keyword}%,key_benefit.ilike.%${keyword}%,target_user.ilike.%${keyword}%`
      ).flat().join(',');
      
      const { data: featureMatches, error } = await this.supabaseAdmin
        .from('app_features')
        .select('app_id')
        .or(featureConditions)
        .limit(limit);
      
      if (error) {
        if (showLogs) console.error('❌ Feature search error:', error.message);
        return [];
      }
      
      if (!featureMatches || featureMatches.length === 0) {
        return [];
      }
      
      const appIds = featureMatches.map(f => f.app_id);
      const { data: apps, error: appError } = await this.supabaseAdmin
        .from('apps_unified')
        .select('id, title, developer, primary_category, description, rating, rating_count, icon_url, price')
        .in('id', appIds)
        .gte('rating', 1.5)
        .order('rating', { ascending: false });
      
      if (appError) {
        if (showLogs) console.error('❌ App details fetch error:', appError.message);
        return [];
      }
      
      return apps || [];
      
    } catch (error) {
      if (showLogs) console.error('❌ Feature search failed:', error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  private async searchAppsByDescription(descriptionKeywords: string[], limit: number, showLogs: boolean) {
    if (descriptionKeywords.length === 0) return [];
    
    if (showLogs) console.log(`🔍 Searching app descriptions for: ${descriptionKeywords.join(', ')}`);
    
    try {
      const descConditions = descriptionKeywords.slice(0, 3).map(keyword => 
        `description.ilike.%${keyword}%`
      ).join(',');
      
      const { data: descMatches, error } = await this.supabaseAdmin
        .from('apps_unified')
        .select('id, title, developer, primary_category, description, rating, rating_count, icon_url, price')
        .or(descConditions)
        .gte('rating', 2.5)
        .order('rating', { ascending: false })
        .limit(limit);
      
      if (error) {
        if (showLogs) console.error('❌ Description search error:', error.message);
        return [];
      }
      
      return descMatches || [];
      
    } catch (error) {
      if (showLogs) console.error('❌ Description search failed:', error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  private combineAndDeduplicate(apps: any[]): any[] {
    const seen = new Set();
    const unique = [];
    
    for (const app of apps) {
      if (!seen.has(app.id)) {
        seen.add(app.id);
        unique.push(app);
      }
    }
    
    // Sort by search priority and rating
    return unique.sort((a, b) => {
      const priorityDiff = (b.search_priority || 0) - (a.search_priority || 0);
      if (priorityDiff !== 0) return priorityDiff;
      return (b.rating || 0) - (a.rating || 0);
    });
  }

  private async performSemanticSearch(candidateApps: any[], originalQuery: string, showLogs: boolean) {
    try {
      if (showLogs) console.log('🔍 Performing semantic search with embeddings...');

      if (!candidateApps || candidateApps.length === 0) {
        return { success: false, error: 'No candidate apps for semantic search' };
      }

      if (showLogs) {
        console.log(`📊 Total candidates: ${candidateApps.length}`);
        console.log(`🔤 Original query: "${originalQuery}"`);
      }

      // Generate query embedding using Gemini
      if (showLogs) console.log('🧠 Generating query embedding...');
      const embeddingModel = this.genAI!.getGenerativeModel({ model: 'text-embedding-004' });
      const embeddingResponse = await embeddingModel.embedContent(originalQuery);
      const queryEmbedding = embeddingResponse.embedding.values;
      
      if (showLogs) console.log(`✅ Generated embedding with ${queryEmbedding.length} dimensions`);

      // Get candidate app IDs
      const candidateIds = candidateApps.map(app => app.id).filter(Boolean);
      
      if (showLogs) console.log(`📊 Fetching embeddings for ${candidateIds.length} candidates...`);

      // Fetch embeddings for candidate apps
      const { data: candidateEmbeddings, error: embeddingError } = await this.supabaseAdmin
        .from('new_embeddings')
        .select('app_id, embedding')
        .in('app_id', candidateIds);

      if (embeddingError) {
        throw new Error(`Error fetching candidate embeddings: ${embeddingError.message}`);
      }

      if (showLogs) {
        console.log(`✅ Found embeddings for ${candidateEmbeddings?.length || 0}/${candidateIds.length} candidates`);
      }

      if (!candidateEmbeddings || candidateEmbeddings.length === 0) {
        return { success: false, error: 'No embeddings found for candidate apps' };
      }

      // Calculate semantic similarities
      if (showLogs) console.log('🧮 Calculating semantic similarities...');
      const similarities: Array<{app_id: number, similarity: number}> = [];
      let processed = 0;

      for (const embedding of candidateEmbeddings) {
        try {
          let appEmbedding = embedding.embedding;
          
          // Handle different embedding formats
          if (typeof appEmbedding === 'string' && appEmbedding.startsWith('[')) {
            appEmbedding = JSON.parse(appEmbedding);
          }

          const similarity = this.cosineSimilarity(queryEmbedding, appEmbedding);
          
          if (!isNaN(similarity) && similarity > 0.2) {
            similarities.push({
              app_id: embedding.app_id,
              similarity: similarity
            });
          }
          processed++;
        } catch (err) {
          if (showLogs) console.log(`⚠️ Skipped embedding for app ${embedding.app_id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      if (showLogs) {
        console.log(`✅ Processed ${processed} embeddings, found ${similarities.length} with similarity > 0.2`);
      }

      // Sort by similarity score
      similarities.sort((a, b) => b.similarity - a.similarity);

      // Merge similarity scores with candidate apps
      const semanticResults = similarities.map(sim => {
        const candidate = candidateApps.find(app => app.id === sim.app_id);
        if (!candidate) return null;

        return {
          ...candidate,
          similarity_score: sim.similarity,
          semantic_relevance: sim.similarity
        };
      }).filter(Boolean);

      if (showLogs) {
        console.log(`📊 Final semantic results: ${semanticResults.length} apps with similarity ranking`);
        if (semanticResults.length > 0) {
          console.log('\n🏆 Top semantic matches:');
          semanticResults.slice(0, 5).forEach((app, i) => {
            console.log(`   ${i + 1}. ${app.title} - Similarity: ${app.similarity_score.toFixed(4)} (${app.primary_category})`);
          });
        }
      }

      return {
        success: true,
        data: semanticResults
      };

    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Semantic search failed' };
    }
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
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

  private async applyWeightedRanking(apps: any[], showLogs: boolean) {
    try {
      if (showLogs) console.log('🎯 Applying weighted ranking...');

      // Apply combined semantic + credibility ranking like the original algorithm
      const rankedApps = apps.map(app => {
        const reviewCount = app.rating_count || 0;
        const rating = app.rating || 0;
        const semanticSimilarity = app.similarity_score || 0;

        // Calculate credibility factor
        const credibilityFactor = Math.min(Math.log10(reviewCount + 1) / 4, 1);
        
        // Base quality score using credibility
        let credibilityScore = rating * credibilityFactor;

        // Tiered boosts based on review volume and rating
        if (reviewCount >= 50000 && rating >= 4.5) {
          credibilityScore *= 1.25;
        } else if (reviewCount >= 10000 && rating >= 4.3) {
          credibilityScore *= 1.20;
        } else if (reviewCount >= 1000 && rating >= 4.0) {
          credibilityScore *= 1.15;
        } else if (reviewCount >= 100 && rating >= 3.8) {
          credibilityScore *= 1.10;
        }

        // Penalty for suspicious perfect ratings with few reviews
        if (rating >= 4.9 && reviewCount < 50) {
          credibilityScore *= 0.8;
        }

        // Final score: Combine semantic similarity with credibility (like original)
        // Original uses similarity as primary, credibility as secondary
        let finalScore = semanticSimilarity;
        if (semanticSimilarity > 0) {
          // Boost high-credibility apps in semantic results
          finalScore = semanticSimilarity + (credibilityScore * 0.1);
        } else {
          // Fall back to pure credibility for apps without semantic scores
          finalScore = credibilityScore * 0.1;
        }

        return {
          ...app,
          weighted_similarity: finalScore,
          similarity_score: semanticSimilarity || rating,
          credibility_score: credibilityScore,
          weight_applied: true,
          boost_reasons: semanticSimilarity > 0 
            ? [`semantic similarity: ${semanticSimilarity.toFixed(3)}`, `credibility-weighted (${reviewCount} reviews)`]
            : [`credibility-weighted (${reviewCount} reviews)`]
        };
      });

      // Sort by weighted similarity score (semantic + credibility)
      rankedApps.sort((a, b) => (b.weighted_similarity || 0) - (a.weighted_similarity || 0));

      return rankedApps;

    } catch (error) {
      console.error('Ranking error:', error);
      return apps; // Return unranked apps if ranking fails
    }
  }
}