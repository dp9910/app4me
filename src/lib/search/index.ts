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

      // Step 3: Database Search
      const searchResult = await this.performDatabaseSearch(keywordResult.data, limit, showDetailedLogs);
      if (!searchResult.success) {
        return {
          success: false,
          error: `Database search failed: ${searchResult.error}`
        };
      }

      // Step 4: Apply Ranking
      const rankedResults = await this.applyWeightedRanking(searchResult.data, showDetailedLogs);

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
          database_search: { result: searchResult.data }
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

      const prompt = `Analyze this app search query and extract:
1. Query type (problem-based, feature-based, category-based, etc.)
2. Key concepts and weighted keywords
3. User situation or need

Query: "${query}"

Respond in JSON format:
{
  "query_type": "problem-based|feature-based|category-based",
  "user_situation": "brief description",
  "weighted_keywords": [{"term": "keyword", "weight": 0.9}],
  "search_strategy": "approach description"
}`;

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

      const keywords = analysisData.weighted_keywords || [];
      const searchTerms = keywords.map((kw: any) => kw.term);

      return {
        success: true,
        data: {
          primary_keywords: searchTerms,
          search_terms: searchTerms,
          query_type: analysisData.query_type
        }
      };

    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Keyword processing failed' };
    }
  }

  private async performDatabaseSearch(keywordData: any, limit: number, showLogs: boolean) {
    try {
      if (showLogs) console.log('🗃️ Searching database...');

      const searchTerms = keywordData.search_terms || [];
      if (searchTerms.length === 0) {
        throw new Error('No search terms available');
      }

      // Build search query for multiple fields
      const searchQuery = searchTerms.join(' | ');
      
      const { data: apps, error } = await this.supabaseAdmin
        .from('apps_unified')
        .select('*')
        .or(`title.ilike.%${searchTerms[0]}%,description.ilike.%${searchTerms[0]}%,primary_category.ilike.%${searchTerms[0]}%`)
        .limit(limit * 3); // Get more for ranking

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      return {
        success: true,
        data: apps || []
      };

    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Database search failed' };
    }
  }

  private async applyWeightedRanking(apps: any[], showLogs: boolean) {
    try {
      if (showLogs) console.log('🎯 Applying weighted ranking...');

      // Apply credibility-based ranking similar to the original algorithm
      const rankedApps = apps.map(app => {
        const reviewCount = app.rating_count || 0;
        const rating = app.rating || 0;

        // Calculate credibility factor
        const credibilityFactor = Math.min(Math.log10(reviewCount + 1) / 4, 1);
        
        // Base quality score
        let qualityScore = rating * credibilityFactor;

        // Tiered boosts based on review volume and rating
        if (reviewCount >= 50000 && rating >= 4.5) {
          qualityScore *= 1.25;
        } else if (reviewCount >= 10000 && rating >= 4.3) {
          qualityScore *= 1.20;
        } else if (reviewCount >= 1000 && rating >= 4.0) {
          qualityScore *= 1.15;
        } else if (reviewCount >= 100 && rating >= 3.8) {
          qualityScore *= 1.10;
        }

        // Penalty for suspicious perfect ratings with few reviews
        if (rating >= 4.9 && reviewCount < 50) {
          qualityScore *= 0.8;
        }

        return {
          ...app,
          weighted_similarity: qualityScore,
          similarity_score: rating,
          weight_applied: true,
          boost_reasons: [`credibility-weighted (${reviewCount} reviews)`]
        };
      });

      // Sort by weighted similarity score
      rankedApps.sort((a, b) => (b.weighted_similarity || 0) - (a.weighted_similarity || 0));

      return rankedApps;

    } catch (error) {
      console.error('Ranking error:', error);
      return apps; // Return unranked apps if ranking fails
    }
  }
}