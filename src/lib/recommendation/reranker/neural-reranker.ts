/**
 * Neural Re-Ranking with Gemini LLM
 * Provides context-aware re-ranking of candidate apps using LLM intelligence
 * Generates personalized explanations and confidence scores
 */

import OpenAI from 'openai';
import { SmartSearchResult } from '../retrievers/smart-hybrid-retriever';

const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY!,
});

export interface RerankedResult extends SmartSearchResult {
  llm_relevance_score: number;
  personalized_oneliner: string;
  match_explanation: string;
  llm_confidence: number;
  final_score: number;
  rerank_position: number;
  score_breakdown: {
    retrieval_score: number;
    llm_score: number;
    confidence_boost: number;
    diversity_penalty?: number;
  };
}

export interface UserContext {
  query: string;
  lifestyle_tags?: string[];
  preferred_use_cases?: string[];
  preferred_complexity?: 'beginner' | 'intermediate' | 'advanced';
  rejected_app_ids?: string[];
  current_context?: string; // e.g., "work", "home", "travel"
}

/**
 * Main neural re-ranking function using Gemini LLM
 */
export async function neuralRerank(
  candidates: SmartSearchResult[],
  userContext: UserContext,
  options: {
    batch_size?: number;
    llm_weight?: number;
    retrieval_weight?: number;
    confidence_threshold?: number;
  } = {}
): Promise<RerankedResult[]> {
  const {
    batch_size = 8,
    llm_weight = 0.7,
    retrieval_weight = 0.3,
    confidence_threshold = 0.3
  } = options;

  console.log(`🧠 Neural re-ranking ${candidates.length} candidates with Gemini...`);
  
  if (candidates.length === 0) {
    return [];
  }

  const results: RerankedResult[] = [];
  
  // Process candidates in smaller batches for DeepSeek performance (7s per batch)
  // Reduced from 8 to 3 apps per batch due to 7+ second response times
  const optimized_batch_size = Math.min(batch_size, 3);
  for (let i = 0; i < Math.min(candidates.length, 15); i += optimized_batch_size) {
    const batch = candidates.slice(i, i + optimized_batch_size);
    
    try {
      const batchResults = await processLLMBatch(batch, userContext);
      
      // Calculate final scores and add to results
      for (const llmResult of batchResults) {
        const originalCandidate = batch.find(c => c.app_id === llmResult.app_id);
        if (originalCandidate) {
          const finalResult = calculateFinalScore(
            originalCandidate, 
            llmResult, 
            llm_weight, 
            retrieval_weight
          );
          
          // Only include if confidence is above threshold
          if (finalResult.llm_confidence >= confidence_threshold) {
            results.push(finalResult);
          }
        }
      }
    } catch (error) {
      console.error(`⚠️ LLM batch ${i} failed:`, error.message);
      
      // Fallback: use original scores
      const fallbackResults = batch.map(candidate => ({
        ...candidate,
        llm_relevance_score: 5.0, // Neutral score
        personalized_oneliner: generateFallbackOneliner(candidate, userContext),
        match_explanation: `Matches your search for "${userContext.query}"`,
        llm_confidence: 0.5,
        final_score: candidate.final_score,
        rerank_position: 0,
        score_breakdown: {
          retrieval_score: candidate.final_score,
          llm_score: 0.5,
          confidence_boost: 0
        }
      }));
      
      results.push(...fallbackResults);
    }
  }
  
  // Sort by final score and assign rerank positions
  const sortedResults = results
    .sort((a, b) => b.final_score - a.final_score)
    .map((result, index) => ({
      ...result,
      rerank_position: index + 1
    }));
  
  console.log(`✅ Neural re-ranking completed: ${sortedResults.length} results`);
  
  return sortedResults;
}

/**
 * Processes a batch of candidates through DeepSeek LLM
 */
