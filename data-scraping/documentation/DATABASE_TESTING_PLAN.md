# Database Testing Plan - App Discovery Platform

## Overview
Comprehensive testing strategy to validate our 4-table database architecture and reconciliation logic before production deployment.

## Test Strategy
- **Test-Driven Development**: Create tests before full implementation
- **Progressive Testing**: Each phase must pass before moving to next
- **Commit on Success**: Only commit when all tests in a phase pass
- **Real Data Testing**: Use actual API response formats

---

## Phase 1: Database Schema Validation

### Test 1.1: Table Creation Verification
**Objective**: Ensure all tables, indexes, functions, and triggers are created correctly

**Steps**:
1. Run `supabase_tables_creation.sql` in Supabase Dashboard
2. Verify table structure with:
```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('itunes_apps', 'apple_rss_apps', 'serp_apps', 'apps_unified');

-- Check indexes exist
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('itunes_apps', 'apple_rss_apps', 'serp_apps', 'apps_unified');

-- Check functions exist
SELECT proname FROM pg_proc WHERE proname IN ('calculate_data_quality_score', 'update_last_scraped');
```

**Success Criteria**: 
- ✅ 4 tables created
- ✅ All indexes present
- ✅ 3 functions created
- ✅ 4 triggers active
- ✅ 2 views accessible

---

## Phase 2: Test Data Preparation

### Test 2.1: Use Existing Real Data Files
**Objective**: Use actual API data we've already collected from our three sources

**Existing Data Files**:

#### iTunes API Data
- **File**: `database_ready_apps.json` (✅ Available)
- **Content**: Real iTunes Search API responses with apps like Flora, Structured, etc.
- **Structure**: Already processed with proper field mapping
- **Sample apps**: Flora - Green Focus, Structured - Daily Planner, and others

#### Apple RSS Data  
- **File**: `apple_rss_all_data.json` (⚠️ Currently empty)
- **Status**: Need to re-run RSS scraper to populate
- **Expected**: Top free/paid apps from Apple RSS feeds

#### SERP API Data
- **File**: `serp_raw_response.json` (✅ Available)
- **Content**: Real SERP API response with Instagram data
- **Structure**: Contains organic_results with complete app details
- **Sample**: Instagram app with full metadata including logos, ratings, etc.

**Test Data Verification**:
```bash
# Check iTunes data
cat database_ready_apps.json | jq 'length'  # Should show number of apps

# Check SERP data  
cat serp_raw_response.json | jq '.organic_results | length'  # Should show 5 apps

# Check RSS data (needs population)
cat apple_rss_all_data.json | jq 'length'  # Currently 0, need to re-run
```

---

## Phase 3: Basic Data Operations

### Test 3.1: Data Insertion Test
**Objective**: Verify data can be inserted into all source tables

**Test Script** (`test-insertion.sql`):
```sql
-- Test iTunes data insertion
INSERT INTO itunes_apps (bundle_id, source, query_term, title, developer, version, price, rating, rating_count, description, category)
VALUES 
('com.burbn.instagram', 'itunes_api', 'social media', 'Instagram', 'Instagram, Inc.', '403.0.0', 0.00, 4.69, 28282046, 'Share photos and videos', 'Photo & Video'),
('com.atebits.Tweetie2', 'itunes_api', 'social media', 'X', 'X Corp.', '10.53.0', 0.00, 4.1, 1582945, 'Social networking platform', 'Social Networking');

-- Test RSS data insertion  
INSERT INTO apple_rss_apps (bundle_id, source, feed_type, title, developer, version, price, rating, rating_count, rss_rank)
VALUES
('com.burbn.instagram', 'apple_rss', 'top-free', 'Instagram', 'Instagram, Inc.', '403.0.0', 0.00, 4.69, 28282046, 1),
('com.zhiliaoapp.musically', 'apple_rss', 'top-free', 'TikTok', 'TikTok Ltd.', '34.4.0', 0.00, 4.7, 12453621, 2);

-- Test SERP data insertion
INSERT INTO serp_apps (bundle_id, source, query_term, title, developer, version, price, rating, rating_count, position)
VALUES
('com.burbn.instagram', 'serp_api', 'social media', 'Instagram', 'Instagram, Inc.', '403.0.0', 'Free', 4.69, 28282046, 1),
('com.facebook.Facebook', 'serp_api', 'social media', 'Facebook', 'Meta Platforms, Inc.', '445.0.0', 'Free', 4.2, 5847392, 2);

-- Verify insertions
SELECT 'iTunes Apps' as source, count(*) as count FROM itunes_apps
UNION ALL
SELECT 'RSS Apps' as source, count(*) as count FROM apple_rss_apps  
UNION ALL
SELECT 'SERP Apps' as source, count(*) as count FROM serp_apps;
```

