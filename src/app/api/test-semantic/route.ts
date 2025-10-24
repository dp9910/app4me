import { NextRequest, NextResponse } from 'next/server';
import { 
  semanticRetrieval, 
  buildAnonymousProfile,
  fastSemanticSearch 
} from '@/lib/recommendation/retrievers/semantic-retriever-working';

export async function POST(request: NextRequest) {
  try {
    const { 
      query,
      userId,
      lifestyle,
      improve,
      wishText,
      enhanced = false,
      limit = 10 
    } = await request.json();

    console.log(`🧪 Testing semantic search for: "${query}"`);

    // Build user profile
    const userProfile = userId 
      ? null // Would fetch from database in real implementation
      : await buildAnonymousProfile(lifestyle, improve, wishText);

    console.log('User profile:', userProfile);

    // Perform semantic search
    const results = enhanced 
      ? await fastSemanticSearch(query, limit) // Fast version for testing
      : await semanticRetrieval(query, userProfile, limit);

    console.log(`✅ Found ${results.length} semantic matches`);

    // Format response
    const recommendations = results.map((result, index) => ({
      rank: index + 1,
      app_id: result.app_id,
      name: result.app_data.name,
      category: result.app_data.category,
      rating: result.app_data.rating,
      icon_url: result.app_data.icon_url,
      description: result.app_data.description?.substring(0, 150) + '...',
      similarity_score: parseFloat(result.similarity.toFixed(3)),
      retrieval_method: result.retrieval_method,
      retrieval_score: parseFloat(result.retrieval_score.toFixed(3))
    }));

    return NextResponse.json({
      success: true,
      query,
      method: enhanced ? 'enhanced_semantic' : 'basic_semantic',
      user_profile_used: !!userProfile,
      results_count: recommendations.length,
      recommendations,
      metadata: {
        search_type: 'semantic',
        personalized: !!userProfile,
        processing_time: Date.now()
      }
    });

  } catch (error) {
    console.error('❌ Semantic search test error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        query: 'failed'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Semantic Search Test API',
    usage: 'POST with { query, lifestyle?, improve?, wishText?, enhanced?, limit? }',
    examples: {
      basic: {
        query: "I need help managing my budget and expenses",
        limit: 5
      },
      personalized: {
        query: "apps for staying healthy",
        lifestyle: ["busy", "active"],
        improve: ["health", "fitness"],
        enhanced: true,
        limit: 10
      }
    }
  });
}