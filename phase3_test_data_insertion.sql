-- Phase 3: Basic Data Operations - Test Data Insertion
-- Run this script in Supabase SQL Editor

-- Clean existing test data (if any)
DELETE FROM itunes_apps WHERE source = 'itunes_api' AND query_term = 'productivity';
DELETE FROM serp_apps WHERE source = 'serp_api' AND query_term = 'instagram';

-- =====================================================
-- Phase 3.1: iTunes Data Insertion
-- =====================================================

INSERT INTO itunes_apps (
  bundle_id, source, query_term, title, developer, developer_id, developer_url, 
  version, price, formatted_price, currency, rating, rating_count, icon_url,
  description, release_date, last_updated, age_rating, genres, category, 
  size_bytes, rank, raw_data
) VALUES 
-- Flora - Green Focus
(
  'com.appfinca.flora.ios',
  'itunes_api',
  'productivity',
  'Flora - Green Focus',
  'AppFinca Inc.',
  1225155794,
  'https://apps.apple.com/us/app/flora-green-focus/id1225155794?uo=4',
  '3.7.27',
  0,
  'Free',
  'USD',
  4.758,
  79938,
  'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/4f/97/bb/4f97bb14-3b48-7561-9633-3cbb47fedd2c/AppIcon-0-0-1x_U007emarketing-0-8-0-85-220.png/100x100bb.jpg',
  'Flora is a new way to stay off your phone, clear to-do lists, and build positive, life-changing habits. Focus trees help you avoid distractions while growing virtual trees.',
  '2017-09-07T03:35:11Z',
  NOW(),
  '4+',
  '["Productivity"]'::jsonb,
  'Productivity',
  697362432,
  1,
  '{"track_id": 1225155794, "track_name": "Flora - Green Focus", "artist_name": "AppFinca Inc."}'::jsonb
),
-- Structured - Daily Planner
(
  'com.leomehlig.today',
  'itunes_api', 
  'productivity',
  'Structured - Daily Planner',
  'unorderly GmbH',
  1499198946,
  'https://apps.apple.com/us/app/structured-daily-planner/id1499198946?uo=4',
  '4.3.6',
  0,
  'Free',
  'USD',
  4.80464,
  146528,
  'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/0f/cd/c4/0fcdc4fe-3cf4-6c8d-c652-7046602a52a6/AppIcon-0-1x_U007epad-0-1-0-sRGB-85-220-0.png/100x100bb.jpg',
  'Plan your day with a clear visual timeline that brings your calendar, to-dos, routines, and habit tracking together. Join 1,500,000 people who feel calmer, focus faster, and finish more.',
  '2020-04-09T07:00:00Z',
  NOW(),
  '4+',
  '["Productivity"]'::jsonb,
  'Productivity',
  251722752,
  2,
  '{"track_id": 1499198946, "track_name": "Structured - Daily Planner", "artist_name": "unorderly GmbH"}'::jsonb
),
-- Focus Keeper - Pomodoro Timer
(
  'com.pixo.focuskeeper',
  'itunes_api',
  'productivity', 
  'Focus Keeper - Pomodoro Timer',
  'PIXO Incorporation',
  867374917,
  'https://apps.apple.com/us/app/focus-keeper-pomodoro-timer/id867374917?uo=4',
  '2.2.2',
  0,
  'Free',
  'USD',
  4.69024,
  41789,
  'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/icon100.jpg',
  'Focus Keeper is the ultimate focus timer and Pomodoro timer designed to help you boost productivity and fight against procrastination.',
  '2014-06-05T07:00:00Z',
  NOW(),
  '4+',
  '["Productivity"]'::jsonb,
  'Productivity',
  89478144,
  3,
  '{"track_id": 867374917, "track_name": "Focus Keeper - Pomodoro Timer", "artist_name": "PIXO Incorporation"}'::jsonb
);

-- =====================================================
-- Phase 3.2: SERP Data Insertion  
-- =====================================================

