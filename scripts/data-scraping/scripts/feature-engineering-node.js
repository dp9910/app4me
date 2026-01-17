/**
 * Feature Engineering Pipeline - Node.js Version
 * For testing and batch processing
 */

// Load environment variables first
require('dotenv').config({ path: '.env.local' });

const natural = require('natural');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Ensure API key is loaded
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not found. Please check your .env.local file.');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// TF-IDF analyzer setup
const TfIdf = natural.TfIdf;
const stemmer = natural.PorterStemmer;

// Stopwords and noise filters
const STOPWORDS = new Set([
  'app', 'application', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
  'of', 'with', 'by', 'this', 'that', 'is', 'are', 'was', 'were', 'be', 'been',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'can', 'must', 'shall', 'very', 'really', 'just', 'now', 'here',
  'there', 'where', 'when', 'why', 'how', 'all', 'any', 'some', 'more', 'most',
  'other', 'another', 'such', 'no', 'not', 'only', 'own', 'same', 'so', 'than',
  'too', 'also', 'well', 'as'
]);

// Category keyword mappings
const CATEGORY_KEYWORDS = {
  'productivity': {
    primary: ['organize', 'manage', 'schedule', 'plan', 'track', 'task', 'todo', 'note', 'document'],
    secondary: ['efficient', 'workflow', 'project', 'calendar', 'reminder', 'focus', 'time'],
    modifiers: ['daily', 'work', 'business', 'professional', 'office']
  },
  'finance': {
    primary: ['budget', 'money', 'expense', 'income', 'payment', 'bank', 'invest'],
    secondary: ['financial', 'cost', 'price', 'savings', 'credit', 'debt', 'tax'],
    modifiers: ['track', 'manage', 'analyze', 'monitor', 'personal']
  },
  'health': {
    primary: ['fitness', 'health', 'workout', 'exercise', 'nutrition', 'diet'],
    secondary: ['medical', 'wellness', 'sleep', 'mental', 'calories', 'weight'],
    modifiers: ['track', 'monitor', 'improve', 'maintain', 'daily']
  },
  'entertainment': {
    primary: ['game', 'play', 'fun', 'entertainment', 'music', 'video', 'movie'],
    secondary: ['streaming', 'podcast', 'social', 'chat', 'media', 'content'],
    modifiers: ['watch', 'listen', 'enjoy', 'relax', 'social']
  },
  'education': {
    primary: ['learn', 'education', 'study', 'course', 'lesson', 'tutorial'],
    secondary: ['skill', 'knowledge', 'training', 'language', 'book', 'reading'],
    modifiers: ['practice', 'improve', 'master', 'develop', 'teach']
  }
};

/**
 * Main feature engineering function
 */
async function enrichAppData(app) {
  console.log(`🔧 Enriching features for: ${app.title || app.name}`);
  
  return {
    // 1. Structured Metadata Features
    metadata: extractMetadataFeatures(app),
    
    // 2. TF-IDF Keywords
    keywords_tfidf: await extractTFIDFKeywords(app.description || ''),
    
    // 3. LLM-Extracted Structured Data  
    llm_features: await extractLLMFeatures(app),
    
    // 4. Category Classification
    category_classification: classifyAppCategory(app),
    
    // 5. Quality & Popularity Signals
    quality_signals: calculateQualitySignals(app)
  };
}

/**
 * Extract structured metadata features
 */
function extractMetadataFeatures(app) {
  return {
    category_primary: app.category || app.primary_category,
    category_all: app.genres || app.all_categories || [],
    price_tier: classifyPriceTier(app.price || app.formatted_price),
    rating_tier: classifyRatingTier(app.rating || app.rating_average),
    popularity_score: calculatePopularity(app.rating_count, app.size_bytes),
    recency_score: calculateRecency(app.release_date, app.last_updated),
    developer_info: {
      name: app.developer || app.developer_name,
      id: app.developer_id
    }
  };
}

/**
 * TF-IDF keyword extraction with category weighting
 */