async function processLLMBatch(
  batch: SmartSearchResult[],
  userContext: UserContext
): Promise<any[]> {
  const prompt = `You are an expert app recommendation AI. Re-rank these apps based on relevance to the user's specific needs and context.

USER CONTEXT:
Query: "${userContext.query}"
Lifestyle: ${userContext.lifestyle_tags?.join(', ') || 'general user'}
Interests: ${userContext.preferred_use_cases?.slice(0, 5).join(', ') || 'general'}
Experience level: ${userContext.preferred_complexity || 'any level'}
Context: ${userContext.current_context || 'general usage'}

CANDIDATE APPS:
${batch.map((app, idx) => `
${idx + 1}. ${app.app_data.name}
   Category: ${app.app_data.category}
   Rating: ${app.app_data.rating}/5
   Description: ${app.app_data.description?.substring(0, 120) || 'No description'}...
   Current score: ${app.final_score.toFixed(3)}
   Found via: ${app.matched_concepts?.join(', ') || 'general search'}
`).join('\n')}

TASK:
For each app, provide:
1. relevance_score (0-10): How well it matches the user's query and context
2. personalized_oneliner: A compelling one-liner in format "Perfect for [user situation] - [specific benefit]"
3. match_explanation: Why this app is relevant (max 25 words)
4. confidence: How confident you are in this recommendation (0-1)

Consider:
- Direct relevance to the query
- Alignment with user's lifestyle and interests
- App quality and user ratings
- Uniqueness of the solution

Return JSON array with EXACT app_ids:
[
${batch.map(app => `  {
    "app_id": "${app.app_id}",
    "relevance_score": 8.5,
    "personalized_oneliner": "Perfect for [user type] - [specific benefit]",
    "match_explanation": "Brief explanation why this matches user needs",
    "confidence": 0.9
  }`).join(',\n')}
]

CRITICAL: Use the EXACT app_id values provided above. Return ONLY the JSON array:`;

  const completion = await Promise.race([
    openai.chat.completions.create({
      messages: [
        { role: "system", content: "You are an expert app recommendation AI. Respond only with valid JSON arrays." },
        { role: "user", content: prompt }
      ],
      model: "deepseek-chat",
      temperature: 0.3,
      max_tokens: 1500 // Reduced token limit for faster responses
    }),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('DeepSeek request timeout (15s)')), 15000)
    )
  ]) as any;

  const text = completion.choices[0].message.content?.trim() || '';
  
  // Handle markdown code blocks from DeepSeek
  let jsonText = text;
  if (text.includes('```json')) {
    const codeBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1];
    }
  }
  
  // Extract JSON from response
  const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Could not extract JSON from LLM response');
  }
  
  const parsed = JSON.parse(jsonMatch[0]);
  
  // Validate and clean results
  return parsed
    .filter((item: any) => item.app_id && typeof item.relevance_score === 'number')
    .map((item: any) => ({
      app_id: item.app_id,
      relevance_score: Math.min(10, Math.max(0, item.relevance_score)),
      personalized_oneliner: item.personalized_oneliner || 'Great app for your needs',
      match_explanation: item.match_explanation || 'Relevant to your search',
      confidence: Math.min(1, Math.max(0, item.confidence || 0.5))
    }));
}

/**
 * Calculates final score combining retrieval and LLM scores
 */
function calculateFinalScore(
  candidate: SmartSearchResult,
  llmResult: any,
  llm_weight: number,
  retrieval_weight: number
): RerankedResult {
  const retrieval_score = candidate.final_score;
  const llm_score = llmResult.relevance_score / 10; // Normalize to 0-1
  
  // Confidence boost for high-confidence recommendations
  const confidence_boost = llmResult.confidence > 0.8 ? 0.1 : 0;
  
  const final_score = 
    (retrieval_weight * retrieval_score) + 
    (llm_weight * llm_score) + 
    confidence_boost;
  
  return {
    ...candidate,
    llm_relevance_score: llmResult.relevance_score,
    personalized_oneliner: llmResult.personalized_oneliner,
    match_explanation: llmResult.match_explanation,
    llm_confidence: llmResult.confidence,
    final_score: final_score,
    rerank_position: 0, // Will be set later
    score_breakdown: {
      retrieval_score: retrieval_score,
      llm_score: llm_score,
      confidence_boost: confidence_boost
    }
  };
}

/**
 * Generates fallback oneliner when LLM fails
 */
