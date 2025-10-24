import { NextRequest, NextResponse } from 'next/server';
import { 
  keywordRetrieval,
  enhancedKeywordSearch,
  intentBasedKeywordSearch
} from '@/lib/recommendation/retrievers/keyword-retriever';

export async function POST(request: NextRequest) {
  try {
    const { 
      query,
      method = 'basic',
      preferredCategories = [],
      userIntent = 'discovery',
      limit = 10 
    } = await request.json();

    console.log(`🧪 Testing keyword retrieval for: "${query}" (method: ${method})`);

    let results;
    
    switch (method) {
      case 'enhanced':
        results = await enhancedKeywordSearch(query, preferredCategories, { limit });
        break;
      case 'intent':
        results = await intentBasedKeywordSearch(query, userIntent, limit);
        break;
      default:
        results = await keywordRetrieval(query, limit);
        break;
    }

    console.log(`✅ Found ${results.length} keyword matches`);

    // Format response
    const recommendations = results.map((result, index) => ({
      rank: index + 1,
      app_id: result.app_id,
      name: result.app_data.name,
      category: result.app_data.category,
      rating: result.app_data.rating,
      icon_url: result.app_data.icon_url,
      description: result.app_data.description?.substring(0, 150) + '...',
      keyword_score: parseFloat(result.keyword_score.toFixed(3)),
      matched_keywords: result.matched_keywords.slice(0, 5),
      retrieval_method: result.retrieval_method,
      retrieval_score: parseFloat(result.retrieval_score.toFixed(3))
    }));

    return NextResponse.json({
      success: true,
      query,
      method,
      results_count: recommendations.length,
      recommendations,
      metadata: {
        search_type: 'keyword',
        tfidf_based: true,
        processing_time: Date.now()
      }
    });

  } catch (error) {
    console.error('❌ Keyword search test error:', error);
    
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
    message: 'Keyword Search Test API',
    usage: 'POST with { query, method?, preferredCategories?, userIntent?, limit? }',
    methods: {
      basic: 'Standard TF-IDF keyword matching',
      enhanced: 'Keyword matching with category boosting',
      intent: 'Intent-based keyword weighting'
    },
    examples: {
      basic: {
        query: "budget expense tracking",
        limit: 5
      },
      enhanced: {
        query: "fitness health workout",
        method: "enhanced",
        preferredCategories: ["Health & Fitness"],
        limit: 10
      },
      intent: {
        query: "apps to help me learn languages",
        method: "intent",
        userIntent: "problem_solving",
        limit: 8
      }
    }
  });
}