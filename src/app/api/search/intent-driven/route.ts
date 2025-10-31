import { NextRequest, NextResponse } from 'next/server';

// Import the state-of-art search class
const StateOfArtSearch = require('../../../../../data-scraping/scripts/state-of-art-search.js');

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
    
    console.log(`🔍 Intent-driven search (state-of-art) request: "${query}" (limit: ${limit})`);
    
    // Initialize and perform state-of-art search
    const stateOfArtSearch = new StateOfArtSearch();
    const searchResponse = await stateOfArtSearch.search(query.trim(), Math.min(limit, 50));
    
    const searchTime = Date.now() - startTime;
    
    console.log(`✅ Intent-driven search completed in ${searchTime}ms: ${searchResponse.results?.length || 0} results`);
    
    // Convert state-of-art results to expected format
    const formattedResults = (searchResponse.results || []).map(result => ({
      app_id: result.id,
      app_data: {
        name: result.title,
        category: result.primary_category,
        rating: result.rating,
        icon_url: result.icon_url,
        description: result.description,
        developer: 'Unknown Developer',
        price: 'Free',
        url: null
      },
      relevance_score: result.relevance_score || 5,
      match_reason: result.feature_match ? 
        `Feature match: ${result.feature_match.use_case}` : 
        `${result.search_method} match`,
      matched_keywords: result.matched_keywords || [],
      search_method: result.search_method || 'state_of_art'
    }));

    // Prepare response
    const response = {
      success: true,
      query: query.trim(),
      results: formattedResults,
      metadata: {
        count: formattedResults.length,
        searchTime: `${searchTime}ms`,
        searchType: 'state-of-art',
        intent: searchResponse.intent,
        timestamp: new Date().toISOString()
      }
    };
    
    // Add performance headers
    const headers = new Headers();
    headers.set('X-Search-Time', `${searchTime}ms`);
    headers.set('X-Result-Count', formattedResults.length.toString());
    headers.set('X-Search-Type', 'state-of-art');
    
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
    
    // Perform quick search with state-of-art algorithm
    const stateOfArtSearch = new StateOfArtSearch();
    const searchResponse = await stateOfArtSearch.search(query, Math.min(limit, 20));
    
    // Simplified response for GET
    const response = {
      success: true,
      query,
      results: (searchResponse.results || []).map(r => ({
        app_id: r.id,
        name: r.title,
        category: r.primary_category,
        rating: r.rating,
        icon_url: r.icon_url,
        relevance_score: r.relevance_score || 5,
        match_reason: r.feature_match ? 
          `Feature match: ${r.feature_match.use_case}` : 
          `${r.search_method} match`
      })),
      count: searchResponse.results?.length || 0
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