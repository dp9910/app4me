import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { smartHybridRetrieval } from '@/lib/recommendation/retrievers/smart-hybrid-retriever';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    
    console.log(`🌱 Testing IMPROVED plant search for: "${query}"`);
    
    // Step 1: Use Smart Hybrid Retriever for intent-aware search
    console.log('🧠 Step 1: Running Smart Hybrid Retrieval...');
    const smartResults = await smartHybridRetrieval(query, 20);
    console.log(`✅ Smart Hybrid found ${smartResults.length} results`);
    
    // Step 2: Apply plant-specific filtering
    console.log('🌿 Step 2: Applying plant-specific TF-IDF filtering...');
    const plantFilteredResults = await applyPlantSpecificFiltering(smartResults, query);
    console.log(`🔍 After plant filtering: ${plantFilteredResults.length} results`);
    
    // Step 3: Re-rank by plant care relevance
    console.log('📊 Step 3: Re-ranking by plant care relevance...');
    const finalResults = await reRankByPlantRelevance(plantFilteredResults, query);
    console.log(`🏆 Final results: ${finalResults.length}`);
    
    // For comparison, also get the OLD method results
    console.log('📝 Getting OLD method results for comparison...');
    const oldResults = await getOldMethodResults(query);
    
    return NextResponse.json({
      success: true,
      query,
      improved_method: {
        results: finalResults.slice(0, 10),
        total_found: finalResults.length,
        method: 'smart_hybrid_with_plant_filtering'
      },
      old_method: {
        results: oldResults.slice(0, 10),
        total_found: oldResults.length,
        method: 'broad_keyword_search'
      },
      comparison: {
        improved_count: finalResults.length,
        old_count: oldResults.length,
        false_positives_removed: Math.max(0, oldResults.length - finalResults.length),
        quality_improvement: calculateQualityImprovement(finalResults, oldResults)
      }
    });
    
  } catch (error: any) {
    console.error('❌ Improved plant search test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to test improved plant search'
    }, { status: 500 });
  }
}

/**
 * Apply plant-specific filtering using TF-IDF scores
 */
async function applyPlantSpecificFiltering(results: any[], query: string) {
  console.log('🔍 Applying plant-specific TF-IDF filtering...');
  
  // Get app IDs from results
  const appIds = results.map(r => r.app_id);
  
  if (appIds.length === 0) return [];
  
  // Get TF-IDF data for these apps
  const { data: tfidfData, error } = await supabase
    .from('app_features')
    .select('app_id, keywords_tfidf, primary_use_case')
    .in('app_id', appIds);
  
  if (error) {
    console.error('Error fetching TF-IDF data:', error);
    return results; // Return original results if TF-IDF fails
  }
  
  const tfidfMap = new Map();
  tfidfData.forEach(item => {
    tfidfMap.set(item.app_id.toString(), item);
  });
  
  // Filter results based on plant-specific TF-IDF relevance
  const filteredResults = [];
  
  for (const result of results) {
    const tfidfInfo = tfidfMap.get(result.app_id);
    
    if (!tfidfInfo) {
      // If no TF-IDF data, check if app name/description clearly indicates plant care
      if (isDefinitelyPlantRelated(result.app_data)) {
        filteredResults.push({
          ...result,
          plant_relevance_score: 0.8,
          plant_match_reason: 'clearly_plant_related_name'
        });
      }
      continue;
    }
    
    const plantScore = calculatePlantTFIDFScore(tfidfInfo, query);
    
    // Only include if plant relevance score is above threshold
    if (plantScore.relevance_score > 0.3) {
      filteredResults.push({
        ...result,
        plant_relevance_score: plantScore.relevance_score,
        plant_match_reason: plantScore.reason,
        plant_keywords: plantScore.matched_keywords
      });
    }
  }
  
  return filteredResults;
}

/**
 * Calculate plant-specific TF-IDF relevance score
 */
