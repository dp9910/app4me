-- =====================================================
-- App Discovery Platform - Database Schema
-- Run this script in Supabase SQL Editor
-- =====================================================

-- Check if our new tables already exist and drop them if needed
DROP TABLE IF EXISTS apps_unified CASCADE;
DROP TABLE IF EXISTS serp_apps CASCADE;
DROP TABLE IF EXISTS apple_rss_apps CASCADE;
DROP TABLE IF EXISTS itunes_apps CASCADE;

-- Drop functions if they exist
DROP FUNCTION IF EXISTS calculate_data_quality_score CASCADE;
DROP FUNCTION IF EXISTS update_last_scraped CASCADE;
DROP FUNCTION IF EXISTS update_reconciliation_metadata CASCADE;

-- Drop views if they exist
DROP VIEW IF EXISTS v_all_apps CASCADE;
DROP VIEW IF EXISTS v_multi_source_apps CASCADE;

-- =====================================================
-- 1. iTunes Apps Table
-- =====================================================
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
  CONSTRAINT itunes_apps_unique UNIQUE(bundle_id, source, query_term)
);

-- =====================================================
-- 2. Apple RSS Apps Table
-- =====================================================
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
  CONSTRAINT apple_rss_apps_unique UNIQUE(bundle_id, source, feed_type)
);

-- =====================================================
-- 3. SERP Apps Table
-- =====================================================
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
  CONSTRAINT serp_apps_unique UNIQUE(bundle_id, source, query_term)
);

-- =====================================================
-- 4. Apps Unified Table (Reconciliation)
-- =====================================================
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
  
  -- Constraints
  CONSTRAINT apps_unified_bundle_id_unique UNIQUE(bundle_id)
);

-- =====================================================
-- 5. Create all indexes
-- =====================================================

-- Indexes for itunes_apps
CREATE INDEX idx_itunes_apps_bundle_id ON itunes_apps(bundle_id);
CREATE INDEX idx_itunes_apps_developer ON itunes_apps(developer);
CREATE INDEX idx_itunes_apps_category ON itunes_apps(category);
CREATE INDEX idx_itunes_apps_last_scraped ON itunes_apps(last_scraped);
CREATE INDEX idx_itunes_apps_rating ON itunes_apps(rating DESC);

-- Indexes for apple_rss_apps
CREATE INDEX idx_apple_rss_apps_bundle_id ON apple_rss_apps(bundle_id);
CREATE INDEX idx_apple_rss_apps_feed_type ON apple_rss_apps(feed_type);
CREATE INDEX idx_apple_rss_apps_rss_rank ON apple_rss_apps(rss_rank);
CREATE INDEX idx_apple_rss_apps_last_scraped ON apple_rss_apps(last_scraped);
CREATE INDEX idx_apple_rss_apps_developer ON apple_rss_apps(developer);

-- Indexes for serp_apps
CREATE INDEX idx_serp_apps_bundle_id ON serp_apps(bundle_id);
CREATE INDEX idx_serp_apps_developer ON serp_apps(developer);
CREATE INDEX idx_serp_apps_category ON serp_apps(category);
CREATE INDEX idx_serp_apps_position ON serp_apps(position);
CREATE INDEX idx_serp_apps_last_scraped ON serp_apps(last_scraped);
CREATE INDEX idx_serp_apps_rating ON serp_apps(rating DESC);

-- Indexes for apps_unified
CREATE INDEX idx_apps_unified_bundle_id ON apps_unified(bundle_id);
CREATE INDEX idx_apps_unified_developer ON apps_unified(developer);
CREATE INDEX idx_apps_unified_primary_category ON apps_unified(primary_category);
CREATE INDEX idx_apps_unified_rating ON apps_unified(rating DESC);
CREATE INDEX idx_apps_unified_last_reconciled ON apps_unified(last_reconciled);
CREATE INDEX idx_apps_unified_data_quality_score ON apps_unified(data_quality_score DESC);
CREATE INDEX idx_apps_unified_total_appearances ON apps_unified(total_appearances DESC);

-- =====================================================
-- 6. Helper Functions
-- =====================================================