**Success Criteria**:
- ✅ iTunes: 2 records inserted
- ✅ RSS: 2 records inserted  
- ✅ SERP: 2 records inserted
- ✅ No constraint violations
- ✅ Timestamps auto-populated

### Test 3.2: Data Retrieval Test
**Objective**: Verify data can be queried from all tables

**Test Script** (`test-retrieval.sql`):
```sql
-- Test basic queries
SELECT bundle_id, title, developer, rating FROM itunes_apps;
SELECT bundle_id, title, rss_rank FROM apple_rss_apps ORDER BY rss_rank;
SELECT bundle_id, title, position FROM serp_apps ORDER BY position;

-- Test joins and complex queries
SELECT 
  i.bundle_id,
  i.title,
  i.rating as itunes_rating,
  r.rss_rank,
  s.position as serp_position
FROM itunes_apps i
FULL OUTER JOIN apple_rss_apps r ON i.bundle_id = r.bundle_id
FULL OUTER JOIN serp_apps s ON i.bundle_id = s.bundle_id;

-- Test views
SELECT * FROM v_all_apps;
SELECT * FROM v_multi_source_apps;
```

**Success Criteria**:
- ✅ All data retrieved correctly
- ✅ Joins work properly
- ✅ Views return expected results
- ✅ No data corruption

---

## Phase 4: Duplicate Detection & Smart Updates

### Test 4.1: Duplicate Prevention Test
**Objective**: Verify duplicate constraint enforcement

**Test Script** (`test-duplicates.sql`):
```sql
-- Try to insert duplicate (should fail)
INSERT INTO itunes_apps (bundle_id, source, query_term, title, developer, version)
VALUES ('com.burbn.instagram', 'itunes_api', 'social media', 'Instagram Duplicate', 'Instagram, Inc.', '403.0.0');

-- Check error occurs
-- Expected: ERROR: duplicate key value violates unique constraint "itunes_apps_unique"
```

**Success Criteria**:
- ✅ Duplicate insertion fails with constraint error
- ✅ Original data remains unchanged

### Test 4.2: Smart Update Logic Test
**Objective**: Verify UPDATE operations work with changed data

**Test Script** (`test-updates.sql`):
```sql
-- Record initial state
SELECT bundle_id, version, rating, rating_count, scrape_count, last_scraped 
FROM itunes_apps WHERE bundle_id = 'com.burbn.instagram';

-- Update with new version and rating
UPDATE itunes_apps 
SET version = '404.0.0', rating = 4.70, rating_count = 28500000
WHERE bundle_id = 'com.burbn.instagram' AND source = 'itunes_api' AND query_term = 'social media';

-- Verify update
SELECT bundle_id, version, rating, rating_count, scrape_count, last_scraped 
FROM itunes_apps WHERE bundle_id = 'com.burbn.instagram';

-- Test UPSERT operation (INSERT ... ON CONFLICT)
INSERT INTO itunes_apps (bundle_id, source, query_term, title, developer, version, rating, rating_count)
VALUES ('com.burbn.instagram', 'itunes_api', 'social media', 'Instagram', 'Instagram, Inc.', '405.0.0', 4.71, 29000000)
ON CONFLICT (bundle_id, source, query_term) 
DO UPDATE SET 
  version = EXCLUDED.version,
  rating = EXCLUDED.rating,
  rating_count = EXCLUDED.rating_count;
```

