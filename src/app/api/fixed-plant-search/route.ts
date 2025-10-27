import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    
    console.log(`🌱 FIXED plant search for: "${query}"`);
    
    // Step 1: Get initial plant-related apps using improved keyword matching
    console.log('🔍 Step 1: Getting initial plant-related apps...');
    const initialPlantApps = await getInitialPlantApps();
    console.log(`✅ Found ${initialPlantApps.length} initial plant apps`);
    
    // Step 2: Apply TF-IDF filtering to remove false positives
    console.log('📊 Step 2: Applying TF-IDF filtering...');
    const filteredApps = await applyAdvancedPlantFiltering(initialPlantApps, query);
    console.log(`🔍 After TF-IDF filtering: ${filteredApps.length} apps`);
    
    // Step 3: Score and rank by plant care relevance
    console.log('🏆 Step 3: Scoring by plant care relevance...');
    const rankedApps = scoreByPlantCareRelevance(filteredApps, query);
    console.log(`✅ Final ranking complete: ${rankedApps.length} apps`);
    
    // Get old method for comparison
    const oldResults = await getOldMethodResults();
    
    return NextResponse.json({
      success: true,
      query,
      fixed_method: {
        results: rankedApps.slice(0, 10),
        total_found: rankedApps.length,
        method: 'improved_keyword_tfidf_filtering'
      },
      old_method: {
        results: oldResults.slice(0, 10),
        total_found: oldResults.length,
        method: 'broad_keyword_search'
      },
      comparison: {
        fixed_count: rankedApps.length,
        old_count: oldResults.length,
        false_positives_removed: Math.max(0, oldResults.length - rankedApps.length),
        precision_improvement: calculatePrecisionImprovement(rankedApps, oldResults)
      },
      debug: {
        initial_apps: initialPlantApps.length,
        after_filtering: filteredApps.length,
        final_ranked: rankedApps.length
      }
    });
    
  } catch (error: any) {
    console.error('❌ Fixed plant search error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to perform fixed plant search'
    }, { status: 500 });
  }
}

/**
 * Get initial plant-related apps using improved keyword matching
 */
async function getInitialPlantApps() {
  // Use more targeted plant-specific keywords
  const plantQueries = [
    'title.ilike.%plant care%',
    'title.ilike.%planta%',
    'title.ilike.%garden%',
    'title.ilike.%botanical%',
    'title.ilike.%flora%',
    'description.ilike.%plant care%',
    'description.ilike.%plant identification%',
    'description.ilike.%plant health%',
    'description.ilike.%plant journal%',
    'description.ilike.%plant watering%',
    'description.ilike.%gardening%',
    'description.ilike.%botanical%',
    'description.ilike.%horticulture%'
  ];
  
  const { data: apps, error } = await supabase
    .from('apps_unified')
    .select('id, title, description, primary_category, rating, icon_url')
    .or(plantQueries.join(','))
    .limit(100);
  
  if (error) throw error;
  
  return apps || [];
}

/**
 * Apply advanced filtering using TF-IDF and context analysis
 */
async function applyAdvancedPlantFiltering(apps: any[], query: string) {
  const filteredApps = [];
  
  // Get TF-IDF data for all apps
  const appIds = apps.map(app => app.id);
  const { data: tfidfData, error } = await supabase
    .from('app_features')
    .select('app_id, keywords_tfidf, primary_use_case')
    .in('app_id', appIds);
  
  if (error) {
    console.warn('TF-IDF data not available, using basic filtering');
    return apps.filter(app => isPlantRelatedByName(app));
  }
  
  const tfidfMap = new Map();
  tfidfData.forEach(item => {
    tfidfMap.set(item.app_id, item);
  });
  
  for (const app of apps) {
    const tfidfInfo = tfidfMap.get(app.id);
    
    // Check if app is definitely plant-related by name/description
    if (isPlantRelatedByName(app)) {
      filteredApps.push({
        ...app,
        plant_score: 0.9,
        match_reason: 'clearly_plant_related',
        confidence: 'high'
      });
      continue;
    }
    
    // Use TF-IDF to check if plant terms are meaningful
    if (tfidfInfo) {
      const plantScore = calculatePlantRelevanceScore(app, tfidfInfo);
      
      if (plantScore.score > 0.3) {
        filteredApps.push({
          ...app,
          plant_score: plantScore.score,
          match_reason: plantScore.reason,
          plant_keywords: plantScore.keywords,
          confidence: plantScore.score > 0.7 ? 'high' : 'medium'
        });
      }
    }
  }
  
  return filteredApps;
}

/**
 * Check if app is clearly plant-related by name/description analysis
 */
function isPlantRelatedByName(app: any): boolean {
  const title = app.title.toLowerCase();
  const description = (app.description || '').toLowerCase();
  
  // Definite plant care apps
  const definitelyPlantTerms = [
    'planta', 'plantnet', 'plant care', 'plant doctor', 'plant journal',
    'plant identification', 'plant health', 'plant watering', 'plant scanner',
    'gardenize', 'garden planner', 'garden journal', 'garden care',
    'botanical', 'flora identification', 'leafsnap', 'plantsome'
  ];
  
  for (const term of definitelyPlantTerms) {
    if (title.includes(term) || description.includes(term)) {
      return true;
    }
  }
  
  // Apps with "garden" but exclude non-plant contexts
  if (title.includes('garden') || description.includes('garden')) {
    const nonPlantGardenTerms = ['olive garden', 'beer garden', 'garden state', 'covent garden'];
    const isNonPlantGarden = nonPlantGardenTerms.some(term => 
      title.includes(term) || description.includes(term)
    );
    
    if (!isNonPlantGarden) {
      return true;
    }
  }
  
  return false;
}

