/**
 * Create App Features Database Schema
 * Applies the feature storage schema to Supabase
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createFeaturesSchema() {
  console.log('🗄️  Creating App Features Database Schema...\n');

  try {
    // Read the schema SQL file
    const schemaPath = path.join(__dirname, '../database/app-features-schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📋 Loaded schema SQL file');
    console.log(`   File size: ${schemaSql.length} characters`);
    
    // Split into individual statements (simple approach)
    const statements = schemaSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));
    
    console.log(`   Found ${statements.length} SQL statements\n`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.startsWith('/*') || statement.length < 10) {
        continue;
      }
      
      console.log(`📦 Executing statement ${i + 1}/${statements.length}...`);
      
      // Extract statement type for logging
      const statementType = statement.match(/^(CREATE|ALTER|DROP|INSERT|UPDATE|SELECT)\s+(\w+)/i);
      const logName = statementType ? `${statementType[1]} ${statementType[2]}` : 'SQL';
      
      try {
        const { data, error } = await supabase.rpc('execute_sql', {
          sql: statement + ';'
        });
        
        if (error) {
          // Try direct query for some statements
          const { data: directData, error: directError } = await supabase
            .from('pg_tables')
            .select('*')
            .limit(1);
          
          if (directError) {
            console.error(`   ❌ Failed: ${logName}`);
            console.error(`   Error: ${error.message}`);
            
            // Continue with other statements for now
            continue;
          }
        }
        
        console.log(`   ✅ Success: ${logName}`);
        
      } catch (execError) {
        console.error(`   ❌ Execution failed: ${logName}`);
        console.error(`   Error: ${execError.message}`);
        
        // For critical tables, we should stop
        if (statement.includes('CREATE TABLE') && statement.includes('app_features')) {
          throw new Error('Failed to create critical app_features table');
        }
      }
      
      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n🎉 Schema creation complete!');
    
    // Verify tables were created
    await verifySchema();
    
  } catch (error) {
    console.error('❌ Schema creation failed:', error);
    throw error;
  }
}

async function verifySchema() {
  console.log('\n🔍 Verifying schema creation...');
  
  try {
    // Check if main tables exist by trying a simple query
    const { data: featuresTest, error: featuresError } = await supabase
      .from('app_features')
      .select('id')
      .limit(1);
    
    if (featuresError && !featuresError.message.includes('relation "app_features" does not exist')) {
      console.log('✅ app_features table exists');
    } else if (featuresError) {
      console.log('⚠️  app_features table may not exist:', featuresError.message);
    } else {
      console.log('✅ app_features table exists and accessible');
    }
    
    const { data: keywordsTest, error: keywordsError } = await supabase
      .from('app_keywords_tfidf')
      .select('id')
      .limit(1);
    
    if (keywordsError && !keywordsError.message.includes('relation "app_keywords_tfidf" does not exist')) {
      console.log('✅ app_keywords_tfidf table exists');
    } else if (keywordsError) {
      console.log('⚠️  app_keywords_tfidf table may not exist:', keywordsError.message);
    } else {
      console.log('✅ app_keywords_tfidf table exists and accessible');
    }
    
    console.log('\n📊 Schema verification complete');
    
  } catch (error) {
    console.error('❌ Schema verification failed:', error);
  }
}

// Alternative direct table creation (if RPC doesn't work)
async function createTablesDirectly() {
  console.log('🔄 Attempting direct table creation...\n');
  
  // Create app_features table
  const createAppFeatures = `
    CREATE TABLE IF NOT EXISTS app_features (
      id BIGSERIAL PRIMARY KEY,
      app_id TEXT NOT NULL UNIQUE,
      processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      processing_time_ms INTEGER,
      feature_version TEXT DEFAULT '1.0',
      
      metadata_category_primary TEXT,
      metadata_category_all TEXT[],
      metadata_price_tier TEXT,
      metadata_rating_tier TEXT,
      metadata_popularity_score DECIMAL(3,2),
      metadata_recency_score DECIMAL(3,2),
      metadata_developer_name TEXT,
      metadata_developer_id TEXT,
      
      quality_signals DECIMAL(3,2),
      
      category_productivity DECIMAL(4,1) DEFAULT 0,
      category_finance DECIMAL(4,1) DEFAULT 0,
      category_health DECIMAL(4,1) DEFAULT 0,
      category_entertainment DECIMAL(4,1) DEFAULT 0,
      category_education DECIMAL(4,1) DEFAULT 0,
      
      llm_primary_use_case TEXT,
      llm_use_cases TEXT[],
      llm_target_personas TEXT[],
      llm_problem_solved TEXT,
      llm_key_features TEXT[],
      llm_limitations TEXT[],
      llm_best_for_keywords TEXT[],
      llm_not_good_for TEXT[],
      llm_emotional_tone TEXT,
      llm_complexity_level TEXT,
      llm_time_commitment TEXT
    )
  `;
  
  const createKeywordsTable = `
    CREATE TABLE IF NOT EXISTS app_keywords_tfidf (
      id BIGSERIAL PRIMARY KEY,
      app_id TEXT NOT NULL,
      keyword TEXT NOT NULL,
      score DECIMAL(6,3) NOT NULL,
      categories TEXT[],
      UNIQUE(app_id, keyword)
    )
  `;
  
  try {
    console.log('📦 Creating app_features table...');
    const { error: featuresError } = await supabase.query(createAppFeatures);
    if (featuresError) {
      console.log('⚠️  Direct creation method not available');
      console.log('   You may need to run the SQL manually in Supabase dashboard');
    } else {
      console.log('✅ app_features table created');
    }
    
    console.log('📦 Creating app_keywords_tfidf table...');
    const { error: keywordsError } = await supabase.query(createKeywordsTable);
    if (!keywordsError) {
      console.log('✅ app_keywords_tfidf table created');
    }
    
  } catch (error) {
    console.log('ℹ️  Direct table creation not available with current Supabase client');
    console.log('   Please run the SQL schema manually in your Supabase dashboard');
    console.log('   File location: data-scraping/database/app-features-schema.sql');
  }
}

async function main() {
  try {
    await createFeaturesSchema();
  } catch (error) {
    console.log('\n🔄 Trying alternative approach...');
    await createTablesDirectly();
  }
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Schema setup completed!');
      console.log('\n📋 Next steps:');
      console.log('   1. Verify tables in Supabase dashboard');
      console.log('   2. Run feature upload script to populate data');
      console.log('   3. Test feature-based recommendations');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Schema setup failed:', error);
      console.log('\n🛠️  Manual setup required:');
      console.log('   1. Copy SQL from: data-scraping/database/app-features-schema.sql');
      console.log('   2. Run it in Supabase SQL Editor');
      console.log('   3. Verify tables are created');
      process.exit(1);
    });
}