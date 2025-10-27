const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function analyzeAllPlantFeatures() {
  try {
    console.log('🔍 Analyzing features patterns across ALL plant/garden apps...\n');
    
    // Get all plant/garden apps and their features
    const { data: plantApps, error: plantError } = await supabase
      .from('apps_unified')
      .select('id, title, primary_category')
      .or('title.ilike.%plant%,title.ilike.%garden%,description.ilike.%plant%,description.ilike.%garden%');
    
    if (plantError) throw plantError;
    
    const plantAppIds = plantApps.map(app => app.id);
    
    const { data: features, error: featuresError } = await supabase
      .from('app_features')
      .select('*')
      .in('app_id', plantAppIds);
    
    if (featuresError) throw featuresError;
    
    // Analyze patterns
    const useCasePatterns = {};
    const targetUserPatterns = {};
    const keyBenefitPatterns = {};
    const keywordPatterns = {};
    
    features.forEach(feature => {
      const app = plantApps.find(a => a.id === feature.app_id);
      
      // Collect use cases
      if (feature.primary_use_case) {
        useCasePatterns[feature.primary_use_case] = (useCasePatterns[feature.primary_use_case] || 0) + 1;
      }
      
      // Collect target users
      if (feature.target_user) {
        targetUserPatterns[feature.target_user] = (targetUserPatterns[feature.target_user] || 0) + 1;
      }
      
      // Collect key benefits
      if (feature.key_benefit) {
        keyBenefitPatterns[feature.key_benefit] = (keyBenefitPatterns[feature.key_benefit] || 0) + 1;
      }
      
      // Collect plant-related keywords
      if (feature.keywords_tfidf && feature.keywords_tfidf.keywords) {
        Object.entries(feature.keywords_tfidf.keywords).forEach(([keyword, score]) => {
          if (keyword.includes('plant') || 
              keyword.includes('garden') || 
              keyword.includes('water') ||
              keyword.includes('care') ||
              keyword.includes('grow') ||
              keyword.includes('green') ||
              keyword.includes('leaf') ||
              keyword.includes('flower') ||
              keyword.includes('seed') ||
              keyword.includes('tree') ||
              keyword.includes('flora') ||
              keyword.includes('botanical')) {
            if (!keywordPatterns[keyword]) keywordPatterns[keyword] = [];
            keywordPatterns[keyword].push({ 
              app: app.title, 
              score: parseFloat(score),
              use_case: feature.primary_use_case 
            });
          }
        });
      }
    });
    
    console.log('📊 USE CASE PATTERNS:');
    console.log('='.repeat(40));
    Object.entries(useCasePatterns)
      .sort(([,a], [,b]) => b - a)
      .forEach(([useCase, count]) => {
        console.log(`${count}x: ${useCase}`);
      });
    
    console.log('\n👤 TARGET USER PATTERNS:');
    console.log('='.repeat(40));
    Object.entries(targetUserPatterns)
      .sort(([,a], [,b]) => b - a)
      .forEach(([user, count]) => {
        console.log(`${count}x: ${user}`);
      });
    
    console.log('\n✨ KEY BENEFIT PATTERNS:');
    console.log('='.repeat(40));
    Object.entries(keyBenefitPatterns)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([benefit, count]) => {
        console.log(`${count}x: ${benefit}`);
      });
    
    console.log('\n🔑 PLANT-RELATED KEYWORDS:');
    console.log('='.repeat(40));
    Object.entries(keywordPatterns)
      .sort(([,a], [,b]) => b.length - a.length)
      .forEach(([keyword, apps]) => {
        const avgScore = apps.reduce((sum, app) => sum + app.score, 0) / apps.length;
        const realPlantApps = apps.filter(app => 
          app.use_case && (app.use_case.includes('plant') || 
          app.use_case.includes('care') ||
          app.use_case.includes('garden')) ||
          app.app && app.app.toLowerCase().includes('planta')
        );
        console.log(`${keyword}: ${apps.length} apps (avg score: ${avgScore.toFixed(3)}) - ${realPlantApps.length} real plant apps`);
      });
    
    // Show which features identify real plant care apps
    console.log('\n🎯 REAL PLANT CARE APP IDENTIFIERS:');
    console.log('='.repeat(50));
    
    const realPlantFeatures = features.filter(feature => {
      return feature.primary_use_case && (
        feature.primary_use_case.toLowerCase().includes('plant') ||
        feature.primary_use_case.toLowerCase().includes('care') ||
        feature.primary_use_case.toLowerCase().includes('garden') ||
        feature.primary_use_case.toLowerCase().includes('water')
      );
    });
    
    realPlantFeatures.forEach(feature => {
      const app = plantApps.find(a => a.id === feature.app_id);
      console.log(`📱 ${app.title}`);
      console.log(`   🎯 Use Case: ${feature.primary_use_case}`);
      console.log(`   👤 Target User: ${feature.target_user}`);
      console.log(`   ✨ Key Benefit: ${feature.key_benefit}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

analyzeAllPlantFeatures();