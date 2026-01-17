/**
 * MASSIVE APP DATA SCRAPER
 * 
 * This script scrapes comprehensive app data from all sources:
 * - iTunes Search API (25 categories × 200 apps = 5,000 apps)
 * - Apple RSS Feeds (4 feeds × 25 apps = 100 apps)  
 * - SERP API (25 categories × 100 apps = 2,500 apps)
 * 
 * Total Target: ~7,600 raw apps → ~5,000-6,000 unique apps
 * 
 * Data saved to JSON files for backup and future re-upload
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Comprehensive app categories for maximum coverage
const APP_CATEGORIES = [
  // Productivity & Business
  'productivity', 'business', 'finance', 'utilities', 'office',
  
  // Entertainment & Media
  'games', 'entertainment', 'music', 'video', 'streaming', 'movies',
  
  // Social & Communication  
  'social media', 'messaging', 'dating', 'networking', 'communication',
  
  // Health & Lifestyle
  'health', 'fitness', 'food', 'travel', 'lifestyle', 'wellness',
  
  // Creative & Education
  'photo', 'education', 'books', 'design', 'art', 'creativity',
  
  // Shopping & Services
  'shopping', 'delivery', 'transportation', 'weather', 'news',
  
  // Tech & Developer
  'developer tools', 'reference', 'navigation'
];

// Apple RSS feed types
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

class MassiveScraper {
  constructor() {
    this.dataDir = './data';
    this.stats = {
      startTime: new Date(),
      iTunes: { attempted: 0, successful: 0, failed: 0, totalApps: 0 },
      appleRSS: { attempted: 0, successful: 0, failed: 0, totalApps: 0 },
      serp: { attempted: 0, successful: 0, failed: 0, totalApps: 0 },
      errors: []
    };
    
    this.ensureDirectories();
  }

  ensureDirectories() {
    const dirs = [
      this.dataDir,
      path.join(this.dataDir, 'itunes'),
      path.join(this.dataDir, 'apple_rss'), 
      path.join(this.dataDir, 'serp'),
      path.join(this.dataDir, 'combined')
    ];
    
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    });
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async scrapeItunesCategory(category) {
    console.log(`📱 Scraping iTunes: ${category}`);
    this.stats.iTunes.attempted++;
    
    try {
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(category)}&country=US&entity=software&limit=200`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`iTunes API returned ${response.status}`);
      }
      
      const data = await response.json();
      const apps = data.results || [];
      
      // Process and clean iTunes data
      const processedApps = apps.map(app => ({
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
      }));
      
      // Save to JSON file
      const filename = path.join(this.dataDir, 'itunes', `${category.replace(/[^a-z0-9]/gi, '_')}_${apps.length}.json`);
      fs.writeFileSync(filename, JSON.stringify({
        metadata: {
          source: 'itunes',
          category: category,
          scraped_at: new Date().toISOString(),
          total_apps: apps.length,
          query_url: url
        },
        apps: processedApps
      }, null, 2));
      
      console.log(`✅ iTunes ${category}: ${apps.length} apps saved to ${filename}`);
      this.stats.iTunes.successful++;
      this.stats.iTunes.totalApps += apps.length;
      
      return { success: true, count: apps.length, apps: processedApps };
      
    } catch (error) {
      console.error(`❌ iTunes ${category} failed:`, error.message);
      this.stats.iTunes.failed++;
      this.stats.errors.push({ source: 'itunes', category, error: error.message });
      return { success: false, error: error.message };
    }
  }

  async scrapeAppleRSSFeed(feed) {
    console.log(`🍎 Scraping Apple RSS: ${feed.description}`);
    this.stats.appleRSS.attempted++;
    
    try {
      const response = await fetch(feed.url);
      
      if (!response.ok) {
        throw new Error(`Apple RSS returned ${response.status}`);
      }
      
      const data = await response.json();
      const entries = data.feed?.entry || [];
      
      // Process RSS data
      const processedApps = entries.map((app, index) => ({
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
      }));
      
      // Save to JSON file
      const filename = path.join(this.dataDir, 'apple_rss', `${feed.name}_${entries.length}.json`);
      fs.writeFileSync(filename, JSON.stringify({
        metadata: {
          source: 'apple_rss',
          feed_type: feed.name,
          feed_url: feed.url,
          description: feed.description,
          scraped_at: new Date().toISOString(),
          total_apps: entries.length
        },
        apps: processedApps
      }, null, 2));
      
      console.log(`✅ Apple RSS ${feed.name}: ${entries.length} apps saved to ${filename}`);
      this.stats.appleRSS.successful++;
      this.stats.appleRSS.totalApps += entries.length;
      
      return { success: true, count: entries.length, apps: processedApps };
      
    } catch (error) {
      console.error(`❌ Apple RSS ${feed.name} failed:`, error.message);
      this.stats.appleRSS.failed++;
      this.stats.errors.push({ source: 'apple_rss', feed: feed.name, error: error.message });
      return { success: false, error: error.message };
    }
  }

  async scrapeSerpCategory(category) {
    console.log(`🔍 Scraping SERP: ${category}`);
    this.stats.serp.attempted++;
    
    const serpApiKey = process.env.SERPAPI_KEY;
    if (!serpApiKey) {
      console.log(`⚠️ SERP API key not found, skipping ${category}`);
      return { success: false, error: 'No SERP API key' };
    }
    
    try {
      const url = `https://serpapi.com/search.json?engine=apple_app_store&term=${encodeURIComponent(category)}&api_key=${serpApiKey}&num=100`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`SERP API returned ${response.status}`);
      }
      
      const data = await response.json();
      const apps = data.organic_results || [];
      
      // Process SERP data
      const processedApps = apps.map((app, index) => ({
        source: 'serp',
        category: category,
        bundle_id: app.product_id || `serp_${category}_${index}`,
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
      }));
      
      // Save to JSON file
      const filename = path.join(this.dataDir, 'serp', `${category.replace(/[^a-z0-9]/gi, '_')}_${apps.length}.json`);
      fs.writeFileSync(filename, JSON.stringify({
        metadata: {
          source: 'serp',
          category: category,
          scraped_at: new Date().toISOString(),
          total_apps: apps.length,
          query_url: url
        },
        apps: processedApps
      }, null, 2));
      
      console.log(`✅ SERP ${category}: ${apps.length} apps saved to ${filename}`);
      this.stats.serp.successful++;
      this.stats.serp.totalApps += apps.length;
      
      return { success: true, count: apps.length, apps: processedApps };
      
    } catch (error) {
      console.error(`❌ SERP ${category} failed:`, error.message);
      this.stats.serp.failed++;
      this.stats.errors.push({ source: 'serp', category, error: error.message });
      return { success: false, error: error.message };
    }
  }

  async runMassiveScraping() {
    console.log('🚀 Starting Massive App Data Scraping...');
    console.log(`📊 Target: ${APP_CATEGORIES.length} iTunes categories + ${RSS_FEEDS.length} RSS feeds + ${APP_CATEGORIES.length} SERP categories`);
    console.log(`🎯 Estimated: ~7,600 raw apps → ~5,000-6,000 unique apps\n`);
    
    const allApps = [];
    
    // 1. Scrape iTunes (5,000 apps estimated)
    console.log('📱 PHASE 1: iTunes Search API Scraping');
    console.log('='.repeat(50));
    
    for (const category of APP_CATEGORIES) {
      const result = await this.scrapeItunesCategory(category);
      if (result.success) {
        allApps.push(...result.apps);
      }
      
      // Rate limiting: 1 second between requests
      await this.delay(1000);
    }
    
    console.log(`\n📱 iTunes Phase Complete: ${this.stats.iTunes.successful}/${this.stats.iTunes.attempted} categories, ${this.stats.iTunes.totalApps} apps\n`);
    
    // 2. Scrape Apple RSS (100 apps estimated)
    console.log('🍎 PHASE 2: Apple RSS Feeds Scraping');
    console.log('='.repeat(50));
    
    for (const feed of RSS_FEEDS) {
      const result = await this.scrapeAppleRSSFeed(feed);
      if (result.success) {
        allApps.push(...result.apps);
      }
      
      // Rate limiting: 2 seconds between RSS requests
      await this.delay(2000);
    }
    
    console.log(`\n🍎 Apple RSS Phase Complete: ${this.stats.appleRSS.successful}/${this.stats.appleRSS.attempted} feeds, ${this.stats.appleRSS.totalApps} apps\n`);
    
    // 3. Scrape SERP API (2,500 apps estimated)
    console.log('🔍 PHASE 3: SERP API Scraping');
    console.log('='.repeat(50));
    
    for (const category of APP_CATEGORIES) {
      const result = await this.scrapeSerpCategory(category);
      if (result.success) {
        allApps.push(...result.apps);
      }
      
      // Rate limiting: 3 seconds between SERP requests (API limits)
      await this.delay(3000);
    }
    
    console.log(`\n🔍 SERP Phase Complete: ${this.stats.serp.successful}/${this.stats.serp.attempted} categories, ${this.stats.serp.totalApps} apps\n`);
    
    // 4. Save combined data and generate statistics
    await this.saveCombinedData(allApps);
    this.generateFinalReport();
  }

  async saveCombinedData(allApps) {
    console.log('💾 PHASE 4: Saving Combined Data & Deduplication');
    console.log('='.repeat(50));
    
    // Save all raw data
    const rawDataFile = path.join(this.dataDir, 'combined', 'all_raw_data.json');
    fs.writeFileSync(rawDataFile, JSON.stringify({
      metadata: {
        total_apps: allApps.length,
        sources: ['itunes', 'apple_rss', 'serp'],
        categories: APP_CATEGORIES,
        scraped_at: new Date().toISOString(),
        scraping_duration_minutes: (new Date() - this.stats.startTime) / 1000 / 60
      },
      apps: allApps
    }, null, 2));
    
    console.log(`💾 Raw data saved: ${allApps.length} apps in ${rawDataFile}`);
    
    // Deduplicate by bundle_id
    const uniqueApps = new Map();
    
    allApps.forEach(app => {
      const bundleId = app.bundle_id;
      if (!uniqueApps.has(bundleId)) {
        uniqueApps.set(bundleId, app);
      } else {
        // Keep the app with more complete data (higher rating_count or more fields)
        const existing = uniqueApps.get(bundleId);
        const existingFields = Object.keys(existing).filter(k => existing[k] !== null && existing[k] !== '').length;
        const newFields = Object.keys(app).filter(k => app[k] !== null && app[k] !== '').length;
        
        if (newFields > existingFields || (app.rating_count && app.rating_count > (existing.rating_count || 0))) {
          uniqueApps.set(bundleId, app);
        }
      }
    });
    
    const deduplicatedApps = Array.from(uniqueApps.values());
    
    // Save deduplicated data
    const deduplicatedFile = path.join(this.dataDir, 'combined', 'deduplicated_apps.json');
    fs.writeFileSync(deduplicatedFile, JSON.stringify({
      metadata: {
        total_unique_apps: deduplicatedApps.length,
        total_raw_apps: allApps.length,
        deduplication_ratio: ((allApps.length - deduplicatedApps.length) / allApps.length * 100).toFixed(1) + '%',
        sources: ['itunes', 'apple_rss', 'serp'],
        scraped_at: new Date().toISOString()
      },
      apps: deduplicatedApps
    }, null, 2));
    
    console.log(`🔄 Deduplicated data saved: ${deduplicatedApps.length} unique apps in ${deduplicatedFile}`);
    console.log(`📊 Deduplication: ${allApps.length} → ${deduplicatedApps.length} (${((allApps.length - deduplicatedApps.length) / allApps.length * 100).toFixed(1)}% duplicates removed)`);
  }

  generateFinalReport() {
    this.stats.endTime = new Date();
    this.stats.duration = (this.stats.endTime - this.stats.startTime) / 1000 / 60; // minutes
    
    console.log('\n🎉 MASSIVE SCRAPING COMPLETED!');
    console.log('='.repeat(60));
    console.log(`⏱️  Duration: ${this.stats.duration.toFixed(1)} minutes`);
    console.log(`📱 iTunes: ${this.stats.iTunes.successful}/${this.stats.iTunes.attempted} categories (${this.stats.iTunes.totalApps} apps)`);
    console.log(`🍎 Apple RSS: ${this.stats.appleRSS.successful}/${this.stats.appleRSS.attempted} feeds (${this.stats.appleRSS.totalApps} apps)`);
    console.log(`🔍 SERP: ${this.stats.serp.successful}/${this.stats.serp.attempted} categories (${this.stats.serp.totalApps} apps)`);
    console.log(`📊 Total Apps: ${this.stats.iTunes.totalApps + this.stats.appleRSS.totalApps + this.stats.serp.totalApps}`);
    
    if (this.stats.errors.length > 0) {
      console.log(`\n⚠️  Errors: ${this.stats.errors.length}`);
      this.stats.errors.forEach(error => {
        console.log(`   ${error.source}: ${error.category || error.feed} - ${error.error}`);
      });
    }
    
    // Save statistics
    const statsFile = path.join(this.dataDir, 'combined', 'scraping_statistics.json');
    fs.writeFileSync(statsFile, JSON.stringify(this.stats, null, 2));
    
    console.log(`\n📈 Statistics saved to: ${statsFile}`);
    console.log(`📁 All data saved in: ${this.dataDir}/`);
    console.log('\n🚀 Ready to load into database with: node json_to_database.js');
  }
}

// Run the massive scraping
const scraper = new MassiveScraper();
scraper.runMassiveScraping().catch(console.error);