# Search Algorithm Implementation Guide

## Overview

The app4me search algorithm is a sophisticated TypeScript-based pipeline that combines AI-powered query analysis with credibility-weighted ranking to deliver highly relevant app recommendations. This document details the implementation, architecture, and how to modify the search algorithm.

## Architecture

### Core Components

1. **TypeScript Pipeline** (`src/lib/search/index.ts`) - Main search orchestrator
2. **API Endpoints** - RESTful interfaces for search functionality
3. **AI Analysis** - DeepSeek and Gemini integration for query understanding
4. **Database Layer** - Supabase integration with apps_unified table
5. **Ranking Algorithm** - Credibility-weighted scoring system

## Implementation Details

### 1. Search Pipeline Flow

```typescript
// Main pipeline execution
async runPipeline(query: string, options: SearchOptions): Promise<PipelineResult>
```

**Steps:**
1. **Query Analysis** - AI classifies query type and extracts weighted keywords
2. **Keyword Processing** - Transforms AI analysis into searchable terms
3. **Database Search** - Queries apps_unified table with multiple field matching
4. **Weighted Ranking** - Applies credibility-based scoring algorithm

### 2. Query Analysis (Step 1)

Uses DeepSeek API to analyze user intent:

```typescript
private async analyzeQuery(query: string, showLogs: boolean) {
  const prompt = `Analyze this app search query and extract:
1. Query type (problem-based, feature-based, category-based, etc.)
2. Key concepts and weighted keywords
3. User situation or need

Query: "${query}"

Respond in JSON format:
{
  "query_type": "problem-based|feature-based|category-based",
  "user_situation": "brief description",
  "weighted_keywords": [{"term": "keyword", "weight": 0.9}],
  "search_strategy": "approach description"
}`;
```

**Query Types:**
- **Problem-based**: User has specific issue to solve
- **Feature-based**: User wants specific functionality
- **Category-based**: User exploring app categories

### 3. Database Search (Step 3)

Searches multiple fields in parallel:

```typescript
const { data: apps, error } = await this.supabaseAdmin
  .from('apps_unified')
  .select('*')
  .or(`title.ilike.%${searchTerms[0]}%,description.ilike.%${searchTerms[0]}%,primary_category.ilike.%${searchTerms[0]}%`)
  .limit(limit * 3); // Get more for ranking
```

**Searched Fields:**
- `title` - App name
- `description` - App description
- `primary_category` - App Store category

### 4. Credibility-Weighted Ranking Algorithm

The core innovation of our search system:

```typescript
private async applyWeightedRanking(apps: any[], showLogs: boolean) {
  const rankedApps = apps.map(app => {
    const reviewCount = app.rating_count || 0;
    const rating = app.rating || 0;

    // Calculate credibility factor using logarithmic scaling
    const credibilityFactor = Math.min(Math.log10(reviewCount + 1) / 4, 1);
    
    // Base quality score = rating × credibility
    let qualityScore = rating * credibilityFactor;

    // Tiered boosts based on review volume and rating
    if (reviewCount >= 50000 && rating >= 4.5) {
      qualityScore *= 1.25; // Exceptional apps
    } else if (reviewCount >= 10000 && rating >= 4.3) {
      qualityScore *= 1.20; // Very high quality
    } else if (reviewCount >= 1000 && rating >= 4.0) {
      qualityScore *= 1.15; // High quality
    } else if (reviewCount >= 100 && rating >= 3.8) {
      qualityScore *= 1.10; // Good quality
    }

    // Penalty for suspicious perfect ratings with few reviews
    if (rating >= 4.9 && reviewCount < 50) {
      qualityScore *= 0.8;
    }

    return {
      ...app,
      weighted_similarity: qualityScore,
      similarity_score: rating,
      weight_applied: true,
      boost_reasons: [`credibility-weighted (${reviewCount} reviews)`]
    };
  });

  // Sort by weighted similarity score (highest first)
  rankedApps.sort((a, b) => (b.weighted_similarity || 0) - (a.weighted_similarity || 0));
  return rankedApps;
}
```

#### Ranking Algorithm Explanation

**1. Credibility Factor Calculation:**
```typescript
const credibilityFactor = Math.min(Math.log10(reviewCount + 1) / 4, 1);
```
- Uses logarithmic scaling to prevent review count inflation
- Caps at 1.0 to maintain balance
- Apps with 10,000+ reviews get maximum credibility weight

**2. Tiered Quality Boosts:**
- **50K+ reviews, 4.5+ rating**: 25% boost (exceptional apps like Instagram, WhatsApp)
- **10K+ reviews, 4.3+ rating**: 20% boost (very high quality apps)
- **1K+ reviews, 4.0+ rating**: 15% boost (established quality apps)
- **100+ reviews, 3.8+ rating**: 10% boost (decent apps with some validation)

**3. Fake Review Detection:**
- Apps with 4.9+ rating but <50 reviews get 20% penalty
- Prevents manipulation by apps with artificially perfect ratings

## API Endpoints

### Primary Search Endpoint

**POST** `/api/search/intent-driven`

```json
{
  "query": "health and fitness apps",
  "limit": 5
}
```

**Response:**
```json
{
  "success": true,
  "query": "health and fitness apps",
  "results": [
    {
      "app_id": 26631,
      "app_data": {
        "name": "Rain Rain Sleep Sounds",
        "category": "Health & Fitness",
        "rating": 4.85,
        "rating_count": 131411,
        "description": "...",
        "developer": "Tim Gostony",
        "price": "Free"
      },
      "relevance_score": 61,
      "match_reason": "Smart match with weighted keywords: credibility-weighted (131411 reviews)",
      "search_method": "weighted_pipeline",
      "weighted_info": {
        "query_type": "category-based",
        "weight_applied": true,
        "original_similarity": 4.85,
        "weighted_similarity": 6.0625,
        "boost_reasons": ["credibility-weighted (131411 reviews)"]
      }
    }
  ],
  "contextual_analysis": {
    "query_type": "category-based",
    "user_situation": "User exploring health/fitness apps",
    "weighted_keywords": [{"term": "health", "weight": 0.9}],
    "search_strategy": "Broad category exploration..."
  },
  "metadata": {
    "count": 5,
    "searchTime": "10601ms",
    "searchType": "weighted_pipeline"
  }
}
```

