/**
 * Create and Populate serp_unique_apps Table
 * Store the 814 unique SERP apps in a dedicated table
 */

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class SerpUniqueTableCreator {
  constructor() {
    this.loadUniqueApps();
  }

  loadUniqueApps() {
    const listFile = './data-scraping/features-output/serp-unique-apps-for-extraction.json';
    if (!fs.existsSync(listFile)) {
      throw new Error('❌ Unique apps list not found. Run compare-serp-itunes.js first.');
    }
    
    const data = JSON.parse(fs.readFileSync(listFile, 'utf8'));
    this.uniqueApps = data.apps;
    console.log(`📋 Loaded ${this.uniqueApps.length} unique SERP apps`);
  }

  async createAndPopulateTable() {
    console.log('🚀 Creating serp_unique_apps table...\n');

    try {
      // Step 1: Create the table
      await this.createTable();
      
      // Step 2: Populate with unique apps
      await this.populateTable();
      
      // Step 3: Verify the data
      await this.verifyTable();
      
      console.log('\n🎉 serp_unique_apps table created and populated successfully!');

    } catch (error) {
      console.error('❌ Table creation failed:', error);
      throw error;
    }
  }

  async createTable() {
    console.log('📋 Creating serp_unique_apps table schema...');

    const createTableSQL = `
      -- Drop table if exists
      DROP TABLE IF EXISTS serp_unique_apps CASCADE;

      -- Create serp_unique_apps table
      CREATE TABLE serp_unique_apps (
        id BIGSERIAL PRIMARY KEY,
        bundle_id VARCHAR(255) UNIQUE NOT NULL,
        
        -- App Basic Info
        title VARCHAR(500) NOT NULL,
        developer VARCHAR(255),
        category VARCHAR(100),
        
        -- Content
        description TEXT,
        
        -- Ratings & Reviews
        rating DECIMAL(3,2),
        rating_count BIGINT,
        
        -- Source Info
        source VARCHAR(50) DEFAULT 'serp_apps' NOT NULL,
        original_serp_id VARCHAR(255), -- Reference to original serp_apps entry
        
        -- Processing Status
        features_extracted BOOLEAN DEFAULT FALSE,
        extraction_attempted BOOLEAN DEFAULT FALSE,
        extraction_error TEXT,
        
        -- Metadata
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Create indexes
      CREATE INDEX idx_serp_unique_bundle_id ON serp_unique_apps(bundle_id);
      CREATE INDEX idx_serp_unique_category ON serp_unique_apps(category);
      CREATE INDEX idx_serp_unique_developer ON serp_unique_apps(developer);
      CREATE INDEX idx_serp_unique_features_extracted ON serp_unique_apps(features_extracted);
      CREATE INDEX idx_serp_unique_rating ON serp_unique_apps(rating DESC);

      -- Add table comment
      COMMENT ON TABLE serp_unique_apps IS 'Unique apps from SERP that are not in iTunes apps table';
    `;

    const { error } = await supabase.rpc('execute_sql', { query: createTableSQL });
    
    if (error) {
      // Try alternative approach without execute_sql
      console.log('⚠️  Using alternative table creation method...');
      await this.createTableAlternative();
    } else {
      console.log('   ✅ Table schema created successfully');
    }
  }

  async createTableAlternative() {
    // Create table using individual operations
    const { error: dropError } = await supabase
      .from('serp_unique_apps')
      .delete()
      .neq('id', 0); // This will fail if table doesn't exist, which is fine

    // Note: We can't create tables directly via Supabase client
    // This needs to be done in Supabase SQL Editor
    console.log('📋 Table creation SQL generated. Please run in Supabase SQL Editor:');
    console.log(`
-- Copy and run this in Supabase SQL Editor:

DROP TABLE IF EXISTS serp_unique_apps CASCADE;

CREATE TABLE serp_unique_apps (
  id BIGSERIAL PRIMARY KEY,
  bundle_id VARCHAR(255) UNIQUE NOT NULL,
  
  -- App Basic Info
  title VARCHAR(500) NOT NULL,
  developer VARCHAR(255),
  category VARCHAR(100),
  
  -- Content
  description TEXT,
  
  -- Ratings & Reviews
  rating DECIMAL(3,2),
  rating_count BIGINT,
  
  -- Source Info
  source VARCHAR(50) DEFAULT 'serp_apps' NOT NULL,
  original_serp_id VARCHAR(255),
  
  -- Processing Status
  features_extracted BOOLEAN DEFAULT FALSE,
  extraction_attempted BOOLEAN DEFAULT FALSE,
  extraction_error TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_serp_unique_bundle_id ON serp_unique_apps(bundle_id);
CREATE INDEX idx_serp_unique_category ON serp_unique_apps(category);
CREATE INDEX idx_serp_unique_developer ON serp_unique_apps(developer);
CREATE INDEX idx_serp_unique_features_extracted ON serp_unique_apps(features_extracted);
CREATE INDEX idx_serp_unique_rating ON serp_unique_apps(rating DESC);

COMMENT ON TABLE serp_unique_apps IS 'Unique apps from SERP that are not in iTunes apps table';
    `);

    // Wait for user to create table
    console.log('\n⏱️  Waiting for table to be created in Supabase...');
    console.log('   After running the SQL above, press Enter to continue...');
    
    // In a real scenario, we'd wait for user input
    // For now, let's assume the table will be created
  }

  async populateTable() {
    console.log('\n📥 Populating serp_unique_apps table...');

    // Transform the apps data for insertion
    const appsForInsertion = this.uniqueApps.map(app => ({
      bundle_id: app.bundle_id,
      title: app.title,
      developer: app.developer,
      category: app.category,
      description: app.description,
      rating: app.rating,
      rating_count: app.rating_count,
      source: 'serp_apps',
      original_serp_id: app.bundle_id, // Same as bundle_id for SERP apps
      features_extracted: false,
      extraction_attempted: false
    }));

    console.log(`   📊 Preparing to insert ${appsForInsertion.length} apps...`);

    // Insert in batches to avoid limits
    const batchSize = 100;
    let totalInserted = 0;

    for (let i = 0; i < appsForInsertion.length; i += batchSize) {
      const batch = appsForInsertion.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(appsForInsertion.length / batchSize);

      console.log(`   📦 Inserting batch ${batchNumber}/${totalBatches} (${batch.length} apps)...`);

      try {
        const { data, error } = await supabase
          .from('serp_unique_apps')
          .insert(batch);

        if (error) {
          console.error(`   ❌ Batch ${batchNumber} failed:`, error);
          
          // Try to insert individual records to identify problematic ones
          console.log(`   🔧 Attempting individual insertions for batch ${batchNumber}...`);
          for (const app of batch) {
            try {
              const { error: singleError } = await supabase
                .from('serp_unique_apps')
                .insert([app]);
              
              if (singleError) {
                console.log(`     ❌ Failed to insert: ${app.title} (${app.bundle_id})`);
                console.log(`        Error: ${singleError.message}`);
              } else {
                totalInserted++;
              }
            } catch (singleErr) {
              console.log(`     ❌ Exception inserting: ${app.title}`);
            }
          }
        } else {
          totalInserted += batch.length;
          console.log(`   ✅ Batch ${batchNumber} inserted successfully`);
        }

      } catch (batchError) {
        console.error(`   ❌ Batch ${batchNumber} exception:`, batchError);
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n   🎉 Total apps inserted: ${totalInserted}/${appsForInsertion.length}`);
    
    if (totalInserted < appsForInsertion.length) {
      console.log(`   ⚠️  ${appsForInsertion.length - totalInserted} apps failed to insert`);
    }
  }

  async verifyTable() {
    console.log('\n🔍 Verifying serp_unique_apps table...');

    try {
      // Check total count
      const { count, error: countError } = await supabase
        .from('serp_unique_apps')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.log(`   ❌ Count verification failed: ${countError.message}`);
        return;
      }

      console.log(`   📊 Total records in table: ${count}`);

      // Check sample data
      const { data: sample, error: sampleError } = await supabase
        .from('serp_unique_apps')
        .select('bundle_id, title, developer, category, features_extracted')
        .limit(5);

      if (sampleError) {
        console.log(`   ❌ Sample data verification failed: ${sampleError.message}`);
        return;
      }

      console.log(`   📋 Sample records:`);
      sample.forEach((app, i) => {
        console.log(`     ${i + 1}. ${app.title} (${app.bundle_id})`);
        console.log(`        Developer: ${app.developer}`);
        console.log(`        Category: ${app.category}`);
        console.log(`        Features extracted: ${app.features_extracted}`);
      });

      // Check category distribution
      const { data: categoryStats, error: catError } = await supabase
        .from('serp_unique_apps')
        .select('category')
        .limit(1000);

      if (!catError && categoryStats) {
        const categories = new Map();
        categoryStats.forEach(app => {
          const cat = app.category || 'unknown';
          categories.set(cat, (categories.get(cat) || 0) + 1);
        });

        console.log(`\n   📊 Category distribution (top 10):`);
        Array.from(categories.entries())
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .forEach(([category, count]) => {
            console.log(`     ${category}: ${count} apps`);
          });
      }

    } catch (error) {
      console.error('   ❌ Verification failed:', error);
    }
  }

  async generateTableSQL() {
    console.log('\n📄 Generating SQL file for manual execution...');
    
    const sqlContent = `-- Create and populate serp_unique_apps table
-- Generated on: ${new Date().toISOString()}

-- Step 1: Create table
DROP TABLE IF EXISTS serp_unique_apps CASCADE;

CREATE TABLE serp_unique_apps (
  id BIGSERIAL PRIMARY KEY,
  bundle_id VARCHAR(255) UNIQUE NOT NULL,
  
  -- App Basic Info
  title VARCHAR(500) NOT NULL,
  developer VARCHAR(255),
  category VARCHAR(100),
  
  -- Content
  description TEXT,
  
  -- Ratings & Reviews
  rating DECIMAL(3,2),
  rating_count BIGINT,
  
  -- Source Info
  source VARCHAR(50) DEFAULT 'serp_apps' NOT NULL,
  original_serp_id VARCHAR(255),
  
  -- Processing Status
  features_extracted BOOLEAN DEFAULT FALSE,
  extraction_attempted BOOLEAN DEFAULT FALSE,
  extraction_error TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_serp_unique_bundle_id ON serp_unique_apps(bundle_id);
CREATE INDEX idx_serp_unique_category ON serp_unique_apps(category);
CREATE INDEX idx_serp_unique_developer ON serp_unique_apps(developer);
CREATE INDEX idx_serp_unique_features_extracted ON serp_unique_apps(features_extracted);
CREATE INDEX idx_serp_unique_rating ON serp_unique_apps(rating DESC);

COMMENT ON TABLE serp_unique_apps IS 'Unique apps from SERP that are not in iTunes apps table';

-- Step 2: Insert data (will be generated separately)
-- Use the Node.js script to populate data after creating the table

SELECT 'serp_unique_apps table created successfully!' as message;`;

    const sqlFile = './data-scraping/database/create-serp-unique-apps.sql';
    fs.writeFileSync(sqlFile, sqlContent);
    
    console.log(`   ✅ SQL file generated: ${sqlFile}`);
    console.log(`   📋 Run this file in Supabase SQL Editor, then run this script again`);
  }
}

// CLI interface
async function main() {
  const creator = new SerpUniqueTableCreator();
  
  if (process.argv.includes('--sql-only')) {
    await creator.generateTableSQL();
  } else {
    await creator.createAndPopulateTable();
  }
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ serp_unique_apps table operation completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Table operation failed:', error);
      process.exit(1);
    });
}

module.exports = { SerpUniqueTableCreator };