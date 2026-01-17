/**
 * Upload Sample Feature Data 
 * Takes processed feature data and uploads to database
 * (Will create simplified tables if needed)
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class FeatureUploader {
  constructor() {
    this.outputDir = './data-scraping/features-output';
  }

  async uploadSampleFeatures() {
    console.log('📤 Starting Feature Data Upload...\n');

    try {
      // Load the batch results
      const batchFile = path.join(this.outputDir, 'batch-complete-results.json');
      
      if (!fs.existsSync(batchFile)) {
        console.log('❌ No batch results found. Run the batch test first.');
        return;
      }
      
      const batchData = JSON.parse(fs.readFileSync(batchFile, 'utf8'));
      const successfulResults = batchData.results.filter(r => r.success);
      
      console.log(`📊 Found ${successfulResults.length} successful feature extractions`);
      
      if (successfulResults.length === 0) {
        console.log('❌ No successful results to upload');
        return;
      }
      
      // For now, let's create a simple features table and upload data
      await this.createSimpleTable();
      await this.uploadFeatureData(successfulResults);
      
      console.log('\n🎉 Feature upload complete!');
      
    } catch (error) {
      console.error('❌ Feature upload failed:', error);
    }
  }

  async createSimpleTable() {
    console.log('🗄️  Creating simplified features table...');
    
    // We'll store features as JSONB for flexibility
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS app_features_simple (
        id SERIAL PRIMARY KEY,
        app_id TEXT UNIQUE NOT NULL,
        app_title TEXT,
        app_category TEXT,
        
        -- Processing metadata
        processed_at TIMESTAMP DEFAULT NOW(),
        processing_time_ms INTEGER,
        
        -- All features stored as JSON for flexibility
        features JSONB NOT NULL,
        
        -- Extracted key fields for indexing
        primary_use_case TEXT,
        quality_score DECIMAL(3,2),
        category_entertainment DECIMAL(4,1),
        category_productivity DECIMAL(4,1),
        
        -- Top keywords as array for search
        top_keywords TEXT[]
      );
      
      CREATE INDEX IF NOT EXISTS idx_app_features_simple_app_id ON app_features_simple(app_id);
      CREATE INDEX IF NOT EXISTS idx_app_features_simple_quality ON app_features_simple(quality_score DESC);
      CREATE INDEX IF NOT EXISTS idx_app_features_simple_entertainment ON app_features_simple(category_entertainment DESC);
      CREATE INDEX IF NOT EXISTS idx_app_features_simple_keywords ON app_features_simple USING GIN(top_keywords);
    `;
    
    // Since we can't execute SQL directly, we'll use a workaround
    console.log('⚠️  Note: Tables need to be created manually in Supabase dashboard');
    console.log('   SQL provided in the logs for manual execution');
    
    // Save SQL to file for manual execution
    fs.writeFileSync(
      path.join(this.outputDir, 'create-simple-features-table.sql'),
      createTableSQL
    );
    
    console.log('💾 SQL saved to: features-output/create-simple-features-table.sql');
  }

  async uploadFeatureData(results) {
    console.log(`\n📤 Uploading ${results.length} feature records...`);
    
    const uploadData = results.map(result => {
      const features = result.features;
      
      // Extract top keywords
      const topKeywords = Object.keys(features.keywords_tfidf?.keywords || {})
        .slice(0, 10); // Top 10 keywords
      
      return {
        app_id: result.app_id,
        app_title: result.app_title,
        app_category: result.app_category,
        processing_time_ms: result.processing_time_ms,
        features: features, // Store complete features as JSON
        primary_use_case: features.llm_features?.primary_use_case || null,
        quality_score: features.quality_signals || 0,
        category_entertainment: features.category_classification?.entertainment || 0,
        category_productivity: features.category_classification?.productivity || 0,
        top_keywords: topKeywords
      };
    });
    
    // Save as JSON for now (since we can't directly upload to non-existent table)
    const uploadFile = path.join(this.outputDir, 'features-upload-data.json');
    fs.writeFileSync(uploadFile, JSON.stringify({
      upload_timestamp: new Date().toISOString(),
      total_records: uploadData.length,
      data: uploadData
    }, null, 2));
    
    console.log(`💾 Upload data prepared: ${uploadFile}`);
    
    // Also create a CSV for easy import
    await this.createCSVExport(uploadData);
    
    // Try to upload to existing table (this will fail gracefully)
    try {
      console.log('\n🔄 Attempting direct upload...');
      
      // Check if we have any table we can use for testing
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .like('table_name', '%feature%');
      
      if (tables && tables.length > 0) {
        console.log('📋 Found feature-related tables:', tables.map(t => t.table_name));
      } else {
        console.log('📋 No feature tables found - manual setup required');
      }
      
    } catch (error) {
      console.log('ℹ️  Direct upload not possible yet - data saved for manual import');
    }
    
    console.log('\n📋 Next Steps:');
    console.log('1. Create tables in Supabase using: features-output/create-simple-features-table.sql');
    console.log('2. Import data from: features-output/features-upload-data.json');
    console.log('3. Or use the CSV: features-output/features-upload-data.csv');
  }

  async createCSVExport(data) {
    console.log('📄 Creating CSV export...');
    
    const csvHeader = [
      'app_id',
      'app_title', 
      'app_category',
      'processing_time_ms',
      'primary_use_case',
      'quality_score',
      'category_entertainment',
      'category_productivity',
      'top_keywords_json',
      'features_json'
    ].join(',');
    
    const csvRows = data.map(record => {
      return [
        record.app_id,
        `"${(record.app_title || '').replace(/"/g, '""')}"`,
        record.app_category || '',
        record.processing_time_ms || 0,
        `"${(record.primary_use_case || '').replace(/"/g, '""')}"`,
        record.quality_score || 0,
        record.category_entertainment || 0,
        record.category_productivity || 0,
        `"${JSON.stringify(record.top_keywords).replace(/"/g, '""')}"`,
        `"${JSON.stringify(record.features).replace(/"/g, '""')}"`
      ].join(',');
    });
    
    const csvContent = [csvHeader, ...csvRows].join('\n');
    
    const csvFile = path.join(this.outputDir, 'features-upload-data.csv');
    fs.writeFileSync(csvFile, csvContent);
    
    console.log(`💾 CSV export saved: ${csvFile}`);
  }

  async analyzeUploadData() {
    console.log('\n📊 Analyzing prepared upload data...');
    
    const uploadFile = path.join(this.outputDir, 'features-upload-data.json');
    if (!fs.existsSync(uploadFile)) {
      console.log('❌ No upload data found');
      return;
    }
    
    const uploadData = JSON.parse(fs.readFileSync(uploadFile, 'utf8'));
    const records = uploadData.data;
    
    console.log(`📈 Upload Analysis:`);
    console.log(`   Total records: ${records.length}`);
    console.log(`   Average quality score: ${(records.reduce((sum, r) => sum + (r.quality_score || 0), 0) / records.length).toFixed(2)}`);
    console.log(`   Average entertainment score: ${(records.reduce((sum, r) => sum + (r.category_entertainment || 0), 0) / records.length).toFixed(1)}`);
    console.log(`   Average productivity score: ${(records.reduce((sum, r) => sum + (r.category_productivity || 0), 0) / records.length).toFixed(1)}`);
    
    // Most common use cases
    const useCases = records
      .map(r => r.primary_use_case)
      .filter(Boolean)
      .reduce((acc, useCase) => {
        acc[useCase] = (acc[useCase] || 0) + 1;
        return acc;
      }, {});
    
    console.log(`   Top use cases:`);
    Object.entries(useCases)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([useCase, count]) => {
        console.log(`     - "${useCase}": ${count} apps`);
      });
  }
}

async function main() {
  const uploader = new FeatureUploader();
  await uploader.uploadSampleFeatures();
  await uploader.analyzeUploadData();
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Feature upload preparation completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Feature upload failed:', error);
      process.exit(1);
    });
}