**Success Criteria**:
- ✅ Update triggers increment scrape_count
- ✅ last_scraped timestamp updates automatically
- ✅ UPSERT operations work correctly
- ✅ Only specified fields change

---

## Phase 5: Database Functions & Triggers

### Test 5.1: Quality Score Function Test
**Objective**: Verify data quality scoring works correctly

**Test Script** (`test-functions.sql`):
```sql
-- Test quality score calculation
SELECT calculate_data_quality_score(
  'Instagram',
  'Share photos and videos with friends. Connect with people around the world.',
  4.69,
  28282046,
  'https://icon.jpg',
  '[{"url": "screenshot1.jpg"}, {"url": "screenshot2.jpg"}]'::jsonb,
  'Instagram, Inc.',
  '["Photo & Video", "Social Networking"]'::jsonb
) AS quality_score;

-- Test with minimal data
SELECT calculate_data_quality_score(
  'App',
  null,
  null,
  null,
  null,
  null,
  null,
  null
) AS minimal_score;

-- Test with maximum data
SELECT calculate_data_quality_score(
  'Complete App Name',
  'Very detailed description with more than 50 characters explaining app functionality',
  4.8,
  50000000,
  'https://highres-icon.jpg',
  '[{"url": "s1.jpg"}, {"url": "s2.jpg"}, {"url": "s3.jpg"}, {"url": "s4.jpg"}, {"url": "s5.jpg"}, {"url": "s6.jpg"}]'::jsonb,
  'Top Developer Inc.',
  '["Category1", "Category2", "Category3"]'::jsonb
) AS max_score;
```

**Success Criteria**:
- ✅ Complete data scores ~90-100
- ✅ Minimal data scores <20
- ✅ Partial data scores 30-70
- ✅ Function handles null values

### Test 5.2: Trigger Functions Test
**Objective**: Verify triggers fire correctly on data changes

**Test Script** (`test-triggers.sql`):
```sql
-- Insert test data for unified table
INSERT INTO apps_unified (bundle_id, title, developer, rating, rating_count, description, icon_url, all_categories)
VALUES (
  'com.test.trigger',
  'Trigger Test App',
  'Test Developer',
  4.5,
  1000,
  'Testing trigger functionality',
  'https://icon.jpg',
  '["Testing", "Utilities"]'::jsonb
);

-- Check auto-calculated fields
SELECT 
  bundle_id,
  data_quality_score,
  first_discovered,
  last_reconciled,
  reconciliation_count
FROM apps_unified 
WHERE bundle_id = 'com.test.trigger';

-- Update and check reconciliation count increment
UPDATE apps_unified 
SET rating = 4.6 
WHERE bundle_id = 'com.test.trigger';

SELECT reconciliation_count, last_reconciled 
FROM apps_unified 
WHERE bundle_id = 'com.test.trigger';
```

**Success Criteria**:
- ✅ data_quality_score auto-calculated
- ✅ Timestamps auto-populated
- ✅ reconciliation_count increments on updates
- ✅ last_reconciled updates on changes

---

## Phase 6: Reconciliation Logic

### Test 6.1: Multi-Source Data Test
**Objective**: Test apps appearing in multiple sources

