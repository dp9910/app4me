# App Discovery Platform - Database & Pipeline Architecture

## Overview
This document outlines the complete data architecture and pipeline for our app discovery platform that integrates three data sources: iTunes Search API, Apple RSS feeds, and SERP API.

## Database Schema Design

### 1. Source-Specific Tables

#### `itunes_apps`
```sql
CREATE TABLE itunes_apps (
  id BIGSERIAL PRIMARY KEY,
  bundle_id VARCHAR(255) NOT NULL,
  source VARCHAR(50) DEFAULT 'itunes_api' NOT NULL,
  query_term VARCHAR(255) NOT NULL,
  
  -- App Basic Info
  title VARCHAR(500) NOT NULL,
  developer VARCHAR(255),
  developer_id BIGINT,
  developer_url TEXT,
  version VARCHAR(50),
  
  -- Pricing & Availability
  price DECIMAL(10,2),
  formatted_price VARCHAR(50),
  currency VARCHAR(10),
  
  -- Ratings & Reviews
  rating DECIMAL(3,2),
  rating_count BIGINT,
  
  -- Media Assets
  icon_url TEXT,
  screenshots JSONB,
  
  -- Metadata
  description TEXT,
  release_date TIMESTAMPTZ,
  last_updated TIMESTAMPTZ,
  age_rating VARCHAR(20),
  genres JSONB,
  category VARCHAR(100),
  size_bytes BIGINT,
  languages_supported JSONB,
  
  -- Tracking Fields
  rank INTEGER,
  first_scraped TIMESTAMPTZ DEFAULT NOW(),
  last_scraped TIMESTAMPTZ DEFAULT NOW(),
  scrape_count INTEGER DEFAULT 1,
  
  -- Raw Data for Debugging
  raw_data JSONB,
  
  -- Constraints
  UNIQUE(bundle_id, source, query_term),
  INDEX(bundle_id),
  INDEX(developer),
  INDEX(category),
  INDEX(last_scraped)
);
```

#### `apple_rss_apps`
```sql
CREATE TABLE apple_rss_apps (
  id BIGSERIAL PRIMARY KEY,
  bundle_id VARCHAR(255) NOT NULL,
  source VARCHAR(50) DEFAULT 'apple_rss' NOT NULL,
  feed_type VARCHAR(100) NOT NULL, -- 'top-free', 'top-paid', 'new-apps', etc.
  
  -- App Basic Info
  title VARCHAR(500) NOT NULL,
  developer VARCHAR(255),
  developer_url TEXT,
  version VARCHAR(50),
  
  -- Pricing & Availability
  price DECIMAL(10,2),
  formatted_price VARCHAR(50),
  currency VARCHAR(10),
  
  -- Ratings & Reviews
  rating DECIMAL(3,2),
  rating_count BIGINT,
  
  -- Media Assets
  icon_url TEXT,
  screenshots JSONB,
  
  -- Metadata
  description TEXT,
  release_date TIMESTAMPTZ,
  last_updated TIMESTAMPTZ,
  age_rating VARCHAR(20),
  genres JSONB,
  category VARCHAR(100),
  size_bytes BIGINT,
  
  -- RSS Specific
  rss_rank INTEGER,
  rss_position INTEGER,
  feed_url TEXT,
  
  -- Tracking Fields
  first_scraped TIMESTAMPTZ DEFAULT NOW(),
  last_scraped TIMESTAMPTZ DEFAULT NOW(),
  scrape_count INTEGER DEFAULT 1,
  
  -- Raw Data
  raw_data JSONB,
  
  -- Constraints
  UNIQUE(bundle_id, source, feed_type),
  INDEX(bundle_id),
  INDEX(feed_type),
  INDEX(rss_rank),
  INDEX(last_scraped)
);
```

