-- Fix v_all_apps view data type conflict
-- Run in Supabase SQL Editor

-- Drop dependent views first
DROP VIEW IF EXISTS v_multi_source_apps CASCADE;
DROP VIEW IF EXISTS v_all_apps CASCADE;

-- Recreate view with proper data type handling
CREATE VIEW v_all_apps AS
SELECT 
  'itunes' as source_type,
  bundle_id,
  title,
  developer,
  rating,
  rating_count,
  category,
  price, -- DECIMAL type
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
  price, -- DECIMAL type
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
  price_value, -- Use DECIMAL price_value instead of string price
  last_scraped
FROM serp_apps;

-- Recreate the multi-source view
CREATE VIEW v_multi_source_apps AS
SELECT 
  bundle_id,
  array_agg(DISTINCT source_type) as sources,
  count(DISTINCT source_type) as source_count,
  max(last_scraped) as latest_update
FROM v_all_apps
GROUP BY bundle_id
HAVING count(DISTINCT source_type) > 1;

-- Test the fixed views
SELECT source_type, count(*) as app_count FROM v_all_apps GROUP BY source_type;

-- Test sample data
SELECT source_type, bundle_id, title, price FROM v_all_apps LIMIT 5;

-- Test multi-source view
SELECT * FROM v_multi_source_apps;