/**
 * Calculate plant relevance score using TF-IDF data
 */
function calculatePlantRelevanceScore(app: any, tfidfInfo: any) {
  const keywords = tfidfInfo.keywords_tfidf?.keywords || {};
  const primaryUseCase = tfidfInfo.primary_use_case || '';
  
  // High-value plant keywords with weights
  const plantKeywords = {
    'plant': 3.0, 'plants': 3.0, 'garden': 2.5, 'gardening': 3.0,
    'care': 2.0, 'grow': 2.5, 'growing': 2.5, 'water': 1.5, 'watering': 3.0,
    'soil': 2.5, 'fertilizer': 2.5, 'pruning': 3.0, 'botanical': 3.0,
    'flower': 2.0, 'flowers': 2.0, 'tree': 1.5, 'trees': 1.5,
    'herb': 2.0, 'herbs': 2.0, 'succulent': 2.5, 'houseplant': 3.0,
    'identify': 2.0, 'identification': 2.5, 'species': 2.0,
    'cultivate': 2.5, 'cultivation': 2.5, 'horticulture': 3.0
  };
  
  let score = 0;
  const matchedKeywords = [];
  
  // Calculate TF-IDF weighted score
  for (const [keyword, weight] of Object.entries(plantKeywords)) {
    if (keywords[keyword]) {
      const tfidfScore = parseFloat(keywords[keyword]);
      if (!isNaN(tfidfScore)) {
        score += tfidfScore * weight;
        matchedKeywords.push(keyword);
      }
    }
  }
  
  // Bonus for plant-related primary use case
  const plantUseCases = [
    'plant care', 'garden', 'botanical', 'ai garden', 'landscape design',
    'plant identification', 'gardening'
  ];
  
  if (plantUseCases.some(useCase => 
    primaryUseCase.toLowerCase().includes(useCase)
  )) {
    score += 0.5;
    matchedKeywords.push('plant_use_case');
  }
  
  // Penalty for false positive contexts
  const falsePositiveKeywords = ['restaurant', 'food', 'pizza', 'dining', 'menu'];
  for (const keyword of falsePositiveKeywords) {
    if (keywords[keyword]) {
      score -= 0.3;
    }
  }
  
  let reason = 'low_plant_relevance';
  if (score > 1.5) {
    reason = 'high_plant_tfidf_score';
  } else if (score > 0.8) {
    reason = 'moderate_plant_tfidf_score';
  } else if (matchedKeywords.length > 0) {
    reason = 'some_plant_keywords_found';
  }
  
  return {
    score: Math.min(score, 3.0),
    keywords: matchedKeywords,
    reason
  };
}

/**
 * Score and rank apps by plant care relevance
 */
function scoreByPlantCareRelevance(apps: any[], query: string) {
  return apps
    .map(app => ({
      ...app,
      final_score: calculateFinalPlantCareScore(app, query)
    }))
    .sort((a, b) => b.final_score - a.final_score);
}

/**
 * Calculate final plant care relevance score
 */
function calculateFinalPlantCareScore(app: any, query: string): number {
  let score = 0;
  
  // Base plant score (most important factor)
  score += (app.plant_score || 0) * 0.6;
  
  // Confidence boost
  if (app.confidence === 'high') {
    score += 0.2;
  } else if (app.confidence === 'medium') {
    score += 0.1;
  }
  
  // Quality bonus (capped to prevent dominance)
  const ratingBonus = Math.min(0.15, (app.rating / 5.0) * 0.15);
  score += ratingBonus;
  
  // Category relevance
  const plantCategories = ['lifestyle', 'reference', 'education', 'productivity'];
  if (plantCategories.includes(app.primary_category?.toLowerCase())) {
    score += 0.05;
  }
  
  // Boost for apps with clear plant focus in name
  const title = app.title.toLowerCase();
  if (title.includes('plant') || title.includes('garden') || title.includes('flora')) {
    score += 0.1;
  }
  
  return score;
}

/**
 * Get old method results for comparison
 */
async function getOldMethodResults() {
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
 * Calculate precision improvement
 */
function calculatePrecisionImprovement(fixedResults: any[], oldResults: any[]) {
  const fixedPlantCount = fixedResults.filter(r => r.confidence === 'high').length;
  const oldPlantCount = oldResults.filter(r => {
    const name = r.app_data.name.toLowerCase();
    return name.includes('plant') || name.includes('garden') || name.includes('flora');
  }).length;
  
  const fixedPrecision = fixedResults.length > 0 ? fixedPlantCount / fixedResults.length : 0;
  const oldPrecision = oldResults.length > 0 ? oldPlantCount / oldResults.length : 0;
  
  return {
    fixed_precision: fixedPrecision,
    old_precision: oldPrecision,
    improvement: fixedPrecision - oldPrecision,
    high_confidence_apps: fixedPlantCount
  };
}