/**
 * DeepSeek Feature Engineering Pipeline
 * Alternative to Gemini using DeepSeek API
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env.local') });

const natural = require('natural');
const OpenAI = require('openai');

if (!process.env.DEEPSEEK_API_KEY) {
  console.error('❌ DEEPSEEK_API_KEY not found. Please check your .env.local file.');
  process.exit(1);
}

const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// Optimized TF-IDF setup (same as optimized version)
const stemmer = natural.PorterStemmer;
const STOPWORDS = new Set([
  'app', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 
  'this', 'that', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 
  'does', 'did', 'will', 'would', 'could', 'should', 'can', 'very', 'just', 'now', 'here', 
  'there', 'you', 'your', 'all', 'any', 'some', 'more', 'most', 'other', 'no', 'not', 'only'
]);

// Simplified category keywords (same as optimized)
const CATEGORY_KEYWORDS = {
  'productivity': ['organize', 'manage', 'schedule', 'plan', 'track', 'task', 'todo', 'note', 'document', 'work', 'business'],
  'finance': ['budget', 'money', 'expense', 'payment', 'bank', 'invest', 'financial', 'cost', 'savings', 'credit'],
  'health': ['fitness', 'health', 'workout', 'exercise', 'nutrition', 'diet', 'medical', 'wellness', 'calories'],
  'entertainment': ['game', 'play', 'fun', 'music', 'video', 'movie', 'streaming', 'social', 'chat', 'media'],
  'education': ['learn', 'education', 'study', 'course', 'lesson', 'tutorial', 'skill', 'knowledge', 'language']
};

/**
 * DEEPSEEK: Main feature engineering function
 */
async function enrichAppDataWithDeepSeek(app) {
  return {
    // 1. Fast metadata extraction (no API calls)
    metadata: extractMetadataFeatures(app),
    
    // 2. Optimized TF-IDF (faster processing)
    keywords_tfidf: extractTFIDFKeywordsOptimized(app.description || ''),
    
    // 3. DeepSeek LLM extraction (instead of Gemini)
    llm_features: await extractDeepSeekFeatures(app),
    
    // 4. Fast category classification
    category_classification: classifyAppCategoryFast(app),
    
    // 5. Quick quality signals
    quality_signals: calculateQualitySignalsFast(app)
  };
}

/**
 * DEEPSEEK: LLM feature extraction using DeepSeek API
 */
async function extractDeepSeekFeatures(app) {
  // Prepare minimal, focused text (max 200 chars)
  const title = (app.title || app.name || '').substring(0, 50);
  const category = (app.category || app.primary_category || '').substring(0, 30);
  const description = (app.description || '').substring(0, 200);
  
  if (!title || description.length < 20) {
    return getDefaultLLMFeatures();
  }
  
  // Optimized prompt for DeepSeek
  const prompt = `App: ${title}
Category: ${category}
Description: ${description}

Extract 3 key insights as JSON:
{
  "primary_use": "main purpose in 2-4 words",
  "target_user": "who uses this in 2-3 words", 
  "key_benefit": "main value in 4-6 words"
}`;

  try {
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 100,
      temperature: 0.3
    });
    
    const responseText = completion.choices[0].message.content;
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        primary_use: parsed.primary_use || 'general utility',
        target_user: parsed.target_user || 'general users',
        key_benefit: parsed.key_benefit || 'provides functionality',
        complexity: 'simple' // Default for speed
      };
    }
    
    return getDefaultLLMFeatures();
    
  } catch (error) {
    console.error(`⚠️  DeepSeek extraction failed for ${title}: ${error.message}`);
    return getDefaultLLMFeatures();
  }
}

function getDefaultLLMFeatures() {
  return {
    primary_use: 'general utility',
    target_user: 'general users',
    key_benefit: 'provides functionality',
    complexity: 'simple'
  };
}

/**
 * Optimized TF-IDF with reduced processing (same as optimized version)
 */
function extractTFIDFKeywordsOptimized(text, maxKeywords = 10) {
  if (!text || text.length < 10) {
    return { keywords: {}, top_categories: [] };
  }
  
  // Fast text cleaning
  const cleanText = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 500); // Limit processing to first 500 chars
  
  // Fast tokenization
  const tokens = cleanText.split(' ')
    .filter(token => 
      token.length > 2 && 
      !STOPWORDS.has(token) &&
      !/^\d+$/.test(token)
    )
    .map(token => stemmer.stem(token));
  
  // Simple frequency counting
  const freq = {};
  tokens.forEach(token => {
    freq[token] = (freq[token] || 0) + 1;
  });
  
  // Get top keywords with category boost
  const scored = Object.entries(freq)
    .map(([term, count]) => {
      let boost = 1.0;
      for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (keywords.includes(term)) boost = 2.0;
      }
      return [term, (count / tokens.length) * boost];
    })
    .sort(([,a], [,b]) => b - a)
    .slice(0, maxKeywords);
  
  const keywords = {};
  const categories = new Set();
  
  scored.forEach(([keyword, score]) => {
    keywords[keyword] = Math.round(score * 1000) / 1000;
    
    // Find matching categories
    for (const [category, categoryKeywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (categoryKeywords.includes(keyword)) {
        categories.add(category);
      }
    }
  });
  
  return { 
    keywords, 
    top_categories: Array.from(categories).slice(0, 3)
  };
}

