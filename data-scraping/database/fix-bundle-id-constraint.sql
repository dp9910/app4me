-- Fix bundle_id constraint for app_features foreign key
-- This addresses the foreign key reference error

-- Step 1: Check if there are duplicate bundle_ids that would prevent adding unique constraint
SELECT bundle_id, COUNT(*) as count 
FROM itunes_apps 
GROUP BY bundle_id 
HAVING COUNT(*) > 1 
LIMIT 10;

-- Step 2: Add unique constraint on bundle_id (if no duplicates exist)
-- If duplicates exist, you'll need to handle them first
ALTER TABLE itunes_apps 
ADD CONSTRAINT itunes_apps_bundle_id_unique UNIQUE (bundle_id);

-- Step 3: Verify the constraint was added
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'itunes_apps'::regclass 
AND contype = 'u';

-- Now the app_features schema can reference itunes_apps(bundle_id)
SELECT 'bundle_id unique constraint added successfully!' as message;