function generateFallbackOneliner(
  candidate: SmartSearchResult,
  userContext: UserContext
): string {
  const category = candidate.app_data.category.toLowerCase();
  const rating = candidate.app_data.rating;
  
  if (rating > 4.5) {
    return `Highly-rated ${category} app - trusted by users for ${userContext.query.toLowerCase()}`;
  } else if (category.includes('productiv')) {
    return `Streamline your workflow - helps with ${userContext.query.toLowerCase()}`;
  } else if (category.includes('health') || category.includes('fitness')) {
    return `Support your wellness journey - designed for ${userContext.query.toLowerCase()}`;
  } else {
    return `Perfect for ${userContext.query.toLowerCase()} - ${category} solution that works`;
  }
}

/**
 * Advanced re-ranking with contextual factors
 */
export async function contextualRerank(
  candidates: SmartSearchResult[],
  userContext: UserContext & {
    time_of_day?: 'morning' | 'afternoon' | 'evening';
    device_type?: 'mobile' | 'tablet' | 'desktop';
    usage_intent?: 'quick' | 'deep' | 'explore';
  },
  limit: number = 10
): Promise<RerankedResult[]> {
  console.log(`🎯 Contextual re-ranking with ${Object.keys(userContext).length} context factors`);
  
  // First, apply neural re-ranking
  const neuralResults = await neuralRerank(candidates, userContext);
  
  // Then apply contextual adjustments
  const contextuallyAdjusted = neuralResults.map(result => {
    let contextual_boost = 0;
    
    // Time-based adjustments
    if (userContext.time_of_day === 'morning' && 
        result.app_data.category.includes('Productivity')) {
      contextual_boost += 0.1;
    }
    
    if (userContext.time_of_day === 'evening' && 
        (result.app_data.category.includes('Entertainment') || 
         result.app_data.category.includes('Health'))) {
      contextual_boost += 0.1;
    }
    
    // Usage intent adjustments
    if (userContext.usage_intent === 'quick' && 
        result.app_data.description?.includes('simple')) {
      contextual_boost += 0.05;
    }
    
    if (userContext.usage_intent === 'deep' && 
        result.app_data.rating > 4.0) {
      contextual_boost += 0.1;
    }
    
    return {
      ...result,
      final_score: result.final_score + contextual_boost,
      score_breakdown: {
        ...result.score_breakdown,
        contextual_boost
      }
    };
  });
  
  return contextuallyAdjusted
    .sort((a, b) => b.final_score - a.final_score)
    .slice(0, limit)
    .map((result, index) => ({
      ...result,
      rerank_position: index + 1
    }));
}

/**
 * Applies diversity penalty to avoid too many similar apps
 */
export function applyDiversityPenalty(
  results: RerankedResult[],
  diversity_factor: number = 0.2
): RerankedResult[] {
  const usedCategories = new Set<string>();
  const usedUseCases = new Set<string>();
  
  return results.map(result => {
    let diversity_penalty = 0;
    
    // Penalty for duplicate categories
    if (usedCategories.has(result.app_data.category)) {
      diversity_penalty += diversity_factor;
    }
    
    // Penalty for duplicate use cases
    const appUseCases = result.app_data.use_cases || [];
    const overlap = appUseCases.filter(uc => usedUseCases.has(uc)).length;
    if (overlap > 0) {
      diversity_penalty += (overlap / appUseCases.length) * diversity_factor;
    }
    
    // Track used categories and use cases
    usedCategories.add(result.app_data.category);
    appUseCases.forEach(uc => usedUseCases.add(uc));
    
    return {
      ...result,
      final_score: result.final_score - diversity_penalty,
      score_breakdown: {
        ...result.score_breakdown,
        diversity_penalty
      }
    };
  }).sort((a, b) => b.final_score - a.final_score);
}

/**
 * Generates explanation for the recommendation ranking
 */
export function generateRankingExplanation(results: RerankedResult[]): string {
  const topResult = results[0];
  if (!topResult) return 'No recommendations available';
  
  const factors = [];
  
  if (topResult.llm_confidence > 0.8) {
    factors.push('high AI confidence');
  }
  
  if (topResult.score_breakdown.llm_score > 0.8) {
    factors.push('strong contextual relevance');
  }
  
  if (topResult.score_breakdown.retrieval_score > 0.7) {
    factors.push('excellent search match');
  }
  
  if (topResult.app_data.rating > 4.5) {
    factors.push('outstanding user ratings');
  }
  
  return `Top recommendation based on: ${factors.join(', ')}`;
}