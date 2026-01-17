# Enhanced Weighted Search Pipeline Implementation Guide

## Overview

The enhanced weighted search pipeline provides intelligent app discovery for both **problem queries** (e.g., "I can't sleep properly") and **general queries** (e.g., "apps to take care of plants"). It uses LLM-powered keyword categorization with weighted priorities to deliver highly relevant results.

## Architecture

The system consists of 4 modular components:

1. **Step 1**: LLM Analysis (`scripts/step1-llm-analysis.js`)
2. **Step 2**: Keyword Processing (`scripts/step2-keyword-processing.js`) 
3. **Step 3**: Database Filtering (`scripts/step3-database-filtering.js`)
4. **Step 4**: Semantic Search (`scripts/step4-semantic-search.js`)

## Key Features

### Intelligent Query Classification
- Automatically detects if query is a **problem** or **general** request
- Adapts keyword weighting based on query type

### Weighted Keyword Categories

**For Problem Queries:**
- **PROBLEM** (Weight 1.0): Core issues user is experiencing
- **SOLUTION** (Weight 0.9): Direct solutions and interventions  
- **CAUSE** (Weight 0.7): Root causes and contributing factors
- **CONTEXT** (Weight 0.5): Related concepts and broader categories

**For General Queries:**
- **PRIMARY** (Weight 1.0): Main category or functionality desired
- **FUNCTIONAL** (Weight 0.9): Specific features or actions
- **DESCRIPTIVE** (Weight 0.7): Qualifiers and requirements
- **CONTEXT** (Weight 0.5): Related concepts and broader terms

### Priority-Based Database Filtering
- Sequential search starting with highest weighted keywords
- Adaptive thresholds based on result quality
- Domain-specific filtering for better relevance

## Usage

### Running Individual Components

```bash
# Step 1: LLM Analysis
node scripts/step1-llm-analysis.js

# Step 2: Keyword Processing  
node scripts/step2-keyword-processing.js

# Step 3: Database Filtering
node scripts/step3-database-filtering.js

# Step 4: Semantic Search
node scripts/step4-semantic-search.js
```

### Running Complete Pipeline

```bash
# Master pipeline (all 4 steps)
node scripts/master-pipeline.js
```

### Testing the System

```bash
# Run comprehensive regression tests
node scripts/test-problem-queries.js
```

## Configuration

### Environment Variables Required

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key

# AI API Keys
DEEPSEEK_API_KEY=your_deepseek_key
GOOGLE_API_KEY=your_gemini_key
```

### Input Format

The system processes natural language queries. Example inputs:

**Problem Queries:**
- "I can't sleep properly, maybe too much coffee or phone"
- "Can't focus at work, too many distractions"
- "Feeling stressed and anxious lately"

**General Queries:**
- "Apps to take care of plants"
- "Photography editing tools"
- "Language learning applications"

## Output Format

### Final Results Structure

```json
{
  "query": "user input query",
  "query_type": "problem|general",
  "results": [
    {
      "title": "App Name",
      "weighted_score": 0.85,
      "category": "Health & Fitness",
      "rating": 4.5,
      "price": "Free",
      "similarity": 0.78,
      "keyword_matches": ["sleep", "meditation"]
    }
  ],
  "performance": {
    "total_time": 5234,
    "candidates_found": 28,
    "semantic_processing_time": 2100
  }
}
```

## Testing Framework

### Regression Testing

The system includes comprehensive regression testing to ensure changes don't break existing functionality:

```bash
# Test known working queries
node scripts/test-problem-queries.js
```

**Test Coverage:**
- Sleep problems with multiple causes
- Phone usage sleep issues  
- Caffeine-related sleep problems
- Stress-induced sleep issues

### Performance Benchmarks

- **Target Response Time**: < 10 seconds
- **Minimum Results**: 15+ relevant apps
- **Quality Threshold**: 100% domain relevance for problem queries

## Quality Assurance

### Expected Performance Metrics

**Problem Queries:**
- 100% relevant results within correct domain
- Top-rated sleep apps (e.g., "Pillow: Sleep Tracker") in top 5
- Average similarity scores > 0.55
- Execution time: 5-6 seconds

**General Queries:**  
- 100% relevant apps for requested category
- High similarity scores (0.90+) for exact matches
- Balanced results across subcategories
- Execution time: 4-5 seconds

### Common Issues & Solutions

**Issue**: Low similarity scores
**Solution**: Check embedding model availability and API keys

**Issue**: Irrelevant results
**Solution**: Verify domain filtering logic in Step 3

**Issue**: Slow performance  
**Solution**: Review database indexing and keyword filtering efficiency

## Integration Points

### API Route Integration

The pipeline can be integrated into existing API routes:

```javascript
const MasterPipeline = require('./scripts/master-pipeline');

app.post('/api/search', async (req, res) => {
  const { query } = req.body;
  const pipeline = new MasterPipeline();
  const results = await pipeline.runCompletePipeline(query);
  res.json(results);
});
```

### Database Requirements

**Required Tables:**
- `apps_unified`: Main app data with titles, descriptions, ratings
- `new_embeddings`: Vector embeddings for semantic search
- `app_features`: Extended feature descriptions (optional)

## Monitoring & Analytics

The system provides detailed analytics:

- Query classification accuracy
- Keyword extraction quality
- Database filtering efficiency  
- Semantic search performance
- End-to-end response times

## Maintenance

### Regular Tasks

1. **Weekly**: Run regression tests to catch any degradation
2. **Monthly**: Review query classification accuracy  
3. **Quarterly**: Optimize database queries and indexes
4. **As needed**: Update LLM prompts based on new use cases

### Troubleshooting

**Check logs for:**
- API rate limiting issues
- Database connection problems
- LLM response parsing errors
- Embedding generation failures

**Common fixes:**
- Restart services to clear caches
- Verify API key validity
- Check database connectivity
- Review prompt engineering for edge cases