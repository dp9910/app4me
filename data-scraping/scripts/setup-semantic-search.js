/**
 * Complete setup script for semantic search system
 * Handles database setup, embedding generation, and testing
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !GEMINI_API_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_KEY');
  console.error('   - GEMINI_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function setupSemanticSearch() {
  console.log('🚀 Setting up Semantic Search System\n');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Check database connection
    await checkDatabaseConnection();
    
    // Step 2: Setup database schema
    await setupDatabase();
    
    // Step 3: Check data availability
    await checkDataAvailability();
    
    // Step 4: Check embedding status
    await checkEmbeddingStatus();
    
    // Step 5: Provide next steps
    provideNextSteps();
    
    console.log('\n✅ Semantic search setup completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

async function checkDatabaseConnection() {
  console.log('🔌 Checking database connection...');
  
  try {
    const { data, error } = await supabase
      .from('apps_unified')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
    
    console.log('✅ Database connection successful');
  } catch (error) {
    throw new Error(`Failed to connect to database: ${error.message}`);
  }
}

async function setupDatabase() {
  console.log('\n🗄️  Setting up database schema...');
  
  try {
    // Check if pgvector extension exists
    const { data: extensions } = await supabase
      .rpc('pg_available_extensions')
      .select('name')
      .eq('name', 'vector');
    
    if (!extensions || extensions.length === 0) {
      console.log('⚠️  pgvector extension not available. You may need to enable it manually.');
      console.log('   Run this in Supabase SQL Editor: CREATE EXTENSION IF NOT EXISTS vector;');
    }
    
    // Check if app_embeddings table exists
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'app_embeddings');
    
    if (error) {
      console.log('⚠️  Could not check for app_embeddings table');
    } else if (!tables || tables.length === 0) {
      console.log('📋 app_embeddings table not found');
      console.log('   You need to run the SQL setup script:');
      console.log('   Execute: data-scraping/sql/setup_embeddings.sql in Supabase SQL Editor');
    } else {
      console.log('✅ app_embeddings table exists');
    }
    
    // Check if search function exists
    const { data: functions } = await supabase
      .rpc('search_apps_by_embedding', { 
        query_embedding: new Array(768).fill(0), 
        match_count: 1 
      })
      .limit(1);
    
    if (functions) {
      console.log('✅ search_apps_by_embedding function exists');
    }
    
  } catch (error) {
    console.log('⚠️  Database schema check completed with warnings');
    console.log('   Make sure to run the SQL setup script if needed');
  }
}

async function checkDataAvailability() {
  console.log('\n📊 Checking data availability...');
  
  try {
    const { count: totalApps } = await supabase
      .from('apps_unified')
      .select('*', { count: 'exact', head: true });
    
    console.log(`✅ Total apps in database: ${totalApps || 0}`);
    
    if (!totalApps || totalApps === 0) {
      console.log('⚠️  No apps found in apps_unified table');
      console.log('   You need to run the data loading scripts first:');
      console.log('   1. Run: node data-scraping/scripts/merge_and_upload.js');
      console.log('   2. Then proceed with embedding generation');
      return false;
    }
    
    // Check data quality
    const { data: sampleApps } = await supabase
      .from('apps_unified')
      .select('name, description, primary_category')
      .not('description', 'is', null)
      .limit(5);
    
    const appsWithDescription = sampleApps?.filter(app => 
      app.description && app.description.length > 50
    ).length || 0;
    
    console.log(`✅ Apps with rich descriptions: ${appsWithDescription}/5 sample`);
    
    if (appsWithDescription < 3) {
      console.log('⚠️  Many apps lack detailed descriptions');
      console.log('   This may affect embedding quality');
    }
    
    return true;
    
  } catch (error) {
    console.log('❌ Error checking data availability:', error.message);
    return false;
  }
}

async function checkEmbeddingStatus() {
  console.log('\n🧠 Checking embedding status...');
  
  try {
    const { count: totalApps } = await supabase
      .from('apps_unified')
      .select('*', { count: 'exact', head: true });
    
    const { count: embeddedApps } = await supabase
      .from('app_embeddings')
      .select('*', { count: 'exact', head: true });
    
    const coverage = totalApps > 0 ? (embeddedApps / totalApps * 100).toFixed(1) : '0.0';
    
    console.log(`📈 Embedding coverage: ${embeddedApps || 0}/${totalApps || 0} (${coverage}%)`);
    
    if (embeddedApps === 0) {
      console.log('🔥 No embeddings found - ready for generation!');
      estimateEmbeddingCost(totalApps);
    } else if (coverage < 50) {
      console.log('⚠️  Low embedding coverage - consider regenerating');
    } else if (coverage < 90) {
      console.log('👍 Good embedding coverage - may need to fill gaps');
    } else {
      console.log('✅ Excellent embedding coverage!');
      
      // Test a quick search
      const { data: sampleEmbedding } = await supabase
        .from('app_embeddings')
        .select('embedding')
        .limit(1)
        .single();
      
      if (sampleEmbedding) {
        const { data: searchResults } = await supabase.rpc('search_apps_by_embedding', {
          query_embedding: sampleEmbedding.embedding,
          match_count: 3
        });
        
        console.log(`🔍 Search function test: ${searchResults?.length || 0} results`);
      }
    }
    
  } catch (error) {
    console.log('❌ Error checking embedding status:', error.message);
  }
}

function estimateEmbeddingCost(appCount) {
  if (!appCount || appCount === 0) return;
  
  // Gemini pricing: ~$0.00001 per 1000 characters
  // Assume average 2000 characters per app
  const avgCharsPerApp = 2000;
  const totalChars = appCount * avgCharsPerApp;
  const estimatedCost = (totalChars / 1000) * 0.00001;
  
  console.log('\n💰 Embedding Cost Estimate:');
  console.log(`   Apps to process: ${appCount.toLocaleString()}`);
  console.log(`   Estimated characters: ${totalChars.toLocaleString()}`);
  console.log(`   Estimated cost: $${estimatedCost.toFixed(3)}`);
  console.log(`   Processing time: ~${Math.ceil(appCount / 100)} minutes`);
}

function provideNextSteps() {
  console.log('\n📋 NEXT STEPS');
  console.log('='.repeat(60));
  
  console.log('1. 🗄️  Database Setup (if needed):');
  console.log('   Run in Supabase SQL Editor:');
  console.log('   Execute: data-scraping/sql/setup_embeddings.sql');
  
  console.log('\n2. 🧠 Generate Embeddings:');
  console.log('   node data-scraping/scripts/embeddings/generate-embeddings.js');
  console.log('   Options:');
  console.log('     --batch-size 50    # Process 50 apps at a time');
  console.log('     --no-skip          # Regenerate existing embeddings');
  console.log('     --start-offset 100 # Start from app #100');
  
  console.log('\n3. 🧪 Test Search Quality:');
  console.log('   node data-scraping/scripts/embeddings/test-search-quality.js');
  
  console.log('\n4. 🚀 Use in Application:');
  console.log('   API Endpoint: POST /api/search/semantic');
  console.log('   Example:');
  console.log('   {');
  console.log('     "query": "budget tracking app",');
  console.log('     "limit": 10,');
  console.log('     "threshold": 0.6');
  console.log('   }');
  
  console.log('\n5. 📊 Monitor Performance:');
  console.log('   Check search_quality_logs table for analytics');
  console.log('   Use getSearchAnalytics() function for metrics');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupSemanticSearch()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

export { setupSemanticSearch };