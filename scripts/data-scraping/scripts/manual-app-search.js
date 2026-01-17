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
    this.serpResults = [];
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
   * STEP 2: Search SERP API
   */
  async searchSerp(term, limit = 50) {
    console.log(`\n🐍 Searching SERP API for: "${term}"`);
    
    return new Promise((resolve, reject) => {
      const params = new URLSearchParams({
        engine: 'apple_app_store',
        term: term,
        country: 'us',
        lang: 'en-us',
        num: limit.toString(),
        api_key: process.env.SERPAPI_KEY
      });

      const url = `https://serpapi.com/search?${params.toString()}`;
      
      https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            const apps = jsonData.apps || [];
            
            console.log(`  Found ${apps.length} apps from SERP`);
            
            const processed = apps.map(app => ({
              source: 'serp',
              bundle_id: app.bundle_id,
              title: app.title,
              developer: app.developer,
              category: app.genre,
              price: parseFloat(app.price?.replace('$', '') || '0'),
              currency: 'USD',
              rating: parseFloat(app.rating || '0'),
              rating_count: parseInt(app.reviews || '0'),
              description: app.description || '',
              icon_url: app.thumbnail,
              app_store_url: app.link,
              version: app.version,
              content_rating: app.content_rating,
              raw_data: app
            }));
            
            this.serpResults = processed;
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
    
    const allResults = [...this.itunesResults, ...this.serpResults];
    const deduplicatedMap = new Map();
    
    allResults.forEach(app => {
      const key = app.bundle_id || app.title?.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!key) return;
      
      const existing = deduplicatedMap.get(key);
      if (!existing) {
        deduplicatedMap.set(key, app);
      } else {
        // Prefer iTunes data as it's more comprehensive
        if (app.source === 'itunes' && existing.source === 'serp') {
          deduplicatedMap.set(key, app);
        }
      }
    });
    
    this.combinedResults = Array.from(deduplicatedMap.values());
    console.log(`  Combined: ${allResults.length} → ${this.combinedResults.length} after deduplication`);
  }

  /**
   * STEP 4: Check against existing apps_unified table (using local backup)
   */
  async checkExistingApps() {
    console.log('\n🔍 Checking against existing apps_unified table (local backup)...');
    
    try {
      // Load from local backup instead of database query
      const backupPath = 'data-scraping/table-backups/apps_unified_2025-10-31T16-33-58-923Z.json';
      
      if (!fs.existsSync(backupPath)) {
        console.log('  ⚠️  Local backup not found, falling back to database query...');
        const { data: existingApps, error } = await supabase
          .from('apps_unified')
          .select('bundle_id, title');
        
        if (error) throw error;
        
        existingApps.forEach(app => {
          if (app.bundle_id) {
            this.existingApps.add(app.bundle_id);
          }
          if (app.title) {
            this.existingApps.add(app.title.toLowerCase().replace(/[^a-z0-9]/g, ''));
          }
        });
        
        console.log(`  Found ${existingApps.length} existing apps from database`);
      } else {
        // Load from local backup
        console.log('  📁 Loading from local backup...');
        const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
        const existingApps = backupData.data || backupData;
        
        // Create set of existing bundle_ids and normalized titles
        existingApps.forEach(app => {
          if (app.bundle_id) {
            this.existingApps.add(app.bundle_id);
          }
          if (app.title) {
            this.existingApps.add(app.title.toLowerCase().replace(/[^a-z0-9]/g, ''));
          }
        });
        
        console.log(`  Found ${existingApps.length} existing apps from backup`);
      }
      
      // Filter out existing apps with detailed logging
      this.newApps = this.combinedResults.filter(app => {
        const bundleKey = app.bundle_id;
        const titleKey = app.title?.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        const bundleExists = bundleKey && this.existingApps.has(bundleKey);
        const titleExists = titleKey && this.existingApps.has(titleKey);
        const isExisting = bundleExists || titleExists;
        
        if (isExisting) {
          console.log(`    ⚠️  Skipping duplicate: "${app.title}" (${bundleExists ? 'bundle_id' : 'title'} match)`);
        }
        
        return !isExisting;
      });
      
      console.log(`  New apps to process: ${this.newApps.length}`);
      console.log(`  Duplicates skipped: ${this.combinedResults.length - this.newApps.length}`);
      
    } catch (error) {
      console.error('❌ Error checking existing apps:', error);
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
   * STEP 6: Generate embeddings using Gemini
   */
  async generateEmbedding(app) {
    console.log(`  🔢 Generating embedding for: ${app.title}`);
    
    try {
      const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const text = `${app.title} ${app.developer} ${app.category} ${app.description}`.slice(0, 1000);
      
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error(`    ❌ Embedding generation failed for ${app.title}:`, error.message);
      return null;
    }
  }

  /**
   * STEP 5: Save unique apps locally first
   */
  saveUniqueAppsLocally() {
    if (this.newApps.length === 0) {
      console.log('\n✅ No new apps to save');
      return null;
    }
    
    console.log(`\n💾 Saving ${this.newApps.length} unique apps locally...`);
    
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
      duplicates_skipped: this.combinedResults.length - this.newApps.length,
      unique_apps_count: this.newApps.length,
      apps: this.newApps
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
    const mergedFilename = `data-scraping/new-apps/merged-apps-unified-${timestamp}.json`;
    
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
      console.log(`\n[${i + 1}/${this.newApps.length}] Generating embedding for: ${app.title}`);
      
      try {
        const embedding = await this.generateEmbedding(app);
        
        if (embedding) {
          const embeddingRecord = {
            bundle_id: app.bundle_id,
            title: app.title,
            embedding: embedding,
            generated_at: new Date().toISOString()
          };
          
          newEmbeddings.push(embeddingRecord);
          console.log(`    ✅ Embedding generated successfully`);
        } else {
          console.log(`    ⚠️ No embedding generated`);
        }
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
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
   * STEP 9: Upload everything to Supabase
   */
  async uploadToSupabase() {
    if (!this.generatedFeatures || !this.generatedEmbeddings || this.newApps.length === 0) {
      console.log('\n⚠️ No processed data to upload');
      return;
    }
    
    console.log(`\n📤 Uploading ${this.newApps.length} apps to Supabase...`);
    
    try {
      // Get current row counts before upload
      console.log('  📊 Getting current database counts...');
      const [unifiedResult, featuresResult, embeddingsResult] = await Promise.all([
        supabase.from('apps_unified').select('*', { count: 'exact', head: true }),
        supabase.from('app_features').select('*', { count: 'exact', head: true }),
        supabase.from('app_embeddings').select('*', { count: 'exact', head: true })
      ]);
      
      const beforeCounts = {
        apps_unified: unifiedResult.count || 0,
        app_features: featuresResult.count || 0,
        app_embeddings: embeddingsResult.count || 0
      };
      
      console.log(`  📊 Before upload - Apps: ${beforeCounts.apps_unified} | Features: ${beforeCounts.app_features} | Embeddings: ${beforeCounts.app_embeddings}`);
      
      // Upload to apps_unified
      console.log('  📊 Uploading to apps_unified...');
      const appsData = this.newApps.map(app => ({
        bundle_id: app.bundle_id,
        title: app.title,
        developer: app.developer,
        primary_category: app.category,
        price: app.price,
        rating: app.rating,
        rating_count: app.rating_count,
        description: app.description,
        icon_url: app.icon_url,
        version: app.version
      }));
      
      const { data: appsInserted, error: appsError } = await supabase
        .from('apps_unified')
        .insert(appsData)
        .select('id, bundle_id');
      
      if (appsError) throw appsError;
      console.log(`    ✅ Uploaded ${appsInserted.length} apps to apps_unified`);
      
      // Create mapping of bundle_id to database id
      const idMapping = new Map();
      appsInserted.forEach(app => {
        idMapping.set(app.bundle_id, app.id);
      });
      
      // Upload to app_features
      console.log('  🌟 Uploading to app_features...');
      const featuresData = this.generatedFeatures.map(feature => {
        const appId = idMapping.get(feature.bundle_id);
        if (!appId) return null;
        
        const { bundle_id, title, generated_at, ...featureFields } = feature;
        return {
          app_id: appId,
          ...featureFields
        };
      }).filter(item => item !== null);
      
      if (featuresData.length > 0) {
        const { error: featuresError } = await supabase
          .from('app_features')
          .insert(featuresData);
        
        if (featuresError) throw featuresError;
        console.log(`    ✅ Uploaded ${featuresData.length} feature records`);
      }
      
      // Upload to app_embeddings
      console.log('  🔢 Uploading to app_embeddings...');
      const embeddingsData = this.generatedEmbeddings.map(embedding => {
        const appId = idMapping.get(embedding.bundle_id);
        if (!appId) return null;
        
        return {
          app_id: appId,
          embedding: embedding.embedding
        };
      }).filter(item => item !== null);
      
      if (embeddingsData.length > 0) {
        const { error: embeddingsError } = await supabase
          .from('app_embeddings')
          .insert(embeddingsData);
        
        if (embeddingsError) throw embeddingsError;
        console.log(`    ✅ Uploaded ${embeddingsData.length} embedding records`);
      }
      
      // Get final row counts after upload
      console.log('  📊 Getting final database counts...');
      const [finalUnifiedResult, finalFeaturesResult, finalEmbeddingsResult] = await Promise.all([
        supabase.from('apps_unified').select('*', { count: 'exact', head: true }),
        supabase.from('app_features').select('*', { count: 'exact', head: true }),
        supabase.from('app_embeddings').select('*', { count: 'exact', head: true })
      ]);
      
      const afterCounts = {
        apps_unified: finalUnifiedResult.count || 0,
        app_features: finalFeaturesResult.count || 0,
        app_embeddings: finalEmbeddingsResult.count || 0
      };
      
      console.log(`\n  🎉 UPLOAD COMPLETE!`);
      console.log(`  📊 Final tally:`);
      console.log(`     Apps unified:  ${beforeCounts.apps_unified} → ${afterCounts.apps_unified} (+${afterCounts.apps_unified - beforeCounts.apps_unified})`);
      console.log(`     App features:  ${beforeCounts.app_features} → ${afterCounts.app_features} (+${afterCounts.app_features - beforeCounts.app_features})`);
      console.log(`     App embeddings: ${beforeCounts.app_embeddings} → ${afterCounts.app_embeddings} (+${afterCounts.app_embeddings - beforeCounts.app_embeddings})`);
      
    } catch (error) {
      console.error('❌ Upload failed:', error);
      throw error;
    }
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
        serp_found: this.serpResults.length,
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
        this.searchItunes(searchTerm),
        this.searchSerp(searchTerm)
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
      
      // Step 9: Upload everything to Supabase
      await this.uploadToSupabase();
      
      // Step 10: Save final results summary
      this.saveResults();
      
      console.log('\n🎉 === SEARCH COMPLETE ===');
      console.log(`📊 Summary:`);
      console.log(`  - iTunes found: ${this.itunesResults.length} apps`);
      console.log(`  - SERP found: ${this.serpResults.length} apps`);
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