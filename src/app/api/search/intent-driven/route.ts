import { NextRequest, NextResponse } from 'next/server';
import { intentDrivenSearch } from '@/lib/recommendation/intent-driven-search';

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
    
    console.log(`🔍 Intent-driven search request: "${query}" (limit: ${limit})`);
    
    // Perform intent-driven search
    const results = await intentDrivenSearch(query.trim(), Math.min(limit, 50));
    
    const searchTime = Date.now() - startTime;
    
    console.log(`✅ Intent-driven search completed in ${searchTime}ms: ${results.length} results`);
    
    // Prepare response
    const response = {
      success: true,
      query: query.trim(),
      results,
      metadata: {
        count: results.length,
        searchTime: `${searchTime}ms`,
        searchType: 'intent-driven',
        timestamp: new Date().toISOString()
      }
    };
    
    // Add performance headers
    const headers = new Headers();
    headers.set('X-Search-Time', `${searchTime}ms`);
    headers.set('X-Result-Count', results.length.toString());
    headers.set('X-Search-Type', 'intent-driven');
    
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
    
    // Perform quick search with lower limit for GET requests
    const results = await intentDrivenSearch(query, Math.min(limit, 20));
    
    // Simplified response for GET
    const response = {
      success: true,
      query,
      results: results.map(r => ({
        app_id: r.app_id,
        name: r.app_data.name,
        category: r.app_data.category,
        rating: r.app_data.rating,
        icon_url: r.app_data.icon_url,
        relevance_score: r.relevance_score,
        match_reason: r.match_reason
      })),
      count: results.length
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