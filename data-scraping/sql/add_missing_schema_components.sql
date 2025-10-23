-- Add Missing Schema Components
-- Only adds what's not already present in your database
-- Run this AFTER running check_schema_status.sql to see what's missing

-- =====================================================
-- 1. Add missing indexes (check if they exist first)
-- =====================================================

-- Create indexes only if they don't exist
DO $$
BEGIN
  -- iTunes apps indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_itunes_apps_bundle_id') THEN
    CREATE INDEX idx_itunes_apps_bundle_id ON itunes_apps(bundle_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_itunes_apps_developer') THEN
    CREATE INDEX idx_itunes_apps_developer ON itunes_apps(developer);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_itunes_apps_category') THEN
    CREATE INDEX idx_itunes_apps_category ON itunes_apps(category);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_itunes_apps_last_scraped') THEN
    CREATE INDEX idx_itunes_apps_last_scraped ON itunes_apps(last_scraped);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_itunes_apps_rating') THEN
    CREATE INDEX idx_itunes_apps_rating ON itunes_apps(rating DESC);
  END IF;

  -- Apple RSS apps indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_apple_rss_apps_bundle_id') THEN
    CREATE INDEX idx_apple_rss_apps_bundle_id ON apple_rss_apps(bundle_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_apple_rss_apps_feed_type') THEN
    CREATE INDEX idx_apple_rss_apps_feed_type ON apple_rss_apps(feed_type);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_apple_rss_apps_rss_rank') THEN
    CREATE INDEX idx_apple_rss_apps_rss_rank ON apple_rss_apps(rss_rank);
  END IF;

  -- SERP apps indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_serp_apps_bundle_id') THEN
    CREATE INDEX idx_serp_apps_bundle_id ON serp_apps(bundle_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_serp_apps_position') THEN
    CREATE INDEX idx_serp_apps_position ON serp_apps(position);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_serp_apps_rating') THEN
    CREATE INDEX idx_serp_apps_rating ON serp_apps(rating DESC);
  END IF;

  -- Apps unified indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_apps_unified_bundle_id') THEN
    CREATE INDEX idx_apps_unified_bundle_id ON apps_unified(bundle_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_apps_unified_rating') THEN
    CREATE INDEX idx_apps_unified_rating ON apps_unified(rating DESC);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_apps_unified_data_quality_score') THEN
    CREATE INDEX idx_apps_unified_data_quality_score ON apps_unified(data_quality_score DESC);
  END IF;

END $$;

-- =====================================================
-- 2. Add data quality scoring function
-- =====================================================

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
-- 3. Add trigger functions
-- =====================================================

-- Function to update last_scraped timestamp
CREATE OR REPLACE FUNCTION update_last_scraped()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_scraped = NOW();
  NEW.scrape_count = OLD.scrape_count + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update reconciliation metadata
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

-- =====================================================
-- 4. Add triggers (only if they don't exist)
-- =====================================================

DO $$
BEGIN
  -- Check and create triggers for iTunes apps
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_itunes_last_scraped') THEN
    CREATE TRIGGER trigger_update_itunes_last_scraped
      BEFORE UPDATE ON itunes_apps
      FOR EACH ROW
      EXECUTE FUNCTION update_last_scraped();
  END IF;

  -- Check and create triggers for RSS apps
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_rss_last_scraped') THEN
    CREATE TRIGGER trigger_update_rss_last_scraped
      BEFORE UPDATE ON apple_rss_apps
      FOR EACH ROW
      EXECUTE FUNCTION update_last_scraped();
  END IF;

  -- Check and create triggers for SERP apps
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_serp_last_scraped') THEN
    CREATE TRIGGER trigger_update_serp_last_scraped
      BEFORE UPDATE ON serp_apps
      FOR EACH ROW
      EXECUTE FUNCTION update_last_scraped();
  END IF;

  -- Check and create triggers for unified apps
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_unified_metadata') THEN
    CREATE TRIGGER trigger_update_unified_metadata
      BEFORE INSERT OR UPDATE ON apps_unified
      FOR EACH ROW
      EXECUTE FUNCTION update_reconciliation_metadata();
  END IF;

END $$;

-- =====================================================
-- 5. Add views for analytics
-- =====================================================

-- Drop views if they exist and recreate
DROP VIEW IF EXISTS v_all_apps;
DROP VIEW IF EXISTS v_multi_source_apps;

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
-- 6. Test everything works
-- =====================================================

-- Test data quality function
SELECT calculate_data_quality_score(
  'Test App',
  'This is a test description with more than 50 characters to get points',
  4.5,
  10000,
  'https://example.com/icon.jpg',
  '[{"url": "screenshot1.jpg"}]'::jsonb,
  'Test Developer',
  '["Games", "Entertainment"]'::jsonb
) as test_quality_score;

-- Test views
SELECT 'v_all_apps' as view_name, count(*) as row_count FROM v_all_apps
UNION ALL
SELECT 'v_multi_source_apps' as view_name, count(*) as row_count FROM v_multi_source_apps;

-- Success message
SELECT 'Schema update completed successfully! 🎉' as message,
       'Added missing indexes, functions, triggers, and views' as details;