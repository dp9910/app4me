/**
 * Semantic Search API Endpoint
 * Provides intelligent app recommendations using vector embeddings
 */

import { NextRequest, NextResponse } from 'next/server';
import { semanticSearch, logSearchQuality } from '@/lib/search/semantic-search';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      query, 
      limit = 20, 
      threshold = 0.5, 
      userContext = null,
      includeInsights = false 
    } = body;
    
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
    if (limit && (typeof limit !== 'number' || limit < 1 || limit > 100)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Limit must be a number between 1 and 100' 
        },
        { status: 400 }
      );
    }
    
    if (threshold && (typeof threshold !== 'number' || threshold < 0 || threshold > 1)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Threshold must be a number between 0 and 1' 
        },
        { status: 400 }
      );
    }
    
    const startTime = Date.now();
    
    // Perform semantic search
    const results = await semanticSearch(query.trim(), {
      limit: Math.min(limit, 100), // Cap at 100 for performance
      threshold: Math.max(threshold, 0.3), // Minimum threshold of 0.3
      userContext,
      includeInsights
    });
    
    const searchTime = Date.now() - startTime;
    
    // Log search for analytics (async, don't wait)
    logSearchQuality(query.trim(), results).catch(console.error);
    
    // Prepare response
    const response = {
      success: true,
      query: query.trim(),
      results,
      metadata: {
        count: results.length,
        searchTime: `${searchTime}ms`,
        threshold,
        includeInsights,
        timestamp: new Date().toISOString()
      }
    };
    
    // Add performance headers
    const headers = new Headers();
    headers.set('X-Search-Time', `${searchTime}ms`);
    headers.set('X-Result-Count', results.length.toString());
    
    return NextResponse.json(response, { headers });
    
  } catch (error) {
    console.error('❌ Semantic search API error:', error);
    
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
 * GET endpoint for search suggestions and quick queries
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');
    const threshold = parseFloat(searchParams.get('threshold') || '0.6');
    
    if (!query) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Query parameter "q" is required' 
        },
        { status: 400 }
      );
    }
    
    // Perform quick search with higher threshold for GET requests
    const results = await semanticSearch(query, {
      limit: Math.min(limit, 20), // Lower limit for GET
      threshold: Math.max(threshold, 0.6), // Higher threshold for quality
      userContext: {}, // Empty context for GET requests
      includeInsights: false // No insights for quick searches
    });
    
    // Simplified response for GET
    const response = {
      success: true,
      query,
      results: results.map(r => ({
        app_id: r.app_id,
        name: r.name,
        category: r.category,
        rating: r.rating,
        icon_url: r.icon_url,
        similarity_score: r.similarity_score,
        match_quality: r.match_quality
      })),
      count: results.length
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Semantic search GET error:', error);
    
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