/**
 * Compare schemas between serp_apps and serp_unique_apps tables
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class SchemaComparator {
  async compareSchemas() {
    console.log('🔍 Comparing schemas between serp_apps and serp_unique_apps...\n');

    try {
      // Get schema for both tables
      const serpAppsSchema = await this.getTableSchema('serp_apps');
      const serpUniqueSchema = await this.getTableSchema('serp_unique_apps');

      console.log('📊 Schema Comparison Results:\n');
      
      // Show serp_apps columns
      console.log('🗂️  serp_apps columns:');
      serpAppsSchema.forEach((col, i) => {
        console.log(`   ${i + 1}. ${col.column_name} (${col.data_type})`);
      });

      console.log(`\n🗂️  serp_unique_apps columns:`);
      serpUniqueSchema.forEach((col, i) => {
        console.log(`   ${i + 1}. ${col.column_name} (${col.data_type})`);
      });

      // Find missing columns
      const serpAppsColumns = new Set(serpAppsSchema.map(col => col.column_name));
      const serpUniqueColumns = new Set(serpUniqueSchema.map(col => col.column_name));

      const missingInUnique = serpAppsSchema.filter(col => !serpUniqueColumns.has(col.column_name));
      const extraInUnique = serpUniqueSchema.filter(col => !serpAppsColumns.has(col.column_name));

      console.log(`\n❌ Missing columns in serp_unique_apps (${missingInUnique.length}):`);
      missingInUnique.forEach((col, i) => {
        console.log(`   ${i + 1}. ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? '- nullable' : '- not null'}`);
      });

      console.log(`\n➕ Extra columns in serp_unique_apps (${extraInUnique.length}):`);
      extraInUnique.forEach((col, i) => {
        console.log(`   ${i + 1}. ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? '- nullable' : '- not null'}`);
      });

      // Generate corrected schema
      await this.generateCorrectedSchema(serpAppsSchema, extraInUnique);

    } catch (error) {
      console.error('❌ Schema comparison failed:', error);
    }
  }

  async getTableSchema(tableName) {
    const { data, error } = await supabase
      .rpc('get_table_schema', { table_name: tableName });

    if (error) {
      // Fallback method
      console.log(`⚠️  Using fallback method for ${tableName} schema...`);
      return await this.getSchemaFallback(tableName);
    }

    return data;
  }

  async getSchemaFallback(tableName) {
    // Get sample data to infer schema
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) throw error;

    if (data && data.length > 0) {
      const sample = data[0];
      return Object.keys(sample).map(key => ({
        column_name: key,
        data_type: typeof sample[key],
        is_nullable: 'YES'
      }));
    }

    return [];
  }

  async generateCorrectedSchema(serpAppsSchema, extraColumns) {
    console.log('\n🛠️  Generating corrected schema...');

    const correctedSchema = `-- Corrected serp_unique_apps table with all columns from serp_apps
-- Run this in Supabase SQL Editor to replace the existing table

DROP TABLE IF EXISTS serp_unique_apps CASCADE;

CREATE TABLE serp_unique_apps (
  id BIGSERIAL PRIMARY KEY,
  bundle_id VARCHAR(255) UNIQUE NOT NULL,
  source VARCHAR(50) DEFAULT 'serp_apps' NOT NULL,
  query_term VARCHAR(255) NOT NULL,
  
  -- App Basic Info
  title VARCHAR(500) NOT NULL,
  developer VARCHAR(255),
  developer_id VARCHAR(50),
  developer_url TEXT,
  version VARCHAR(50),
  
  -- Pricing & Availability
  price VARCHAR(50),
  price_value DECIMAL(10,2),
  formatted_price VARCHAR(50),
  
  -- Ratings & Reviews
  rating DECIMAL(3,2),
  rating_count BIGINT,
  rating_type VARCHAR(50),
  
  -- Media Assets
  icon_url TEXT,
  icon_url_60 TEXT,
  icon_url_512 TEXT,
  all_logos JSONB,
  screenshots JSONB,
  
  -- Metadata
  description TEXT,
  release_date TIMESTAMPTZ,
  latest_version_release_date TIMESTAMPTZ,
  age_rating VARCHAR(20),
  release_note TEXT,
  minimum_os_version VARCHAR(20),
  
  -- Categories & Genres
  category VARCHAR(100),
  primary_genre VARCHAR(100),
  genres JSONB,
  
  -- Technical Info
  size_in_bytes BIGINT,
  supported_languages JSONB,
  supported_devices JSONB,
  features JSONB,
  advisories JSONB,
  game_center_enabled BOOLEAN DEFAULT FALSE,
  vpp_license BOOLEAN DEFAULT FALSE,
  
  -- Search Position
  position INTEGER,
  rank INTEGER,
  serp_link TEXT,
  
  -- Tracking Fields
  first_scraped TIMESTAMPTZ DEFAULT NOW(),
  last_scraped TIMESTAMPTZ DEFAULT NOW(),
  scrape_count INTEGER DEFAULT 1,
  
  -- Raw Data
  raw_data JSONB,
  
  -- Processing Status (new columns)
  features_extracted BOOLEAN DEFAULT FALSE,
  extraction_attempted BOOLEAN DEFAULT FALSE,
  extraction_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_serp_unique_bundle_id ON serp_unique_apps(bundle_id);
CREATE INDEX idx_serp_unique_category ON serp_unique_apps(category);
CREATE INDEX idx_serp_unique_developer ON serp_unique_apps(developer);
CREATE INDEX idx_serp_unique_features_extracted ON serp_unique_apps(features_extracted);
CREATE INDEX idx_serp_unique_rating ON serp_unique_apps(rating DESC);
CREATE INDEX idx_serp_unique_query_term ON serp_unique_apps(query_term);
CREATE INDEX idx_serp_unique_position ON serp_unique_apps(position);
CREATE INDEX idx_serp_unique_last_scraped ON serp_unique_apps(last_scraped);

COMMENT ON TABLE serp_unique_apps IS 'Unique apps from SERP that are not in iTunes apps table - complete schema';

SELECT 'Corrected serp_unique_apps table schema ready!' as message;`;

    const fs = require('fs');
    const schemaFile = './data-scraping/database/create-serp-unique-apps-corrected.sql';
    fs.writeFileSync(schemaFile, correctedSchema);
    
    console.log(`   ✅ Corrected schema saved: ${schemaFile}`);
    console.log(`   📋 This includes ALL columns from serp_apps plus processing status columns`);
  }

  async showSampleData() {
    console.log('\n📋 Sample data from serp_apps to understand full structure:');

    const { data, error } = await supabase
      .from('serp_apps')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Failed to get sample data:', error);
      return;
    }

    if (data && data.length > 0) {
      const sample = data[0];
      console.log('\n   📄 Sample serp_apps record:');
      Object.entries(sample).forEach(([key, value]) => {
        const displayValue = typeof value === 'string' && value.length > 50 
          ? value.substring(0, 50) + '...' 
          : value;
        console.log(`     ${key}: ${displayValue}`);
      });
    }
  }
}

// Run the comparison
async function main() {
  const comparator = new SchemaComparator();
  await comparator.compareSchemas();
  await comparator.showSampleData();
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Schema comparison completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Schema comparison failed:', error);
      process.exit(1);
    });
}

module.exports = { SchemaComparator };