async function extractTFIDFKeywords(text, maxKeywords = 20) {
  if (!text || text.length < 10) {
    return { keywords: {}, categories: {} };
  }
  
  // Clean and tokenize text
  const cleanText = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Tokenize and filter
  const tokenizer = new natural.WordTokenizer();
  const tokens = tokenizer.tokenize(cleanText)
    .filter(token => 
      token.length > 2 && 
      !STOPWORDS.has(token) &&
      !/^\d+$/.test(token) // Remove pure numbers
    )
    .map(token => stemmer.stem(token));
  
  // Calculate term frequency
  const termFreq = {};
  tokens.forEach(token => {
    termFreq[token] = (termFreq[token] || 0) + 1;
  });
  
  // Calculate TF-IDF scores (simplified)
  const totalTokens = tokens.length;
  const tfidfScores = {};
  
  Object.entries(termFreq).forEach(([term, freq]) => {
    // TF score with length normalization
    const tf = freq / totalTokens;
    
    // Boost score for category-relevant keywords
    let categoryBoost = 1.0;
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.primary.includes(term)) categoryBoost = 2.0;
      else if (keywords.secondary.includes(term)) categoryBoost = 1.5;
      else if (keywords.modifiers.includes(term)) categoryBoost = 1.2;
    }
    
    tfidfScores[term] = tf * categoryBoost;
  });
  
  // Get top keywords
  const sortedKeywords = Object.entries(tfidfScores)
    .sort(([,a], [,b]) => b - a)
    .slice(0, maxKeywords);
  
  const keywords = {};
  const keywordCategories = {};
  
  sortedKeywords.forEach(([keyword, score]) => {
    keywords[keyword] = Math.round(score * 1000) / 1000;
    
    // Map keywords to categories
    keywordCategories[keyword] = [];
    for (const [category, categoryKeywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (categoryKeywords.primary.includes(keyword) ||
          categoryKeywords.secondary.includes(keyword) ||
          categoryKeywords.modifiers.includes(keyword)) {
        keywordCategories[keyword].push(category);
      }
    }
  });
  
  return { keywords, categories: keywordCategories };
}

/**
 * LLM-powered feature extraction
 */
async function extractLLMFeatures(app) {
  const appText = [
    app.title || app.name,
    app.category || app.primary_category,
    app.description
  ].filter(Boolean).join('\n');
  
  if (appText.length < 20) {
    return getDefaultLLMFeatures();
  }
  
  const prompt = `Analyze this app and extract structured information:

App: ${app.title || app.name}
Category: ${app.category || app.primary_category}
Description: ${(app.description || '').substring(0, 1000)}

Extract and return ONLY valid JSON with these exact fields:
{
  "primary_use_case": "single most common use case in 3-5 words",
  "use_cases": ["use case 1", "use case 2", "use case 3"],
  "target_personas": ["persona 1", "persona 2"],
  "problem_solved": "main problem this solves in one sentence",
  "key_features": ["feature 1", "feature 2", "feature 3"],
  "limitations": ["limitation 1", "limitation 2"],
  "best_for_keywords": ["keyword1", "keyword2", "keyword3"],
  "not_good_for": ["scenario 1", "scenario 2"],
  "emotional_tone": "professional",
  "complexity_level": "beginner",
  "time_commitment": "quick"
}

Return ONLY the JSON object:`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return validateLLMFeatures(parsed);
    }
    
    return getDefaultLLMFeatures();
    
  } catch (error) {
    console.error(`⚠️  LLM extraction failed for ${app.title}: ${error.message}`);
    return getDefaultLLMFeatures();
  }
}

/**
 * Validate and sanitize LLM features
 */
function validateLLMFeatures(features) {
  return {
    primary_use_case: features.primary_use_case || 'general utility',
    use_cases: Array.isArray(features.use_cases) ? features.use_cases.slice(0, 5) : [],
    target_personas: Array.isArray(features.target_personas) ? features.target_personas.slice(0, 3) : [],
    problem_solved: features.problem_solved || 'provides digital functionality',
    key_features: Array.isArray(features.key_features) ? features.key_features.slice(0, 5) : [],
    limitations: Array.isArray(features.limitations) ? features.limitations.slice(0, 3) : [],
    best_for_keywords: Array.isArray(features.best_for_keywords) ? features.best_for_keywords.slice(0, 5) : [],
    not_good_for: Array.isArray(features.not_good_for) ? features.not_good_for.slice(0, 3) : [],
    emotional_tone: ['professional', 'casual', 'playful', 'serious'].includes(features.emotional_tone) 
      ? features.emotional_tone : 'professional',
    complexity_level: ['beginner', 'intermediate', 'advanced'].includes(features.complexity_level)
      ? features.complexity_level : 'beginner',
    time_commitment: ['quick', 'moderate', 'intensive'].includes(features.time_commitment)
      ? features.time_commitment : 'moderate'
  };
}

/**
 * Default LLM features for when extraction fails
 */
function getDefaultLLMFeatures() {
  return {
    primary_use_case: 'general utility',
    use_cases: [],
    target_personas: [],
    problem_solved: 'provides digital functionality',
    key_features: [],
    limitations: [],
    best_for_keywords: [],
    not_good_for: [],
    emotional_tone: 'professional',
    complexity_level: 'beginner',
    time_commitment: 'moderate'
  };
}

/**
 * Other helper functions...
 */
