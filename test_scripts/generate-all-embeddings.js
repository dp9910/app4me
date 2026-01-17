/**
 * Production Embedding Generator
 * Generates embeddings for all apps with robust error handling, logging, and periodic backups
 */
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class EmbeddingGenerator {
  constructor() {
    this.processed = 0;
    this.successful = 0;
    this.failed = 0;
    this.startTime = Date.now();
    this.backupFolder = 'new_embeddings';
    this.batchSize = 100;
    this.currentBatch = [];
    this.logFile = null;
    this.setupLogging();
    this.ensureBackupFolder();
  }

  setupLogging() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFile = `embedding-generation-${timestamp}.log`;
    this.log('🚀 === PRODUCTION EMBEDDING GENERATION STARTED ===');
    this.log(`Start time: ${new Date().toISOString()}`);
    this.log(`Target: All apps in apps_unified table`);
    this.log(`Format: Natural language (title. description. Category: category)`);
    this.log(`Model: text-embedding-004`);
    this.log(`Backup frequency: Every ${this.batchSize} apps`);
    this.log('');
  }

  ensureBackupFolder() {
    if (!fs.existsSync(this.backupFolder)) {
      fs.mkdirSync(this.backupFolder, { recursive: true });
      this.log(`📁 Created backup folder: ${this.backupFolder}`);
    }
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    
    if (this.logFile) {
      fs.appendFileSync(this.logFile, logMessage + '\n');
    }
  }

  async run() {
    try {
      this.log('📊 Fetching all apps from apps_unified...');
      
      // First, get all existing embedding app_ids
      const { data: existingEmbeddings, error: embError } = await supabase
        .from('new_embeddings')
        .select('app_id');
        
      if (embError) {
        this.log(`❌ Error fetching existing embeddings: ${embError.message}`);
        // If new_embeddings table doesn't exist, process all apps
        this.log(`📋 Assuming new_embeddings table doesn't exist, processing all apps...`);
      }
      
      const existingAppIds = existingEmbeddings ? existingEmbeddings.map(e => e.app_id) : [];
      this.log(`📊 Found ${existingAppIds.length} existing embeddings`);
      
      // Get all apps
      const { data: allApps, error: fetchError } = await supabase
        .from('apps_unified')
        .select('id, title, developer, primary_category, description')
        .order('id');
        
      if (fetchError) {
        this.log(`❌ Error fetching apps: ${fetchError.message}`);
        return;
      }
      
      // Filter out apps that already have embeddings
      const appsToProcess = allApps.filter(app => !existingAppIds.includes(app.id));
      
      this.log(`✅ Found ${allApps.length} total apps, ${appsToProcess.length} need embeddings`);
      this.log(`📈 Progress will be logged every 10 apps`);
      this.log(`💾 Backups will be saved every ${this.batchSize} apps`);
      this.log('');
      
      if (appsToProcess.length === 0) {
        this.log('🎉 All apps already have embeddings!');
        return;
      }
      
      const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
      
      for (let i = 0; i < appsToProcess.length; i++) {
        const app = appsToProcess[i];
        await this.processApp(app, model, i + 1, appsToProcess.length);
        
        // Periodic progress log
        if (this.processed % 10 === 0 || i === appsToProcess.length - 1) {
          this.logProgress();
        }
        
        // Periodic backup
        if (this.processed % this.batchSize === 0 || i === appsToProcess.length - 1) {
          await this.saveBackup();
        }
        
        // Rate limiting
        await this.sleep(300); // 300ms between requests
      }
      
      this.log('');
      this.log('🎉 === EMBEDDING GENERATION COMPLETE ===');
      this.logFinalStats();
      
    } catch (error) {
      this.log(`❌ Fatal error: ${error.message}`);
      this.log(`💾 Saving emergency backup...`);
      await this.saveBackup();
    }
  }

  async processApp(app, model, index, total) {
    try {
      this.processed++;
      
      // Create natural language embedding text
      const embeddingText = this.createEmbeddingText(app);
      
      if (this.processed <= 5) {
        this.log(`[${index}/${total}] Processing: ${app.title}`);
        this.log(`  📝 Text: "${embeddingText.substring(0, 80)}..."`);
      }
      
      // Generate embedding
      const result = await model.embedContent(embeddingText);
      const embedding = result.embedding.values;
      
      // Create embedding record
      const embeddingRecord = {
        app_id: app.id,
        app_title: app.title,
        embedding: embedding, // Keep as array for backup
        embedding_text: embeddingText,
        embedding_model: 'text-embedding-004',
        format_version: 'v2_natural',
        token_count: Math.ceil(embeddingText.length / 4),
        created_at: new Date().toISOString(),
        processed_at: new Date().toISOString()
      };
      
      // Add to current batch
      this.currentBatch.push(embeddingRecord);
      
      // Try to save to database
      try {
        const { error: dbError } = await supabase
          .from('new_embeddings')
          .insert({
            app_id: app.id,
            embedding: JSON.stringify(embedding),
            embedding_text: embeddingText,
            embedding_model: 'text-embedding-004',
            format_version: 'v2_natural',
            token_count: embeddingRecord.token_count
          });
          
        if (dbError) {
          this.log(`⚠️ Database save failed for ${app.title}: ${dbError.message}`);
          // Continue processing even if DB save fails - we have backup
        }
      } catch (dbErr) {
        this.log(`⚠️ Database error for ${app.title}: ${dbErr.message}`);
      }
      
      this.successful++;
      
    } catch (error) {
      this.failed++;
      this.log(`❌ Failed to process ${app.title}: ${error.message}`);
      
      // Add failed record to batch for debugging
      this.currentBatch.push({
        app_id: app.id,
        app_title: app.title,
        error: error.message,
        failed_at: new Date().toISOString()
      });
    }
  }

  createEmbeddingText(app) {
    const title = app.title || '';
    const description = (app.description || '').replace(/\n/g, ' ').trim();
    const category = app.primary_category || 'Mobile App';
    
    // Clean up description - take first 400 chars to stay under token limits
    let cleanDescription = description;
    if (cleanDescription.length > 400) {
      const sentences = cleanDescription.split(/[.!?]+/);
      cleanDescription = sentences[0] + (sentences[0].endsWith('.') ? '' : '.');
      if (cleanDescription.length > 400) {
        cleanDescription = cleanDescription.substring(0, 400) + '.';
      }
    }
    
    // Create natural language format
    const embeddingText = `${title}. ${cleanDescription} Category: ${category}`.slice(0, 1000);
    
    return embeddingText;
  }

  logProgress() {
    const elapsed = Date.now() - this.startTime;
    const rate = this.processed / (elapsed / 1000 / 60); // per minute
    const successRate = ((this.successful / this.processed) * 100).toFixed(1);
    
    this.log(`📊 Progress: ${this.processed} processed | ${this.successful} success | ${this.failed} failed | ${successRate}% success rate | ${rate.toFixed(1)}/min`);
  }

  async saveBackup() {
    if (this.currentBatch.length === 0) return;
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `embeddings-batch-${this.processed}-${timestamp}.json`;
      const filepath = path.join(this.backupFolder, filename);
      
      const backupData = {
        timestamp: new Date().toISOString(),
        batch_number: Math.ceil(this.processed / this.batchSize),
        total_processed: this.processed,
        successful: this.successful,
        failed: this.failed,
        batch_size: this.currentBatch.length,
        format_version: 'v2_natural',
        model_used: 'text-embedding-004',
        embeddings: this.currentBatch
      };
      
      fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));
      this.log(`💾 Backup saved: ${filename} (${this.currentBatch.length} records)`);
      
      // Clear current batch
      this.currentBatch = [];
      
    } catch (error) {
      this.log(`❌ Backup save failed: ${error.message}`);
    }
  }

  logFinalStats() {
    const elapsed = Date.now() - this.startTime;
    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
    
    this.log(`📊 Final Statistics:`);
    this.log(`   Total processed: ${this.processed}`);
    this.log(`   Successful: ${this.successful}`);
    this.log(`   Failed: ${this.failed}`);
    this.log(`   Success rate: ${((this.successful / this.processed) * 100).toFixed(1)}%`);
    this.log(`   Total time: ${hours}h ${minutes}m ${seconds}s`);
    this.log(`   Average rate: ${(this.processed / (elapsed / 1000 / 60)).toFixed(1)} apps/minute`);
    
    if (this.failed > 0) {
      this.log(`⚠️ ${this.failed} apps failed - check backup files for details`);
    }
    
    this.log(`📁 Backup files saved in: ${this.backupFolder}/`);
    this.log(`📋 Log file: ${this.logFile}`);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⚠️ Received interrupt signal. Saving current progress...');
  if (global.generator) {
    await global.generator.saveBackup();
    global.generator.log('⚠️ Process interrupted by user. Progress saved.');
  }
  process.exit(0);
});

// Run the generator
if (require.main === module) {
  const generator = new EmbeddingGenerator();
  global.generator = generator; // For cleanup on interrupt
  generator.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = EmbeddingGenerator;