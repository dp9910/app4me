# Supabase Database Setup Instructions

## Method 1: Using Supabase Dashboard (Recommended)

Since Docker is not available locally, follow these steps to create the database tables:

### Step 1: Access Supabase Dashboard
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Login to your account
3. Select your **app4me** project

### Step 2: Open SQL Editor
1. Click on **"SQL Editor"** in the left sidebar
2. Click **"New Query"** button

### Step 3: Run the Schema Creation Script
1. Copy the entire contents of `supabase_tables_creation.sql`
2. Paste it into the SQL Editor
3. Click **"Run"** button
4. You should see a success message: "Database schema created successfully! 🎉"

### Step 4: Verify Tables Created
1. Go to **"Table Editor"** in the left sidebar
2. You should see 4 new tables:
   - `itunes_apps`
   - `apple_rss_apps` 
   - `serp_apps`
   - `apps_unified`

### Step 5: Check Views and Functions
1. In SQL Editor, run: `SELECT * FROM v_all_apps LIMIT 1;`
2. Should return empty result (no error)
3. Run: `SELECT calculate_data_quality_score('Test', 'Description', 4.5, 1000, 'icon.jpg', '[]'::jsonb, 'Developer', '[]'::jsonb);`
4. Should return a score (e.g., 70)

## Method 2: Using Supabase CLI (Alternative)

If you install Docker Desktop later, you can use CLI:

```bash
# Install Docker Desktop first
# Then run:
supabase db reset
supabase db push
```

## What Gets Created

### Tables:
- **itunes_apps**: iTunes Search API data
- **apple_rss_apps**: Apple RSS feed data  
- **serp_apps**: SERP API data
- **apps_unified**: Reconciled data from all sources

### Indexes:
- Optimized for bundle_id, developer, category, rating queries
- Performance indexes for last_scraped timestamps

### Functions:
- `calculate_data_quality_score()`: Scores data completeness 1-100
- `update_last_scraped()`: Auto-updates timestamps
- `update_reconciliation_metadata()`: Auto-calculates quality scores

### Triggers:
- Auto-update last_scraped on data changes
- Auto-calculate quality scores for unified table

### Views:
- `v_all_apps`: Combined view across all source tables
- `v_multi_source_apps`: Apps found in multiple sources

## Verification Queries

After setup, test with these queries:

```sql
-- Check table structure
\d itunes_apps

-- Check if triggers work
INSERT INTO itunes_apps (bundle_id, title, source, query_term) 
VALUES ('com.test.app', 'Test App', 'itunes_api', 'test');

SELECT bundle_id, title, first_scraped, last_scraped FROM itunes_apps;

-- Test quality score function
SELECT calculate_data_quality_score(
  'Instagram', 
  'Social media app with photo sharing', 
  4.5, 
  1000000, 
  'https://icon.jpg', 
  '[{"url": "screenshot1.jpg"}]'::jsonb,
  'Meta', 
  '["Social", "Photo"]'::jsonb
);
```

## Next Steps

Once tables are created:
1. ✅ Update Next.js APIs to use new tables
2. ✅ Create Supabase Edge Functions for scraping
3. ✅ Implement reconciliation logic
4. ✅ Set up daily cron jobs

## Troubleshooting

### Common Issues:
- **Permission Error**: Make sure you're logged in as project owner
- **Syntax Error**: Copy the exact SQL from `supabase_tables_creation.sql`
- **Table Exists**: The script handles this with `DROP TABLE IF EXISTS`

### Support:
- Check Supabase logs in Dashboard > Logs
- Verify environment variables in Settings > API
- Test connection with: `SELECT NOW();`