### Testing Endpoints

- **GET** `/api/test-env` - Check environment variables
- **POST** `/api/test-pipeline` - Test pipeline functionality

## Environment Configuration

### Required Environment Variables

```env
# AI Services
DEEPSEEK_API_KEY=sk-...
GEMINI_API_KEY=AIza...

# Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
```

### Vercel Deployment

Environment variables must be configured in Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add all required variables for Production, Preview, and Development
3. Redeploy after adding variables

## Customizing the Search Algorithm

### 1. Modify Ranking Weights

Edit the `applyWeightedRanking` method in `src/lib/search/index.ts`:

```typescript
// Adjust credibility calculation
const credibilityFactor = Math.min(Math.log10(reviewCount + 1) / 3, 1); // More aggressive scaling

// Modify boost tiers
if (reviewCount >= 100000 && rating >= 4.7) {
  qualityScore *= 1.5; // Higher boost for exceptional apps
}
```

### 2. Add New Query Types

Update the AI analysis prompt in `analyzeQuery`:

```typescript
const prompt = `Analyze this app search query and extract:
1. Query type (problem-based, feature-based, category-based, price-based, developer-based)
// Add new types as needed
```

### 3. Implement Semantic Search

Add vector embedding search before ranking:

```typescript
// In performDatabaseSearch method
const { data: embeddings } = await this.supabaseAdmin
  .from('new_embeddings')
  .select('app_id, embedding')
  .rpc('match_documents', {
    query_embedding: queryVector,
    match_threshold: 0.7,
    match_count: limit * 2
  });
```

### 4. Add Category-Specific Ranking

Customize ranking based on app category:

```typescript
// In applyWeightedRanking
if (app.primary_category === 'Games') {
  // Games care more about engagement than ratings
  qualityScore *= (app.download_count / 1000000) * 0.1;
} else if (app.primary_category === 'Health & Fitness') {
  // Health apps need higher trust threshold
  if (reviewCount < 1000) qualityScore *= 0.7;
}
```

### 5. Implement User Personalization

Add user preference weighting:

```typescript
// Pass user preferences to ranking
private async applyPersonalizedRanking(apps: any[], userPreferences: any[]) {
  return apps.map(app => {
    let personalizedScore = app.weighted_similarity;
    
    // Boost apps matching user's preferred categories
    if (userPreferences.includes(app.primary_category)) {
      personalizedScore *= 1.3;
    }
    
    // Consider user's past app interactions
    if (userInteractions.includes(app.app_id)) {
      personalizedScore *= 1.1;
    }
    
    return { ...app, personalized_score: personalizedScore };
  });
}
```

## Performance Optimizations

### 1. Database Indexing

Ensure proper indexes on `apps_unified` table:

```sql
CREATE INDEX idx_apps_title ON apps_unified USING gin(to_tsvector('english', title));
CREATE INDEX idx_apps_description ON apps_unified USING gin(to_tsvector('english', description));
CREATE INDEX idx_apps_category ON apps_unified(primary_category);
CREATE INDEX idx_apps_rating ON apps_unified(rating_count DESC, rating DESC);
```

### 2. Caching Strategy

Implement Redis caching for frequent queries:

```typescript
// Cache popular search results
const cacheKey = `search:${queryHash}`;
const cachedResults = await redis.get(cacheKey);
if (cachedResults) return JSON.parse(cachedResults);

// Cache for 1 hour
await redis.setex(cacheKey, 3600, JSON.stringify(results));
```

### 3. API Rate Limiting

Implement rate limiting for AI API calls:

```typescript
// Throttle AI requests
const rateLimiter = new RateLimiter(10, 'per minute');
await rateLimiter.consume(userId);
```

## Monitoring and Analytics

### 1. Search Analytics

Track search performance:

```typescript
// Log search metrics
await supabase.from('search_analytics').insert({
  query: query,
  result_count: results.length,
  search_time: searchDuration,
  query_type: analysisResult.query_type,
  user_id: userId
});
```

### 2. A/B Testing

Test different ranking algorithms:

```typescript
const useNewRanking = userId % 2 === 0; // 50/50 split
if (useNewRanking) {
  rankedResults = await applyNewRankingAlgorithm(apps);
} else {
  rankedResults = await applyWeightedRanking(apps);
}
```

## Troubleshooting

### Common Issues

1. **"Cannot find module" errors** - Check TypeScript imports and paths
2. **Database connection failures** - Verify Supabase credentials
3. **AI API failures** - Ensure API keys are valid and have quota
4. **Slow search responses** - Check database indexes and query optimization

### Debug Tools

- **Environment Check**: `GET /api/test-env`
- **Pipeline Test**: `POST /api/test-pipeline`
- **Search Logs**: Check Vercel function logs for detailed timing

## Future Enhancements

1. **Machine Learning**: Train custom models on user interaction data
2. **Real-time Updates**: Implement WebSocket for live search suggestions
3. **Multi-language**: Add support for non-English queries
4. **Voice Search**: Integrate speech-to-text for voice queries
5. **Visual Search**: Image-based app discovery

---

This implementation provides a robust, scalable search system that prioritizes user experience through intelligent ranking and comprehensive app discovery capabilities.