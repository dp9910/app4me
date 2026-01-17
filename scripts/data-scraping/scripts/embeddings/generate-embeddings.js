/**
 * Batch embedding generation script for semantic search
 * Processes all apps in the database and generates vector embeddings using Gemini
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { createEmbeddingText, validateEmbeddingText } from './create-embedding-text.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - GEMINI_API_KEY');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Configuration
const BATCH_SIZE = 50; // Process 50 apps at a time
const RATE_LIMIT_DELAY = 200; // ms between requests
const MAX_RETRIES = 3;
const CHECKPOINT_FREQUENCY = 100; // Save progress every 100 apps

// Progress tracking
let stats = {
  processed: 0,
  errors: 0,
  skipped: 0,
  total: 0,
  startTime: Date.now(),
  lastCheckpoint: 0
};

export async function generateAllEmbeddings(options = {}) {
  const {
    skipExisting = true,
    batchSize = BATCH_SIZE,
    startOffset = 0
  } = options;
  
  console.log('🚀 Starting embedding generation for all apps...\n');
  console.log('Configuration:');
  console.log(`   Batch size: ${batchSize}`);
  console.log(`   Rate limit delay: ${RATE_LIMIT_DELAY}ms`);
  console.log(`   Skip existing: ${skipExisting}`);
  console.log(`   Start offset: ${startOffset}\n`);
  
  // Get total count from apps_unified
  const { count, error: countError } = await supabase
    .from('apps_unified')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.error('❌ Error getting app count:', countError);
    return;
  }
  
  stats.total = count;
  console.log(`📊 Total apps in database: ${count}\n`);
  
  // Check embedding coverage
  const coverage = await getEmbeddingCoverage();
  console.log(`📈 Current embedding coverage: ${coverage.embedded}/${coverage.total} (${coverage.percentage}%)\n`);
  
  const embeddingModel = genAI.getGenerativeModel({
    model: 'text-embedding-004'
  });
  
  // Process in batches
  for (let offset = startOffset; offset < count; offset += batchSize) {
    console.log(`\n📦 Processing batch ${Math.floor(offset/batchSize) + 1}/${Math.ceil(count/batchSize)} (apps ${offset + 1}-${Math.min(offset + batchSize, count)})...`);
    
    try {
      // Get batch of apps from apps_unified (rich data source)
      const { data: apps, error: fetchError } = await supabase
        .from('apps_unified')
        .select(`
          id, 
          title, 
          primary_category, 
          description, 
          developer,
          rating,
          rating_count,
          formatted_price,
          icon_url
        `)
        .range(offset, offset + batchSize - 1)
        .order('id', { ascending: true });
      
      if (fetchError) {
        console.error('❌ Error fetching apps:', fetchError);
        stats.errors += batchSize;
        continue;
      }
      
      if (!apps || apps.length === 0) {
        console.log('   ℹ️  No more apps to process');
        break;
      }
      
      // Process each app in the batch
      for (const app of apps) {
        await processApp(app, embeddingModel, skipExisting);
        
        // Checkpoint progress
        if (stats.processed > 0 && stats.processed % CHECKPOINT_FREQUENCY === 0) {
          await saveCheckpoint();
        }
      }
      
      // Log batch progress
      const progress = ((offset + apps.length) / count * 100).toFixed(1);
      const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(0);
      const rate = (stats.processed / (elapsed / 60)).toFixed(1);
      
      console.log(`   ✅ Batch complete: ${progress}% | ${stats.processed} processed | ${rate} apps/min`);
      
    } catch (error) {
      console.error(`❌ Batch error:`, error.message);
      stats.errors += batchSize;
    }
  }
  
  // Final summary
  await printFinalSummary();
  
  // Verify index is working
  await verifyIndex();
}

async function processApp(app, embeddingModel, skipExisting = true) {
  try {
    // Check if embedding already exists
    if (skipExisting) {
      const { data: existing } = await supabase
        .from('app_embeddings')
        .select('id')
        .eq('app_id', app.id)
        .single();
      
      if (existing) {
        stats.skipped++;
        return; // Skip if already embedded
      }
    }
    
    // Create rich text for embedding
    const embeddingText = createEmbeddingText(app);
    
    // Validate text
    const validation = validateEmbeddingText(embeddingText);
    if (!validation.isValid) {
      console.log(`   ⚠️  Skipping ${app.name} - ${validation.reason}`);
      stats.skipped++;
      return;
    }
    
    // Generate embedding with retry logic
    let embedding = null;
    let attempt = 0;
    
    while (attempt < MAX_RETRIES && !embedding) {
      try {
        const result = await embeddingModel.embedContent(embeddingText);
        embedding = result.embedding.values;
        
        // Verify embedding is correct size
        if (embedding.length !== 768) {
          throw new Error(`Invalid embedding size: ${embedding.length}, expected 768`);
        }
        
        break; // Success
      } catch (error) {
        attempt++;
        console.log(`   ⚠️  Attempt ${attempt}/${MAX_RETRIES} failed for ${app.name}: ${error.message}`);
        
        if (attempt < MAX_RETRIES) {
          // Wait longer for rate limit errors
          const delay = error.message.includes('429') ? 5000 : RATE_LIMIT_DELAY * attempt;
          await sleep(delay);
        }
      }
    }
    
    if (!embedding) {
      throw new Error(`Failed to generate embedding after ${MAX_RETRIES} attempts`);
    }
    
    // Store in database
    const { error: insertError } = await supabase
      .from('app_embeddings')
      .insert({
        app_id: app.id,
        embedding: embedding,
        embedding_model: 'text-embedding-004',
        text_used: embeddingText.substring(0, 500), // Store sample for debugging
        token_count: Math.ceil(embeddingText.length / 4), // Rough estimate
        created_at: new Date().toISOString()
      });
    
    if (insertError) {
      throw insertError;
    }
    
    stats.processed++;
    
    // Progress indicator
    if (stats.processed % 10 === 0) {
      process.stdout.write('.');
    }
    
    // Rate limiting
    await sleep(RATE_LIMIT_DELAY);
    
  } catch (error) {
    stats.errors++;
    console.error(`   ❌ Error processing ${app.name}: ${error.message}`);
  }
}

async function getEmbeddingCoverage() {
  const { count: total } = await supabase
    .from('apps_unified')
    .select('*', { count: 'exact', head: true });
  
  const { count: embedded } = await supabase
    .from('app_embeddings')
    .select('*', { count: 'exact', head: true });
  
  return {
    total: total || 0,
    embedded: embedded || 0,
    percentage: total > 0 ? ((embedded || 0) / total * 100).toFixed(1) : '0.0'
  };
}

async function saveCheckpoint() {
  const checkpointData = {
    ...stats,
    timestamp: new Date().toISOString(),
    coverage: await getEmbeddingCoverage()
  };
  
  const checkpointFile = path.join(__dirname, 'embedding-checkpoint.json');
  fs.writeFileSync(checkpointFile, JSON.stringify(checkpointData, null, 2));
  
  console.log(`\n   💾 Checkpoint saved: ${stats.processed} processed, ${stats.errors} errors, ${stats.skipped} skipped`);
}

async function printFinalSummary() {
  const duration = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(1);
  const rate = duration > 0 ? (stats.processed / duration).toFixed(1) : '0';
  const coverage = await getEmbeddingCoverage();
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 EMBEDDING GENERATION COMPLETE!');
  console.log('='.repeat(60));
  console.log(`✅ Successfully processed: ${stats.processed}`);
  console.log(`⏭️  Skipped (already exists): ${stats.skipped}`);
  console.log(`❌ Errors: ${stats.errors}`);
  console.log(`📊 Total apps: ${stats.total}`);
  console.log(`⏱️  Duration: ${duration} minutes`);
  console.log(`🏃 Rate: ${rate} apps/minute`);
  console.log(`📈 Final coverage: ${coverage.embedded}/${coverage.total} (${coverage.percentage}%)`);
  console.log('='.repeat(60) + '\n');
  
  // Estimate cost
  const avgTokensPerApp = 500; // Conservative estimate
  const totalTokens = stats.processed * avgTokensPerApp;
  const estimatedCost = (totalTokens / 1000) * 0.00001; // Gemini pricing
  console.log(`💰 Estimated cost: $${estimatedCost.toFixed(3)} (${totalTokens.toLocaleString()} tokens)`);
}

async function verifyIndex() {
  console.log('\n🔍 Verifying vector index...');
  
  try {
    const { data: sample } = await supabase
      .from('app_embeddings')
      .select('embedding, app_id')
      .limit(1)
      .single();
    
    if (sample) {
      // Test search with sample embedding
      const { data: results, error } = await supabase.rpc('search_apps_by_embedding', {
        query_embedding: sample.embedding,
        match_threshold: 0.7,
        match_count: 5
      });
      
      if (error) {
        console.error('❌ Index verification failed:', error);
      } else {
        console.log(`✅ Index working! Found ${results.length} similar apps`);
        if (results.length > 0) {
          console.log(`   Top result: ${results[0].app_name} (similarity: ${results[0].similarity.toFixed(3)})`);
        }
      }
    } else {
      console.log('⚠️  No embeddings found to test index');
    }
  } catch (error) {
    console.error('❌ Index verification error:', error);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--no-skip':
        options.skipExisting = false;
        break;
      case '--batch-size':
        options.batchSize = parseInt(args[++i]) || BATCH_SIZE;
        break;
      case '--start-offset':
        options.startOffset = parseInt(args[++i]) || 0;
        break;
      case '--help':
        console.log(`
Usage: node generate-embeddings.js [options]

Options:
  --no-skip         Don't skip apps that already have embeddings
  --batch-size N    Process N apps at a time (default: ${BATCH_SIZE})
  --start-offset N  Start processing from app N (default: 0)
  --help           Show this help message

Examples:
  node generate-embeddings.js
  node generate-embeddings.js --batch-size 100
  node generate-embeddings.js --start-offset 1000 --no-skip
        `);
        process.exit(0);
    }
  }
  
  await generateAllEmbeddings(options);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}
