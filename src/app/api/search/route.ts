import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

let supabaseAdmin: any = null;
if (supabaseUrl && supabaseServiceKey && supabaseUrl !== 'your-project-url-here') {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Import the enhanced weighted search pipeline
const { MasterPipeline } = require('../../../../scripts/master-pipeline.js');

interface SearchRequest {
  lifestyle?: string[];
  intent?: string;
  wishText?: string;
  query?: string;
  sessionId?: string;
  limit?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: SearchRequest = await request.json();
    const { lifestyle = [], intent, wishText, query, sessionId, limit = 10 } = body;

    // Construct search query from available inputs
    let searchQuery = '';
    if (query) {
      searchQuery = query;
    } else if (wishText) {
      searchQuery = wishText;
    } else if (intent) {
      searchQuery = intent;
    } else if (lifestyle.length > 0) {
      searchQuery = lifestyle.join(' ');
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No search query provided. Include query, wishText, intent, or lifestyle.' 
        },
        { status: 400 }
      );
    }

    console.log('🔍 State-of-art search request:', { searchQuery, limit });

    // Check if services are configured
    if (!supabaseAdmin) {
      console.warn('⚠️ Supabase not configured, returning mock data');
      return NextResponse.json({
        success: true,
        apps: getMockApps(),
        intent: { keywords: lifestyle, categories: [], problemSolved: searchQuery },
        totalFound: 6
      });
    }

    // Initialize enhanced weighted search pipeline 
    const pipeline = new MasterPipeline();

    // Perform the search using the new weighted search algorithm
    const pipelineResult = await pipeline.runPipeline(searchQuery, {
      limit,
      saveIntermediateFiles: false,
      showDetailedLogs: false
    });
    
    // Check for pipeline errors
    if (pipelineResult.error) {
      console.error('❌ Pipeline error:', pipelineResult.error);
      return NextResponse.json(
        { 
          success: false, 
          error: `Search pipeline failed: ${pipelineResult.error}` 
        },
        { status: 500 }
      );
    }
    
    // Extract results from pipeline response
    const results = pipelineResult.final_results?.results || [];
    
    // Format response to match expected structure  
    const searchResponse = {
      results: results.map(app => ({
        id: app.id || app.app_id,
        title: app.title,
        developer: app.developer,
        primary_category: app.primary_category,
        description: app.description,
        rating: app.rating,
        icon_url: app.icon_url,
        price: app.price,
        relevance_score: (app.weighted_similarity || app.similarity_score || 0) * 10, // Scale to 0-10
        search_method: 'weighted_pipeline',
        weight_applied: app.weight_applied || false,
        boost_reasons: app.boost_reasons || []
      })),
      intent: {
        keywords: [searchQuery],
        categories: [],
        problemSolved: searchQuery
      },
      metadata: {
        searchTime: `${Math.round(pipelineResult.total_duration || 0)}ms`,
        method: 'weighted_pipeline',
        count: results.length,
        query_type: pipelineResult.steps?.llm_analysis?.result?.query_type || 'unknown',
        pipeline_steps: {
          llm_analysis: pipelineResult.steps?.llm_analysis?.duration || 0,
          keyword_processing: pipelineResult.steps?.keyword_processing?.duration || 0,
          database_filtering: pipelineResult.steps?.database_filtering?.duration || 0,
          semantic_search: pipelineResult.steps?.semantic_search?.duration || 0
        }
      }
    };

    // Log search for analytics
    if (sessionId && searchResponse.results) {
      await logSearch(sessionId, searchResponse.intent, searchResponse.results);
    }

    console.log(`✨ State-of-art search completed: ${searchResponse.results?.length || 0} results`);

    // Format response to match existing API structure
    return NextResponse.json({
      success: true,
      apps: searchResponse.results || [],
      intent: searchResponse.intent || { 
        keywords: [searchQuery], 
        categories: [], 
        problemSolved: searchQuery 
      },
      totalFound: searchResponse.results?.length || 0,
      metadata: searchResponse.metadata
    });

  } catch (error) {
    console.error('State-of-art search error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

function getMockApps() {
  return [
    {
      id: 'mock-1',
      title: 'FitTrack Pro',
      primary_category: 'Health & Fitness',
      icon_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=512&h=512&fit=crop&crop=center',
      description: 'Comprehensive fitness tracking app',
      rating: 4.5,
      relevance_score: 5
    },
    {
      id: 'mock-2',
      title: 'Mindful Moments',
      primary_category: 'Health & Fitness',
      icon_url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=512&h=512&fit=crop&crop=center',
      description: 'Daily meditation and mindfulness',
      rating: 4.7,
      relevance_score: 5
    },
    {
      id: 'mock-3',
      title: 'TaskMaster',
      primary_category: 'Productivity',
      icon_url: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=512&h=512&fit=crop&crop=center',
      description: 'Advanced task management',
      rating: 4.2,
      relevance_score: 5
    }
  ];
}

async function logSearch(sessionId: string, intent: any, results: any[]) {
  if (!supabaseAdmin) {
    console.log('📊 Mock search logged:', { sessionId, intent: intent?.problemSolved || 'search', results: results.length });
    return;
  }
  
  try {
    await supabaseAdmin.from('search_logs').insert({
      session_id: sessionId,
      query_text: intent?.problemSolved || intent?.user_goal || 'search',
      lifestyle_context: intent?.search_terms?.exact_keywords || [],
      results_returned: results.length,
      apps_shown: results.map(r => r.id),
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Logging error:', error);
  }
}