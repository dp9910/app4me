/**
 * Hybrid Feature Engineering Pipeline
 * Strategy: Try Gemini 2.0-flash-exp first, fallback to DeepSeek on quota limits
 */

require('dotenv').config({ path: '.env.local' });

const natural = require('natural');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

// Check API keys
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not found. Please check your .env.local file.');
  process.exit(1);
}

if (!process.env.DEEPSEEK_API_KEY) {
  console.error('❌ DEEPSEEK_API_KEY not found. Please check your .env.local file.');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// Optimized TF-IDF setup (same as before)
const stemmer = natural.PorterStemmer;
const STOPWORDS = new Set([
  'app', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 
  'this', 'that', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 
  'does', 'did', 'will', 'would', 'could', 'should', 'can', 'very', 'just', 'now', 'here', 
  'there', 'you', 'your', 'all', 'any', 'some', 'more', 'most', 'other', 'no', 'not', 'only'
]);

const CATEGORY_KEYWORDS = {
  'productivity': ['organize', 'manage', 'schedule', 'plan', 'track', 'task', 'todo', 'note', 'document', 'work', 'business'],
  'finance': ['budget', 'money', 'expense', 'payment', 'bank', 'invest', 'financial', 'cost', 'savings', 'credit'],
  'health': ['fitness', 'health', 'workout', 'exercise', 'nutrition', 'diet', 'medical', 'wellness', 'calories'],
  'entertainment': ['game', 'play', 'fun', 'music', 'video', 'movie', 'streaming', 'social', 'chat', 'media'],
  'education': ['learn', 'education', 'study', 'course', 'lesson', 'tutorial', 'skill', 'knowledge', 'language']
};

// Track API usage statistics
let apiStats = {
  gemini_success: 0,
  gemini_quota_errors: 0,
  deepseek_fallback: 0,
  total_requests: 0
};

/**
 * HYBRID: Main feature engineering function
 */
async function enrichAppDataHybrid(app) {
  return {
    metadata: extractMetadataFeatures(app),
    keywords_tfidf: extractTFIDFKeywordsOptimized(app.description || ''),
    llm_features: await extractLLMFeaturesHybrid(app),
    category_classification: classifyAppCategoryFast(app),
    quality_signals: calculateQualitySignalsFast(app)
  };
}

/**
 * HYBRID: Try Gemini first, fallback to DeepSeek on quota errors
 */
async function extractLLMFeaturesHybrid(app) {
  const title = (app.title || app.name || '').substring(0, 50);
  const category = (app.category || app.primary_category || '').substring(0, 30);
  const description = (app.description || '').substring(0, 200);
  
  if (!title || description.length < 20) {
    return getDefaultLLMFeatures();
  }
  
  const prompt = `App: ${title}
Category: ${category}
Description: ${description}

Extract 3 key insights as JSON:
{
  "primary_use": "main purpose in 2-4 words",
  "target_user": "who uses this in 2-3 words", 
  "key_benefit": "main value in 4-6 words"
}`;

  apiStats.total_requests++;

  // Try Gemini first (cheapest option)
  try {
    const startTime = Date.now();
    
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',  // Cheapest: ~$0.18 total
      generationConfig: {
        maxOutputTokens: 100,
        temperature: 0.3
      }
    });
    
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Minimal delay for quota respect
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const processingTime = Date.now() - startTime;
    apiStats.gemini_success++;
    
    const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        primary_use: parsed.primary_use || 'general utility',
        target_user: parsed.target_user || 'general users',
        key_benefit: parsed.key_benefit || 'provides functionality',
        complexity: 'simple',
        api_used: 'gemini-2.0-flash-exp',
        processing_time_ms: processingTime
      };
    }
    
    return {
      ...getDefaultLLMFeatures(),
      api_used: 'gemini-2.0-flash-exp',
      processing_time_ms: processingTime
    };
    
  } catch (error) {
    // Check if it's a quota error
    if (error.message && (
        error.message.includes('quota') || 
        error.message.includes('rate limit') ||
        error.message.includes('429') ||
        error.message.includes('Too Many Requests')
      )) {
      
      console.log(`⚠️  Gemini quota limit hit for ${title}, falling back to DeepSeek...`);
      apiStats.gemini_quota_errors++;
      
      // Fallback to DeepSeek
      return await extractDeepSeekFeaturesWithRetry(title, category, description, prompt);
      
    } else {
      // Other error, still try DeepSeek
      console.error(`⚠️  Gemini error for ${title}: ${error.message}, trying DeepSeek...`);
      return await extractDeepSeekFeaturesWithRetry(title, category, description, prompt);
    }
  }
}