**Test Script** (`test-reconciliation.sql`):
```sql
-- Verify Instagram appears in all 3 sources
SELECT 
  bundle_id,
  source_type,
  title,
  developer,
  rating,
  rating_count
FROM v_all_apps 
WHERE bundle_id = 'com.burbn.instagram'
ORDER BY source_type;

-- Check multi-source detection
SELECT * FROM v_multi_source_apps WHERE bundle_id = 'com.burbn.instagram';

-- Manual reconciliation test (create function later)
-- For now, insert best data into unified table
INSERT INTO apps_unified (
  bundle_id, 
  title, 
  developer, 
  rating, 
  rating_count, 
  rating_source,
  available_in_sources
)
SELECT 
  'com.burbn.instagram',
  'Instagram',
  'Instagram, Inc.',
  MAX(rating) as best_rating,
  MAX(rating_count) as highest_count,
  'serp_api' as rating_source,
  '["itunes", "rss", "serp"]'::jsonb
FROM (
  SELECT rating, rating_count FROM itunes_apps WHERE bundle_id = 'com.burbn.instagram'
  UNION ALL
  SELECT rating, rating_count FROM apple_rss_apps WHERE bundle_id = 'com.burbn.instagram'  
  UNION ALL
  SELECT rating, rating_count FROM serp_apps WHERE bundle_id = 'com.burbn.instagram'
) combined_data;
```

**Success Criteria**:
- ✅ Same app detected across sources
- ✅ Multi-source view works
- ✅ Best data selection logic works
- ✅ Source tracking accurate

---

## Phase 7: Performance & Stress Testing

### Test 7.1: Bulk Data Insertion Test
**Objective**: Test performance with larger datasets

**Test Script** (`test-bulk-insert.sql`):
```sql
-- Generate 1000 test records
INSERT INTO itunes_apps (bundle_id, source, query_term, title, developer, version, rating, rating_count, category)
SELECT 
  'com.test.app' || generate_series(1, 1000),
  'itunes_api',
  'test',
  'Test App ' || generate_series(1, 1000),
  'Test Developer ' || (generate_series(1, 1000) % 50),
  '1.0.0',
  4.0 + (random() * 1.0),
  (random() * 1000000)::integer,
  CASE (generate_series(1, 1000) % 5) 
    WHEN 0 THEN 'Games'
    WHEN 1 THEN 'Utilities'
    WHEN 2 THEN 'Social'
    WHEN 3 THEN 'Photo & Video'
    ELSE 'Productivity'
  END;

-- Test query performance
EXPLAIN ANALYZE SELECT * FROM itunes_apps WHERE developer LIKE 'Test Developer 1%';
EXPLAIN ANALYZE SELECT * FROM itunes_apps WHERE category = 'Games' ORDER BY rating DESC LIMIT 10;
```

**Success Criteria**:
- ✅ 1000 records inserted < 5 seconds
- ✅ Index queries complete < 100ms
- ✅ No memory issues
- ✅ Query plans use indexes

---

## Phase 8: Edge Function Timer Testing

### Test 8.1: Manual Function Trigger Test
**Objective**: Test Edge Function execution manually

**Create**: `supabase/functions/test-scraper/index.ts`
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    // Test simple data insertion
    const { data, error } = await supabase
      .from('itunes_apps')
      .insert({
        bundle_id: `com.test.${Date.now()}`,
        source: 'test_function',
        query_term: 'test',
        title: 'Function Test App',
        developer: 'Edge Function'
      })

    if (error) throw error

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Function test successful',
        data: data,
        timestamp: new Date().toISOString()
      }),
      { headers: { "Content-Type": "application/json" } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" } 
      }
    )
  }
})
```

**Test Commands**:
```bash
# Deploy function
supabase functions deploy test-scraper

# Test function manually
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/test-scraper \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Success Criteria**:
- ✅ Function deploys successfully
- ✅ Function executes without errors
- ✅ Data inserted into database
- ✅ Proper error handling

### Test 8.2: Scheduled Function Test (5-minute intervals)
**Objective**: Test cron scheduling with short intervals

