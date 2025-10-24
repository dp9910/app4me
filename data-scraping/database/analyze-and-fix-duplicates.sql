-- Analyze and fix duplicate bundle_id entries in itunes_apps table
-- This addresses the unique constraint creation error

-- Step 1: Analyze duplicate bundle_ids
SELECT 
    bundle_id,
    COUNT(*) as duplicate_count,
    string_agg(DISTINCT source, ', ') as sources,
    string_agg(DISTINCT query_term, ', ') as query_terms,
    MAX(last_scraped) as latest_scrape
FROM itunes_apps 
GROUP BY bundle_id 
HAVING COUNT(*) > 1 
ORDER BY duplicate_count DESC;

-- Step 2: See example of duplicates
SELECT 
    id,
    bundle_id,
    title,
    source,
    query_term,
    last_scraped,
    scrape_count
FROM itunes_apps 
WHERE bundle_id = 'com.lifexp.hani'
ORDER BY last_scraped DESC;

-- Step 3: Strategy - Keep the most recent entry per bundle_id
-- Create a temporary table with deduplicated data
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

-- Step 4: Show what we're keeping vs removing
SELECT 
    'Total original records' as description,
    COUNT(*) as count
FROM itunes_apps
UNION ALL
SELECT 
    'Deduplicated records' as description,
    COUNT(*) as count
FROM itunes_apps_deduplicated
UNION ALL
SELECT 
    'Records to be removed' as description,
    (SELECT COUNT(*) FROM itunes_apps) - (SELECT COUNT(*) FROM itunes_apps_deduplicated) as count;

-- Step 5: Backup the original table (optional)
-- CREATE TABLE itunes_apps_backup AS SELECT * FROM itunes_apps;

-- Step 6: Replace with deduplicated data
-- WARNING: This will delete duplicate entries permanently!
-- Uncomment these lines when ready to proceed:

/*
-- Delete all records
DELETE FROM itunes_apps;

-- Insert deduplicated records
INSERT INTO itunes_apps SELECT * FROM itunes_apps_deduplicated;

-- Add the unique constraint
ALTER TABLE itunes_apps 
ADD CONSTRAINT itunes_apps_bundle_id_unique UNIQUE (bundle_id);

-- Verify success
SELECT 
    'Deduplication complete!' as message,
    COUNT(*) as final_record_count,
    COUNT(DISTINCT bundle_id) as unique_bundle_ids
FROM itunes_apps;
*/

-- Step 7: Alternative approach - Update composite constraint to be more restrictive
-- If you want to keep duplicates but still enable foreign keys:
/*
ALTER TABLE itunes_apps 
DROP CONSTRAINT IF EXISTS itunes_apps_unique;

ALTER TABLE itunes_apps 
ADD CONSTRAINT itunes_apps_unique_bundle_only UNIQUE (bundle_id);
*/

SELECT 'Analysis complete. Review the results and uncomment the appropriate section to proceed.' as next_step;