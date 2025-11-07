# How to Scrape Data and Upload

This guide explains how to scrape new app data, generate features and embeddings, and upload everything to the database.

## Overview

The data scraping and upload process consists of two main scripts:

1. **`search_pd.js`** - Scrapes iTunes, generates features and embeddings
2. **`upload-processed-data.js`** - Uploads processed data to Supabase

## Prerequisites

### Environment Setup
Ensure you have the following environment variables in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
DEEPSEEK_API_KEY=your_deepseek_api_key
GEMINI_API_KEY=your_gemini_api_key
```

### Required Dependencies
```bash
npm install @supabase/supabase-js openai @google/generative-ai dotenv
```

## Step 1: Data Scraping and Processing

### Command
```bash
node data-scraping/scripts/search_pd.js "your_search_term"
```

### Examples
```bash
# Scrape chemistry apps
node data-scraping/scripts/search_pd.js "chemistry"

# Scrape productivity apps  
node data-scraping/scripts/search_pd.js "productivity"

# Scrape plant care apps
node data-scraping/scripts/search_pd.js "plant care"
```

### What This Script Does

#### 1. **iTunes API Search**
- Searches iTunes for apps matching your term
- Returns app metadata (title, developer, description, rating, etc.)
- Default limit: 50 apps (can be modified in script)

#### 2. **Intelligent Duplicate Detection** 🧠
**This is the key optimization that saves time and money!**

The script checks three database tables:
- **`apps_unified`** - Main apps table
- **`app_features`** - Generated features table  
- **`new_embeddings`** - Vector embeddings table

For each scraped app:
- ✅ **New app**: Generates features + embeddings
- ⚠️ **Existing app with missing features**: Generates only features
- ⚠️ **Existing app with missing embeddings**: Generates only embeddings  
- ⏭️ **Existing app with complete data**: Skips entirely (saves ~$0.02 + 15 seconds)

#### 3. **Feature Generation** (DeepSeek AI)
- **Cost**: ~$0.001 per app
- **Time**: ~8-12 seconds per app
- **Purpose**: Extract structured app characteristics

Generated features include:
- `primary_use_case` - Main app function
- `target_user` - Target audience
- `key_benefit` - Value proposition
- `core_features` - Feature list
- `pricing_model` - Free/paid/subscription
- `user_interaction_style` - Active/passive/interactive
- `content_type` - Text/visual/audio/video/mixed
- `offline_capability` - Works offline (boolean)
- `social_features` - Has social features (boolean)
- `customization_level` - Low/medium/high
- `learning_curve` - Easy/moderate/difficult
- `update_frequency` - Regular/occasional/rare
- `data_privacy_level` - High/medium/low
- `integration_capability` - Integration level

#### 4. **Embedding Generation** (Gemini AI)
- **Cost**: ~$0.00001 per app
- **Time**: ~3-5 seconds per app  
- **Purpose**: Enable semantic search

Uses rich text combining:
- App title and category
- Full description (cleaned and truncated)
- Developer name
- Rating information
- Price context

**Embedding specifications:**
- **Model**: `text-embedding-004`
- **Dimensions**: 768
- **Max text length**: 5,000 characters
- **Validation**: Ensures correct embedding size
- **Retry logic**: 3 attempts with exponential backoff

#### 5. **Local File Generation**
Creates timestamped files in:
- `data-scraping/new-apps/` - New app data
- `data-scraping/new-features/` - Generated features
- `data-scraping/new-embeddings/` - Vector embeddings
- `data-scraping/merged_data_apps/` - Updated unified data
- `data-scraping/manual-search-results/` - Search summary

### Expected Output
```
🚀 === MANUAL APP SEARCH: "chemistry" ===

🍎 Searching iTunes API for: "chemistry"
  Found 25 apps from iTunes

🔍 Checking for duplicates across all database tables...
  📊 Fetching apps from apps_unified...
  ✅ Found 9334 existing apps in database
    ⚠️  App exists: "Chemistry Helper" (features exist, embeddings exist - skipping)
    ⚠️  App exists: "Chem Quiz" (features exist, embeddings exist - skipping)
  🆕 Truly new apps: 23
  💰 Estimated API calls saved: 4 (features + embeddings)