#### `serp_apps`
```sql
CREATE TABLE serp_apps (
  id BIGSERIAL PRIMARY KEY,
  bundle_id VARCHAR(255) NOT NULL,
  source VARCHAR(50) DEFAULT 'serp_api' NOT NULL,
  query_term VARCHAR(255) NOT NULL,
  
  -- App Basic Info
  title VARCHAR(500) NOT NULL,
  developer VARCHAR(255),
  developer_id VARCHAR(50),
  developer_url TEXT,
  version VARCHAR(50),
  
  -- Pricing & Availability
  price VARCHAR(50),
  price_value DECIMAL(10,2),
  formatted_price VARCHAR(50),
  
  -- Ratings & Reviews
  rating DECIMAL(3,2),
  rating_count BIGINT,
  rating_type VARCHAR(50),
  
  -- Media Assets
  icon_url TEXT,
  icon_url_60 TEXT,
  icon_url_512 TEXT,
  all_logos JSONB,
  screenshots JSONB,
  
  -- Metadata
  description TEXT,
  release_date TIMESTAMPTZ,
  latest_version_release_date TIMESTAMPTZ,
  age_rating VARCHAR(20),
  release_note TEXT,
  minimum_os_version VARCHAR(20),
  
  -- Categories & Genres
  category VARCHAR(100),
  primary_genre VARCHAR(100),
  genres JSONB,
  
  -- Technical Info
  size_in_bytes BIGINT,
  supported_languages JSONB,
  supported_devices JSONB,
  features JSONB,
  advisories JSONB,
  game_center_enabled BOOLEAN DEFAULT FALSE,
  vpp_license BOOLEAN DEFAULT FALSE,
  
  -- Search Position
  position INTEGER,
  rank INTEGER,
  serp_link TEXT,
  
  -- Tracking Fields
  first_scraped TIMESTAMPTZ DEFAULT NOW(),
  last_scraped TIMESTAMPTZ DEFAULT NOW(),
  scrape_count INTEGER DEFAULT 1,
  
  -- Raw Data
  raw_data JSONB,
  
  -- Constraints
  UNIQUE(bundle_id, source, query_term),
  INDEX(bundle_id),
  INDEX(developer),
  INDEX(category),
  INDEX(position),
  INDEX(last_scraped)
);
```

#### `apps_unified` (Reconciliation Table)
```sql
CREATE TABLE apps_unified (
  id BIGSERIAL PRIMARY KEY,
  bundle_id VARCHAR(255) UNIQUE NOT NULL,
  
  -- Best Available Data (Reconciled)
  title VARCHAR(500) NOT NULL,
  developer VARCHAR(255),
  developer_id VARCHAR(50),
  developer_url TEXT,
  version VARCHAR(50),
  
  -- Pricing (Latest from any source)
  price DECIMAL(10,2),
  formatted_price VARCHAR(50),
  currency VARCHAR(10),
  
  -- Ratings (Best quality - highest sample size)
  rating DECIMAL(3,2),
  rating_count BIGINT,
  rating_source VARCHAR(50), -- Which source provided the rating
  
  -- Media Assets (Best quality available)
  icon_url TEXT,
  icon_url_hd TEXT,
  screenshots JSONB,
  
  -- Metadata (Richest description, latest info)
  description TEXT,
  description_source VARCHAR(50),
  release_date TIMESTAMPTZ,
  last_updated TIMESTAMPTZ,
  age_rating VARCHAR(20),
  
  -- Categories (Merged from all sources)
  primary_category VARCHAR(100),
  all_categories JSONB,
  genres JSONB,
  
  -- Technical Info
  size_bytes BIGINT,
  supported_languages JSONB,
  supported_devices JSONB,
  minimum_os_version VARCHAR(20),
  
  -- Source Tracking
  available_in_sources JSONB, -- ['itunes', 'rss', 'serp']
  data_quality_score INTEGER, -- 1-100 based on completeness
  
  -- Reconciliation Metadata
  first_discovered TIMESTAMPTZ DEFAULT NOW(),
  last_reconciled TIMESTAMPTZ DEFAULT NOW(),
  reconciliation_count INTEGER DEFAULT 1,
  
  -- Search Performance
  total_appearances INTEGER DEFAULT 1,
  avg_rank DECIMAL(5,2),
  best_rank INTEGER,
  
  -- Indexes
  INDEX(bundle_id),
  INDEX(developer),
  INDEX(primary_category),
  INDEX(rating DESC),
  INDEX(last_reconciled),
  INDEX(data_quality_score DESC)
);
```

## Pipeline Architecture

### Supabase Edge Functions Setup

#### Function Structure
```
supabase/functions/
├── daily-scraper/
│   ├── index.ts              # Main orchestrator
│   ├── itunes-scraper.ts     # iTunes API scraping
│   ├── rss-scraper.ts        # Apple RSS scraping  
│   ├── serp-scraper.ts       # SERP API scraping
│   ├── reconciler.ts         # Data reconciliation logic
│   └── utils.ts              # Shared utilities
```

#### Cron Schedule
```sql
-- Run daily at 6 AM UTC
SELECT cron.schedule(
  'daily-app-scraper', 
  '0 6 * * *', 
  'SELECT net.http_post(url := ''https://YOUR_PROJECT.supabase.co/functions/v1/daily-scraper'')'
);
```

### Smart Update Logic (Option B)

#### Duplicate Detection Strategy
```typescript
interface UpdateDecision {
  shouldUpdate: boolean;
  fieldsToUpdate: string[];
  reason: string;
}

function shouldUpdateApp(existing: App, incoming: App): UpdateDecision {
  const updates: string[] = [];
  
  // Always update these fields
  if (existing.version !== incoming.version) updates.push('version');
  if (existing.rating !== incoming.rating) updates.push('rating', 'rating_count');
  if (existing.price !== incoming.price) updates.push('price', 'formatted_price');
  
  // Conditionally update
  if (incoming.description && 
      incoming.description.length > existing.description?.length) {
    updates.push('description');
  }
  
  if (incoming.icon_url && existing.icon_url !== incoming.icon_url) {
    updates.push('icon_url');
  }
  
  return {
    shouldUpdate: updates.length > 0,
    fieldsToUpdate: updates,
    reason: updates.length > 0 ? `Updated: ${updates.join(', ')}` : 'No changes detected'
  };
}
```

