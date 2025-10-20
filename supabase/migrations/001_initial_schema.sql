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