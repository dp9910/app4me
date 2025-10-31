const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function getTechTrends() {
  const serpApiKey = process.env.SERPAPI_KEY;
  if (!serpApiKey) {
    console.error('SERPAPI_KEY not found in .env.local');
    process.exit(1);
  }

  const apiUrl = `https://serpapi.com/search?engine=google_trends_trending_now&geo=US&output=json&api_key=${serpApiKey}`;

  console.log('Fetching trending searches from SerpApi...');
  let response;
  try {
    response = await fetch(apiUrl);
  } catch (error) {
    console.error('Error fetching from SerpApi:', error);
    process.exit(1);
  }

  if (!response.ok) {
    console.error(`SerpApi request failed with status: ${response.status} ${response.statusText}`);
    process.exit(1);
  }

  const data = await response.json();
  console.log('Raw SerpApi response data:', JSON.stringify(data, null, 2));
  const trendingSearches = data.trending_searches;

  if (!trendingSearches || trendingSearches.length === 0) {
    console.log('No trending searches found.');
    return;
  }

  const techKeywords = [
    'tech', 'software', 'app', 'streaming', 'AI', 'stock', 'console', 'game', 'cybersecurity', 'internet', 'digital', 'mobile', 'computer', 'robotics', 'gadget', 'innovation', 'startup', 'developer', 'programming', 'data', 'cloud', 'network', 'virtual', 'augmented', 'metaverse', 'blockchain', 'crypto', 'electric vehicle', 'semiconductor', 'chip', 'quantum', 'biotech', 'fintech', 'edtech', 'healthtech',
    'Apple', 'Google', 'Microsoft', 'Amazon', 'Netflix', 'Hulu', 'Disney+', 'Waymo', 'OpenAI', 'Sam Altman', 'Nintendo',
    'youtube tv', 'hulu live tv', 'netflix stock', 'disneyplus', 'upenn hacked', 'amzn stock', 'aapl stock', 'sling tv', 'apple stock', 'nintendo switch'
  ];

  const techTrends = trendingSearches.filter(trend => {
    const title = trend.title && trend.title.query ? trend.title.query.toLowerCase() : '';
    return techKeywords.some(keyword => {
      const keywordLower = keyword.toLowerCase();
      // console.log(`Checking if "${title}" includes "${keywordLower}"`);
      return title.includes(keywordLower);
    });
  });

  if (techTrends.length === 0) {
    console.log('No tech-related trends found.');
    return;
  }

  console.log('Found tech-related trends:');
  techTrends.forEach((trend, index) => {
    console.log(`${index + 1}. ${trend.title.query}`);
  });

  // Create latest_trends folder if it doesn't exist
  const outputDir = path.join(__dirname, 'latest_trends');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  // Save to CSV
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-') ;
  const outputFile = path.join(outputDir, `tech_trends_${timestamp}.csv`);

  const csvHeader = 'Rank,Query,Traffic,News_Title,News_Source,News_URL';
  const csvRows = techTrends.map((trend, index) => {
    const query = `"${trend.title.query.replace(/"/g, '""')}"`;
    const traffic = trend.formatted_traffic || '';
    const news = trend.articles && trend.articles.length > 0 ? trend.articles[0] : {};
    const newsTitle = `"${(news.title || '').replace(/"/g, '""')}"`;
    const newsSource = `"${(news.source || '').replace(/"/g, '""')}"`;
    const newsUrl = `"${news.url || ''}"`;
    return `${index + 1},${query},${traffic},${newsTitle},${newsSource},${newsUrl}`;
  });

  fs.writeFileSync(outputFile, [csvHeader, ...csvRows].join('\n'));
  console.log(`
Tech trends saved to ${outputFile}`);
}

getTechTrends();