/**
 * Fast metadata extraction (same as optimized version)
 */
function extractMetadataFeatures(app) {
  return {
    category: app.category || app.primary_category || 'unknown',
    price_tier: classifyPriceTierFast(app.price || app.formatted_price),
    rating_tier: classifyRatingTierFast(app.rating || app.rating_average),
    popularity_tier: calculatePopularityTierFast(app.rating_count),
    developer: (app.developer || app.developer_name || '').substring(0, 50)
  };
}

/**
 * Fast category classification (same as optimized version)
 */
function classifyAppCategoryFast(app) {
  const text = `${app.title || ''} ${app.description || ''}`.toLowerCase();
  const scores = {};
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    keywords.forEach(keyword => {
      if (text.includes(keyword)) score += 1;
    });
    if (score > 0) scores[category] = score;
  }
  
  return scores;
}

/**
 * Fast helper functions (same as optimized version)
 */
function classifyPriceTierFast(price) {
  if (!price) return 'unknown';
  const priceStr = String(price).toLowerCase();
  if (priceStr.includes('free') || priceStr === '0' || priceStr === '$0.00') return 'free';
  const numPrice = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
  if (numPrice === 0) return 'free';
  if (numPrice < 5) return 'low';
  if (numPrice < 20) return 'medium';
  return 'high';
}

function classifyRatingTierFast(rating) {
  const numRating = parseFloat(rating) || 0;
  if (numRating >= 4.5) return 'excellent';
  if (numRating >= 4.0) return 'good';
  if (numRating >= 3.5) return 'average';
  return 'below_average';
}

function calculatePopularityTierFast(ratingCount) {
  const count = parseInt(ratingCount) || 0;
  if (count >= 100000) return 'very_high';
  if (count >= 10000) return 'high';
  if (count >= 1000) return 'medium';
  if (count >= 100) return 'low';
  return 'very_low';
}

function calculateQualitySignalsFast(app) {
  const rating = parseFloat(app.rating || app.rating_average) || 0;
  const ratingCount = parseInt(app.rating_count) || 0;
  const hasDescription = (app.description || '').length > 50;
  const hasIcon = !!(app.icon_url || app.icon_url_512);
  
  let score = 0.3; // Base score
  if (rating >= 4.0) score += 0.3;
  if (ratingCount >= 1000) score += 0.2;
  if (hasDescription) score += 0.1;
  if (hasIcon) score += 0.1;
  
  return Math.min(1.0, score);
}

/**
 * Batch processing with DeepSeek
 */
async function batchEnrichAppsWithDeepSeek(apps, batchSize = 10) {
  const results = [];
  const total = apps.length;
  
  console.log(`🚀 Starting DEEPSEEK batch enrichment of ${total} apps...`);
  console.log(`   Settings: ${batchSize} apps/batch, DeepSeek API, simplified features`);
  
  for (let i = 0; i < total; i += batchSize) {
    const batch = apps.slice(i, i + batchSize);
    console.log(`📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(total/batchSize)}...`);
    
    const batchStartTime = Date.now();
    
    // Process batch in parallel
    const batchPromises = batch.map(async (app) => {
      try {
        const appStartTime = Date.now();
        const features = await enrichAppDataWithDeepSeek(app);
        const processingTime = Date.now() - appStartTime;
        
        return { 
          app_id: app.bundle_id || app.id, 
          app_title: app.title || app.name,
          features, 
          processing_time_ms: processingTime,
          success: true,
          api_used: 'deepseek'
        };
      } catch (error) {
        console.error(`❌ Error enriching app ${app.title}: ${error.message}`);
        return { 
          app_id: app.bundle_id || app.id, 
          error: error.message, 
          success: false,
          api_used: 'deepseek'
        };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    const batchDuration = Date.now() - batchStartTime;
    const successful = batchResults.filter(r => r.success).length;
    const avgTime = successful > 0 ? Math.round(batchDuration / successful) : 0;
    
    console.log(`   ✅ Batch complete: ${successful}/${batch.length} successful, ${avgTime}ms avg/app, ${batchDuration}ms total`);
    
    // Small delay between batches
    if (i + batchSize < total) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  const successfulResults = results.filter(r => r.success);
  const avgProcessingTime = successfulResults.length > 0 
    ? Math.round(successfulResults.reduce((sum, r) => sum + r.processing_time_ms, 0) / successfulResults.length)
    : 0;
  
  console.log(`🎉 DEEPSEEK batch enrichment complete!`);
  console.log(`   Success rate: ${successfulResults.length}/${total} (${(successfulResults.length/total*100).toFixed(1)}%)`);
  console.log(`   Average processing time: ${avgProcessingTime}ms per app`);
  console.log(`   🚀 Speed vs original Gemini: ~${Math.round(13970/avgProcessingTime)}x faster`);
  
  return results;
}

module.exports = {
  enrichAppDataWithDeepSeek,
  batchEnrichAppsWithDeepSeek,
  extractDeepSeekFeatures,
  extractTFIDFKeywordsOptimized,
  extractMetadataFeatures,
  classifyAppCategoryFast
};