function calculatePlantTFIDFScore(tfidfInfo: any, query: string) {
  const keywords = tfidfInfo.keywords_tfidf?.keywords || {};
  const primaryUseCase = tfidfInfo.primary_use_case || '';
  
  // Plant-specific high-value keywords
  const plantKeywords = {
    // Core plant care terms
    'plant': 2.0, 'plants': 2.0, 'garden': 1.8, 'gardening': 2.0,
    'care': 1.5, 'grow': 1.8, 'growing': 1.8, 'cultivation': 2.0,
    'watering': 2.0, 'water': 1.2, 'soil': 1.8, 'fertilizer': 1.8,
    'pruning': 2.0, 'botanical': 2.0, 'botany': 2.0,
    
    // Plant types and features
    'flower': 1.5, 'flowers': 1.5, 'tree': 1.3, 'trees': 1.3,
    'herb': 1.6, 'herbs': 1.6, 'vegetable': 1.4, 'vegetables': 1.4,
    'succulent': 1.8, 'succulents': 1.8, 'houseplant': 2.0,
    
    // Plant care activities
    'repot': 2.0, 'repotting': 2.0, 'transplant': 1.8,
    'identify': 1.6, 'identification': 1.8, 'diagnose': 1.7,
    'pest': 1.5, 'disease': 1.4, 'health': 1.2,
    
    // Gardening activities
    'landscaping': 1.6, 'landscape': 1.4, 'greenhouse': 1.8,
    'seedling': 1.8, 'seeds': 1.6, 'planting': 1.8,
    'harvest': 1.4, 'organic': 1.3
  };
  
  let score = 0;
  const matchedKeywords = [];
  
  // Score based on TF-IDF values for plant keywords
  for (const [keyword, weight] of Object.entries(plantKeywords)) {
    if (keywords[keyword]) {
      const tfidfScore = parseFloat(keywords[keyword]);
      if (!isNaN(tfidfScore)) {
        score += tfidfScore * weight;
        matchedKeywords.push(keyword);
      }
    }
  }
  
  // Bonus for primary use case being plant-related
  if (primaryUseCase && isPlantRelatedUseCase(primaryUseCase)) {
    score += 0.5;
    matchedKeywords.push('plant_use_case');
  }
  
  // Penalty for non-plant contexts (common false positives)
  const nonPlantKeywords = ['manufacturing', 'industrial', 'power', 'nuclear', 'chemical', 'factory'];
  for (const keyword of nonPlantKeywords) {
    if (keywords[keyword]) {
      score -= 0.3; // Reduce score for industrial contexts
    }
  }
  
  let reason = 'low_plant_relevance';
  if (score > 1.0) {
    reason = 'high_plant_tfidf_score';
  } else if (score > 0.5) {
    reason = 'moderate_plant_tfidf_score';
  } else if (matchedKeywords.length > 0) {
    reason = 'some_plant_keywords_found';
  }
  
  return {
    relevance_score: Math.min(score, 2.0), // Cap at 2.0
    matched_keywords: matchedKeywords,
    reason
  };
}

/**
 * Check if app name/description clearly indicates plant care
 */
function isDefinitelyPlantRelated(appData: any): boolean {
  const name = appData.name.toLowerCase();
  const description = (appData.description || '').toLowerCase();
  
  // Apps with clear plant care focus in their name
  const definitelyPlantNames = [
    'planta', 'plantsome', 'plantnet', 'plantin', 'plantkeeper',
    'gardenize', 'garden', 'flora', 'botanical', 'greenhouse',
    'leafsnap', 'plantscanner', 'plantidentifier'
  ];
  
  for (const plantName of definitelyPlantNames) {
    if (name.includes(plantName)) {
      return true;
    }
  }
  
  // Check for clear plant care descriptions
  const plantCareIndicators = [
    'plant care', 'plant identification', 'garden management',
    'plant journal', 'plant health', 'plant watering',
    'plant doctor', 'garden planner', 'botanical guide'
  ];
  
  for (const indicator of plantCareIndicators) {
    if (description.includes(indicator)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if use case is plant-related
 */
function isPlantRelatedUseCase(useCase: string): boolean {
  const plantUseCases = [
    'plant care', 'gardening', 'botanical', 'agriculture',
    'horticulture', 'landscaping', 'plant identification'
  ];
  
  const useCaseLower = useCase.toLowerCase();
  return plantUseCases.some(plantUse => useCaseLower.includes(plantUse));
}

/**
 * Re-rank results by plant care relevance
 */
async function reRankByPlantRelevance(results: any[], query: string) {
  return results
    .map(result => ({
      ...result,
      final_relevance_score: calculateFinalPlantScore(result, query)
    }))
    .sort((a, b) => b.final_relevance_score - a.final_relevance_score);
}

/**
 * Calculate final plant care relevance score
 */
function calculateFinalPlantScore(result: any, query: string): number {
  let score = 0;
  
  // Base score from Smart Hybrid Retriever
  score += (result.final_score || 0) * 0.4;
  
  // Plant-specific relevance score
  score += (result.plant_relevance_score || 0) * 0.4;
  
  // Intent match score
  score += (result.intent_match_score || 0) * 0.2;
  
  // Bonus for apps clearly about plant care
  if (result.plant_match_reason === 'clearly_plant_related_name') {
    score += 0.3;
  }
  
  if (result.plant_match_reason === 'high_plant_tfidf_score') {
    score += 0.2;
  }
  
  // Quality bonus for highly rated apps (but capped to prevent Wish/craigslist dominance)
  const ratingBonus = Math.min(0.1, (result.app_data.rating / 5.0) * 0.1);
  score += ratingBonus;
  
  return score;
}

/**
 * Get results using the old broad keyword method for comparison
 */
async function getOldMethodResults(query: string) {
  const { data: allPlantApps, error } = await supabase
    .from('apps_unified')
    .select('id, title, description, primary_category, rating, icon_url')
    .or('title.ilike.%plant%,description.ilike.%plant%,title.ilike.%garden%,description.ilike.%garden%,title.ilike.%nature%,description.ilike.%nature%,title.ilike.%flower%,description.ilike.%flower%,title.ilike.%botanical%,description.ilike.%botanical%')
    .limit(50);
  
  if (error) throw error;
  
  return allPlantApps.map(app => ({
    app_id: app.id.toString(),
    app_data: {
      name: app.title,
      category: app.primary_category,
      rating: app.rating || 0,
      icon_url: app.icon_url,
      description: app.description
    },
    method: 'old_broad_keyword'
  }));
}

/**
 * Calculate quality improvement metrics
 */
function calculateQualityImprovement(improvedResults: any[], oldResults: any[]) {
  // Count how many improved results are clearly plant-related
  const improvedPlantCount = improvedResults.filter(r => 
    r.plant_relevance_score > 0.5 || 
    r.plant_match_reason === 'clearly_plant_related_name'
  ).length;
  
  // Estimate how many old results are clearly plant-related (simple heuristic)
  const oldPlantCount = oldResults.filter(r => {
    const name = r.app_data.name.toLowerCase();
    const desc = (r.app_data.description || '').toLowerCase();
    return name.includes('plant') || name.includes('garden') || 
           desc.includes('plant care') || desc.includes('garden');
  }).length;
  
  const improvedPrecision = improvedResults.length > 0 ? improvedPlantCount / improvedResults.length : 0;
  const oldPrecision = oldResults.length > 0 ? oldPlantCount / oldResults.length : 0;
  
  return {
    improved_precision: improvedPrecision,
    old_precision: oldPrecision,
    precision_improvement: improvedPrecision - oldPrecision,
    improved_plant_relevant: improvedPlantCount,
    old_plant_relevant: oldPlantCount
  };
}