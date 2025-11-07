/**
 * Manual App Search and Processing Script
 * 
 * Usage: node manual-app-search.js "productivity"
 * 
 * This script:
 * 1. Searches iTunes and SERP APIs for a given keyword
 * 2. Deduplicates against existing apps_unified table
 * 3. Adds new apps to local apps_unified table
 * 4. Generates features using DeepSeek
 * 5. Generates embeddings using Gemini
 * 6. Uploads everything to Supabase
 */

const https = require('https');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class ManualAppSearcher {
  constructor() {
    this.searchTerm = '';
    this.itunesResults = [];

    this.combinedResults = [];
    this.newApps = [];
    this.existingApps = new Set();
    this.processedApps = [];
    this.generatedFeatures = [];
    this.generatedEmbeddings = [];
  }

  /**
   * STEP 1: Search iTunes API
   */
  async searchItunes(term, limit = 50) {
    console.log(`\n🍎 Searching iTunes API for: "${term}"`);
    
    return new Promise((resolve, reject) => {
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=US&entity=software&limit=${limit}`;
      
      https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            const apps = jsonData.results || [];
            
            console.log(`  Found ${apps.length} apps from iTunes`);
            
            const processed = apps.map(app => ({
              source: 'itunes',
              bundle_id: app.bundleId,
              title: app.trackName,
              developer: app.artistName,
              category: app.primaryGenreName,
              price: app.price || 0,
              currency: app.currency || 'USD',
              rating: app.averageUserRating || 0,
              rating_count: app.userRatingCount || 0,
              description: app.description || '',
              icon_url: app.artworkUrl512 || app.artworkUrl100 || app.artworkUrl60,
              app_store_url: app.trackViewUrl,
              version: app.version,
              content_rating: app.contentAdvisoryRating,
              release_date: app.releaseDate,
              file_size: app.fileSizeBytes,
              supported_devices: app.supportedDevices,
              raw_data: app
            }));
            
            this.itunesResults = processed;
            resolve(processed);
          } catch (error) {
            reject(error);
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * STEP 3: Combine and deduplicate results
   */
  combineResults() {
    console.log('\n🔄 Combining and deduplicating results...');
    
    const allResults = [...this.itunesResults];
    const deduplicatedMap = new Map();
    
    allResults.forEach(app => {
      const key = app.bundle_id || app.title?.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!key) return;
      
      const existing = deduplicatedMap.get(key);
      if (!existing) {
        deduplicatedMap.set(key, app);
      } else {
        // Prefer iTunes data as it's more comprehensive
        if (app.source === 'itunes') {
          deduplicatedMap.set(key, app);
        }
      }
    });
    
    this.combinedResults = Array.from(deduplicatedMap.values());
    console.log(`  Combined: ${allResults.length} → ${this.combinedResults.length} after deduplication`);
  }

  /**
   * STEP 4: Comprehensive duplicate check against all database tables
   */
  async checkExistingApps() {
    console.log('\n🔍 Checking for duplicates across all database tables...');
    
    try {
      // Get all apps from database to get their IDs for feature/embedding checks
      console.log('  📊 Fetching apps from apps_unified...');
      const { data: existingApps, error: appsError } = await supabase
        .from('apps_unified')
        .select('id, bundle_id, title');
      
      if (appsError) throw appsError;
      
      // Create lookup maps
      const bundleIdToAppId = new Map();
      const existingBundleIds = new Set();
      const existingTitles = new Set();
      
      existingApps.forEach(app => {
        if (app.bundle_id) {
          existingBundleIds.add(app.bundle_id);
          bundleIdToAppId.set(app.bundle_id, app.id);
        }
        if (app.title) {
          existingTitles.add(app.title.toLowerCase().replace(/[^a-z0-9]/g, ''));
        }
      });
      
      console.log(`  ✅ Found ${existingApps.length} existing apps in database`);
      
      // Check which of our scraped apps already exist
      const appsToCheck = [];
      this.newApps = this.combinedResults.filter(app => {
        const bundleKey = app.bundle_id;
        const titleKey = app.title?.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        const bundleExists = bundleKey && existingBundleIds.has(bundleKey);
        const titleExists = titleKey && existingTitles.has(titleKey);
        const isExisting = bundleExists || titleExists;
        
        if (isExisting) {
          console.log(`    ⚠️  App exists: "${app.title}" (${bundleExists ? 'bundle_id' : 'title'} match)`);
          // Still check if features/embeddings exist for this app
          if (bundleExists) {
            appsToCheck.push({
              bundle_id: bundleKey,
              app_id: bundleIdToAppId.get(bundleKey),
              title: app.title
            });
          }
        }
        
        return !isExisting;
      });
      
      console.log(`  🆕 Truly new apps: ${this.newApps.length}`);
      console.log(`  🔍 Checking features/embeddings for ${appsToCheck.length} existing apps...`);
      
      // For existing apps, check if features and embeddings already exist
      if (appsToCheck.length > 0) {
        const appIds = appsToCheck.map(app => app.app_id);
        
        // Check existing features
        const { data: existingFeatures, error: featuresError } = await supabase
          .from('app_features')
          .select('app_id')
          .in('app_id', appIds);
        
        if (featuresError) throw featuresError;
        
        // Check existing embeddings
        const { data: existingEmbeddings, error: embeddingsError } = await supabase
          .from('new_embeddings')
          .select('app_id')
          .in('app_id', appIds);
        
        if (embeddingsError) throw embeddingsError;
        
        const appsWithFeatures = new Set(existingFeatures.map(f => f.app_id));
        const appsWithEmbeddings = new Set(existingEmbeddings.map(e => e.app_id));
        
        // Log what data already exists for each app
        appsToCheck.forEach(app => {
          const hasFeatures = appsWithFeatures.has(app.app_id);
          const hasEmbeddings = appsWithEmbeddings.has(app.app_id);
          
          let status = [];
          if (hasFeatures) status.push('features exist');
          if (hasEmbeddings) status.push('embeddings exist');
          
          if (status.length > 0) {
            console.log(`    📋 "${app.title}": ${status.join(', ')} - skipping generation`);
          } else {
            console.log(`    🔄 "${app.title}": missing data - needs processing`);
            // Add back to newApps for feature/embedding generation only
            // But mark as existing app so we don't add to apps_unified
            this.newApps.push({
              ...this.combinedResults.find(r => r.bundle_id === app.bundle_id),
              _existingApp: true,
              _needsFeatures: !hasFeatures,
              _needsEmbeddings: !hasEmbeddings
            });
          }
        });
      }
      
      console.log(`  📊 Final processing queue: ${this.newApps.length} apps`);
      console.log(`  💰 Estimated API calls saved: ${(this.combinedResults.length - this.newApps.length) * 2} (features + embeddings)`);
      
    } catch (error) {
      console.error('❌ Error checking existing data:', error);
      throw error;
    }
  }

  /**
   * STEP 5: Generate features using DeepSeek
   */
  async generateFeatures(app) {
    console.log(`  🧠 Generating features for: ${app.title}`);
    
    const prompt = `Analyze this mobile app and extract detailed features:

App Details:
- Title: ${app.title}
- Developer: ${app.developer}
- Category: ${app.category}
- Description: ${app.description || 'No description available'}
- Rating: ${app.rating}/5 (${app.rating_count} reviews)
- Price: $${app.price}

Extract the following information in JSON format:
{
  "primary_use_case": "What is the main purpose/function of this app?",
  "target_user": "Who is the primary target audience?",
  "key_benefit": "What is the main benefit/value proposition?",
  "core_features": ["feature1", "feature2", "feature3"],
  "pricing_model": "free/freemium/paid/subscription",
  "user_interaction_style": "passive/active/interactive",
  "content_type": "text/visual/audio/video/mixed",
  "offline_capability": true/false,
  "social_features": true/false,
  "customization_level": "low/medium/high",
  "learning_curve": "easy/moderate/difficult",
  "update_frequency": "regular/occasional/rare",
  "data_privacy_level": "high/medium/low",
  "integration_capability": "high/medium/low/none"
}

Return only the JSON object:`;

    try {
      const response = await openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.3
      });

      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not extract JSON from response');
      }
    } catch (error) {
      console.error(`    ❌ Feature generation failed for ${app.title}:`, error.message);
      return {
        primary_use_case: app.category || 'Unknown',
        target_user: 'General users',
        key_benefit: 'Mobile app functionality',
        core_features: ['basic functionality'],
        pricing_model: app.price > 0 ? 'paid' : 'free',
        user_interaction_style: 'active',
        content_type: 'mixed',
        offline_capability: false,
        social_features: false,
        customization_level: 'medium',
        learning_curve: 'moderate',
        update_frequency: 'regular',
        data_privacy_level: 'medium',
        integration_capability: 'medium'
      };
    }
  }

  /**
   * STEP 6: Generate embeddings using new embedding generation approach
   */
  async generateEmbedding(app) {
    console.log(`  🔢 Generating embedding for: ${app.title}`);
    
    try {
      const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
      
      // Use the same rich text creation approach as the new embedding system
      const embeddingText = this.createEmbeddingText(app);
      
      // Generate embedding with validation
      if (embeddingText.length < 10) {
        console.log(`    ⚠️ Embedding text too short for ${app.title}`);
        return null;
      }
      
      const result = await embeddingModel.embedContent(embeddingText);
      const embedding = result.embedding.values;
      
      // Verify embedding is correct size
      if (embedding.length !== 768) {
        throw new Error(`Invalid embedding size: ${embedding.length}, expected 768`);
      }
      
      return embedding;
    } catch (error) {
      console.error(`    ❌ Embedding generation failed for ${app.title}:`, error.message);
      return null;
    }
  }

  /**
   * Generate embedding with retry logic (same as new system)
   */
  async generateEmbeddingWithRetry(app, maxRetries = 3) {
    let embedding = null;
    let attempt = 0;
    
    while (attempt < maxRetries && !embedding) {
      try {
        embedding = await this.generateEmbedding(app);
        break; // Success
      } catch (error) {
        attempt++;
        console.log(`    ⚠️  Attempt ${attempt}/${maxRetries} failed for ${app.title}: ${error.message}`);
        
        if (attempt < maxRetries) {
          // Wait longer for rate limit errors
          const delay = error.message.includes('429') ? 5000 : 200 * attempt;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    return embedding;
  }

  /**
   * Create rich embedding text from app metadata (same as new system)
   */
  createEmbeddingText(app) {
    const parts = [];
    
    // 1. App name (most important for matching)
    if (app.title) {
      parts.push(`App: ${app.title}`);
    }
    
    // 2. Primary category (helps with classification)
    if (app.category) {
      parts.push(`Category: ${app.category}`);
    }
    
    // 3. Full description (detailed functionality) - truncated to avoid token limits
    if (app.description && app.description.trim()) {
      // Clean up description text
      let description = app.description
        .replace(/\n+/g, ' ')  // Replace newlines with spaces
        .replace(/\s+/g, ' ')  // Normalize whitespace
        .trim();
      
      // Truncate to keep under token limits
      description = description.substring(0, 2000);
      parts.push(description);
    }
    
    // 4. Developer name (can indicate app type/quality)
    if (app.developer && app.developer.trim()) {
      parts.push(`Developer: ${app.developer.trim()}`);
    }
    
    // 5. Rating context (helps with quality indication)
    if (app.rating && app.rating_count) {
      const rating = parseFloat(app.rating);
      const count = parseInt(app.rating_count);
      
      if (rating > 0 && count > 0) {
        let ratingContext = `Rated ${rating}/5`;
        if (count >= 1000) {
          ratingContext += ` (${Math.round(count/1000)}k reviews)`;
        } else if (count >= 100) {
          ratingContext += ` (${count} reviews)`;
        }
        parts.push(ratingContext);
      }
    }
    
    // 6. Price context (free vs paid can indicate app type)
    if (app.price !== undefined) {
      if (app.price === 0) {
        parts.push('Free app');
      } else {
        parts.push(`Paid app ($${app.price})`);
      }
    }
    
    // Join with double newlines for clarity
    const text = parts.join('\n\n').trim();
    
    // Final length limit to ensure we don't exceed token limits
    return text.substring(0, 5000);
  }

  /**
   * STEP 5: Save unique apps locally first
   */
  saveUniqueAppsLocally() {
    // Filter out existing apps (those with _existingApp flag) - only save truly new apps
    const trulyNewApps = this.newApps.filter(app => !app._existingApp);
    
    if (trulyNewApps.length === 0) {
      console.log('\n✅ No truly new apps to save');
      return null;
    }
    
    console.log(`\n💾 Saving ${trulyNewApps.length} truly new apps locally...`);
    
    // Create new-apps directory if it doesn't exist
    const newAppsDir = 'data-scraping/new-apps';
    if (!fs.existsSync(newAppsDir)) {
      fs.mkdirSync(newAppsDir, { recursive: true });
      console.log(`  📁 Created directory: ${newAppsDir}`);
    }
    
    // Create filename with timestamp and keyword
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedTerm = this.searchTerm.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const filename = `${newAppsDir}/unique-apps-${sanitizedTerm}-${timestamp}.json`;
    
    const uniqueAppsData = {
      search_term: this.searchTerm,
      timestamp: new Date().toISOString(),
      total_found: this.combinedResults.length,
      duplicates_skipped: this.combinedResults.length - trulyNewApps.length,
      unique_apps_count: trulyNewApps.length,
      apps: trulyNewApps
    };
    
    fs.writeFileSync(filename, JSON.stringify(uniqueAppsData, null, 2));
    console.log(`  ✅ Saved unique apps to: ${filename}`);
    console.log(`  📊 Summary: ${this.newApps.length} unique apps out of ${this.combinedResults.length} total found`);
    
    return filename;
  }

  /**
   * STEP 6: Merge unique apps with apps_unified table locally
   */
  async mergeWithAppsUnified(uniqueAppsFile) {
    if (!uniqueAppsFile || this.newApps.length === 0) {
      console.log('\n⚠️ No unique apps to merge');
      return null;
    }
    
    console.log(`\n🔄 Merging unique apps with apps_unified table...`);
    
    // Load current apps_unified backup
    const backupPath = 'data-scraping/table-backups/apps_unified_2025-10-31T16-33-58-923Z.json';
    let currentApps = [];
    
    if (fs.existsSync(backupPath)) {
      console.log('  📁 Loading current apps_unified backup...');
      const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
      currentApps = backupData.data || backupData;
      console.log(`  📊 Current apps in unified table: ${currentApps.length}`);
    } else {
      console.log('  ⚠️ No local backup found, starting with empty table');
    }
    
    // Prepare new apps for unified table
    const newUnifiedApps = this.newApps.map(app => ({
      bundle_id: app.bundle_id,
      title: app.title,
      developer: app.developer,
      primary_category: app.category,
      price: app.price,
      rating: app.rating,
      rating_count: app.rating_count,
      description: app.description,
      icon_url: app.icon_url,
      app_store_url: app.app_store_url,
      version: app.version,
      source: app.source,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    // Merge with existing apps
    const mergedApps = [...currentApps, ...newUnifiedApps];
    
    // Save merged apps_unified locally
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const mergedFilename = `data-scraping/merged_data_apps/merged-apps-unified-${timestamp}.json`;
    
    const mergedData = {
      timestamp: new Date().toISOString(),
      previous_count: currentApps.length,
      new_apps_added: newUnifiedApps.length,
      total_count: mergedApps.length,
      data: mergedApps
    };
    
    fs.writeFileSync(mergedFilename, JSON.stringify(mergedData, null, 2));
    console.log(`  ✅ Saved merged apps_unified to: ${mergedFilename}`);
    console.log(`  📊 Before: ${currentApps.length} apps | Added: ${newUnifiedApps.length} apps | After: ${mergedApps.length} apps`);
    
    return mergedFilename;
  }

  /**
   * STEP 7: Generate features for new apps and save locally
   */
  async generateFeaturesForNewApps() {
    if (this.newApps.length === 0) {
      console.log('\n✅ No new apps to generate features for');
      return null;
    }
    
    console.log(`\n🌟 Generating features for ${this.newApps.length} new apps...`);
    
    // Create features directory if it doesn't exist
    const featuresDir = 'data-scraping/new-features';
    if (!fs.existsSync(featuresDir)) {
      fs.mkdirSync(featuresDir, { recursive: true });
      console.log(`  📁 Created directory: ${featuresDir}`);
    }
    
    const newFeatures = [];
    
    for (let i = 0; i < this.newApps.length; i++) {
      const app = this.newApps[i];
      
      // Skip feature generation if app already has features
      if (app._existingApp && app._needsFeatures === false) {
        console.log(`\n[${i + 1}/${this.newApps.length}] Skipping features for: ${app.title} (already exists)`);
        continue;
      }
      
      console.log(`\n[${i + 1}/${this.newApps.length}] Generating features for: ${app.title}`);
      
      try {
        const features = await this.generateFeatures(app);
        
        const featureRecord = {
          bundle_id: app.bundle_id,
          title: app.title,
          ...features,
          generated_at: new Date().toISOString()
        };
        
        newFeatures.push(featureRecord);
        console.log(`    ✅ Features generated successfully`);
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`    ❌ Failed to generate features for ${app.title}:`, error.message);
      }
    }
    
    // Save features locally
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedTerm = this.searchTerm.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const featuresFilename = `${featuresDir}/features-${sanitizedTerm}-${timestamp}.json`;
    
    const featuresData = {
      search_term: this.searchTerm,
      timestamp: new Date().toISOString(),
      total_apps: this.newApps.length,
      successful_features: newFeatures.length,
      failed_features: this.newApps.length - newFeatures.length,
      features: newFeatures
    };
    
    fs.writeFileSync(featuresFilename, JSON.stringify(featuresData, null, 2));
    console.log(`\n  ✅ Saved ${newFeatures.length} feature records to: ${featuresFilename}`);
    console.log(`  📊 Success rate: ${newFeatures.length}/${this.newApps.length} (${Math.round(newFeatures.length/this.newApps.length*100)}%)`);
    
    this.generatedFeatures = newFeatures;
    return featuresFilename;
  }

  /**
   * STEP 8: Generate embeddings for new apps and save locally
   */
  async generateEmbeddingsForNewApps() {
    if (this.newApps.length === 0) {
      console.log('\n✅ No new apps to generate embeddings for');
      return null;
    }
    
    console.log(`\n🔢 Generating embeddings for ${this.newApps.length} new apps...`);
    
    // Create embeddings directory if it doesn't exist
    const embeddingsDir = 'data-scraping/new-embeddings';
    if (!fs.existsSync(embeddingsDir)) {
      fs.mkdirSync(embeddingsDir, { recursive: true });
      console.log(`  📁 Created directory: ${embeddingsDir}`);
    }
    
    const newEmbeddings = [];
    
    for (let i = 0; i < this.newApps.length; i++) {
      const app = this.newApps[i];
      
      // Skip embedding generation if app already has embeddings
      if (app._existingApp && app._needsEmbeddings === false) {
        console.log(`\n[${i + 1}/${this.newApps.length}] Skipping embeddings for: ${app.title} (already exists)`);
        continue;
      }
      
      console.log(`\n[${i + 1}/${this.newApps.length}] Generating embedding for: ${app.title}`);
      
      try {
        const embedding = await this.generateEmbeddingWithRetry(app);
        
        if (embedding) {
          const embeddingRecord = {
            bundle_id: app.bundle_id,
            title: app.title,
            embedding: embedding,
            embedding_model: 'text-embedding-004',
            text_used: this.createEmbeddingText(app).substring(0, 500), // Store sample for debugging
            generated_at: new Date().toISOString()
          };
          
          newEmbeddings.push(embeddingRecord);
          console.log(`    ✅ Embedding generated successfully (${embedding.length} dimensions)`);
        } else {
          console.log(`    ⚠️ No embedding generated`);
        }
        
        // Rate limiting with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`    ❌ Failed to generate embedding for ${app.title}:`, error.message);
      }
    }
    
    // Save embeddings locally
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedTerm = this.searchTerm.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const embeddingsFilename = `${embeddingsDir}/embeddings-${sanitizedTerm}-${timestamp}.json`;
    
    const embeddingsData = {
      search_term: this.searchTerm,
      timestamp: new Date().toISOString(),
      total_apps: this.newApps.length,
      successful_embeddings: newEmbeddings.length,
      failed_embeddings: this.newApps.length - newEmbeddings.length,
      embeddings: newEmbeddings
    };
    
    fs.writeFileSync(embeddingsFilename, JSON.stringify(embeddingsData, null, 2));
    console.log(`\n  ✅ Saved ${newEmbeddings.length} embedding records to: ${embeddingsFilename}`);
    console.log(`  📊 Success rate: ${newEmbeddings.length}/${this.newApps.length} (${Math.round(newEmbeddings.length/this.newApps.length*100)}%)`);
    
    this.generatedEmbeddings = newEmbeddings;
    return embeddingsFilename;
  }

  
  /**
   * STEP 9: Save results locally
   */
  saveResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `data-scraping/manual-search-results/search-${this.searchTerm}-${timestamp}.json`;
    
    // Ensure directory exists
    const fs = require('fs');
    const path = require('path');
    const dir = path.dirname(filename);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const results = {
      search_term: this.searchTerm,
      timestamp: new Date().toISOString(),
      summary: {
        itunes_found: this.itunesResults.length,
        combined_total: this.combinedResults.length,
        new_apps: this.newApps.length,
        successfully_processed: this.processedApps.length
      },
      processed_apps: this.processedApps
    };
    
    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
    console.log(`\n💾 Results saved to: ${filename}`);
  }

  /**
   * Main execution function
   */
  async run(searchTerm) {
    this.searchTerm = searchTerm;
    
    console.log(`🚀 === MANUAL APP SEARCH: "${searchTerm}" ===`);
    
    try {
      // Step 1 & 2: Search both APIs
      await Promise.all([
        this.searchItunes(searchTerm)
      ]);
      
      // Step 3: Combine and deduplicate
      this.combineResults();
      
      // Step 4: Check against existing apps (using local backup)
      await this.checkExistingApps();
      
      // Step 5: Save unique apps locally first
      const uniqueAppsFile = this.saveUniqueAppsLocally();
      
      // Step 6: Merge with apps_unified table locally  
      const mergedAppsFile = await this.mergeWithAppsUnified(uniqueAppsFile);
      
      // Step 7: Generate features for new apps and save locally
      const featuresFile = await this.generateFeaturesForNewApps();
      
      // Step 8: Generate embeddings for new apps and save locally
      const embeddingsFile = await this.generateEmbeddingsForNewApps();
      
     
      
      // Step 10: Save final results summary
      this.saveResults();
      
      console.log('\n🎉 === SEARCH COMPLETE ===');
      console.log(`📊 Summary:`);
      console.log(`  - iTunes found: ${this.itunesResults.length} apps`);
      console.log(`  - Combined total: ${this.combinedResults.length} apps`);
      console.log(`  - Duplicates skipped: ${this.combinedResults.length - this.newApps.length} apps`);
      console.log(`  - New unique apps: ${this.newApps.length} apps`);
      console.log(`  - Features generated: ${this.generatedFeatures?.length || 0} apps`);
      console.log(`  - Embeddings generated: ${this.generatedEmbeddings?.length || 0} apps`);
      
      console.log(`\n📁 Files created:`);
      if (uniqueAppsFile) console.log(`  - Unique apps: ${uniqueAppsFile}`);
      if (mergedAppsFile) console.log(`  - Merged apps: ${mergedAppsFile}`);
      if (featuresFile) console.log(`  - Features: ${featuresFile}`);
      if (embeddingsFile) console.log(`  - Embeddings: ${embeddingsFile}`);
      
    } catch (error) {
      console.error('❌ Search failed:', error);
      process.exit(1);
    }
  }
}

// Main execution
if (require.main === module) {
  const searchTerm = process.argv[2];
  
  if (!searchTerm) {
    console.log('Usage: node manual-app-search.js "search term"');
    console.log('Example: node manual-app-search.js "productivity"');
    process.exit(1);
  }
  
  const searcher = new ManualAppSearcher();
  searcher.run(searchTerm);
}

module.exports = ManualAppSearcher;