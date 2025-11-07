import { NextRequest, NextResponse } from 'next/server';

// Import the contextual problem solver
const ContextualProblemSolver = require('../../../../../contextual-problem-solver.js');

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
    
    console.log(`🧠 Contextual problem solver request: "${query}" (limit: ${limit})`);
    
    // Initialize and perform contextual search
    const solver = new ContextualProblemSolver();
    const searchResponse = await solver.solveUserQuery(query.trim());
    
    const searchTime = Date.now() - startTime;
    
    console.log(`✅ Contextual search completed in ${searchTime}ms: ${searchResponse.query_type} query`);
    
    // Convert contextual search results to expected format
    const formattedResults = await formatContextualResults(searchResponse, limit);

    // Prepare response
    const response = {
      success: true,
      query: query.trim(),
      results: formattedResults,
      // Include guidance analysis for problem queries
      contextual_analysis: searchResponse.query_type === 'problem' ? {
        query_type: searchResponse.query_type,
        user_situation: searchResponse.analysis?.user_situation,
        root_cause: searchResponse.analysis?.root_cause,
        urgency: searchResponse.analysis?.urgency,
        emotional_state: searchResponse.analysis?.emotional_state,
        solution_steps: searchResponse.solution_steps?.map((step: any) => ({
          step_number: step.step,
          step_name: step.step_name,
          focus: step.focus,
          app_count: step.apps?.length || 0
        }))
      } : null,
      metadata: {
        count: formattedResults.length,
        searchTime: `${searchTime}ms`,
        searchType: 'contextual',
        query_type: searchResponse.query_type,
        intent: searchResponse.analysis?.user_situation || 'General search',
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
    
    // Perform quick search with contextual solver
    const solver = new ContextualProblemSolver();
    const searchResponse = await solver.solveUserQuery(query);
    
    // Simplified response for GET
    const formattedResults = await formatContextualResults(searchResponse, Math.min(limit, 20));
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
 * Format contextual search results for swipe interface
 */
async function formatContextualResults(searchResponse: any, limit: number) {
  let allApps: any[] = [];
  
  if (searchResponse.query_type === 'problem') {
    // For problem queries, collect apps from all solution steps
    for (const step of searchResponse.solution_steps || []) {
      if (step.apps && step.apps.length > 0) {
        const stepApps = step.apps.map((app: any) => ({
          app_id: app.app_id,
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
          relevance_score: app.relevance_score || 7,
          match_reason: `Step ${step.step}: ${step.focus} - ${app.source === 'keyword_match' ? 'Perfect match' : 'Recommended'}`,
          matched_keywords: [app.search_term || step.step_name],
          search_method: 'contextual_guidance',
          step_context: {
            step_number: step.step,
            step_focus: step.focus,
            step_description: step.step_name
          }
        }));
        
        allApps.push(...stepApps);
      }
    }
  } else {
    // For general queries, use main recommendations
    allApps = (searchResponse.results || []).map((app: any) => ({
      app_id: app.app_id,
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
      relevance_score: Math.round((app.relevance || 0.5) * 10),
      match_reason: app.source === 'keyword_match' ? 'Direct match for your search' : 'Recommended based on your query',
      matched_keywords: [app.search_term || 'general'],
      search_method: 'contextual_general'
    }));
  }
  
  // Remove duplicates and return top results
  const uniqueApps = allApps.reduce((acc, app) => {
    const existingIndex = acc.findIndex(existing => existing.app_id === app.app_id);
    if (existingIndex === -1) {
      acc.push(app);
    } else if (app.relevance_score > acc[existingIndex].relevance_score) {
      acc[existingIndex] = app; // Replace with higher relevance
    }
    return acc;
  }, []);
  
  // Sort by relevance score and return limited results
  return uniqueApps
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, limit);
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