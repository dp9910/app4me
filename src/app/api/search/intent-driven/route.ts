import { NextRequest, NextResponse } from 'next/server';

// Import the enhanced weighted search pipeline
const { MasterPipeline } = require('../../../../../scripts/master-pipeline.js');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, limit = 20 } = body;
    
    // Validate required parameters
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Query is required and must be a non-empty string' 
        },
        { status: 400 }
      );
    }
    
    // Validate optional parameters
    if (limit && (typeof limit !== 'number' || limit < 1 || limit > 50)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Limit must be a number between 1 and 50' 
        },
        { status: 400 }
      );
    }
    
    const startTime = Date.now();
    
    console.log(`🧠 Weighted pipeline request: "${query}" (limit: ${limit})`);
    
    // Initialize and perform weighted search
    const pipeline = new MasterPipeline();
    const pipelineResult = await pipeline.runPipeline(query.trim(), {
      limit,
      saveIntermediateFiles: false,
      showDetailedLogs: false
    });
    
    const searchTime = Date.now() - startTime;
    
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
    
    console.log(`✅ Weighted search completed in ${searchTime}ms: ${pipelineResult.steps?.llm_analysis?.result?.query_type || 'unknown'} query`);
    
    // Convert pipeline results to expected format
    const formattedResults = await formatContextualResults(pipelineResult, limit);

    // Prepare response
    const response = {
      success: true,
      query: query.trim(),
      results: formattedResults,
      // Include analysis from the weighted pipeline
      contextual_analysis: {
        query_type: pipelineResult.steps?.llm_analysis?.result?.query_type || 'unknown',
        user_situation: pipelineResult.steps?.llm_analysis?.result?.user_situation,
        root_cause: pipelineResult.steps?.llm_analysis?.result?.root_cause,
        urgency: pipelineResult.steps?.llm_analysis?.result?.urgency,
        weighted_keywords: pipelineResult.steps?.llm_analysis?.result?.weighted_keywords,
        search_strategy: pipelineResult.steps?.llm_analysis?.result?.search_strategy
      },
      metadata: {
        count: formattedResults.length,
        searchTime: `${searchTime}ms`,
        searchType: 'weighted_pipeline',
        query_type: pipelineResult.steps?.llm_analysis?.result?.query_type || 'unknown',
        intent: pipelineResult.steps?.llm_analysis?.result?.user_situation || 'General search',
        timestamp: new Date().toISOString()
      }
    };
    
    // Add performance headers
    const headers = new Headers();
    headers.set('X-Search-Time', `${searchTime}ms`);
    headers.set('X-Result-Count', formattedResults.length.toString());
    headers.set('X-Search-Type', 'contextual');
    
    return NextResponse.json(response, { headers });
    
  } catch (error) {
    console.error('❌ Intent-driven search API error:', error);
    
    // Return appropriate error response
    const isUserError = error.message.includes('Invalid') || 
                       error.message.includes('required') ||
                       error.message.includes('Query');
    
    const statusCode = isUserError ? 400 : 500;
    const errorMessage = isUserError ? error.message : 'Internal search error';
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
    );
  }
}

/**
 * GET endpoint for quick searches
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    if (!query) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Query parameter "q" is required' 
        },
        { status: 400 }
      );
    }
    
    // Perform quick search with weighted pipeline
    const pipeline = new MasterPipeline();
    const pipelineResult = await pipeline.runPipeline(query, {
      limit: Math.min(limit, 20),
      saveIntermediateFiles: false,
      showDetailedLogs: false
    });
    
    // Simplified response for GET
    const formattedResults = await formatContextualResults(pipelineResult, Math.min(limit, 20));
    const response = {
      success: true,
      query,
      results: formattedResults.map(r => ({
        app_id: r.app_id,
        name: r.app_data.name,
        category: r.app_data.category,
        rating: r.app_data.rating,
        icon_url: r.app_data.icon_url,
        relevance_score: r.relevance_score || 5,
        match_reason: r.match_reason
      })),
      count: formattedResults.length
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Intent-driven search GET error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Search failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * Format weighted pipeline results for swipe interface
 */
async function formatContextualResults(pipelineResult: any, limit: number) {
  let allApps: any[] = [];
  
  // Extract results from the weighted pipeline
  const results = pipelineResult.final_results?.results || [];
  const queryType = pipelineResult.steps?.llm_analysis?.result?.query_type || 'unknown';
  
  // Format apps from the weighted pipeline
  allApps = results.map((app: any) => ({
    app_id: app.id || app.app_id,
    app_data: {
      name: app.title,
      category: app.primary_category || 'Apps',
      rating: app.rating || 0,
      icon_url: app.icon_url || '/default-app-icon.png',
      description: app.description || 'No description available',
      developer: app.developer || 'Unknown Developer',
      price: app.price || 'Free',
      url: null
    },
    relevance_score: Math.round((app.weighted_similarity || app.similarity_score || 0.5) * 10),
    match_reason: app.weight_applied ? 
      `Smart match with weighted keywords: ${app.boost_reasons?.[0] || 'Enhanced ranking'}` : 
      'Semantic similarity match',
    matched_keywords: app.boost_reasons || ['semantic'],
    search_method: 'weighted_pipeline',
    weighted_info: {
      query_type: queryType,
      weight_applied: app.weight_applied || false,
      original_similarity: app.original_similarity || app.similarity_score,
      weighted_similarity: app.weighted_similarity || app.similarity_score,
      boost_reasons: app.boost_reasons || []
    }
  }));
  
  // Remove duplicates and return top results
  const uniqueApps = Array.from(new Map(allApps.map(app => [app.app_id, app])).values());
  
  // Sort by relevance score
  uniqueApps.sort((a, b) => b.relevance_score - a.relevance_score);
  
  return uniqueApps.slice(0, limit);
}

/**
 * OPTIONS endpoint for CORS support
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}