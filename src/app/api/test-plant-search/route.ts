import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { streamlinedSearch } from '@/lib/recommendation/search-orchestrator';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    
    console.log(`🌱 Testing plant search for: "${query}"`);
    
    // Step 1: Get all 374 plant-related apps from database
    console.log('📱 Fetching all plant-related apps...');
    
    const { data: allPlantApps, error } = await supabase
      .from('apps_unified')
      .select('id, title, description, primary_category, rating, icon_url')
      .or('title.ilike.%plant%,description.ilike.%plant%,title.ilike.%garden%,description.ilike.%garden%,title.ilike.%nature%,description.ilike.%nature%,title.ilike.%flower%,description.ilike.%flower%,title.ilike.%botanical%,description.ilike.%botanical%');
    
    if (error) {
      throw error;
    }
    
    console.log(`🌿 Found ${allPlantApps.length} plant-related apps in database`);
    
    // Step 2: Run our streamlined search algorithm to get top 10
    console.log('🔍 Running streamlined search algorithm...');
    const top10Results = await streamlinedSearch(query, 10);
    
    console.log(`✅ Algorithm selected ${top10Results.length} top results`);
    
    // Step 3: Format all plant apps with one-liners
    const formattedAllApps = allPlantApps.map(app => ({
      id: app.id,
      name: app.title,
      description: app.description,
      category: app.primary_category,
      rating: app.rating || 0,
      icon_url: app.icon_url,
      one_liner: generatePlantOneLiner(app, query)
    }));
    
    // Step 4: Format top 10 results
    const formattedTop10 = top10Results.map(result => ({
      id: result.app_id,
      name: result.app_data.name,
      description: result.app_data.description,
      category: result.app_data.category,
      rating: result.app_data.rating,
      icon_url: result.app_data.icon_url,
      relevance_score: result.relevance_score,
      match_reason: result.match_reason,
      matched_keywords: result.matched_keywords,
      one_liner: generatePlantOneLiner({
        title: result.app_data.name,
        description: result.app_data.description,
        primary_category: result.app_data.category
      }, query)
    }));
    
    return NextResponse.json({
      success: true,
      query,
      top_10_results: formattedTop10,
      all_plant_apps: formattedAllApps,
      metadata: {
        total_plant_apps: allPlantApps.length,
        algorithm_selected: top10Results.length,
        search_method: 'streamlined_search_with_deepseek'
      }
    });
    
  } catch (error: any) {
    console.error('❌ Plant search test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to test plant search'
    }, { status: 500 });
  }
}

function generatePlantOneLiner(app: any, query: string): string {
  const title = app.title?.toLowerCase() || '';
  const description = app.description?.toLowerCase() || '';
  const category = app.primary_category?.toLowerCase() || '';
  const queryLower = query.toLowerCase();
  
  // For plant-specific apps
  if (title.includes('plant') && title.includes('care')) {
    return "🌱 Complete plant care companion - watering schedules, care tips, and plant health tracking";
  }
  
  if (title.includes('garden') && category.includes('design')) {
    return "🌻 Transform your space - AI-powered garden design and landscape planning";
  }
  
  if (title.includes('flora') || title.includes('focus')) {
    return "🌿 Plant-themed productivity - grow your focus while nurturing your green habits";
  }
  
  if (title.includes('plant') && title.includes('identifier')) {
    return "📱 Instant plant identification - scan any plant to learn about care and species";
  }
  
  if (title.includes('garden') && title.includes('game')) {
    return "🎮 Virtual gardening fun - build and manage your dream garden in a relaxing game";
  }
  
  // For design apps
  if (category.includes('design') && (title.includes('home') || title.includes('landscape'))) {
    return "🏡 Design your green oasis - plan gardens, landscapes, and outdoor living spaces";
  }
  
  // For games with plants
  if (category.includes('game') && title.includes('plant')) {
    return "🎯 Plant-powered gaming - strategy and fun with botanical themes";
  }
  
  if (category.includes('game') && title.includes('garden')) {
    return "🌱 Virtual gardening adventure - grow, design, and manage your digital garden";
  }
  
  // For productivity apps
  if (category.includes('productivity') && (title.includes('plant') || title.includes('forest'))) {
    return "⏰ Nature-inspired focus - stay productive with plant growth motivation";
  }
  
  // For reference/educational apps
  if (category.includes('reference') || category.includes('education')) {
    if (description.includes('plant') || description.includes('garden')) {
      return "📚 Plant knowledge base - comprehensive guides for gardening and plant care";
    }
  }
  
  // For health/lifestyle apps
  if (category.includes('health') || category.includes('lifestyle')) {
    if (description.includes('nature') || description.includes('plant')) {
      return "🧘 Nature-connected wellness - bring the calming power of plants into your daily routine";
    }
  }
  
  // Generic based on what keywords match
  if (title.includes('plant') || description.includes('plant')) {
    return "🌱 Plant enthusiast tool - everything you need for successful plant care and growth";
  }
  
  if (title.includes('garden') || description.includes('garden')) {
    return "🌻 Gardening companion - design, plant, and maintain beautiful garden spaces";
  }
  
  if (title.includes('nature') || description.includes('nature')) {
    return "🌿 Connect with nature - explore and appreciate the natural world around you";
  }
  
  if (title.includes('flower') || description.includes('flower')) {
    return "🌸 Flower lover's delight - discover, identify, and care for beautiful blooms";
  }
  
  // Fallback based on category
  if (category.includes('design')) {
    return "🎨 Creative design tool - bring your landscaping and garden visions to life";
  }
  
  if (category.includes('game')) {
    return "🎮 Engaging game experience - fun and entertainment with nature themes";
  }
  
  if (category.includes('productivity')) {
    return "⚡ Productivity booster - stay organized and focused with nature-inspired motivation";
  }
  
  // Final fallback
  return "🌱 Nature-related app - discover tools and content for plant and garden enthusiasts";
}