**Setup Cron** (in Supabase SQL Editor):
```sql
-- Create 5-minute test schedule
SELECT cron.schedule(
  'test-scraper-5min',
  '*/5 * * * *',  -- Every 5 minutes
  'SELECT net.http_post(url := ''https://YOUR_PROJECT.supabase.co/functions/v1/test-scraper'')'
);

-- Check cron jobs
SELECT * FROM cron.job;
```

**Monitor for 20 minutes**:
```sql
-- Check function execution results
SELECT * FROM itunes_apps WHERE source = 'test_function' ORDER BY first_scraped DESC;

-- Expected: 4 new records (every 5 minutes)
```

**Success Criteria**:
- ✅ Cron job created successfully
- ✅ Function executes every 5 minutes
- ✅ 4 new records created in 20 minutes
- ✅ No missed executions

---

## Phase 9: Error Handling & Edge Cases

### Test 9.1: Network Failure Simulation
**Objective**: Test error handling for API failures

**Test Cases**:
- Invalid API keys
- Rate limiting responses
- Network timeouts
- Malformed JSON responses
- Empty result sets

### Test 9.2: Data Validation Tests
**Objective**: Test data integrity constraints

**Test Script** (`test-validation.sql`):
```sql
-- Test required field validation
INSERT INTO itunes_apps (bundle_id, source, query_term) 
VALUES ('test', 'itunes_api', 'test'); -- Missing title (should fail)

-- Test data type validation  
INSERT INTO itunes_apps (bundle_id, source, query_term, title, rating)
VALUES ('test2', 'itunes_api', 'test', 'Test App', 'invalid_rating'); -- Invalid rating type

-- Test constraint validation
INSERT INTO itunes_apps (bundle_id, source, query_term, title, rating)
VALUES ('test3', 'itunes_api', 'test', 'Test App', 6.0); -- Rating > 5
```

**Success Criteria**:
- ✅ Required field violations caught
- ✅ Data type mismatches rejected
- ✅ Business rule constraints enforced

---

## Phase 10: Final Integration Test

### Test 10.1: End-to-End Workflow Test
**Objective**: Full pipeline from API to unified table

**Workflow**:
1. Edge Function fetches from iTunes, RSS, SERP APIs
2. Data inserted into source tables
3. Reconciliation logic creates unified records
4. Quality scores calculated
5. Views and analytics work

**Success Criteria**:
- ✅ Complete data flow works
- ✅ No data loss
- ✅ Performance acceptable
- ✅ Error handling robust

---

## Commit Strategy

### Commit Points:
- **Commit 1**: After Phase 1-2 (Schema + Test Data) ✅
- **Commit 2**: After Phase 3-4 (Basic Operations + Duplicates) ✅  
- **Commit 3**: After Phase 5-6 (Functions + Reconciliation) ✅
- **Commit 4**: After Phase 7-8 (Performance + Edge Functions) ✅
- **Commit 5**: After Phase 9-10 (Error Handling + Integration) ✅

### Commit Messages:
```bash
git commit -m "feat: implement database schema with 4-table architecture

- Create itunes_apps, apple_rss_apps, serp_apps, apps_unified tables
- Add smart indexing and triggers for auto-updates  
- Implement data quality scoring function
- Add reconciliation views for multi-source analysis

✅ All Phase 1-2 tests passing
🗄️ Database ready for data ingestion"
```

---

## Test Execution Checklist

### Before Each Phase:
- [ ] Review test objectives
- [ ] Prepare test data
- [ ] Set up monitoring

### During Testing:
- [ ] Execute tests systematically
- [ ] Document any failures
- [ ] Fix issues before proceeding

### After Each Phase:
- [ ] All tests pass ✅
- [ ] Performance acceptable ✅
- [ ] Error handling verified ✅
- [ ] Ready for commit ✅

### Final Verification:
- [ ] All 10 phases completed
- [ ] 5 commits made with passing tests
- [ ] Production-ready pipeline
- [ ] Documentation complete