-- Function to calculate data quality score
CREATE OR REPLACE FUNCTION calculate_data_quality_score(
  p_title TEXT,
  p_description TEXT,
  p_rating DECIMAL,
  p_rating_count BIGINT,
  p_icon_url TEXT,
  p_screenshots JSONB,
  p_developer TEXT,
  p_categories JSONB
) RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
BEGIN
  -- Basic info (40 points)
  IF p_title IS NOT NULL AND LENGTH(p_title) > 0 THEN score := score + 10; END IF;
  IF p_description IS NOT NULL AND LENGTH(p_description) > 50 THEN score := score + 15; END IF;
  IF p_developer IS NOT NULL AND LENGTH(p_developer) > 0 THEN score := score + 10; END IF;
  IF p_categories IS NOT NULL AND jsonb_array_length(p_categories) > 0 THEN score := score + 5; END IF;
  
  -- Rating data (30 points)
  IF p_rating IS NOT NULL AND p_rating > 0 THEN score := score + 10; END IF;
  IF p_rating_count IS NOT NULL AND p_rating_count > 0 THEN 
    IF p_rating_count > 1000 THEN score := score + 20;
    ELSIF p_rating_count > 100 THEN score := score + 15;
    ELSIF p_rating_count > 10 THEN score := score + 10;
    ELSE score := score + 5;
    END IF;
  END IF;
  
  -- Media assets (30 points)
  IF p_icon_url IS NOT NULL AND LENGTH(p_icon_url) > 0 THEN score := score + 10; END IF;
  IF p_screenshots IS NOT NULL THEN
    IF jsonb_array_length(p_screenshots) >= 5 THEN score := score + 20;
    ELSIF jsonb_array_length(p_screenshots) >= 3 THEN score := score + 15;
    ELSIF jsonb_array_length(p_screenshots) >= 1 THEN score := score + 10;
    END IF;
  END IF;
  
  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. Triggers for automatic updates
-- =====================================================

-- Update last_scraped timestamp on updates
CREATE OR REPLACE FUNCTION update_last_scraped()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_scraped = NOW();
  NEW.scrape_count = OLD.scrape_count + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all source tables
CREATE TRIGGER trigger_update_itunes_last_scraped
  BEFORE UPDATE ON itunes_apps
  FOR EACH ROW
  EXECUTE FUNCTION update_last_scraped();

CREATE TRIGGER trigger_update_rss_last_scraped
  BEFORE UPDATE ON apple_rss_apps
  FOR EACH ROW
  EXECUTE FUNCTION update_last_scraped();

CREATE TRIGGER trigger_update_serp_last_scraped
  BEFORE UPDATE ON serp_apps
  FOR EACH ROW
  EXECUTE FUNCTION update_last_scraped();

-- Update reconciliation metadata
CREATE OR REPLACE FUNCTION update_reconciliation_metadata()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_reconciled = NOW();
  NEW.reconciliation_count = COALESCE(OLD.reconciliation_count, 0) + 1;
  
  -- Calculate data quality score
  NEW.data_quality_score = calculate_data_quality_score(
    NEW.title,
    NEW.description,
    NEW.rating,
    NEW.rating_count,
    NEW.icon_url,
    NEW.screenshots,
    NEW.developer,
    NEW.all_categories
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_unified_metadata
  BEFORE INSERT OR UPDATE ON apps_unified
  FOR EACH ROW
  EXECUTE FUNCTION update_reconciliation_metadata();

-- =====================================================
-- 8. Views for common queries
-- =====================================================

-- View: All apps across sources with basic info
CREATE VIEW v_all_apps AS
SELECT 
  'itunes' as source_type,
  bundle_id,
  title,
  developer,
  rating,
  rating_count,
  category,
  price,
  last_scraped
FROM itunes_apps
UNION ALL
SELECT 
  'rss' as source_type,
  bundle_id,
  title,
  developer,
  rating,
  rating_count,
  category,
  price,
  last_scraped
FROM apple_rss_apps
UNION ALL
SELECT 
  'serp' as source_type,
  bundle_id,
  title,
  developer,
  rating,
  rating_count,
  category,
  price_value,
  last_scraped
FROM serp_apps;

-- View: Apps with multiple source presence
CREATE VIEW v_multi_source_apps AS
SELECT 
  bundle_id,
  array_agg(DISTINCT source_type) as sources,
  count(DISTINCT source_type) as source_count,
  max(last_scraped) as latest_update
FROM v_all_apps
GROUP BY bundle_id
HAVING count(DISTINCT source_type) > 1;

-- =====================================================
-- 9. Add table comments
-- =====================================================

COMMENT ON TABLE itunes_apps IS 'Apps scraped from iTunes Search API';
COMMENT ON TABLE apple_rss_apps IS 'Apps scraped from Apple RSS feeds';
COMMENT ON TABLE serp_apps IS 'Apps scraped from SERP API';
COMMENT ON TABLE apps_unified IS 'Reconciled app data from all sources';

-- =====================================================
-- 10. Success message
-- =====================================================

SELECT 'Database schema created successfully! 🎉' as message,
       'Created 4 tables: itunes_apps, apple_rss_apps, serp_apps, apps_unified' as details;