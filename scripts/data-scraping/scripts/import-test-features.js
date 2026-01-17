/**
 * Import Test Features to Supabase
 * Imports the 10 processed features from batch-complete-results.json
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class FeatureImporter {
  constructor() {
    this.featuresFile = './data-scraping/features-output/batch-complete-results.json';
  }

  async importTestFeatures() {
    console.log('📥 Starting feature import to Supabase...\n');

    try {
      // Step 1: Load the feature data
      const featuresData = this.loadFeatureData();
      
      // Step 2: Transform to database format
      const dbRecords = this.transformToDbFormat(featuresData.results);
      
      // Step 3: Import to database
      await this.insertFeatures(dbRecords.features);
      await this.insertKeywords(dbRecords.keywords);
      
      // Step 4: Verify import
      await this.verifyImport();
      
      console.log('\n🎉 Feature import completed successfully!');
      
    } catch (error) {
      console.error('❌ Import failed:', error);
      throw error;
    }
  }

  loadFeatureData() {
    console.log('📁 Loading feature data...');
    
    if (!fs.existsSync(this.featuresFile)) {
      throw new Error(`Features file not found: ${this.featuresFile}`);
    }
    
    const data = JSON.parse(fs.readFileSync(this.featuresFile, 'utf8'));
    const successful = data.results.filter(r => r.success);
    
    console.log(`   ✅ Loaded ${successful.length} successful feature records`);
    return { ...data, results: successful };
  }

  transformToDbFormat(results) {
    console.log('🔄 Transforming data to database format...');
    
    const featuresMap = new Map();
    const keywordsMap = new Map();
    
    // Deduplicate by app_id - keep the best record per app
    for (const result of results) {
      const f = result.features;
      const appId = result.app_id;
      
      // Check if we already have this app, keep the one with highest entertainment score
      const existing = featuresMap.get(appId);
      const currentEntertainment = f.category_classification?.entertainment || 0;
      const existingEntertainment = existing?.category_entertainment || 0;
      
      if (!existing || currentEntertainment > existingEntertainment) {
        // Main features record
        const featureRecord = {
          app_id: appId,
          processed_at: new Date().toISOString(),
          processing_time_ms: result.processing_time_ms,
          feature_version: '1.0',
          
          // Metadata
          metadata_category_primary: f.metadata?.category_primary,
          metadata_category_all: f.metadata?.category_all || [],
          metadata_price_tier: f.metadata?.price_tier,
          metadata_rating_tier: f.metadata?.rating_tier,
          metadata_popularity_score: f.metadata?.popularity_score,
          metadata_recency_score: f.metadata?.recency_score,
          metadata_developer_name: f.metadata?.developer_info?.name,
          metadata_developer_id: f.metadata?.developer_info?.id,
          
          // Quality signals
          quality_signals: f.quality_signals,
          
          // Category classifications
          category_productivity: f.category_classification?.productivity || 0,
          category_finance: f.category_classification?.finance || 0,
          category_health: f.category_classification?.health || 0,
          category_entertainment: f.category_classification?.entertainment || 0,
          category_education: f.category_classification?.education || 0,
          
          // LLM features
          llm_primary_use_case: f.llm_features?.primary_use_case,
          llm_use_cases: f.llm_features?.use_cases || [],
          llm_target_personas: f.llm_features?.target_personas || [],
          llm_problem_solved: f.llm_features?.problem_solved,
          llm_key_features: f.llm_features?.key_features || [],
          llm_limitations: f.llm_features?.limitations || [],
          llm_best_for_keywords: f.llm_features?.best_for_keywords || [],
          llm_not_good_for: f.llm_features?.not_good_for || [],
          llm_emotional_tone: f.llm_features?.emotional_tone,
          llm_complexity_level: f.llm_features?.complexity_level,
          llm_time_commitment: f.llm_features?.time_commitment
        };
        
        featuresMap.set(appId, featureRecord);
        
        // Keywords records - merge keywords for same app
        if (f.keywords_tfidf?.keywords) {
          const appKeywords = keywordsMap.get(appId) || new Map();
          
          for (const [keyword, score] of Object.entries(f.keywords_tfidf.keywords)) {
            const categories = f.keywords_tfidf.categories?.[keyword] || [];
            const keywordKey = `${appId}-${keyword}`;
            
            // Keep highest score for same keyword
            const existing = appKeywords.get(keyword);
            if (!existing || score > existing.score) {
              appKeywords.set(keyword, {
                app_id: appId,
                keyword: keyword,
                score: score,
                categories: categories
              });
            }
          }
          
          keywordsMap.set(appId, appKeywords);
        }
      }
    }
    
    // Convert maps to arrays
    const features = Array.from(featuresMap.values());
    const keywords = [];
    
    for (const appKeywords of keywordsMap.values()) {
      keywords.push(...Array.from(appKeywords.values()));
    }
    
    console.log(`   ✅ Deduplicated to ${features.length} unique apps`);
    console.log(`   ✅ Transformed ${keywords.length} keyword records`);
    
    return { features, keywords };
  }

  async insertFeatures(features) {
    console.log('📤 Inserting features to app_features table...');
    
    // Insert in smaller batches to avoid limits
    const batchSize = 5;
    
    for (let i = 0; i < features.length; i += batchSize) {
      const batch = features.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('app_features')
        .upsert(batch, { 
          onConflict: 'app_id',
          ignoreDuplicates: false 
        });
      
      if (error) {
        console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} failed:`, error);
        throw error;
      }
      
      console.log(`   ✅ Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(features.length/batchSize)} inserted`);
    }
    
    console.log(`   🎉 ${features.length} features inserted successfully`);
  }

  async insertKeywords(keywords) {
    console.log('📤 Inserting keywords to app_keywords_tfidf table...');
    
    // Insert in batches
    const batchSize = 50;
    
    for (let i = 0; i < keywords.length; i += batchSize) {
      const batch = keywords.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('app_keywords_tfidf')
        .upsert(batch, { 
          onConflict: 'app_id,keyword',
          ignoreDuplicates: false 
        });
      
      if (error) {
        console.error(`❌ Keywords batch ${Math.floor(i/batchSize) + 1} failed:`, error);
        throw error;
      }
      
      console.log(`   ✅ Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(keywords.length/batchSize)} inserted`);
    }
    
    console.log(`   🎉 ${keywords.length} keywords inserted successfully`);
  }

  async verifyImport() {
    console.log('🔍 Verifying import...');
    
    // Check features count
    const { data: featuresCount, error: featuresError } = await supabase
      .from('app_features')
      .select('id', { count: 'exact' });
    
    if (featuresError) {
      console.error('❌ Features verification failed:', featuresError);
      return;
    }
    
    // Check keywords count
    const { data: keywordsCount, error: keywordsError } = await supabase
      .from('app_keywords_tfidf')
      .select('id', { count: 'exact' });
    
    if (keywordsError) {
      console.error('❌ Keywords verification failed:', keywordsError);
      return;
    }
    
    // Sample data check
    const { data: sampleFeatures, error: sampleError } = await supabase
      .from('app_features_complete')
      .select('*')
      .limit(3);
    
    console.log(`   ✅ Features in database: ${featuresCount?.length || 'unknown'}`);
    console.log(`   ✅ Keywords in database: ${keywordsCount?.length || 'unknown'}`);
    
    if (sampleFeatures && sampleFeatures.length > 0) {
      console.log(`   ✅ Sample app: "${sampleFeatures[0].title}" - ${sampleFeatures[0].llm_primary_use_case}`);
    }
  }
}

// Run the import
async function main() {
  const importer = new FeatureImporter();
  await importer.importTestFeatures();
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Import completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Import failed:', error);
      process.exit(1);
    });
}

module.exports = { FeatureImporter };