-- Schema Status Check - Run this to see what's already implemented
-- Execute in Supabase SQL Editor to verify current state

-- 1. Check if unique constraints exist
SELECT 
  conname as constraint_name,
  conrelid::regclass as table_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname IN ('itunes_apps_unique', 'apple_rss_apps_unique', 'serp_apps_unique', 'apps_unified_bundle_id_unique');

-- 2. Check if indexes exist
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('itunes_apps', 'apple_rss_apps', 'serp_apps', 'apps_unified')
AND schemaname = 'public'
ORDER BY tablename, indexname;

-- 3. Check if functions exist
SELECT 
  proname as function_name,
  pronargs as num_args,
  prorettype::regtype as return_type
FROM pg_proc 
WHERE proname IN ('calculate_data_quality_score', 'update_last_scraped', 'update_reconciliation_metadata')
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 4. Check if triggers exist
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid::regclass::text IN ('itunes_apps', 'apple_rss_apps', 'serp_apps', 'apps_unified')
AND tgname NOT LIKE 'RI_%'; -- Exclude foreign key triggers

-- 5. Check if views exist
SELECT 
  viewname,
  definition
FROM pg_views 
WHERE viewname IN ('v_all_apps', 'v_multi_source_apps')
AND schemaname = 'public';

-- 6. Test data quality function (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calculate_data_quality_score') THEN
    RAISE NOTICE 'Testing data quality function...';
    PERFORM calculate_data_quality_score('Test App', 'Description', 4.5, 1000, 'icon.jpg', '[]'::jsonb, 'Developer', '[]'::jsonb);
    RAISE NOTICE 'Data quality function works!';
  ELSE
    RAISE NOTICE 'Data quality function NOT found';
  END IF;
EXCEPTION 
  WHEN OTHERS THEN
    RAISE NOTICE 'Data quality function exists but has errors: %', SQLERRM;
END $$;

-- 7. Count existing data
SELECT 'itunes_apps' as table_name, count(*) as record_count FROM itunes_apps
UNION ALL
SELECT 'apple_rss_apps' as table_name, count(*) as record_count FROM apple_rss_apps  
UNION ALL
SELECT 'serp_apps' as table_name, count(*) as record_count FROM serp_apps
UNION ALL
SELECT 'apps_unified' as table_name, count(*) as record_count FROM apps_unified
ORDER BY table_name;