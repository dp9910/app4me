/**
 * STANDALONE MASSIVE APP SCRAPER
 * 
 * Features:
 * - Checkpoint/Resume functionality
 * - Individual JSON files per category/feed  
 * - Error handling with continuation
 * - Progress tracking and recovery
 * - Standalone - only scrapes and saves, no database operations
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Comprehensive app categories for maximum coverage
const APP_CATEGORIES = [
  'productivity', 'business', 'finance', 'utilities', 'office',
  'games', 'entertainment', 'music', 'video', 'streaming', 'movies',
  'social media', 'messaging', 'dating', 'networking', 'communication',
  'health', 'fitness', 'food', 'travel', 'lifestyle', 'wellness',
  'photo', 'education', 'books', 'design', 'art', 'creativity',
  'shopping', 'delivery', 'transportation', 'weather', 'news',
  'developer tools', 'reference', 'navigation'
];

const RSS_FEEDS = [
  {
    name: 'top_free',
    url: 'https://itunes.apple.com/us/rss/topfreeapplications/limit=25/json',
    description: 'Top 25 Free iPhone Apps'
  },
  {
    name: 'top_paid', 
    url: 'https://itunes.apple.com/us/rss/toppaidapplications/limit=25/json',
    description: 'Top 25 Paid iPhone Apps'
  },
  {
    name: 'new_apps',
    url: 'https://itunes.apple.com/us/rss/newapplications/limit=25/json', 
    description: 'Top 25 New iPhone Apps'
  },
  {
    name: 'top_grossing',
    url: 'https://itunes.apple.com/us/rss/topgrossingapplications/limit=25/json',
    description: 'Top 25 Grossing iPhone Apps'
  }
];

class StandaloneScraper {
  constructor() {
    this.dataDir = './scraped_data';
    this.checkpointFile = path.join(this.dataDir, 'scraping_progress.json');
    this.progressFile = path.join(this.dataDir, 'scraping_stats.json');
    
    this.progress = {
      startTime: new Date().toISOString(),
      iTunes: { completed: [], failed: [], total: APP_CATEGORIES.length },
      appleRSS: { completed: [], failed: [], total: RSS_FEEDS.length },
      serp: { completed: [], failed: [], total: APP_CATEGORIES.length },
      lastSaved: new Date().toISOString()
    };
    
    this.stats = {
      iTunes: { attempts: 0, successes: 0, failures: 0, totalApps: 0 },
      appleRSS: { attempts: 0, successes: 0, failures: 0, totalApps: 0 },
      serp: { attempts: 0, successes: 0, failures: 0, totalApps: 0 },
      errors: []
    };
    
    this.ensureDirectories();
    this.loadProgress();
  }

  ensureDirectories() {
    const dirs = [
      this.dataDir,
      path.join(this.dataDir, 'itunes'),
      path.join(this.dataDir, 'apple_rss'), 
      path.join(this.dataDir, 'serp')
    ];
    
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    });
  }

  loadProgress() {
    if (fs.existsSync(this.checkpointFile)) {
      try {
        const saved = JSON.parse(fs.readFileSync(this.checkpointFile, 'utf8'));
        this.progress = { ...this.progress, ...saved };
        console.log('🔄 Loaded previous progress:');
        console.log(`   iTunes: ${this.progress.iTunes.completed.length}/${this.progress.iTunes.total} completed`);
        console.log(`   Apple RSS: ${this.progress.appleRSS.completed.length}/${this.progress.appleRSS.total} completed`);
        console.log(`   SERP: ${this.progress.serp.completed.length}/${this.progress.serp.total} completed`);
      } catch (error) {
        console.log('⚠️ Could not load previous progress, starting fresh');
      }
    } else {
      console.log('🆕 Starting fresh scraping session');
    }
  }

  saveProgress() {
    this.progress.lastSaved = new Date().toISOString();
    fs.writeFileSync(this.checkpointFile, JSON.stringify(this.progress, null, 2));
    fs.writeFileSync(this.progressFile, JSON.stringify(this.stats, null, 2));
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isAlreadyScraped(source, identifier) {
    return this.progress[source].completed.includes(identifier);
  }

  markCompleted(source, identifier) {
    if (!this.progress[source].completed.includes(identifier)) {
      this.progress[source].completed.push(identifier);
    }
    this.saveProgress();
  }

  markFailed(source, identifier, error) {
    if (!this.progress[source].failed.includes(identifier)) {
      this.progress[source].failed.push(identifier);
    }
    this.stats.errors.push({ source, identifier, error, timestamp: new Date().toISOString() });
    this.saveProgress();
  }

  async scrapeItunesCategory(category) {
    const safeCategory = category.replace(/[^a-z0-9]/gi, '_');
    const filename = path.join(this.dataDir, 'itunes', `${safeCategory}.json`);
    
    // Skip if already completed
    if (this.isAlreadyScraped('iTunes', category)) {
      console.log(`⏭️  iTunes ${category}: Already scraped, skipping`);
      return { success: true, skipped: true };
    }
    
    console.log(`📱 Scraping iTunes: ${category}`);
    this.stats.iTunes.attempts++;
    
    try {
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(category)}&country=US&entity=software&limit=200`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`iTunes API returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const apps = data.results || [];
      
      // Process and save immediately
      const scrapedData = {
        metadata: {
          source: 'itunes',
          category: category,
          scraped_at: new Date().toISOString(),
          total_apps: apps.length,
          query_url: url,
          api_response_time: new Date().toISOString()
        },
        apps: apps.map(app => ({
          source: 'itunes',
          category: category,
          bundle_id: app.bundleId,
          title: app.trackName,
          developer: app.artistName,
          developer_id: app.artistId,
          version: app.version,
          price: app.price,
          formatted_price: app.formattedPrice,
          currency: app.currency,
          rating: app.averageUserRating,
          rating_count: app.userRatingCount,
          icon_url: app.artworkUrl100,
          description: app.description,
          release_date: app.releaseDate,
          age_rating: app.trackContentRating,
          genres: app.genres,
          primary_genre: app.primaryGenreName,
          size_bytes: app.fileSizeBytes,
          scraped_at: new Date().toISOString(),
          raw_data: app
        }))
      };
      
      // Save to individual JSON file
      fs.writeFileSync(filename, JSON.stringify(scrapedData, null, 2));
      
      console.log(`✅ iTunes ${category}: ${apps.length} apps saved to ${filename}`);
      
      this.stats.iTunes.successes++;
      this.stats.iTunes.totalApps += apps.length;
      this.markCompleted('iTunes', category);
      
      return { success: true, count: apps.length };
      
    } catch (error) {
      console.error(`❌ iTunes ${category} failed:`, error.message);
      this.stats.iTunes.failures++;
      this.markFailed('iTunes', category, error.message);
      
      // Save partial data if any was collected
      const partialData = {
        metadata: {
          source: 'itunes',
          category: category,
          scraped_at: new Date().toISOString(),
          status: 'failed',
          error: error.message
        },
        apps: []
      };
      fs.writeFileSync(filename.replace('.json', '_failed.json'), JSON.stringify(partialData, null, 2));
      
      return { success: false, error: error.message };
    }
  }

  async scrapeAppleRSSFeed(feed) {
    const filename = path.join(this.dataDir, 'apple_rss', `${feed.name}.json`);
    
    // Skip if already completed
    if (this.isAlreadyScraped('appleRSS', feed.name)) {
      console.log(`⏭️  Apple RSS ${feed.name}: Already scraped, skipping`);
      return { success: true, skipped: true };
    }
    
    console.log(`🍎 Scraping Apple RSS: ${feed.description}`);
    this.stats.appleRSS.attempts++;
    
    try {
      const response = await fetch(feed.url);
      
      if (!response.ok) {
        throw new Error(`Apple RSS returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const entries = data.feed?.entry || [];
      
      // Process and save immediately
      const scrapedData = {
        metadata: {
          source: 'apple_rss',
          feed_type: feed.name,
          feed_url: feed.url,
          description: feed.description,
          scraped_at: new Date().toISOString(),
          total_apps: entries.length
        },
        apps: entries.map((app, index) => ({
          source: 'apple_rss',
          feed_type: feed.name,
          bundle_id: app['im:bundleId']?.label || app.id?.attributes?.['im:id'] || `rss_${feed.name}_${index}`,
          title: app['im:name']?.label || app.title?.label || '',
          developer: app['im:artist']?.label || '',
          icon_url: app['im:image']?.[2]?.label || app['im:image']?.[1]?.label || '',
          category: app.category?.attributes?.term || '',
          release_date: app['im:releaseDate']?.attributes?.label || null,
          age_rating: app['im:contentType']?.attributes?.term || '',
          description: app.summary?.label || '',
          formatted_price: app['im:price']?.label || 'Free',
          rank: index + 1,
          scraped_at: new Date().toISOString(),
          raw_data: app
        }))
      };
      
      // Save to individual JSON file
      fs.writeFileSync(filename, JSON.stringify(scrapedData, null, 2));
      
      console.log(`✅ Apple RSS ${feed.name}: ${entries.length} apps saved to ${filename}`);
      
      this.stats.appleRSS.successes++;
      this.stats.appleRSS.totalApps += entries.length;
      this.markCompleted('appleRSS', feed.name);
      
      return { success: true, count: entries.length };
      
    } catch (error) {
      console.error(`❌ Apple RSS ${feed.name} failed:`, error.message);
      this.stats.appleRSS.failures++;
      this.markFailed('appleRSS', feed.name, error.message);
      
      // Save partial data
      const partialData = {
        metadata: {
          source: 'apple_rss',
          feed_type: feed.name,
          scraped_at: new Date().toISOString(),
          status: 'failed',
          error: error.message
        },
        apps: []
      };
      fs.writeFileSync(filename.replace('.json', '_failed.json'), JSON.stringify(partialData, null, 2));
      
      return { success: false, error: error.message };
    }
  }

  async scrapeSerpCategory(category) {
    const safeCategory = category.replace(/[^a-z0-9]/gi, '_');
    const filename = path.join(this.dataDir, 'serp', `${safeCategory}.json`);
    
    // Skip if already completed
    if (this.isAlreadyScraped('serp', category)) {
      console.log(`⏭️  SERP ${category}: Already scraped, skipping`);
      return { success: true, skipped: true };
    }
    
    const serpApiKey = process.env.SERPAPI_KEY;
    if (!serpApiKey) {
      console.log(`⚠️ SERP API key not found, skipping ${category}`);
      this.markFailed('serp', category, 'No SERP API key');
      return { success: false, error: 'No SERP API key' };
    }
    
    console.log(`🔍 Scraping SERP: ${category}`);
    this.stats.serp.attempts++;
    
    try {
      const url = `https://serpapi.com/search.json?engine=apple_app_store&term=${encodeURIComponent(category)}&api_key=${serpApiKey}&num=100`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`SERP API returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const apps = data.organic_results || [];
      
      // Process and save immediately
      const scrapedData = {
        metadata: {
          source: 'serp',
          category: category,
          scraped_at: new Date().toISOString(),
          total_apps: apps.length,
          query_url: url
        },
        apps: apps.map((app, index) => ({
          source: 'serp',
          category: category,
          bundle_id: app.product_id || `serp_${safeCategory}_${index}`,
          title: app.title || '',
          developer: app.developer?.name || '',
          version: app.version || '',
          price_value: app.price?.value || 0,
          price: app.price?.extracted_value || app.price?.value || '0',
          formatted_price: app.price?.currency ? `${app.price.currency} ${app.price.value || 0}` : '',
          rating: app.rating?.[0]?.rating || null,
          rating_count: app.rating?.[0]?.count || null,
          icon_url: app.logos?.find(logo => logo.size === '100x100')?.link || '',
          icon_url_60: app.logos?.find(logo => logo.size === '60x60')?.link || '',
          icon_url_512: app.logos?.find(logo => logo.size === '512x512')?.link || '',
          all_logos: app.logos || [],
          description: app.description || '',
          primary_genre: app.genre || '',
          position: app.position || index + 1,
          scraped_at: new Date().toISOString(),
          raw_data: app
        }))
      };
      
      // Save to individual JSON file
      fs.writeFileSync(filename, JSON.stringify(scrapedData, null, 2));
      
      console.log(`✅ SERP ${category}: ${apps.length} apps saved to ${filename}`);
      
      this.stats.serp.successes++;
      this.stats.serp.totalApps += apps.length;
      this.markCompleted('serp', category);
      
      return { success: true, count: apps.length };
      
    } catch (error) {
      console.error(`❌ SERP ${category} failed:`, error.message);
      this.stats.serp.failures++;
      this.markFailed('serp', category, error.message);
      
      // Save partial data
      const partialData = {
        metadata: {
          source: 'serp',
          category: category,
          scraped_at: new Date().toISOString(),
          status: 'failed',
          error: error.message
        },
        apps: []
      };
      fs.writeFileSync(filename.replace('.json', '_failed.json'), JSON.stringify(partialData, null, 2));
      
      return { success: false, error: error.message };
    }
  }

  getRemainingWork() {
    const remainingItunes = APP_CATEGORIES.filter(cat => !this.isAlreadyScraped('iTunes', cat));
    const remainingRSS = RSS_FEEDS.filter(feed => !this.isAlreadyScraped('appleRSS', feed.name));
    const remainingSerp = APP_CATEGORIES.filter(cat => !this.isAlreadyScraped('serp', cat));
    
    return {
      iTunes: remainingItunes,
      appleRSS: remainingRSS,
      serp: remainingSerp,
      total: remainingItunes.length + remainingRSS.length + remainingSerp.length
    };
  }

  displayProgress() {
    const remaining = this.getRemainingWork();
    
    console.log('\n📊 SCRAPING PROGRESS');
    console.log('='.repeat(50));
    console.log(`📱 iTunes: ${this.progress.iTunes.completed.length}/${this.progress.iTunes.total} completed (${remaining.iTunes.length} remaining)`);
    console.log(`🍎 Apple RSS: ${this.progress.appleRSS.completed.length}/${this.progress.appleRSS.total} completed (${remaining.appleRSS.length} remaining)`);
    console.log(`🔍 SERP: ${this.progress.serp.completed.length}/${this.progress.serp.total} completed (${remaining.serp.length} remaining)`);
    console.log(`📊 Total remaining: ${remaining.total} tasks\n`);
    
    if (remaining.total === 0) {
      console.log('🎉 ALL SCRAPING COMPLETED!');
      return true;
    }
    
    return false;
  }

  async runStandaloneScraping() {
    console.log('🚀 Starting Standalone App Data Scraping...');
    console.log(`📊 Categories: ${APP_CATEGORIES.length} iTunes + ${RSS_FEEDS.length} RSS + ${APP_CATEGORIES.length} SERP`);
    
    const allCompleted = this.displayProgress();
    if (allCompleted) {
      this.generateFinalReport();
      return;
    }
    
    const remaining = this.getRemainingWork();
    
    try {
      // Phase 1: iTunes (remaining categories only)
      if (remaining.iTunes.length > 0) {
        console.log('\n📱 PHASE 1: iTunes Search API Scraping');
        console.log('='.repeat(50));
        
        for (const category of remaining.iTunes) {
          await this.scrapeItunesCategory(category);
          await this.delay(1000); // Rate limiting
        }
        
        console.log(`\n📱 iTunes Phase: ${this.stats.iTunes.successes} successful, ${this.stats.iTunes.failures} failed`);
      } else {
        console.log('\n📱 iTunes scraping already completed, skipping...');
      }
      
      // Phase 2: Apple RSS (remaining feeds only)
      if (remaining.appleRSS.length > 0) {
        console.log('\n🍎 PHASE 2: Apple RSS Feeds Scraping');
        console.log('='.repeat(50));
        
        for (const feed of remaining.appleRSS) {
          await this.scrapeAppleRSSFeed(feed);
          await this.delay(2000); // Rate limiting
        }
        
        console.log(`\n🍎 Apple RSS Phase: ${this.stats.appleRSS.successes} successful, ${this.stats.appleRSS.failures} failed`);
      } else {
        console.log('\n🍎 Apple RSS scraping already completed, skipping...');
      }
      
      // Phase 3: SERP (remaining categories only)
      if (remaining.serp.length > 0) {
        console.log('\n🔍 PHASE 3: SERP API Scraping');
        console.log('='.repeat(50));
        
        for (const category of remaining.serp) {
          await this.scrapeSerpCategory(category);
          await this.delay(3000); // Rate limiting for SERP
        }
        
        console.log(`\n🔍 SERP Phase: ${this.stats.serp.successes} successful, ${this.stats.serp.failures} failed`);
      } else {
        console.log('\n🔍 SERP scraping already completed, skipping...');
      }
      
    } catch (error) {
      console.error('\n💥 Scraping interrupted:', error.message);
      console.log('💾 Progress saved. Run the script again to continue from where it left off.');
      this.saveProgress();
      return;
    }
    
    this.generateFinalReport();
  }

  generateFinalReport() {
    const endTime = new Date();
    const duration = (endTime - new Date(this.progress.startTime)) / 1000 / 60;
    
    console.log('\n🎉 STANDALONE SCRAPING COMPLETED!');
    console.log('='.repeat(60));
    console.log(`⏱️  Duration: ${duration.toFixed(1)} minutes`);
    console.log(`📱 iTunes: ${this.stats.iTunes.successes}/${APP_CATEGORIES.length} categories (${this.stats.iTunes.totalApps} apps)`);
    console.log(`🍎 Apple RSS: ${this.stats.appleRSS.successes}/${RSS_FEEDS.length} feeds (${this.stats.appleRSS.totalApps} apps)`);
    console.log(`🔍 SERP: ${this.stats.serp.successes}/${APP_CATEGORIES.length} categories (${this.stats.serp.totalApps} apps)`);
    console.log(`📊 Total Apps Scraped: ${this.stats.iTunes.totalApps + this.stats.appleRSS.totalApps + this.stats.serp.totalApps}`);
    
    if (this.stats.errors.length > 0) {
      console.log(`\n⚠️  Errors: ${this.stats.errors.length}`);
      console.log('   Run script again to retry failed categories');
    }
    
    console.log(`\n📁 All data saved in: ${this.dataDir}/`);
    console.log('📁 Individual JSON files created for each category/feed');
    console.log('\n🚀 Next: Run merge_and_upload.js to combine data and load into database');
    
    // Mark scraping as complete
    this.progress.completedAt = new Date().toISOString();
    this.saveProgress();
  }
}

// Run the standalone scraper
const scraper = new StandaloneScraper();
scraper.runStandaloneScraping().catch(error => {
  console.error('💥 Scraper crashed:', error);
  console.log('💾 Progress saved. Run the script again to continue.');
});