INSERT INTO serp_apps (
  bundle_id, source, query_term, title, developer, developer_id, developer_url,
  version, price, price_value, formatted_price, rating, rating_count, rating_type,
  icon_url, icon_url_60, icon_url_512, all_logos, screenshots, description,
  release_date, latest_version_release_date, age_rating, release_note, 
  minimum_os_version, category, primary_genre, genres, size_in_bytes,
  supported_languages, supported_devices, features, advisories,
  game_center_enabled, vpp_license, position, rank, serp_link, raw_data
) VALUES
-- Instagram
(
  'com.burbn.instagram',
  'serp_api',
  'instagram',
  'Instagram',
  'Instagram, Inc.',
  '389801255',
  'https://apps.apple.com/us/developer/id389801255',
  '403.0.0',
  'Free',
  0,
  'Free',
  4.69,
  28282046,
  'All Times',
  'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/c5/4e/e2/c54ee2e0-1519-380f-e7a8-cd1797efb4eb/Prod-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/100x100bb.jpg',
  'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/c5/4e/e2/c54ee2e0-1519-380f-e7a8-cd1797efb4eb/Prod-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/60x60bb.jpg',
  'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/c5/4e/e2/c54ee2e0-1519-380f-e7a8-cd1797efb4eb/Prod-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg',
  '[{"size": "60x60", "link": "https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/c5/4e/e2/c54ee2e0-1519-380f-e7a8-cd1797efb4eb/Prod-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/60x60bb.jpg"}, {"size": "100x100", "link": "https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/c5/4e/e2/c54ee2e0-1519-380f-e7a8-cd1797efb4eb/Prod-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/100x100bb.jpg"}, {"size": "512x512", "link": "https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/c5/4e/e2/c54ee2e0-1519-380f-e7a8-cd1797efb4eb/Prod-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg"}]'::jsonb,
  '{"general": [{"link": "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/47/0c/29/470c29e9-fe22-7978-4795-14fb70f264f0/1_iOS_5.5.jpg/392x696bb.jpg", "size": "392x696"}]}'::jsonb,
  'Little moments lead to big friendships. Share yours on Instagram. From Meta Connect with friends, find other fans, and see what people around you are up to and into.',
  '2010-10-06T08:12:41Z',
  '2025-10-20T17:19:37Z',
  '12+',
  'Performance optimizations and stability improvements for a smoother, more reliable experience.',
  '15.1',
  'Photo & Video',
  'Photo & Video',
  '[{"name": "Photo & Video", "id": 6008, "primary": true}, {"name": "Social Networking", "id": 6005, "primary": false}]'::jsonb,
  495641600,
  '["EN", "ES", "FR", "DE", "IT", "JA", "KO", "PT", "ZH"]'::jsonb,
  '["iPhone5s", "iPadAir", "iPhone6", "iPhone6Plus"]'::jsonb,
  '["iosUniversal"]'::jsonb,
  '["Infrequent/Mild Sexual Content and Nudity", "Infrequent/Mild Profanity or Crude Humor"]'::jsonb,
  false,
  true,
  1,
  1,
  'https://apps.apple.com/us/app/instagram/id389801252?uo=4',
  '{"id": 389801252, "title": "Instagram", "bundle_id": "com.burbn.instagram", "version": "403.0.0"}'::jsonb
);

-- =====================================================
-- Phase 3.3: Verification Queries
-- =====================================================

-- Check insertion results
SELECT 'iTunes Apps Inserted' as table_name, count(*) as count FROM itunes_apps WHERE query_term = 'productivity'
UNION ALL  
SELECT 'SERP Apps Inserted' as table_name, count(*) as count FROM serp_apps WHERE query_term = 'instagram'
UNION ALL
SELECT 'Total Apps' as table_name, count(*) as count FROM (
  SELECT bundle_id FROM itunes_apps 
  UNION ALL 
  SELECT bundle_id FROM serp_apps
) combined;

-- Test basic retrieval
SELECT 
  'iTunes' as source,
  bundle_id,
  title,
  developer,
  rating,
  category
FROM itunes_apps 
WHERE query_term = 'productivity'
ORDER BY rank
LIMIT 3;

SELECT 
  'SERP' as source,
  bundle_id, 
  title,
  developer,
  rating,
  position
FROM serp_apps
WHERE query_term = 'instagram'
ORDER BY position
LIMIT 3;

-- Test views work
SELECT 
  source_type,
  count(*) as app_count
FROM v_all_apps 
GROUP BY source_type;

-- =====================================================
-- Success Message
-- =====================================================

SELECT 
  '🎉 Phase 3: Basic Data Operations COMPLETED!' as message,
  'iTunes apps: ' || (SELECT count(*) FROM itunes_apps WHERE query_term = 'productivity') ||
  ', SERP apps: ' || (SELECT count(*) FROM serp_apps WHERE query_term = 'instagram') ||
  ', Views working: ' || CASE WHEN EXISTS(SELECT 1 FROM v_all_apps LIMIT 1) THEN 'YES' ELSE 'NO' END as details;