🌟 Generating features for 23 new apps...
🔢 Generating embeddings for 23 new apps...

🎉 === SEARCH COMPLETE ===
📊 Summary:
  - iTunes found: 25 apps
  - New unique apps: 23 apps
  - Features generated: 23 apps
  - Embeddings generated: 23 apps
  - API calls saved: 4 calls (~$0.08 + 60 seconds saved)
```

## Step 2: Upload to Database

### Command
```bash
node data-scraping/scripts/upload-processed-data.js
```

### What This Script Does

#### 1. **Automatic File Detection**
Finds the latest files from:
- `data-scraping/new-apps/` (latest unique apps)
- `data-scraping/new-features/` (latest features)  
- `data-scraping/new-embeddings/` (latest embeddings)

#### 2. **Database Upload Process**

**Apps Upload** (`apps_unified` table):
- Checks for existing apps by `bundle_id`
- Only uploads truly new apps
- Uses upsert to prevent duplicates

**Features Upload** (`app_features` table):
- Maps `bundle_id` to `app_id` using database lookup
- Upserts features (updates if exists)
- Handles missing app IDs gracefully

**Embeddings Upload** (`new_embeddings` table):
- Maps `bundle_id` to `app_id` 
- Upserts embeddings (768-dimension vectors)
- Used by semantic search system

#### 3. **Progress Tracking**
Shows before/after counts for all tables:
```
📊 Before upload - Apps: 9334 | Features: 9304 | Embeddings: 9334
📊 After upload  - Apps: 9357 | Features: 9327 | Embeddings: 9357
📊 Added: +23 apps, +23 features, +23 embeddings
```

### Expected Output
```
🚀 === UPLOADING PROCESSED DATA ===

📁 Loading processed data files...
  ✅ Loaded 23 unique apps
  ✅ Loaded 23 feature records  
  ✅ Loaded 23 embedding records

📤 Uploading apps to apps_unified...
  ✅ Uploaded 23 apps to apps_unified

🌟 Uploading features to app_features...
  ✅ Uploaded 23 feature records

🔢 Uploading embeddings to new_embeddings...
  ✅ Uploaded 23 embedding records

🎉 UPLOAD COMPLETE!
📊 Final tally:
  Apps unified: 9334 → 9357 (+23)
  App features: 9304 → 9327 (+23) 
  New embeddings: 9334 → 9357 (+23)
```

## Complete Workflow Example

```bash
# 1. Scrape chemistry apps (finds 25, processes 23 new ones)
node data-scraping/scripts/search_pd.js "chemistry"

# 2. Upload to database (+23 apps, +23 features, +23 embeddings)
node data-scraping/scripts/upload-processed-data.js

