-- Execute Deduplication - Run this after reviewing the analysis results
-- This will deduplicate the itunes_apps table and add the unique constraint

-- Step 1: Create backup (optional but recommended)
CREATE TABLE IF NOT EXISTS itunes_apps_backup AS 
SELECT * FROM itunes_apps;

-- Step 2: Create deduplicated temporary table
CREATE TEMP TABLE itunes_apps_deduplicated AS
SELECT DISTINCT ON (bundle_id) 
    id,
    bundle_id,
    source,
    query_term,
    title,
    developer,
    developer_id,
    developer_url,
    version,
    price,
    formatted_price,
    currency,
    rating,
    rating_count,
    icon_url,
    screenshots,
    description,
    release_date,
    last_updated,
    age_rating,
    genres,
    category,
    size_bytes,
    languages_supported,
    rank,
    first_scraped,
    last_scraped,
    scrape_count,
    raw_data
FROM itunes_apps 
ORDER BY bundle_id, last_scraped DESC, scrape_count DESC, id DESC;

-- Step 3: Show what will be kept vs removed
SELECT 
    'Original records' as type,
    COUNT(*) as count
FROM itunes_apps
UNION ALL
SELECT 
    'After deduplication' as type,
    COUNT(*) as count
FROM itunes_apps_deduplicated
UNION ALL
SELECT 
    'Records to remove' as type,
    (SELECT COUNT(*) FROM itunes_apps) - (SELECT COUNT(*) FROM itunes_apps_deduplicated) as count;

-- Step 4: Replace with deduplicated data
DELETE FROM itunes_apps;
INSERT INTO itunes_apps SELECT * FROM itunes_apps_deduplicated;

-- Step 5: Add the unique constraint
ALTER TABLE itunes_apps 
ADD CONSTRAINT itunes_apps_bundle_id_unique UNIQUE (bundle_id);

-- Step 6: Verify success
SELECT 
    'Deduplication complete!' as message,
    COUNT(*) as final_record_count,
    COUNT(DISTINCT bundle_id) as unique_bundle_ids
FROM itunes_apps;

-- Step 7: Verify the constraint exists
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'itunes_apps'::regclass 
AND contype = 'u';

SELECT 'Ready to apply app features schema!' as next_step;