function classifyAppCategory(app) {
  const description = (app.description || '').toLowerCase();
  const title = (app.title || app.name || '').toLowerCase();
  const primaryCategory = app.category || app.primary_category || '';
  
  const scores = {};
  
  // Score based on category keywords
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    
    // Check primary keywords
    keywords.primary.forEach(keyword => {
      if (title.includes(keyword)) score += 3;
      if (description.includes(keyword)) score += 2;
    });
    
    // Check secondary keywords
    keywords.secondary.forEach(keyword => {
      if (title.includes(keyword)) score += 2;
      if (description.includes(keyword)) score += 1;
    });
    
    // Check modifiers
    keywords.modifiers.forEach(keyword => {
      if (title.includes(keyword)) score += 1;
      if (description.includes(keyword)) score += 0.5;
    });
    
    scores[category] = score;
  }
  
  // Boost if matches primary category
  const primaryCategoryLower = primaryCategory.toLowerCase();
  Object.keys(scores).forEach(category => {
    if (primaryCategoryLower.includes(category)) {
      scores[category] += 5;
    }
  });
  
  return scores;
}

function classifyPriceTier(price) {
  if (!price) return 'unknown';
  
  const priceStr = String(price).toLowerCase();
  if (priceStr.includes('free') || priceStr === '0' || priceStr === '$0.00') {
    return 'free';
  }
  
  const numPrice = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
  if (numPrice === 0) return 'free';
  if (numPrice < 5) return 'low';
  if (numPrice < 20) return 'medium';
  return 'high';
}

function classifyRatingTier(rating) {
  const numRating = parseFloat(rating) || 0;
  if (numRating >= 4.5) return 'excellent';
  if (numRating >= 4.0) return 'good';
  if (numRating >= 3.5) return 'average';
  if (numRating >= 3.0) return 'below_average';
  return 'poor';
}

function calculatePopularity(ratingCount, sizeBytes) {
  const ratings = parseInt(ratingCount) || 0;
  const size = parseInt(sizeBytes) || 0;
  
  // Normalize rating count (log scale)
  const ratingScore = ratings > 0 ? Math.log10(ratings + 1) / 6 : 0;
  
  // App size factor (smaller apps might be more accessible)
  const sizeScore = size > 0 ? Math.max(0, 1 - (size / 1000000000)) : 0.5; // 1GB max
  
  return Math.min(1.0, (ratingScore * 0.8) + (sizeScore * 0.2));
}

function calculateRecency(releaseDate, lastUpdated) {
  const now = Date.now();
  const release = releaseDate ? new Date(releaseDate).getTime() : now;
  const updated = lastUpdated ? new Date(lastUpdated).getTime() : release;
  
  // Recency based on last update (more recent = higher score)
  const daysSinceUpdate = (now - updated) / (1000 * 60 * 60 * 24);
  
  if (daysSinceUpdate < 30) return 1.0;      // Very recent
  if (daysSinceUpdate < 90) return 0.8;      // Recent
  if (daysSinceUpdate < 365) return 0.6;     // Somewhat recent
  if (daysSinceUpdate < 730) return 0.4;     // Old
  return 0.2;                                // Very old
}

function calculateQualitySignals(app) {
  const rating = parseFloat(app.rating || app.rating_average) || 0;
  const ratingCount = parseInt(app.rating_count) || 0;
  const hasDescription = (app.description || '').length > 50;
  const hasIcon = !!(app.icon_url || app.icon_url_512);
  
  let qualityScore = 0.5; // Base score
  
  // Rating quality
  if (rating >= 4.5) qualityScore += 0.3;
  else if (rating >= 4.0) qualityScore += 0.2;
  else if (rating >= 3.5) qualityScore += 0.1;
  
  // Rating count (credibility)
  if (ratingCount >= 10000) qualityScore += 0.2;
  else if (ratingCount >= 1000) qualityScore += 0.15;
  else if (ratingCount >= 100) qualityScore += 0.1;
  else if (ratingCount >= 10) qualityScore += 0.05;
  
  // Content quality
  if (hasDescription) qualityScore += 0.1;
  if (hasIcon) qualityScore += 0.05;
  
  return Math.min(1.0, qualityScore);
}

/**
 * Batch process multiple apps
 */
async function batchEnrichApps(apps, batchSize = 10) {
  const results = [];
  const total = apps.length;
  
  console.log(`🔧 Starting batch enrichment of ${total} apps...`);
  
  for (let i = 0; i < total; i += batchSize) {
    const batch = apps.slice(i, i + batchSize);
    console.log(`📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(total/batchSize)}...`);
    
    const batchPromises = batch.map(async (app, index) => {
      try {
        const enriched = await enrichAppData(app);
        return { app_id: app.bundle_id || app.id, features: enriched, success: true };
      } catch (error) {
        console.error(`❌ Error enriching app ${app.title}: ${error.message}`);
        return { app_id: app.bundle_id || app.id, error: error.message, success: false };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Progress indicator
    const progress = ((i + batch.length) / total * 100).toFixed(1);
    console.log(`   ✅ Batch complete: ${progress}% | ${results.filter(r => r.success).length} successful`);
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`🎉 Batch enrichment complete: ${results.filter(r => r.success).length}/${total} successful`);
  return results;
}

module.exports = {
  enrichAppData,
  extractTFIDFKeywords,
  batchEnrichApps,
  extractMetadataFeatures,
  classifyAppCategory
};