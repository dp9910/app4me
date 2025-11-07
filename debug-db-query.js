
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function searchByKeywords(keywords, limit) {
  console.log(`[DEBUG] Starting searchByKeywords with keywords: ${keywords.join(', ')}`);
  try {
    const titleConditions = keywords.map(keyword => `title.ilike.%${keyword}%`).join(',');
    const descConditions = keywords.map(keyword => `description.ilike.%${keyword}%`).join(',');

    let allResults = [];

    console.log('[DEBUG] About to query database for title matches...');
    const { data: titleMatches, error: titleError } = await supabase
      .from('apps_unified')
      .select('id, title, developer, primary_category, description, rating, icon_url, price')
      .or(titleConditions)
      .gte('rating', 3.0)
      .order('rating', { ascending: false })
      .limit(Math.ceil(limit * 0.7));

    if (!titleError && titleMatches) {
      console.log(`[DEBUG] Found ${titleMatches.length} title matches`);
      allResults.push(...titleMatches.map(app => ({
        app_id: app.id,
        title: app.title,
        developer: app.developer,
        primary_category: app.primary_category,
        description: app.description,
        rating: app.rating,
        icon_url: app.icon_url,
        price: app.price,
        relevance: 0.9
      })));
    } else if (titleError) {
      console.log(`[DEBUG] Database error: ${titleError.message}`);
    }

    if (allResults.length < limit) {
      const existingIds = allResults.map(app => app.app_id);
      const { data: descMatches, error: descError } = await supabase
        .from('apps_unified')
        .select('id, title, developer, primary_category, description, rating, icon_url, price')
        .or(descConditions)
        .not('id', 'in', existingIds.length > 0 ? `(${existingIds.map(id => `"${id}"`).join(',')})` : '()')
        .gte('rating', 2.5)
        .order('rating', { ascending: false })
        .limit(limit - allResults.length);

      if (!descError && descMatches) {
        allResults.push(...descMatches.map(app => ({
          app_id: app.id,
          title: app.title,
          developer: app.developer,
          primary_category: app.primary_category,
          description: app.description,
          rating: app.rating,
          icon_url: app.icon_url,
          price: app.price,
          relevance: 0.7
        })));
      }
    }

    return allResults.slice(0, limit);

  } catch (error) {
    console.error(`Keyword search failed: ${error.message}`);
    return [];
  }
}

async function runTest() {
  const keywords = process.argv.slice(2);
  if (keywords.length === 0) {
    console.log('Please provide keywords as command line arguments.');
    return;
  }

  const results = await searchByKeywords(keywords, 10);
  console.log(JSON.stringify(results, null, 2));
}

runTest();
