const fs = require('fs');

try {
  const results = JSON.parse(fs.readFileSync('./temp-final-results.json', 'utf8'));

  console.log('🛌 SLEEP-RELATED APPS FOUND:');
  console.log('=' .repeat(50));

  const sleepApps = results.results.filter(app => {
    const text = `${app.title} ${app.description || ''}`.toLowerCase();
    const sleepTerms = ['sleep', 'meditation', 'mindfulness', 'rest', 'relaxation', 'dream', 'pillow', 'bedtime'];
    return sleepTerms.some(term => text.includes(term)) && !text.includes('caffeine');
  });

  console.log(`Found ${sleepApps.length} non-caffeine sleep apps:\n`);

  sleepApps.slice(0, 15).forEach((app, i) => {
    const position = results.results.indexOf(app) + 1;
    console.log(`${i+1}. ${app.title}`);
    console.log(`   Position: #${position} | Similarity: ${app.similarity_score.toFixed(4)} | Rating: ${app.rating}`);
    console.log(`   Category: ${app.primary_category || 'Unknown'}`);
    console.log('');
  });

  // Check categories
  const categories = {};
  sleepApps.forEach(app => {
    const cat = app.primary_category || 'Unknown';
    categories[cat] = (categories[cat] || 0) + 1;
  });

  console.log('📊 Sleep App Categories:');
  Object.entries(categories).forEach(([cat, count]) => {
    console.log(`   ${cat}: ${count} apps`);
  });

  // Check for specific high-quality sleep apps
  console.log('\n🎯 High-Quality Sleep Apps (similarity > 0.4):');
  const highQualitySleep = sleepApps.filter(app => app.similarity_score > 0.4);
  highQualitySleep.forEach(app => {
    const position = results.results.indexOf(app) + 1;
    console.log(`   ${app.title} - Position #${position} (${app.similarity_score.toFixed(4)})`);
  });

} catch (error) {
  console.error('Error:', error.message);
}