#### Composite Primary Key Logic
```typescript
// For source tables
const uniqueKey = `${bundle_id}_${source}_${query_term}`;

// For unified table
const uniqueKey = bundle_id; // Single source of truth
```

### Data Reconciliation Strategy

#### Priority Rules
1. **Ratings**: Prefer source with highest `rating_count`
2. **Descriptions**: Prefer longest/richest description
3. **Media**: Prefer highest resolution icons/screenshots
4. **Version Info**: Use most recent version data
5. **Categories**: Merge all unique categories from sources

#### Reconciliation Algorithm
```typescript
async function reconcileApp(bundleId: string): Promise<UnifiedApp> {
  const [itunesData, rssData, serpData] = await Promise.all([
    getLatestFromItunes(bundleId),
    getLatestFromRSS(bundleId),
    getLatestFromSERP(bundleId)
  ]);
  
  return {
    bundle_id: bundleId,
    title: serpData?.title || itunesData?.title || rssData?.title,
    
    // Best rating (highest sample size)
    rating: getBestRating([itunesData, rssData, serpData]),
    rating_source: getRatingSource([itunesData, rssData, serpData]),
    
    // Richest description
    description: getRichestDescription([itunesData, rssData, serpData]),
    description_source: getDescriptionSource([itunesData, rssData, serpData]),
    
    // Latest version
    version: getLatestVersion([itunesData, rssData, serpData]),
    
    // Merge categories
    all_categories: mergeCategories([itunesData, rssData, serpData]),
    primary_category: getPrimaryCategory([itunesData, rssData, serpData]),
    
    // Track sources
    available_in_sources: getAvailableSources([itunesData, rssData, serpData]),
    data_quality_score: calculateQualityScore({itunesData, rssData, serpData}),
    
    last_reconciled: new Date().toISOString()
  };
}
```

## Implementation Phases

### Phase 1: Database Setup
- [ ] Create all 4 tables in Supabase
- [ ] Set up proper indexes and constraints
- [ ] Create database functions for common operations

### Phase 2: Edge Functions
- [ ] Create Supabase Edge Function structure
- [ ] Implement iTunes scraper function
- [ ] Implement RSS scraper function  
- [ ] Implement SERP scraper function
- [ ] Implement reconciliation logic

### Phase 3: Smart Updates
- [ ] Implement duplicate detection logic
- [ ] Add change tracking and versioning
- [ ] Create update decision algorithms
- [ ] Add data quality scoring

### Phase 4: Scheduling & Monitoring
- [ ] Set up pg_cron for daily execution
- [ ] Add error handling and retry logic
- [ ] Implement logging and monitoring
- [ ] Create summary reports and alerts

### Phase 5: API Integration
- [ ] Update existing Next.js APIs to use new tables
- [ ] Create unified API endpoints
- [ ] Add real-time subscriptions
- [ ] Implement caching strategies

## Configuration

### Environment Variables
```bash
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# API Keys
SERPAPI_KEY=your_serp_api_key

# Pipeline Config
SCRAPE_SCHEDULE="0 6 * * *"  # Daily at 6 AM UTC
MAX_RETRIES=3
BATCH_SIZE=50
```

### Search Queries Configuration
```typescript
const SEARCH_QUERIES = {
  itunes: [
    'productivity', 'social media', 'photo editor', 'fitness', 'finance'
  ],
  serp: [
    'productivity', 'social media', 'photo editor', 'fitness', 'finance'  
  ],
  rss_feeds: [
    'topfreeapplications', 'toppaidapplications', 'newapplications',
    'topgrossingapplications'
  ]
};
```

## Monitoring & Alerting

### Key Metrics to Track
- Apps scraped per source per day
- Duplicate detection rate
- Reconciliation success rate
- Data quality scores
- API rate limits and errors
- Pipeline execution time

### Success Criteria
- 95%+ successful daily scrapes
- <5% data loss during reconciliation
- <30 minutes total pipeline execution time
- 90%+ data quality scores for unified table

## Future Enhancements

### Advanced Features
- [ ] Real-time app ranking tracking
- [ ] Price change detection and alerts
- [ ] Review sentiment analysis
- [ ] Competitive analysis dashboards
- [ ] App discovery recommendations
- [ ] Historical data analysis and trends

### Scalability Considerations
- [ ] Implement database partitioning by date
- [ ] Add read replicas for analytics workloads
- [ ] Consider event-driven architecture for real-time updates
- [ ] Implement CDC (Change Data Capture) for downstream systems