# 3. Verify semantic search is working
node test-plant-care-search.js
```

## Cost and Time Estimates

### Per App Processing
| Operation | Time | Cost | When Skipped |
|-----------|------|------|--------------|
| Feature Generation (DeepSeek) | 8-12 sec | ~$0.001 | ✅ If features exist |
| Embedding Generation (Gemini) | 3-5 sec | ~$0.00001 | ✅ If embeddings exist |
| **Total per duplicate skipped** | **~15 sec** | **~$0.002** | **Significant savings!** |

### Example Batch (50 apps)
- **All new apps**: 50 apps × 15 sec = 12.5 minutes, ~$0.10
- **30 duplicates found**: 20 apps × 15 sec = 5 minutes, ~$0.04
- **Savings**: 7.5 minutes + $0.06 saved! 💰

## Database Schema

### `apps_unified` table
```sql
CREATE TABLE apps_unified (
  id SERIAL PRIMARY KEY,
  bundle_id TEXT UNIQUE,
  title TEXT,
  developer TEXT,
  primary_category TEXT,
  price DECIMAL,
  rating DECIMAL,
  rating_count INTEGER,
  description TEXT,
  icon_url TEXT,
  version TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### `app_features` table
```sql
CREATE TABLE app_features (
  id SERIAL PRIMARY KEY,
  app_id INTEGER REFERENCES apps_unified(id),
  primary_use_case TEXT,
  target_user TEXT,
  key_benefit TEXT,
  core_features TEXT[],
  pricing_model TEXT,
  user_interaction_style TEXT,
  content_type TEXT,
  offline_capability BOOLEAN,
  social_features BOOLEAN,
  customization_level TEXT,
  learning_curve TEXT,
  update_frequency TEXT,
  data_privacy_level TEXT,
  integration_capability TEXT,
  UNIQUE(app_id)
);
```

### `new_embeddings` table
```sql
CREATE TABLE new_embeddings (
  id SERIAL PRIMARY KEY,
  app_id INTEGER REFERENCES apps_unified(id),
  embedding vector(768),
  UNIQUE(app_id)
);
```

## Troubleshooting

### Common Issues

**1. Environment Variables Missing**
```
❌ Missing required environment variables:
   - GEMINI_API_KEY
   - DEEPSEEK_API_KEY
```
**Solution**: Check your `.env.local` file

**2. API Rate Limits**
```
⚠️ Attempt 2/3 failed: 429 Too Many Requests
```
**Solution**: The script handles this automatically with exponential backoff

**3. Network Issues**
```
❌ Error fetching apps: fetch failed
```
**Solution**: Check internet connection and try again

**4. Database Connection Issues**
```
❌ Could not find the 'bundle_id' column
```
**Solution**: Verify Supabase credentials and table schema

### File Locations

If upload script can't find files:
```bash
# Check if files exist
ls -la data-scraping/new-apps/
ls -la data-scraping/new-features/  
ls -la data-scraping/new-embeddings/
```

Manual file specification:
```bash
node data-scraping/scripts/upload-processed-data.js \
  --apps data-scraping/new-apps/specific-file.json \
  --features data-scraping/new-features/specific-file.json \
  --embeddings data-scraping/new-embeddings/specific-file.json
```

## Best Practices

### 1. **Search Term Selection**
- Use specific terms for better results: "molecular biology" vs "biology"
- Try different variations: "photo editing", "image editor", "photo filters"
- Check existing apps first to avoid excessive duplicates

### 2. **Batch Processing**
- Process 20-50 apps at a time for optimal performance
- Monitor API usage to stay within limits
- Run during off-peak hours for faster processing

### 3. **Data Quality**
- Review generated features for accuracy
- Check embedding quality with semantic search tests
- Verify app metadata completeness

### 4. **Monitoring**
```bash
# Check database growth
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
Promise.all([
  supabase.from('apps_unified').select('*', { count: 'exact', head: true }),
  supabase.from('app_features').select('*', { count: 'exact', head: true }),
  supabase.from('new_embeddings').select('*', { count: 'exact', head: true })
]).then(([apps, features, embeddings]) => {
  console.log('📊 Database Status:');
  console.log('Apps:', apps.count);
  console.log('Features:', features.count);
  console.log('Embeddings:', embeddings.count);
});
"
```

## Integration with Semantic Search

Once uploaded, new embeddings are immediately available for semantic search:

```javascript
// Test semantic search with new data
const solver = new ContextualProblemSolver();
const results = await solver.searchBySemanticSimilarity("your search term", 10);
console.log(`Found ${results.length} relevant apps`);
```

The semantic search system uses the `new_embeddings` table to find contextually relevant apps, providing much better results than keyword matching.

---

## Summary

This workflow provides:
- ✅ **Intelligent duplicate detection** - saves time and money
- ✅ **High-quality feature extraction** - enables rich app discovery
- ✅ **Semantic search capabilities** - finds contextually relevant apps  
- ✅ **Scalable processing** - handles large datasets efficiently
- ✅ **Cost optimization** - avoids unnecessary API calls
- ✅ **Production-ready** - robust error handling and retry logic

The system is designed to scale as your app database grows while maintaining cost efficiency and data quality.