/**
 * DeepSeek fallback with retry logic
 */
async function extractDeepSeekFeaturesWithRetry(title, category, description, prompt) {
  try {
    const startTime = Date.now();
    apiStats.deepseek_fallback++;
    
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 100,
      temperature: 0.3
    });
    
    const processingTime = Date.now() - startTime;
    const responseText = completion.choices[0].message.content;
    
    const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        primary_use: parsed.primary_use || 'general utility',
        target_user: parsed.target_user || 'general users',
        key_benefit: parsed.key_benefit || 'provides functionality',
        complexity: 'simple',
        api_used: 'deepseek-fallback',
        processing_time_ms: processingTime
      };
    }
    
    return {
      ...getDefaultLLMFeatures(),
      api_used: 'deepseek-fallback',
      processing_time_ms: processingTime
    };
    
  } catch (error) {
    console.error(`❌ DeepSeek fallback failed for ${title}: ${error.message}`);
    return {
      ...getDefaultLLMFeatures(),
      api_used: 'fallback-failed',
      error: error.message
    };
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
 * Get API usage statistics
 */
function getAPIStats() {
  const total = apiStats.total_requests;
  return {
    ...apiStats,
    gemini_success_rate: total > 0 ? (apiStats.gemini_success / total * 100).toFixed(1) + '%' : '0%',
    deepseek_fallback_rate: total > 0 ? (apiStats.deepseek_fallback / total * 100).toFixed(1) + '%' : '0%',
    quota_error_rate: total > 0 ? (apiStats.gemini_quota_errors / total * 100).toFixed(1) + '%' : '0%'
  };
}

/**
 * Reset API statistics
 */
function resetAPIStats() {
  apiStats = {
    gemini_success: 0,
    gemini_quota_errors: 0,
    deepseek_fallback: 0,
    total_requests: 0
  };
}

// Include all the other optimized functions from the previous script
function extractTFIDFKeywordsOptimized(text, maxKeywords = 10) {
  if (!text || text.length < 10) {
    return { keywords: {}, top_categories: [] };
  }
  
  const cleanText = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 500);
  
  const tokens = cleanText.split(' ')
    .filter(token => 
      token.length > 2 && 
      !STOPWORDS.has(token) &&
      !/^\d+$/.test(token)
    )
    .map(token => stemmer.stem(token));
  
  const freq = {};
  tokens.forEach(token => {
    freq[token] = (freq[token] || 0) + 1;
  });
  
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

function extractMetadataFeatures(app) {
  return {
    category: app.category || app.primary_category || 'unknown',
    price_tier: classifyPriceTierFast(app.price || app.formatted_price),
    rating_tier: classifyRatingTierFast(app.rating || app.rating_average),
    popularity_tier: calculatePopularityTierFast(app.rating_count),
    developer: (app.developer || app.developer_name || '').substring(0, 50)
  };
}

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
  
  let score = 0.3;
  if (rating >= 4.0) score += 0.3;
  if (ratingCount >= 1000) score += 0.2;
  if (hasDescription) score += 0.1;
  if (hasIcon) score += 0.1;
  
  return Math.min(1.0, score);
}

module.exports = {
  enrichAppDataHybrid,
  extractLLMFeaturesHybrid,
  getAPIStats,
  resetAPIStats,
  extractTFIDFKeywordsOptimized,
  extractMetadataFeatures,
  classifyAppCategoryFast
};