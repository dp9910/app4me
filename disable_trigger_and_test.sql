-- Temporarily disable the problematic trigger
-- Run this in Supabase SQL Editor

-- Disable the trigger
DROP TRIGGER IF EXISTS trigger_update_unified_metadata ON apps_unified;

-- Test a simple insert
INSERT INTO apps_unified (
  bundle_id,
  title,
  developer,
  rating,
  rating_count,
  rating_source,
  primary_category,
  all_categories,
  available_in_sources,
  data_quality_score,
  total_appearances,
  last_reconciled,
  reconciliation_count
) VALUES (
  'com.test.reconciliation',
  'Test Reconciliation App',
  'Test Developer',
  4.5,
  1000,
  'test_api',
  'Testing',
  '["Testing", "Development"]'::jsonb,
  '["test"]'::jsonb,
  75,
  1,
  NOW(),
  1
);

-- Check if it worked
SELECT 
  bundle_id,
  title,
  data_quality_score,
  all_categories,
  available_in_sources
FROM apps_unified 
WHERE bundle_id = 'com.test.reconciliation';

-- Clean up test
DELETE FROM apps_unified WHERE bundle_id = 'com.test.reconciliation';

SELECT 'Trigger disabled and basic insert test completed' as status;