/**
 * Upload Processed Data Script
 * 
 * This script uploads already processed apps, features, and embeddings to Supabase
 * Usage: node upload-processed-data.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class ProcessedDataUploader {
  constructor(uniqueAppsFile = null, featuresFile = null, embeddingsFile = null) {
    if (uniqueAppsFile) {
      this.uniqueAppsFile = uniqueAppsFile;
    } else {
      const newAppsDir = 'data-scraping/new-apps';
      this.uniqueAppsFile = this.getLatestJsonFile(newAppsDir);
    }

    if (featuresFile) {
      this.featuresFile = featuresFile;
    } else {
      const newFeaturesDir = 'data-scraping/new-features';
      this.featuresFile = this.getLatestJsonFile(newFeaturesDir);
    }

    if (embeddingsFile) {
      this.embeddingsFile = embeddingsFile;
    } else {
      const newEmbeddingsDir = 'data-scraping/new-embeddings';
      this.embeddingsFile = this.getLatestJsonFile(newEmbeddingsDir);
    }
  }

  getLatestJsonFile(directory) {
    const files = fs.readdirSync(directory)
      .filter(file => file.endsWith('.json'))
      .map(file => ({ file, mtime: fs.statSync(path.join(directory, file)).mtime.getTime() }))
      .sort((a, b) => b.mtime - a.mtime); // Sort by modification time, newest first

    if (files.length === 0) {
      throw new Error(`No JSON files found in ${directory}`);
    }

    return path.join(directory, files[0].file);
  }

  async loadProcessedData() {
    console.log('📁 Loading processed data files...');

    // Load unique apps
    if (!fs.existsSync(this.uniqueAppsFile)) {
      throw new Error(`Unique apps file not found: ${this.uniqueAppsFile}`);
    }
    console.log(`  Loading unique apps from: ${this.uniqueAppsFile}`);
    const uniqueAppsData = JSON.parse(fs.readFileSync(this.uniqueAppsFile, 'utf-8'));
    console.log(`  uniqueAppsData keys: ${Object.keys(uniqueAppsData)}`);
    this.uniqueApps = uniqueAppsData.apps;
    console.log(`  ✅ Loaded ${this.uniqueApps.length} unique apps`);

    // Load features
    if (!fs.existsSync(this.featuresFile)) {
      throw new Error(`Features file not found: ${this.featuresFile}`);
    }
    const featuresData = JSON.parse(fs.readFileSync(this.featuresFile, 'utf-8'));
    this.features = featuresData.features;
    console.log(`  ✅ Loaded ${this.features.length} feature records`);

    // Load embeddings
    if (!fs.existsSync(this.embeddingsFile)) {
      throw new Error(`Embeddings file not found: ${this.embeddingsFile}`);
    }
    const embeddingsData = JSON.parse(fs.readFileSync(this.embeddingsFile, 'utf-8'));
    this.embeddings = embeddingsData.embeddings;
    console.log(`  ✅ Loaded ${this.embeddings.length} embedding records`);

    console.log(`\n📊 Data loaded successfully:`);
    console.log(`  - Apps: ${this.uniqueApps.length}`);
    console.log(`  - Features: ${this.features.length}`);
    console.log(`  - Embeddings: ${this.embeddings.length}`);
  }

  async getCurrentCounts() {
    console.log('📊 Getting current database counts...');
    
    const [unifiedResult, featuresResult, embeddingsResult] = await Promise.all([
      supabase.from('apps_unified').select('*', { count: 'exact', head: true }),
      supabase.from('app_features').select('*', { count: 'exact', head: true }),
      supabase.from('app_embeddings').select('*', { count: 'exact', head: true })
    ]);
    
    const counts = {
      apps_unified: unifiedResult.count || 0,
      app_features: featuresResult.count || 0,
      app_embeddings: embeddingsResult.count || 0
    };
    
    console.log(`  📊 Before upload - Apps: ${counts.apps_unified} | Features: ${counts.app_features} | Embeddings: ${counts.app_embeddings}`);
    
    return counts;
  }

  async uploadApps() {
    console.log('📤 Uploading apps to apps_unified...');

    // Get existing bundle_ids from the database
    const { data: existingApps, error: existingAppsError } = await supabase
      .from('apps_unified')
      .select('bundle_id');

    if (existingAppsError) {
      console.error('❌ Error fetching existing apps:', existingAppsError);
      throw existingAppsError;
    }

    const existingBundleIds = new Set(existingApps.map(app => app.bundle_id));
    console.log(`  Found ${existingBundleIds.size} existing apps in the database.`);

    // Filter out apps that already exist
    const newAppsToUpload = this.uniqueApps.filter(app => !existingBundleIds.has(app.bundle_id));
    console.log(`  Identified ${newAppsToUpload.length} new apps to upload.`);

    if (newAppsToUpload.length === 0) {
      console.log('  ⚠️ No new apps to upload.');
      // Even if no new apps, we still need to populate idMapping for features/embeddings
      const { data: allAppsInDb, error: allAppsInDbError } = await supabase
        .from('apps_unified')
        .select('id, bundle_id');

      if (allAppsInDbError) {
        console.error('❌ Error fetching all apps for ID mapping:', allAppsInDbError);
        throw allAppsInDbError;
      }

      this.idMapping = new Map();
      allAppsInDb.forEach(app => {
        this.idMapping.set(app.bundle_id, app.id);
      });
      return;
    }

    // Prepare new apps data for upload
    const appsData = newAppsToUpload.map(app => ({
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

    console.log(`  Attempting to upsert ${appsData.length} apps.`);
    const { data: appsInserted, error: appsError } = await supabase
      .from('apps_unified')
      .upsert(appsData, { onConflict: 'bundle_id' })
      .select('id, bundle_id');

    if (appsError) {
      console.error('❌ Error during apps upsert:', appsError);
      throw appsError;
    }
    
    console.log(`  ✅ Uploaded ${appsInserted.length} apps to apps_unified`);

    // Create mapping of bundle_id to database id (for all apps, including existing ones)
    // We need the IDs of all apps that will be referenced by features and embeddings
    const { data: allAppsInDb, error: allAppsInDbError } = await supabase
      .from('apps_unified')
      .select('id, bundle_id');

    if (allAppsInDbError) {
      console.error('❌ Error fetching all apps for ID mapping:', allAppsInDbError);
      throw allAppsInDbError;
    }

    this.idMapping = new Map();
    allAppsInDb.forEach(app => {
      this.idMapping.set(app.bundle_id, app.id);
    });

    return appsInserted;
  }

  async populateIdMapping() {
    console.log('🔄 Populating app ID mapping...');
    const { data: allAppsInDb, error: allAppsInDbError } = await supabase
      .from('apps_unified')
      .select('id, bundle_id');

    if (allAppsInDbError) {
      console.error('❌ Error fetching all apps for ID mapping:', allAppsInDbError);
      throw allAppsInDbError;
    }

    this.idMapping = new Map();
    allAppsInDb.forEach(app => {
      this.idMapping.set(app.bundle_id, app.id);
    });
    console.log(`  ✅ Populated ID mapping for ${this.idMapping.size} apps.`);
  }

  async uploadFeatures() {
    console.log('🌟 Uploading features to app_features...');

    const featuresData = this.features.map(feature => {
      const appId = this.idMapping.get(feature.bundle_id);
      if (!appId) {
        console.warn(`  ⚠️ No app ID found for bundle_id: ${feature.bundle_id}`);
        return null;
      }
      
      const { bundle_id, title, generated_at, content_type, core_features, customization_level, data_privacy_level, integration_capability, pricing_model, user_interaction_style, offline_capability, social_features, learning_curve, update_frequency, ...featureFields } = feature;
      return {
        app_id: appId,
        ...featureFields
      };
    }).filter(item => item !== null);

    if (featuresData.length > 0) {
      const { error: featuresError } = await supabase
        .from('app_features')
        .upsert(featuresData, { onConflict: 'app_id' });
      
      if (featuresError) throw featuresError;
      console.log(`  ✅ Uploaded ${featuresData.length} feature records`);
    } else {
      console.log(`  ⚠️ No feature records to upload`);
    }

    return featuresData;
  }

  async uploadEmbeddings() {
    console.log('🔢 Uploading embeddings to app_embeddings...');

    const embeddingsData = this.embeddings.map(embedding => {
      const appId = this.idMapping.get(embedding.bundle_id);
      if (!appId) {
        console.warn(`  ⚠️ No app ID found for bundle_id: ${embedding.bundle_id}`);
        return null;
      }
      
      return {
        app_id: appId,
        embedding: embedding.embedding
      };
    }).filter(item => item !== null);

    if (embeddingsData.length > 0) {
      const { error: embeddingsError } = await supabase
        .from('app_embeddings')
        .upsert(embeddingsData, { onConflict: 'app_id' });
      
      if (embeddingsError) throw embeddingsError;
      console.log(`  ✅ Uploaded ${embeddingsData.length} embedding records`);
    } else {
      console.log(`  ⚠️ No embedding records to upload`);
    }

    return embeddingsData;
  }

  async getFinalCounts() {
    console.log('📊 Getting final database counts...');
    
    const [finalUnifiedResult, finalFeaturesResult, finalEmbeddingsResult] = await Promise.all([
      supabase.from('apps_unified').select('*', { count: 'exact', head: true }),
      supabase.from('app_features').select('*', { count: 'exact', head: true }),
      supabase.from('app_embeddings').select('*', { count: 'exact', head: true })
    ]);
    
    const finalCounts = {
      apps_unified: finalUnifiedResult.count || 0,
      app_features: finalFeaturesResult.count || 0,
      app_embeddings: finalEmbeddingsResult.count || 0
    };
    
    return finalCounts;
  }

  async run() {
    console.log('🚀 === UPLOADING PROCESSED CHEMISTRY DATA ===\n');

    try {
      // Load processed data
      await this.loadProcessedData();

      // Get current counts
      const beforeCounts = await this.getCurrentCounts();

      // Upload apps first
      await this.uploadApps();

      // Populate ID mapping for features and embeddings
      await this.populateIdMapping();

      // Upload features
      await this.uploadFeatures();

      // Upload embeddings  
      await this.uploadEmbeddings();

      // Get final counts
      const afterCounts = await this.getFinalCounts();

      // Show final results
      console.log(`\n🎉 UPLOAD COMPLETE!`);
      console.log(`📊 Final tally:`);
      console.log(`  Apps unified:  ${beforeCounts.apps_unified} → ${afterCounts.apps_unified} (+${afterCounts.apps_unified - beforeCounts.apps_unified})`);
      console.log(`  App features:  ${beforeCounts.app_features} → ${afterCounts.app_features} (+${afterCounts.app_features - beforeCounts.app_features})`);
      console.log(`  App embeddings: ${beforeCounts.app_embeddings} → ${afterCounts.app_embeddings} (+${afterCounts.app_embeddings - beforeCounts.app_embeddings})`);

      console.log(`\n✅ Successfully uploaded chemistry apps to the database!`);

    } catch (error) {
      console.error('❌ Upload failed:', error);
      process.exit(1);
    }
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  let uniqueAppsFile = null;
  let featuresFile = null;
  let embeddingsFile = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--apps' && args[i + 1]) {
      uniqueAppsFile = args[++i];
    } else if (args[i] === '--features' && args[i + 1]) {
      featuresFile = args[++i];
    } else if (args[i] === '--embeddings' && args[i + 1]) {
      embeddingsFile = args[++i];
    }
  }

  const uploader = new ProcessedDataUploader(uniqueAppsFile, featuresFile, embeddingsFile);
  uploader.run();
}

module.exports = ProcessedDataUploader;