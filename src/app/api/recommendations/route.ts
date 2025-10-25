import { NextRequest, NextResponse } from 'next/server'
import { geminiService, UserPreferences } from '@/lib/ai/gemini-client'
import { smartHybridRetrieval } from '@/lib/recommendation/retrievers/smart-hybrid-retriever'
import { neuralRerank } from '@/lib/recommendation/reranker/neural-reranker'

export async function POST(request: NextRequest) {
  try {
    const userProfile = await request.json()
    
    console.log('🔍 Received recommendation request:', userProfile);

    // Handle both old format (preferences + query) and new format (userProfile)
    let searchQuery: string;
    let userContext: any;
    
    if (userProfile.preferences || userProfile.query) {
      // Old format - for backward compatibility
      searchQuery = userProfile.query || 'general app search';
      userContext = {
        query: searchQuery,
        lifestyle_tags: userProfile.preferences?.interests || [],
        preferred_use_cases: userProfile.preferences?.categories || [],
        preferred_complexity: 'intermediate',
        current_context: 'general'
      };
    } else {
      // New format - direct user profile
      searchQuery = userProfile.query;
      userContext = userProfile;
    }

    // Validate required fields
    if (!searchQuery) {
      return NextResponse.json({
        success: false,
        error: 'Query is required'
      }, { status: 400 });
    }

    // Step 1: Get initial candidates using smart hybrid retrieval
    console.log('📊 Starting smart hybrid retrieval...');
    const candidates = await smartHybridRetrieval(searchQuery, 20);
    
    if (candidates.length === 0) {
      return NextResponse.json({
        success: true,
        recommendations: [],
        message: 'No apps found matching your criteria'
      });
    }

    console.log(`✅ Found ${candidates.length} candidates from hybrid retrieval`);

    // Step 2: Apply neural re-ranking with user context
    console.log('🧠 Applying neural re-ranking...');
    const rerankedResults = await neuralRerank(candidates, userContext, {
      batch_size: 6,
      llm_weight: 0.7,
      retrieval_weight: 0.3,
      confidence_threshold: 0.3
    });

    console.log(`🎯 Neural re-ranking completed: ${rerankedResults.length} results`);

    // Step 3: Format results for frontend
    const formattedResults = rerankedResults.map((result, index) => ({
      app_id: result.app_id,
      app_data: result.app_data,
      final_score: result.final_score,
      personalized_oneliner: result.personalized_oneliner,
      match_explanation: result.match_explanation,
      llm_confidence: result.llm_confidence,
      matched_concepts: result.matched_concepts || [],
      rank: index + 1,
      score_breakdown: result.score_breakdown
    }));

    return NextResponse.json({
      success: true,
      recommendations: formattedResults,
      count: formattedResults.length,
      metadata: {
        total_candidates: candidates.length,
        final_results: rerankedResults.length,
        user_query: searchQuery,
        lifestyle_tags: userContext.lifestyle_tags,
        preferred_use_cases: userContext.preferred_use_cases
      }
    });

  } catch (error: any) {
    console.error('❌ Recommendation API error:', error);
    
    // Return appropriate error response
    if (error.message?.includes('Gemini AI not configured') || error.message?.includes('API key')) {
      return NextResponse.json({
        success: false,
        error: 'AI service is not configured properly'
      }, { status: 503 });
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate recommendations'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 }
    )
  }

  try {
    // Generate recommendations based on search query only
    const recommendations = await geminiService.generateAppRecommendations(
      {}, // Empty preferences
      query
    )

    return NextResponse.json({
      success: true,
      query,
      recommendations,
      count: recommendations.length
    })

  } catch (error: any) {
    console.error('Error generating search recommendations:', error)
    
    return NextResponse.json(
      { error: 'Failed to generate search recommendations' },
      { status: 500 }
    )
  }
}