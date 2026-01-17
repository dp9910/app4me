# App4Me - Complete Technical Specification

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Brand Identity](#brand-identity)
3. [Technical Architecture](#technical-architecture)
4. [Database Schema](#database-schema)
5. [Data Collection Strategy](#data-collection-strategy)
6. [LLM Integration (Gemini)](#llm-integration)
7. [Search & Discovery Implementation](#search-discovery)
8. [Frontend Structure](#frontend-structure)
9. [SEO Strategy](#seo-strategy)
10. [Deployment & Hosting](#deployment)
11. [Cost Breakdown](#cost-breakdown)
12. [Launch Timeline](#launch-timeline)
13. [Success Metrics](#success-metrics)

---

## 1. Project Overview {#project-overview}

### The Problem
- App stores have millions of apps, but discovery is broken
- Users browse by category (not by personal need)
- Generic descriptions don't help users understand if an app is for THEM
- Hidden gems with low reviews never surface

### The Solution: App4Me
**Personalized app discovery based on lifestyle and intent**

**Core Features:**
- Users describe their lifestyle ("I'm a foodie", "I eat out a lot")
- Users express wishes ("I wish there was an app that tracks my restaurant spending")
- AI-powered matching finds relevant apps
- Personalized one-liners: "If you love visuals, this app turns expenses into simple charts"
- No login required for first search (frictionless discovery)

### Unique Value Proposition
1. **Intent-based discovery** - "I wish..." searches
2. **Lifestyle personalization** - Apps matched to your life
3. **Friendly one-liners** - Not marketing copy, actual value props
4. **Hidden gems** - Surface great apps with few reviews
5. **Frictionless** - Try before signing up

---

## 2. Brand Identity {#brand-identity}

### Name & Domain
- **Name:** App4Me
- **Full Name:** App For Me
- **Domain:** app4me.shop (primary)
- **Pronunciation:** "App For Me"

### Brand Voice
- **Tone:** Friendly, personal, helpful (not corporate)
- **Style:** Conversational, empathetic, encouraging
- **Example:** "Because you said you eat out a lot 🍔" not "Based on your profile..."

### Visual Identity
```
Logo: Simple "App4Me" wordmark with stylized "4"
Colors:
  Primary: #FF6B35 (Vibrant Orange) - personal, warm
  Secondary: #004E89 (Deep Blue) - trust, tech
  Accent: #F7F7F7 (Light Gray) - clean, minimal
  Success: #2ECC71 (Green)
  Error: #E74C3C (Red)

Typography:
  Headings: Space Grotesk or Poppla (Bold, modern)
  Body: Inter (Clean, readable)
  
Icon Style: Lucide React (consistent, modern)
```

### Taglines
- Primary: "Apps for me, chosen by you"
- Alternative: "Shop apps made for your life"
- Alternative: "Find apps for YOU"

### Social Presence
- **Twitter/X:** @app4me or @app4meshop
- **Instagram:** @app4me
- **Email:** hello@app4me.shop
- **ProductHunt:** /app4me

---

## 3. Technical Architecture {#technical-architecture}

### Stack Overview
```
Frontend:
├── Next.js 14 (App Router)
├── React 18
├── Tailwind CSS
├── Lucide React (icons)
└── TypeScript (optional but recommended)

Backend:
├── Supabase (PostgreSQL + Auth + Storage)
├── Next.js API Routes (serverless functions)
└── Vercel Edge Functions (for performance)

AI/ML:
├── Google Gemini (1.5 Flash for generation, text-embedding-004 for embeddings)
├── Supabase pgvector (for semantic search)
└── Vector similarity search

Data Sources:
├── iTunes Search API (primary, free)
├── Apple RSS Feeds (trending/new apps, free)
├── SerpAPI (strategic, 250 searches/month free)
└── Manual curation (optional)

Hosting:
├── Vercel (frontend + API routes, free tier)
├── Supabase (database, free tier 500MB)
└── Custom domain (app4me.shop)

Monitoring:
├── Google Analytics 4
├── Vercel Analytics
├── Supabase Dashboard
└── Error tracking (Sentry optional)
```

### Architecture Diagram (Conceptual)
```
┌─────────────────────────────────────────────────────┐
│                  USER INTERFACE                      │
│            (Next.js 14 + Tailwind CSS)              │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│              API ROUTES (Next.js)                    │
│  /api/search   /api/chat   /api/cron/*             │
└─────────────────────────────────────────────────────┘
                        ↓
        ┌───────────────┴───────────────┐
        ↓                               ↓
┌──────────────────┐          ┌──────────────────┐
│  SUPABASE DB     │          │  GEMINI API      │
│  - Apps table    │          │  - Summaries     │
│  - Embeddings    │          │  - Embeddings    │
│  - User data     │          │  - Chat          │
└──────────────────┘          └──────────────────┘
        ↑
        │
┌──────────────────────────────────────┐
│      DATA COLLECTION (Cron Jobs)     │
│  - iTunes API                        │
│  - RSS Feeds                         │
│  - SerpAPI (strategic)               │
└──────────────────────────────────────┘
```

### Environment Variables
```bash
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# Gemini AI (get from https://makersuite.google.com/app/apikey)
GEMINI_API_KEY=your-gemini-api-key

# SerpAPI (get from https://serpapi.com)
SERPAPI_KEY=your-serpapi-key

# Cron Security
CRON_SECRET=your-random-secret-string-for-cron-auth

# Optional
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
SENTRY_DSN=your-sentry-dsn
```

---

## 4. Database Schema {#database-schema}

### PostgreSQL Schema (Supabase)

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================
-- MAIN APPS TABLE (Central Repository)
-- ============================================
CREATE TABLE apps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Core identifiers
  app_id TEXT UNIQUE NOT NULL,
  bundle_id TEXT,
  
  -- Basic info
  name TEXT NOT NULL,
  developer_name TEXT,
  developer_id TEXT,
  
  -- Store details
  app_store_url TEXT,
  release_date TIMESTAMP,
  last_updated TIMESTAMP,
  version TEXT,
  size_bytes BIGINT,
  
  -- Categorization
  primary_category TEXT,
  all_categories TEXT[],
  genres TEXT[],
  
  -- Pricing
  price DECIMAL,
  currency TEXT DEFAULT 'USD',
  is_free BOOLEAN DEFAULT true,
  has_in_app_purchases BOOLEAN DEFAULT false,
  iap_price_range TEXT,
  
  -- Ratings & popularity
  rating_average DECIMAL,
  rating_count INTEGER,
  review_count INTEGER,
  chart_position INTEGER,
  
  -- Content
  short_description TEXT,
  full_description TEXT,
  whats_new TEXT,
  keywords TEXT[],
  
  -- Media
  icon_url_60 TEXT,
  icon_url_100 TEXT,
  icon_url_512 TEXT,
  screenshot_urls TEXT[],
  preview_video_url TEXT,
  
  -- Requirements
  min_ios_version TEXT,
  supported_devices TEXT[],
  languages TEXT[],
  content_rating TEXT,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  is_trending BOOLEAN DEFAULT false,
  is_new BOOLEAN DEFAULT false,
  is_hidden_gem BOOLEAN DEFAULT false,
  hidden_gem_score INTEGER DEFAULT 0,
  data_source TEXT, -- 'itunes_api', 'rss_feed', 'serpapi'
  scrape_source TEXT,
  detailed_scraped_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- AI-GENERATED INSIGHTS (Pre-computed)
-- ============================================
CREATE TABLE app_ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id UUID REFERENCES apps(id) ON DELETE CASCADE UNIQUE,
  
  -- AI-generated content
  one_liner_generic TEXT,
  ai_summary TEXT,
  problem_tags TEXT[],
  lifestyle_tags TEXT[],
  use_cases JSONB,
  
  generated_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- EMBEDDINGS (Semantic Search)
-- ============================================
CREATE TABLE app_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id UUID REFERENCES apps(id) ON DELETE CASCADE UNIQUE,
  embedding VECTOR(768), -- Gemini text-embedding-004 = 768 dimensions
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- USER PROFILES
-- ============================================
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  lifestyle_tags TEXT[],
  improvement_goals TEXT[],
  wish_text TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- USER INTERACTIONS (for learning)
-- ============================================
CREATE TABLE user_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id),
  app_id UUID REFERENCES apps(id),
  action TEXT, -- 'like', 'skip', 'visit', 'install'
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- SEARCH LOGS (analytics)
-- ============================================
CREATE TABLE search_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  session_id TEXT,
  
  query_text TEXT,
  lifestyle_context TEXT[],
  improvement_goal TEXT,
  
  results_returned INTEGER,
  apps_shown UUID[],
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- SERPAPI USAGE TRACKING
-- ============================================
CREATE TABLE serp_usage_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usage_type TEXT,
  query TEXT,
  month TEXT, -- 'YYYY-MM' format
  apps_found INTEGER,
  used_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- SERPAPI SCRAPING QUEUE
-- ============================================
CREATE TABLE serp_scraping_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT,
  search_term TEXT,
  priority TEXT DEFAULT 'medium', -- 'high', 'medium', 'low'
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  apps_found INTEGER,
  error_message TEXT,
  scraped_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- HISTORICAL METRICS
-- ============================================
CREATE TABLE app_metrics_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
  
  rating_average DECIMAL,
  rating_count INTEGER,
  chart_position INTEGER,
  price DECIMAL,
  
  recorded_at DATE NOT NULL,
  
  UNIQUE(app_id, recorded_at)
);

-- ============================================
-- REVIEWS (Sample recent ones)
-- ============================================
CREATE TABLE app_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
  
  review_id TEXT UNIQUE,
  author_name TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT,
  helpful_count INTEGER DEFAULT 0,
  
  review_date TIMESTAMP,
  scraped_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES (Performance)
-- ============================================
CREATE INDEX idx_apps_app_id ON apps(app_id);
CREATE INDEX idx_apps_category ON apps(primary_category);
CREATE INDEX idx_apps_rating ON apps(rating_average DESC);
CREATE INDEX idx_apps_price ON apps(price);
CREATE INDEX idx_apps_updated ON apps(last_updated DESC);
CREATE INDEX idx_apps_active ON apps(is_active) WHERE is_active = true;
CREATE INDEX idx_apps_trending ON apps(is_trending) WHERE is_trending = true;
CREATE INDEX idx_apps_new ON apps(is_new) WHERE is_new = true;
CREATE INDEX idx_apps_hidden_gem ON apps(is_hidden_gem) WHERE is_hidden_gem = true;

CREATE INDEX idx_reviews_app ON app_reviews(app_id);
CREATE INDEX idx_metrics_app_date ON app_metrics_history(app_id, recorded_at DESC);
CREATE INDEX idx_interactions_user ON user_interactions(user_id);
CREATE INDEX idx_interactions_app ON user_interactions(app_id);
CREATE INDEX idx_embeddings_app ON app_embeddings(app_id);

-- Vector similarity index (IVFFlat for speed)
CREATE INDEX ON app_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Full-text search index
CREATE INDEX idx_apps_fulltext ON apps USING gin(
  to_tsvector('english', 
    coalesce(name, '') || ' ' || 
    coalesce(short_description, '') || ' ' || 
    coalesce(full_description, '')
  )
);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Semantic search function
CREATE OR REPLACE FUNCTION match_apps(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  app_id TEXT,
  name TEXT,
  one_liner TEXT,
  icon_url TEXT,
  app_store_url TEXT,
  category TEXT,
  rating_average DECIMAL,
  problem_tags TEXT[],
  lifestyle_tags TEXT[],
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    apps.id,
    apps.app_id,
    apps.name,
    app_ai_insights.one_liner_generic as one_liner,
    apps.icon_url_512 as icon_url,
    apps.app_store_url,
    apps.primary_category as category,
    apps.rating_average,
    app_ai_insights.problem_tags,
    app_ai_insights.lifestyle_tags,
    1 - (app_embeddings.embedding <=> query_embedding) AS similarity
  FROM app_embeddings
  JOIN apps ON apps.id = app_embeddings.app_id
  LEFT JOIN app_ai_insights ON app_ai_insights.app_id = apps.id
  WHERE 
    apps.is_active = true
    AND 1 - (app_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY app_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Get SerpAPI usage for current month
CREATE OR REPLACE FUNCTION get_serp_usage_this_month()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  usage_count INTEGER;
  current_month TEXT;
BEGIN
  current_month := to_char(NOW(), 'YYYY-MM');
  
  SELECT COUNT(*)
  INTO usage_count
  FROM serp_usage_log
  WHERE month = current_month;
  
  RETURN COALESCE(usage_count, 0);
END;
$$;

-- Find category gaps (for strategic SerpAPI use)
CREATE OR REPLACE FUNCTION find_category_gaps()
RETURNS TABLE (
  category TEXT,
  app_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    primary_category as category,
    COUNT(*) as app_count
  FROM apps
  WHERE is_active = true
  GROUP BY primary_category
  HAVING COUNT(*) < 50
  ORDER BY COUNT(*) ASC;
END;
$$;

-- ============================================
-- ROW LEVEL SECURITY (Optional - for production)
-- ============================================

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" 
  ON user_profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON user_profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can view own interactions" 
  ON user_interactions FOR SELECT 
  USING (auth.uid() = user_id);

-- Public read access for apps
CREATE POLICY "Apps are viewable by everyone" 
  ON apps FOR SELECT 
  USING (true);

-- ============================================
-- TRIGGERS (Auto-update timestamps)
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_apps_updated_at BEFORE UPDATE ON apps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_ai_insights_updated_at BEFORE UPDATE ON app_ai_insights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 5. Data Collection Strategy {#data-collection-strategy}

### Overview: Central App Repository Approach

**Goal:** Build a comprehensive database of 20,000+ apps using primarily FREE sources

**Sources Priority:**
1. **iTunes Search API** (FREE, unlimited) - Primary source
2. **Apple RSS Feeds** (FREE, daily) - Trending/new apps
3. **SerpAPI** (250 searches/month FREE) - Strategic fill

### 5.1 iTunes Search API Collection

**File:** `/lib/data-collection/itunes-api-collector.js`

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function collectFromiTunesAPI() {
  console.log('🔍 Starting iTunes API collection...');
  
  const categories = [
    // Lifestyle & Personal (50+ terms)
    'finance', 'budget', 'expense tracker', 'banking', 'investment',
    'productivity', 'todo', 'notes', 'calendar', 'planner', 'reminder',
    'health', 'fitness', 'meditation', 'sleep', 'workout', 'nutrition',
    'food', 'recipe', 'cooking', 'meal planning', 'restaurant', 'diet',
    'travel', 'trip planning', 'booking', 'flight', 'hotel', 'navigation',
    'shopping', 'deals', 'price tracker', 'fashion', 'clothes',
    
    // Social & Entertainment (30+ terms)
    'social', 'messaging', 'dating', 'friends', 'community',
    'photo', 'video', 'camera', 'editing',
    'music', 'podcast', 'streaming', 'audiobook',
    'games', 'puzzle', 'strategy', 'casual',
    
    // Learning & Work (25+ terms)
    'education', 'learning', 'language', 'reading', 'ebook',
    'business', 'email', 'document', 'pdf',
    'design', 'drawing', 'creative', 'art',
    
    // Utilities (20+ terms)
    'weather', 'news', 'utilities', 'tools',
    'vpn', 'security', 'password manager', 'privacy',
    'file manager', 'cleaner', 'battery', 'wifi'
  ];
  
  let totalCollected = 0;
  
  for (const term of categories) {
    try {
      const response = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=us&media=software&limit=200`
      );
      
      const data = await response.json();
      
      for (const app of data.results) {
        await storeApp(app, 'itunes_api');
      }
      
      totalCollected += data.resultCount;
      console.log(`  ✓ ${term}: ${data.resultCount} apps`);
      
      // Rate limiting: 2 seconds between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`  ✗ Error with term "${term}":`, error.message);
    }
  }
  
  console.log(`✅ iTunes API collection complete: ${totalCollected} apps`);
  return totalCollected;
}

async function storeApp(itunesApp, source) {
  const appData = {
    app_id: String(itunesApp.trackId),
    bundle_id: itunesApp.bundleId,
    name: itunesApp.trackName,
    developer_name: itunesApp.artistName,
    developer_id: String(itunesApp.artistId),
    
    app_store_url: itunesApp.trackViewUrl,
    release_date: itunesApp.releaseDate,
    last_updated: itunesApp.currentVersionReleaseDate,
    version: itunesApp.version,
    size_bytes: itunesApp.fileSizeBytes,
    
    primary_category: itunesApp.primaryGenreName,
    all_categories: itunesApp.genres,
    
    price: itunesApp.price,
    currency: itunesApp.currency,
    is_free: itunesApp.price === 0,
    has_in_app_purchases: itunesApp.features?.includes('iosUniversal'),
    
    rating_average: itunesApp.averageUserRating,
    rating_count: itunesApp.userRatingCount,
    
    short_description: itunesApp.description?.substring(0, 200),
    full_description: itunesApp.description,
    
    icon_url_60: itunesApp.artworkUrl60,
    icon_url_100: itunesApp.artworkUrl100,
    icon_url_512: itunesApp.artworkUrl512,
    screenshot_urls: itunesApp.screenshotUrls,
    
    min_ios_version: itunesApp.minimumOsVersion,
    supported_devices: itunesApp.supportedDevices,
    languages: itunesApp.languageCodesISO2A,
    content_rating: itunesApp.contentAdvisoryRating,
    
    data_source: source,
    scrape_source: source,
    is_active: true,
    updated_at: new Date().toISOString()
  };
  
  const { error } = await supabase
    .from('apps')
    .upsert(appData, { 
      onConflict: 'app_id',
      ignoreDuplicates: false 
    });
  
  if (error && !error.message.includes('duplicate')) {
    console.error(`Error storing ${appData.name}:`, error.message);
  }
  
  // Store historical metrics
  await supabase.from('app_metrics_history').upsert({
    app_id: appData.app_id,
    rating_average: appData.rating_average,
    rating_count: appData.rating_count,
    price: appData.price,
    recorded_at: new Date().toISOString().split('T')[0]
  }, { onConflict: 'app_id,recorded_at' });
}
```

### 5.2 RSS Feeds Collection

**File:** `/lib/data-collection/rss-collector.js`

```javascript
export async function collectFromRSSFeeds() {
  console.log('📰 Starting RSS feeds collection...');
  
  const feeds = [
    'https://rss.applemarketingtools.com/api/v2/us/apps/top-free/100/apps.json',
    'https://rss.applemarketingtools.com/api/v2/us/apps/top-paid/100/apps.json',
    'https://rss.applemarketingtools.com/api/v2/us/apps/top-grossing/100/apps.json',
    'https://rss.applemarketingtools.com/api/v2/us/apps/new-apps-we-love/50/apps.json',
    'https://rss.applemarketingtools.com/api/v2/us/apps/new-games-we-love/50/apps.json'
  ];
  
  let totalCollected = 0;
  
  for (const feedUrl of feeds) {
    try {
      const response = await fetch(feedUrl);
      const data = await response.json();
      
      for (const app of data.feed.results) {
        // Get full details from iTunes API
        const detailResponse = await fetch(
          `https://itunes.apple.com/lookup?id=${app.id}&country=us`
        );
        const detailData = await detailResponse.json();
        
        if (detailData.results?.[0]) {
          await storeApp(detailData.results[0], 'rss_feed');
          
          // Mark trending/new flags
          await supabase.from('apps').update({
            is_trending: feedUrl.includes('top-'),
            is_new: feedUrl.includes('new-')
          }).eq('app_id', app.id);
        }
      }
      
      totalCollected += data.feed.results.length;
      const feedType = feedUrl.split('/').slice(-2)[0];
      console.log(`  ✓ ${feedType}: ${data.feed.results.length} apps`);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`  ✗ Error with feed:`, error.message);
    }
  }
  
  console.log(`✅ RSS collection complete: ${totalCollected} apps`);
  return totalCollected;
}
```

### 5.3 SerpAPI Strategic Scraping

**File:** `/lib/data-collection/serp-strategic-scraper.js`

```javascript
const DAILY_SERP_BUDGET = 8;
const MONTHLY_SERP_BUDGET = 250;

export async function strategicSerpScraping() {
  // Check budget
  const { data: usage } = await supabase.rpc('get_serp_usage_this_month');
  const remaining = MONTHLY_SERP_BUDGET - (usage || 0);
  
  if (remaining < DAILY_SERP_BUDGET) {
    console.log('⚠️ SerpAPI budget exhausted for this month');
    return;
  }
  
  console.log(`📊 SerpAPI: ${remaining}/${MONTHLY_SERP_BUDGET} remaining`);
  
  // Priority 1: Fill category gaps (5 searches)
  await fillCategoryGaps(5);
  
  // Priority 2: Hidden gems (2 searches)
  await findHiddenGems(2);
  
  // Priority 3: Detailed info (1 search)
  await scrapeDetailedInfo(1);
}

async function fillCategoryGaps(budget) {
  const { data: gaps } = await supabase.rpc('find_category_gaps');
  
  for (let i = 0; i < Math.min(budget, gaps?.length || 0); i++) {
    const gap = gaps[i];
    
    try {
      const response = await fetch('https://serpapi.com/search.json', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        params: {
          api_key: process.env.SERPAPI_KEY,
          engine: 'apple_app_store',
          term: gap.category,
          num: 50
        }
      });
      
      const data = await response.json();
      
      // Store apps from SerpAPI
      for (const app of data.organic_results || []) {
        await storeAppFromSerp(app);
      }
      
      await logSerpUsage('category_fill', gap.category, data.organic_results?.length || 0);
      
      console.log(`  ✓ Filled "${gap.category}": ${data.organic_results?.length} apps`);
      
    } catch (error) {
      console.error(`  ✗ Error:`, error);
    }
  }
}

async function logSerpUsage(type, query, appsFound) {
  await supabase.from('serp_usage_log').insert({
    usage_type: type,
    query: query,
    month: new Date().toISOString().substring(0, 7),
    apps_found: appsFound,
    used_at: new Date().toISOString()
  });
}
```

### 5.4 Master Collection Orchestrator

**File:** `/lib/data-collection/master-collector.js`

```javascript
export async function runDailyCollection() {
  console.log('🚀 Starting daily data collection...');
  
  try {
    // Step 1: RSS Feeds (FREE, fast)
    const rssCount = await collectFromRSSFeeds();
    
    // Step 2: iTunes API searches (FREE, comprehensive)
    const itunesCount = await collectFromiTunesAPI();
    
    // Step 3: Strategic SerpAPI (LIMITED, strategic)
    await strategicSerpScraping();
    
    // Step 4: Update existing apps (refresh stale data)
    await updateStaleApps();
    
    console.log('✅ Daily collection complete!');
    
    return {
      success: true,
      rssApps: rssCount,
      itunesApps: itunesCount,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Collection failed:', error);
    return { success: false, error: error.message };
  }
}

async function updateStaleApps() {
  console.log('🔄 Updating stale apps...');
  
  // Get apps not updated in 7 days
  const { data: staleApps } = await supabase
    .from('apps')
    .select('app_id, name')
    .lt('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .eq('is_active', true)
    .limit(50);
  
  for (const app of staleApps || []) {
    try {
      const response = await fetch(
        `https://itunes.apple.com/lookup?id=${app.app_id}&country=us`
      );
      const data = await response.json();
      
      if (data.results?.[0]) {
        await storeApp(data.results[0], 'itunes_api_refresh');
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`  ✗ Error updating ${app.name}`);
    }
  }
}
```

---

## 6. LLM Integration (Gemini) {#llm-integration}

### 6.1 Generate AI One-Liners & Tags

**File:** `/lib/ai/gemini-summarizer.js`

```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generateAppSummaries(batchSize = 50) {
  console.log('🤖 Generating AI summaries with Gemini...');
  
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  // Get apps without summaries
  const { data: apps } = await supabase
    .from('apps')
    .select('id, app_id, name, primary_category, full_description, short_description')
    .is('one_liner_generic', null)
    .limit(batchSize);
  
  if (!apps || apps.length === 0) {
    console.log('No apps need summarization');
    return 0;
  }
  
  let processed = 0;
  
  for (const app of apps) {
    try {
      // Generate one-liner
      const oneLinerPrompt = `Create a single friendly one-liner (max 15 words) for this app in format: "If you [user situation], this app [benefit]."

App: ${app.name}
Category: ${app.primary_category}
Description: ${(app.short_description || app.full_description || '').substring(0, 800)}

Return ONLY the one-liner:`;

      const oneLinerResult = await model.generateContent(oneLinerPrompt);
      const oneLiner = oneLinerResult.response.text().trim().replace(/^["']|["']$/g, '');
      
      // Generate problem tags
      const tagsPrompt = `Extract 3-5 problem/benefit tags from this app. Return ONLY comma-separated values.

App: ${app.name}
Category: ${app.primary_category}
Description: ${(app.full_description || '').substring(0, 500)}

Tags:`;

      const tagsResult = await model.generateContent(tagsPrompt);
      const problemTags = tagsResult.response.text()
        .trim()
        .toLowerCase()
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 2 && t.length < 50);
      
      // Generate lifestyle tags
      const lifestylePrompt = `Which lifestyle categories fit this app? Choose 1-3 from: foodie, traveler, student, professional, fitness, creator, parent, gamer, minimalist, budget-conscious, health-focused

App: ${app.name}
Category: ${app.primary_category}

Return ONLY comma-separated categories:`;

      const lifestyleResult = await model.generateContent(lifestylePrompt);
      const lifestyleTags = lifestyleResult.response.text()
        .trim()
        .toLowerCase()
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);
      
      // Store in app_ai_insights
      await supabase.from('app_ai_insights').upsert({
        app_id: app.id,
        one_liner_generic: oneLiner,
        problem_tags: problemTags,
        lifestyle_tags: lifestyleTags,
        generated_at: new Date().toISOString()
      }, { onConflict: 'app_id' });
      
      processed++;
      console.log(`  ✓ [${processed}/${apps.length}] ${app.name}`);
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`  ✗ Error with ${app.name}:`, error.message);
    }
  }
  
  console.log(`✅ Generated summaries for ${processed} apps`);
  return processed;
}
```

### 6.2 Generate Embeddings

**File:** `/lib/ai/gemini-embeddings.js`

```javascript
export async function generateEmbeddings(batchSize = 100) {
  console.log('🧠 Generating embeddings with Gemini...');
  
  const embeddingModel = genAI.getGenerativeModel({ 
    model: 'text-embedding-004' 
  });
  
  // Get apps with AI insights but no embeddings
  const { data: apps } = await supabase
    .from('app_ai_insights')
    .select(`
      app_id,
      one_liner_generic,
      problem_tags,
      lifestyle_tags,
      apps (
        name,
        primary_category,
        app_id
      )
    `)
    .limit(batchSize);
  
  let processed = 0;
  
  for (const appInsight of apps || []) {
    try {
      // Check if embedding already exists
      const { data: existing } = await supabase
        .from('app_embeddings')
        .select('id')
        .eq('app_id', appInsight.app_id)
        .single();
      
      if (existing) continue;
      
      // Create rich text for embedding
      const embeddingText = `
${appInsight.apps.name}
${appInsight.one_liner_generic || ''}
Category: ${appInsight.apps.primary_category}
Problems: ${appInsight.problem_tags?.join(', ') || ''}
Lifestyle: ${appInsight.lifestyle_tags?.join(', ') || ''}
      `.trim();
      
      // Generate embedding
      const result = await embeddingModel.embedContent(embeddingText);
      const embedding = result.embedding.values;
      
      // Store embedding
      await supabase.from('app_embeddings').insert({
        app_id: appInsight.app_id,
        embedding: embedding
      });
      
      processed++;
      console.log(`  ✓ [${processed}] ${appInsight.apps.name}`);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`  ✗ Error:`, error.message);
    }
  }
  
  console.log(`✅ Generated ${processed} embeddings`);
  return processed;
}
```

### 6.3 User Intent Extraction

**File:** `/lib/ai/intent-extractor.js`

```javascript
export async function extractSearchIntent(lifestyle, improve, wishText) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  const prompt = `Extract search intent from user input. Return JSON only.

User input:
- Lifestyle: ${lifestyle?.join(', ') || 'none'}
- Goal: ${improve || 'none'}
- Wish: ${wishText || 'none'}

Extract:
{
  "keywords": ["array", "of", "keywords"],
  "categories": ["app store categories"],
  "problemSolved": "what problem user wants to solve",
  "mustHave": ["required features"],
  "niceToHave": ["optional features"]
}

Return ONLY valid JSON:`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    return JSON.parse(jsonMatch[0]);
    
  } catch (error) {
    console.error('Intent extraction error:', error);
    
    // Fallback: simple keyword extraction
    return {
      keywords: [
        ...(lifestyle || []),
        improve,
        ...wishText.split(' ').filter(w => w.length > 3)
      ].filter(Boolean),
      categories: [],
      problemSolved: wishText || improve || 'general app discovery',
      mustHave: [],
      niceToHave: []
    };
  }
}
```

---

## 7. Search & Discovery Implementation {#search-discovery}

### 7.1 Multi-Strategy Search API

**File:** `/app/api/search/route.js`

```javascript
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { extractSearchIntent } from '@/lib/ai/intent-extractor';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  try {
    const { lifestyle, improve, wishText, sessionId } = await request.json();
    
    console.log('🔍 Search request:', { lifestyle, improve, wishText });
    
    // Step 1: Extract intent with LLM
    const intent = await extractSearchIntent(lifestyle, improve, wishText);
    console.log('🧠 Intent:', intent);
    
    // Step 2: Query database with multiple strategies
    const candidateApps = await queryMultiStrategy(intent);
    console.log(`📦 Found ${candidateApps.length} candidates`);
    
    // Step 3: LLM ranks and personalizes
    const rankedApps = await rankAndPersonalize(
      candidateApps.slice(0, 30), // Limit to top 30 for LLM processing
      { lifestyle, improve, wishText }
    );
    
    // Step 4: Log search for analytics
    await logSearch(sessionId, intent, rankedApps);
    
    console.log(`✨ Returning ${rankedApps.length} results`);
    
    return NextResponse.json({
      success: true,
      apps: rankedApps.slice(0, 10),
      intent: intent,
      totalFound: candidateApps.length
    });
    
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function queryMultiStrategy(intent) {
  const results = [];
  
  // Strategy 1: Semantic search (if we have embedding)
  if (intent.problemSolved) {
    try {
      const embeddingModel = genAI.getGenerativeModel({ 
        model: 'text-embedding-004' 
      });
      const embeddingResult = await embeddingModel.embedContent(intent.problemSolved);
      
      const { data: semanticResults } = await supabase.rpc('match_apps', {
        query_embedding: embeddingResult.embedding.values,
        match_threshold: 0.5,
        match_count: 30
      });
      
      results.push(...(semanticResults || []));
    } catch (error) {
      console.error('Semantic search error:', error);
    }
  }
  
  // Strategy 2: Keyword array overlap
  if (intent.keywords.length > 0) {
    const { data: tagResults } = await supabase
      .from('app_ai_insights')
      .select(`
        app_id,
        problem_tags,
        apps (*)
      `)
      .overlaps('problem_tags', intent.keywords)
      .limit(30);
    
    results.push(...(tagResults?.map(t => t.apps) || []));
  }
  
  // Strategy 3: Category match
  if (intent.categories.length > 0) {
    const { data: categoryResults } = await supabase
      .from('apps')
      .select('*')
      .in('primary_category', intent.categories)
      .eq('is_active', true)
      .gte('rating_average', 4.0)
      .order('rating_count', { ascending: false })
      .limit(30);
    
    results.push(...(categoryResults || []));
  }
  
  // Strategy 4: Full-text search
  if (intent.keywords.length > 0) {
    const searchText = intent.keywords.join(' | ');
    const { data: textResults } = await supabase
      .from('apps')
      .select('*')
      .textSearch('full_description', searchText)
      .eq('is_active', true)
      .limit(30);
    
    results.push(...(textResults || []));
  }
  
  // Remove duplicates
  const uniqueApps = Array.from(
    new Map(results.map(app => [app.app_id || app.id, app])).values()
  );
  
  return uniqueApps;
}

async function rankAndPersonalize(apps, userContext) {
  if (apps.length === 0) return [];
  
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  const results = [];
  
  // Process in batches of 10
  for (let i = 0; i < apps.length; i += 10) {
    const batch = apps.slice(i, i + 10);
    
    const prompt = `Rank these apps by relevance for the user and create personalized one-liners.

User context:
- Lifestyle: ${userContext.lifestyle?.join(', ') || 'general'}
- Goal: ${userContext.improve || 'improve life'}
- Wish: ${userContext.wishText || 'find useful apps'}

Apps:
${batch.map((app, idx) => `
${idx + 1}. ${app.name}
   Category: ${app.primary_category}
   Description: ${(app.short_description || app.full_description || '').substring(0, 200)}
   Rating: ${app.rating_average || 'N/A'}/5
`).join('\n')}

For each app, return JSON:
[
  {
    "appId": "the app_id",
    "relevanceScore": 1-10,
    "oneLiner": "If you [user situation], this app [benefit].",
    "reason": "why it matches"
  }
]

Return ONLY JSON array:`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const parsed = JSON.parse(jsonMatch[0]);
      
      for (const insight of parsed) {
        const app = batch.find(a => a.app_id === insight.appId || a.id === insight.appId);
        if (app) {
          results.push({
            ...app,
            relevance_score: insight.relevanceScore,
            personalized_one_liner: insight.oneLiner,
            match_reason: insight.reason
          });
        }
      }
    } catch (error) {
      console.error('LLM ranking error:', error);
      // Fallback: return apps without personalization
      results.push(...batch.map(app => ({
        ...app,
        relevance_score: 5,
        personalized_one_liner: app.short_description
      })));
    }
  }
  
  // Sort by relevance
  return results.sort((a, b) => b.relevance_score - a.relevance_score);
}

async function logSearch(sessionId, intent, results) {
  try {
    await supabase.from('search_logs').insert({
      session_id: sessionId,
      query_text: intent.problemSolved,
      lifestyle_context: intent.keywords,
      results_returned: results.length,
      apps_shown: results.map(r => r.id),
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Logging error:', error);
  }
}
```

### 7.2 Chat Discovery API

**File:** `/app/api/chat/route.js`

```javascript
export async function POST(request) {
  const { message, userId, conversationHistory } = await request.json();
  
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  const prompt = `You are App4Me assistant. Help users discover apps.

User message: ${message}

Respond with JSON:
{
  "reply": "friendly response",
  "searchKeywords": ["keywords"],
  "shouldSearch": true/false
}`;

  const result = await model.generateContent(prompt);
  const parsed = JSON.parse(result.response.text().match(/\{[\s\S]*\}/)[0]);
  
  let apps = [];
  if (parsed.shouldSearch) {
    // Perform search with keywords
    const searchResponse = await fetch('/api/search', {
      method: 'POST',
      body: JSON.stringify({
        wishText: parsed.searchKeywords.join(' ')
      })
    });
    const searchData = await searchResponse.json();
    apps = searchData.apps || [];
  }
  
  return NextResponse.json({
    reply: parsed.reply,
    apps: apps.slice(0, 5),
    searchPerformed: parsed.shouldSearch
  });
}
```

---

## 8. Frontend Structure {#frontend-structure}

### 8.1 Project Structure

```
app4me/
├── app/
│   ├── layout.js                 # Root layout
│   ├── page.js                   # Landing page
│   ├── discover/
│   │   └── page.js              # Discovery results
│   ├── chat/
│   │   └── page.js              # Chat interface (post-signup)
│   ├── api/
│   │   ├── search/
│   │   │   └── route.js         # Search API
│   │   ├── chat/
│   │   │   └── route.js         # Chat API
│   │   └── cron/
│   │       ├── collect-apps/
│   │       │   └── route.js     # Data collection cron
│   │       ├── generate-summaries/
│   │       │   └── route.js     # AI summarization cron
│   │       └── generate-embeddings/
│   │           └── route.js     # Embeddings cron
├── components/
│   ├── ui/
│   │   ├── AppCard.jsx          # App display card
│   │   ├── Button.jsx           # Reusable button
│   │   └── Input.jsx            # Form inputs
│   ├── QuestionFlow.jsx         # Onboarding questions
│   ├── AppResults.jsx           # Results grid
│   └── SignupPrompt.jsx         # Soft signup modal
├── lib/
│   ├── supabase/
│   │   └── client.js            # Supabase client
│   ├── ai/
│   │   ├── gemini-summarizer.js
│   │   ├── gemini-embeddings.js
│   │   └── intent-extractor.js
│   └── data-collection/
│       ├── master-collector.js
│       ├── itunes-api-collector.js
│       ├── rss-collector.js
│       └── serp-strategic-scraper.js
├── public/
│   ├── logo.svg
│   └── og-image.png
├── styles/
│   └── globals.css              # Tailwind + custom CSS
├── .env.local                    # Environment variables
├── package.json
├── tailwind.config.js
├── next.config.js
└── vercel.json                   # Cron jobs config
```

### 8.2 Landing Page Flow

**File:** `/app/page.js`

```jsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({
    lifestyle: [],
    improve: '',
    wishText: ''
  });

  const lifestyleOptions = [
    { id: 'foodie', label: 'Foodie', emoji: '🍔' },
    { id: 'traveler', label: 'Traveler', emoji: '✈️' },
    { id: 'student', label: 'Student', emoji: '📚' },
    { id: 'professional', label: 'Professional', emoji: '💼' },
    { id: 'fitness', label: 'Fitness Lover', emoji: '💪' },
    { id: 'creator', label: 'Creator', emoji: '🎨' }
  ];

  const handleSearch = async () => {
    // Store in localStorage temporarily
    localStorage.setItem('searchProfile', JSON.stringify(profile));
    
    // Navigate to discover page
    router.push('/discover');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <div className="max-w-2xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-purple-600" />
            <h1 className="text-4xl font-bold text-gray-900">App4Me</h1>
          </div>
          <p className="text-xl text-gray-700">
            Tell us what kind of person you are — we'll show you the perfect apps
          </p>
        </div>

        {/* Question Flow */}
        <div className="bg-white rounded-3xl shadow-xl p-8 space-y-8">
          {/* Step 1: Lifestyle */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              How would you describe yourself?
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {lifestyleOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => {
                    setProfile(prev => ({
                      ...prev,
                      lifestyle: prev.lifestyle.includes(option.id)
                        ? prev.lifestyle.filter(l => l !== option.id)
                        : [...prev.lifestyle, option.id]
                    }));
                  }}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    profile.lifestyle.includes(option.id)
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <span className="text-2xl mr-2">{option.emoji}</span>
                  <span className="font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Improvement Goal */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              What's something you wish you could do better?
            </h2>
            <select
              value={profile.improve}
              onChange={(e) => setProfile(prev => ({ ...prev, improve: e.target.value }))}
              className="w-full p-4 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none"
            >
              <option value="">Select one...</option>
              <option value="manage-money">Manage money better</option>
              <option value="stay-organized">Stay organized</option>
              <option value="build-habits">Build better habits</option>
              <option value="eat-healthy">Eat healthier</option>
              <option value="be-productive">Be more productive</option>
            </select>
          </div>

          {/* Step 3: Wish Text */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Finish this sentence: "I wish there was an app that..."
            </h2>
            <textarea
              value={profile.wishText}
              onChange={(e) => setProfile(prev => ({ ...prev, wishText: e.target.value }))}
              placeholder="e.g., helps me track how much I spend eating out"
              className="w-full p-4 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none resize-none"
              rows="3"
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSearch}
            disabled={!profile.lifestyle.length && !profile.improve && !profile.wishText}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 px-8 rounded-xl font-semibold text-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Show Me Apps ✨
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 8.3 Discovery Results Page

**File:** `/app/discover/page.js`

```jsx
'use client';

import { useState, useEffect } from 'react';
import { Heart, X, ExternalLink } from 'lucide-react';
import AppCard from '@/components/ui/AppCard';
import SignupPrompt from '@/components/SignupPrompt';

export default function DiscoverPage() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cardsViewed, setCardsViewed] = useState(0);
  const [showSignup, setShowSignup] = useState(false);

  useEffect(() => {
    searchApps();
  }, []);

  useEffect(() => {
    if (cardsViewed >= 3) {
      setShowSignup(true);
    }
  }, [cardsViewed]);

  const searchApps = async () => {
    try {
      const profile = JSON.parse(localStorage.getItem('searchProfile') || '{}');
      
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profile,
          sessionId: getSessionId()
        })
      });
      
      const data = await response.json();
      setApps(data.apps || []);
      setLoading(false);
    } catch (error) {
      console.error('Search error:', error);
      setLoading(false);
    }
  };

  const handleLike = (app) => {
    // Track interaction
    setCardsViewed(prev => prev + 1);
  };

  const handleSkip = () => {
    setCardsViewed(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 py-16">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-4">
          Here are apps for you 🎯
        </h1>
        <p className="text-center text-gray-600 mb-12">
          Because you said you eat out a lot and want to budget better
        </p>

        <div className="space-y-4">
          {apps.map((app, index) => (
            <AppCard
              key={app.id}
              app={app}
              onLike={() => handleLike(app)}
              onSkip={handleSkip}
              index={index}
            />
          ))}
        </div>
      </div>

      {showSignup && <SignupPrompt />}
    </div>
  );
}

function getSessionId() {
  let sessionId = localStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(7);
    localStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
}
```

### 8.4 App Card Component

**File:** `/components/ui/AppCard.jsx`

```jsx
import { Heart, X, ExternalLink } from 'lucide-react';

export default function AppCard({ app, onLike, onSkip, index }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
      <div className="flex items-start gap-4">
        {/* App Icon */}
        <img
          src={app.icon_url || app.icon_url_512}
          alt={app.name}
          className="w-20 h-20 rounded-2xl"
        />

        {/* App Info */}
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900">{app.name}</h3>
          <p className="text-sm text-gray-500 mb-2">{app.category}</p>
          
          {/* Personalized One-liner */}
          <p className="text-gray-700 mb-3">
            {app.personalized_one_liner || app.one_liner}
          </p>

          {/* Rating */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="text-yellow-500">⭐</span>
            <span>{app.rating_average?.toFixed(1) || 'N/A'}</span>
            <span className="text-gray-400">•</span>
            <span>{app.rating_count?.toLocaleString() || '0'} ratings</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-4">
        <button
          onClick={onSkip}
          className="flex-1 py-3 px-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-colors flex items-center justify-center gap-2"
        >
          <X className="w-5 h-5" />
          <span>Not for me</span>
        </button>
        
        <button
          onClick={onLike}
          className="flex-1 py-3 px-4 rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
        >
          <Heart className="w-5 h-5" />
          <span>I like this</span>
        </button>
        
        <a
          href={app.app_store_url}
          target="_blank"
          rel="noopener noreferrer"
          className="py-3 px-4 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center"
        >
          <ExternalLink className="w-5 h-5" />
        </a>
      </div>
    </div>
  );
}
```

---

## 9. SEO Strategy {#seo-strategy}

### 9.1 Meta Tags & OG Setup

**File:** `/app/layout.js`

```jsx
export const metadata = {
  title: 'App4Me - Discover Apps Made For You',
  description: 'Tell us about your lifestyle, and we\'ll show you the perfect apps. No more endless scrolling through categories. Just personalized app discoveries.',
  keywords: 'app discovery, find apps, app recommendations, personalized apps, ios apps, app store',
  authors: [{ name: 'App4Me' }],
  creator: 'App4Me',
  publisher: 'App4Me',
  metadataBase: new URL('https://app4me.shop'),
  openGraph: {
    title: 'App4Me - Discover Apps Made For You',
    description: 'Find the perfect apps for your lifestyle',
    url: 'https://app4me.shop',
    siteName: 'App4Me',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'App4Me'
      }
    ],
    locale: 'en_US',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'App4Me - Discover Apps Made For You',
    description: 'Find the perfect apps for your lifestyle',
    images: ['/og-image.png']
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  }
};
```

### 9.2 Sitemap Generation

**File:** `/app/sitemap.js`

```javascript
export default function sitemap() {
  return [
    {
      url: 'https://app4me.shop',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1
    },
    {
      url: 'https://app4me.shop/discover',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8
    },
    {
      url: 'https://app4me.shop/blog',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7
    }
  ];
}
```

### 9.3 Structured Data (JSON-LD)

Add to landing page:

```jsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'App4Me',
      description: 'Discover apps made for your lifestyle',
      url: 'https://app4me.shop',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD'
      }
    })
  }}
/>
```

### 9.4 Content Strategy

**Blog topics for SEO:**
- "10 Hidden Gem Finance Apps for 2025"
- "Best Budget Apps That Actually Work"
- "Productivity Apps for Busy Professionals"
- "How to Find the Perfect App for Your Lifestyle"
- "Travel Apps You've Never Heard Of"

---

## 10. Deployment & Hosting {#deployment}

### 10.1 Vercel Configuration

**File:** `vercel.json`

```json
{
  "framework": "nextjs",
  "buildCommand": "next build",
  "devCommand": "next dev",
  "installCommand": "npm install",
  "regions": ["iad1"],
  "crons": [
    {
      "path": "/api/cron/collect-apps",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/generate-summaries",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/generate-embeddings",
      "schedule": "0 4 * * *"
    }
  ]
}
```

### 10.2 Deployment Steps

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login to Vercel
vercel login

# 3. Link project
vercel link

# 4. Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_KEY
vercel env add GEMINI_API_KEY
vercel env add SERPAPI_KEY
vercel env add CRON_SECRET

# 5. Deploy
vercel --prod

# 6. Add custom domain
vercel domains add app4me.shop
```

### 10.3 Domain Setup

1. **In your domain registrar (where you bought app4me.shop):**
   ```
   Type: A Record
   Name: @
   Value: 76.76.21.21 (Vercel's IP)
   
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

2. **In Vercel dashboard:**
   - Add domain: app4me.shop
   - Add www.app4me.shop (redirect to apex)
   - Enable HTTPS (automatic)

---

## 11. Cost Breakdown {#cost-breakdown}

### Monthly Costs (MVP Phase)

| Service | Plan | Cost | Notes |
|---------|------|------|-------|
| **Vercel** | Hobby | $0 | 100GB bandwidth, serverless functions |
| **Supabase** | Free | $0 | 500MB database, 2GB bandwidth |
| **Gemini API** | Free Tier | $0 | 1M tokens/day, 15 RPM (Flash) |
| **SerpAPI** | Free | $0 | 250 searches/month |
| **Domain** | app4me.shop | $10/yr | Already purchased |
| **TOTAL** | | **~$1/mo** | Essentially free during MVP! |

### Scaling Costs (1,000+ users)

| Service | Plan | Cost | When to Upgrade |
|---------|------|------|-----------------|
| **Vercel** | Pro | $20/mo | >100GB bandwidth or team features |
| **Supabase** | Pro | $25/mo | >500MB DB or >2GB bandwidth |
| **Gemini API** | Pay-as-go | $5-20/mo | Heavy usage (still cheap!) |
| **SerpAPI** | Developer | $50/mo | Need >250 searches (5K searches) |
| **TOTAL** | | **$100-115/mo** | At scale with real users |

---

## 12. Launch Timeline {#launch-timeline}

### Week 1: Setup & Infrastructure
- [ ] Day 1: Create Next.js project
- [ ] Day 2: Set up Supabase, create schema
- [ ] Day 3: Connect domain, deploy to Vercel
- [ ] Day 4: Implement landing page
- [ ] Day 5: Build discovery results page
- [ ] Day 6: Connect Gemini API
- [ ] Day 7: Test end-to-end flow

### Week 2: Data Collection
- [ ] Day 8-9: Build iTunes API collector
- [ ] Day 10: Build RSS feed collector
- [ ] Day 11: Run initial collection (target: 10K apps)
- [ ] Day 12-13: Generate AI summaries (batch processing)
- [ ] Day 14: Generate embeddings

### Week 3: Search & Polish
- [ ] Day 15-16: Implement multi-strategy search
- [ ] Day 17: Build LLM ranking/personalization
- [ ] Day 18: Add signup flow
- [ ] Day 19-20: Testing & bug fixes
- [ ] Day 21: SEO optimization

### Week 4: Launch! 🚀
- [ ] Day 22-23: Final testing
- [ ] Day 24: Soft launch to friends
- [ ] Day 25: ProductHunt preparation
- [ ] Day 26: **PUBLIC LAUNCH**
- [ ] Day 27-28: Monitor, iterate, respond to feedback

---

## 13. Success Metrics {#success-metrics}

### Week 1 Goals
- 100 unique visitors
- 20 searches performed
- 5 email signups
- 0 crashes

### Month 1 Goals
- 1,000 unique visitors
- 200 searches
- 50 email signups
- 10 returning users
- ProductHunt launch

### Month 3 Goals
- 10,000 unique visitors
- 2,000 searches
- 500 signups
- 100 active weekly users
- First revenue (optional ads/affiliate)

### Key Metrics to Track
- **Search quality:** Relevance score from user feedback
- **Engagement:** Cards viewed per session
- **Conversion:** Search → Signup rate
- **Retention:** 7-day return rate
- **App Store clicks:** Click-through rate to App Store

---

## 🚀 Quick Start Commands

```bash
# Clone and setup
npx create-next-app@latest app4me
cd app4me

# Install dependencies
npm install @supabase/supabase-js @google/generative-ai lucide-react

# Setup environment
cp .env.example .env.local
# Add your API keys

# Run database migrations
# (Copy SQL from section 4 into Supabase SQL editor)

# Start development
npm run dev

# Run data collection (one-time setup)
npm run collect:bootstrap

# Deploy to Vercel
vercel --prod
```

---

## 📞 Support & Resources

- **Supabase Docs:** https://supabase.com/docs
- **Gemini API:** https://ai.google.dev/docs
- **Next.js Docs:** https://nextjs.org/docs
- **iTunes API:** https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/
- **SerpAPI Docs:** https://serpapi.com/apple-app-store

---

**Ready to build App4Me! 🎯**

This document contains everything needed to implement the complete system. Hand this to Claude Code or any developer to build the MVP.