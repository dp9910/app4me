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

    // Step 2: Neural re-ranking with optimized DeepSeek performance
    console.log('🧠 Starting neural re-ranking with DeepSeek...');
    
    let rerankedResults;
    try {
      rerankedResults = await neuralRerank(candidates, userContext, {
        batch_size: 3, // Optimized for DeepSeek 7s response time
        llm_weight: 0.6,
        retrieval_weight: 0.4,
        confidence_threshold: 0.3
      });
      
      console.log(`✅ Neural re-ranking completed: ${rerankedResults.length} results`);
    } catch (error) {
      console.error('⚠️ Neural re-ranking failed, using fallback:', error.message);
      
      // Fallback to smart retrieval with generated content
      rerankedResults = candidates.map(result => ({
        ...result,
        llm_relevance_score: 7.0 + (result.final_score * 3), // Scale to 0-10
        personalized_oneliner: generatePersonalizedOneliner(result, userContext),
        match_explanation: result.explanation || generateMatchExplanation(result, userContext),
        llm_confidence: Math.min(0.9, 0.6 + result.final_score * 0.3),
        score_breakdown: {
          retrieval_score: result.final_score,
          llm_score: 0.7,
          confidence_boost: result.final_score > 0.8 ? 0.1 : 0
        }
      }));
    }
    
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
        final_results: formattedResults.length,
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

// Helper functions for generating personalized content
function generatePersonalizedOneliner(result: any, userContext: any): string {
  const category = result.app_data.category.toLowerCase();
  const appName = result.app_data.name;
  const query = userContext.query?.toLowerCase() || '';
  
  // Generate context-aware one-liners based on the search
  if (query.includes('plant') || query.includes('garden')) {
    if (category.includes('design')) return `Perfect for garden enthusiasts - design your dream plant paradise with AI assistance`;
    if (category.includes('productivity')) return `Perfect for plant lovers - grow your focus while nurturing your green thumb`;
    if (appName.toLowerCase().includes('garden')) return `Perfect for aspiring gardeners - transform your space into a thriving garden`;
    return `Perfect for plant care - discover apps that help you nurture and grow plants`;
  }
  
  if (query.includes('productiv')) {
    return `Perfect for busy professionals - streamline your workflow and boost daily productivity`;
  }
  
  if (query.includes('meditat') || query.includes('mindful')) {
    return `Perfect for mindfulness seekers - find peace and clarity in your daily routine`;
  }
  
  if (query.includes('learn')) {
    return `Perfect for learners - expand your knowledge with engaging educational content`;
  }
  
  // Default based on category and lifestyle
  const lifestyle = userContext.lifestyle_tags?.[0] || 'general';
  return `Perfect for ${lifestyle} users - ${category} app that enhances your daily life`;
}

function generateMatchExplanation(result: any, userContext: any): string {
  const reasons = [];
  
  if (result.final_score > 0.8) {
    reasons.push('excellent relevance match');
  } else if (result.final_score > 0.6) {
    reasons.push('strong content alignment');
  } else {
    reasons.push('relevant to your interests');
  }
  
  if (result.app_data.rating > 4.5) {
    reasons.push('highly rated by users');
  } else if (result.app_data.rating > 4.0) {
    reasons.push('well-reviewed by community');
  }
  
  if (result.matched_concepts?.length > 0) {
    reasons.push(`matches key concepts: ${result.matched_concepts.slice(0, 2).join(', ')}`);
  }
  
  return `Recommended because: ${reasons.join(', ')}`;
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