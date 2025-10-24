import { NextRequest, NextResponse } from 'next/server';
import { 
  hybridRetrieval,
  intentAwareHybridSearch,
  categoryAwareHybridSearch,
  explainRecommendation,
  getHybridAnalytics
} from '@/lib/recommendation/retrievers/hybrid-retriever';
import { buildAnonymousProfile } from '@/lib/recommendation/retrievers/semantic-retriever-working';

export async function POST(request: NextRequest) {
  try {
    const { 
      query,
      method = 'basic',
      userIntent = 'discovery',
      preferredCategories = [],
      userId,
      lifestyle,
      improve,
      wishText,
      limit = 10,
      config = {}
    } = await request.json();

    console.log(`🔄 Testing hybrid retrieval for: "${query}" (method: ${method})`);

    // Build user profile if provided
    const userProfile = userId 
      ? null // Would fetch from database in real implementation
      : lifestyle || improve || wishText 
        ? await buildAnonymousProfile(lifestyle, improve, wishText)
        : undefined;

    let results;
    
    switch (method) {
      case 'intent':
        results = await intentAwareHybridSearch(query, userIntent, userProfile, limit);
        break;
      case 'category':
        results = await categoryAwareHybridSearch(query, preferredCategories, userProfile, limit);
        break;
      default:
        results = await hybridRetrieval(query, userProfile, limit, config);
        break;
    }

    console.log(`✅ Hybrid search completed: ${results.length} results`);

    // Generate explanations for top results
    const recommendationsWithExplanations = results.map((result, index) => ({
      rank: index + 1,
      app_id: result.app_id,
      name: result.app_data.name,
      category: result.app_data.category,
      rating: result.app_data.rating,
      icon_url: result.app_data.icon_url,
      description: result.app_data.description?.substring(0, 150) + '...',
      semantic_score: parseFloat(result.semantic_score.toFixed(3)),
      keyword_score: parseFloat(result.keyword_score.toFixed(3)),
      rrf_score: parseFloat(result.rrf_score.toFixed(3)),
      final_score: parseFloat(result.final_score.toFixed(3)),
      retrieval_methods: result.retrieval_methods,
      explanation: explainRecommendation(result)
    }));

    // Get analytics
    const analytics = getHybridAnalytics(results);

    return NextResponse.json({
      success: true,
      query,
      method,
      user_intent: userIntent,
      preferred_categories: preferredCategories,
      user_profile_used: !!userProfile,
      results_count: results.length,
      recommendations: recommendationsWithExplanations,
      analytics,
      metadata: {
        search_type: 'hybrid',
        fusion_method: 'reciprocal_rank_fusion',
        personalized: !!userProfile,
        processing_time: Date.now()
      }
    });

  } catch (error) {
    console.error('❌ Hybrid search test error:', error);
    
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
    message: 'Hybrid Search Test API - RRF Fusion of Semantic + Keyword',
    usage: 'POST with { query, method?, userIntent?, preferredCategories?, lifestyle?, improve?, wishText?, limit?, config? }',
    methods: {
      basic: 'Standard hybrid search with RRF fusion',
      intent: 'Intent-aware hybrid search with dynamic weighting',
      category: 'Category-aware hybrid search with preference boosting'
    },
    examples: {
      basic: {
        query: "budget expense tracking apps",
        limit: 8
      },
      intent_discovery: {
        query: "apps to help me be more productive",
        method: "intent",
        userIntent: "discovery",
        limit: 10
      },
      intent_specific: {
        query: "Notion alternative for note taking",
        method: "intent", 
        userIntent: "specific",
        limit: 5
      },
      category_preference: {
        query: "fitness health wellness",
        method: "category",
        preferredCategories: ["Health & Fitness", "Lifestyle"],
        limit: 10
      },
      personalized: {
        query: "apps for daily routine",
        lifestyle: ["busy", "professional"],
        improve: ["productivity", "organization"],
        wishText: "I want to organize my daily tasks better",
        limit: 8
      }
    },
    config_options: {
      semantic_weight: "Weight for semantic scores (0-1, default: 0.6)",
      keyword_weight: "Weight for keyword scores (0-1, default: 0.4)", 
      rrf_k: "RRF parameter (default: 60)",
      diversity_boost: "Boost for category diversity (default: 0.1)",
      quality_boost: "Boost for high-rated apps (default: 0.1)",
      min_score_threshold: "Minimum score to include (default: 0.3)"
    }
  });
}