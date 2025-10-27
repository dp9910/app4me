import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    
    console.log(`🔍 Debugging plant search for: "${query}"`);
    
    const debugInfo = {
      query,
      steps: []
    };
    
    // Step 1: Test basic database connection
    debugInfo.steps.push("=== Step 1: Testing database connection ===");
    try {
      const { data: testData, error: testError } = await supabase
        .from('apps_unified')
        .select('id, title')
        .limit(3);
      
      if (testError) {
        debugInfo.steps.push(`❌ Database error: ${testError.message}`);
      } else {
        debugInfo.steps.push(`✅ Database connected. Sample apps: ${testData.map(a => a.title).join(', ')}`);
      }
    } catch (err: any) {
      debugInfo.steps.push(`❌ Database connection failed: ${err.message}`);
    }
    
    // Step 2: Test app_embeddings table
    debugInfo.steps.push("=== Step 2: Testing app_embeddings table ===");
    try {
      const { data: embeddingData, error: embeddingError } = await supabase
        .from('app_embeddings')
        .select('app_id, embedding')
        .limit(2);
      
      if (embeddingError) {
        debugInfo.steps.push(`❌ Embeddings error: ${embeddingError.message}`);
      } else {
        debugInfo.steps.push(`✅ Embeddings table accessible. Found ${embeddingData.length} records`);
        if (embeddingData.length > 0) {
          const firstEmbedding = embeddingData[0].embedding;
          debugInfo.steps.push(`📊 First embedding dimensions: ${firstEmbedding ? firstEmbedding.length : 'null'}`);
          debugInfo.steps.push(`📊 First embedding type: ${typeof firstEmbedding}`);
        }
      }
    } catch (err: any) {
      debugInfo.steps.push(`❌ Embeddings table failed: ${err.message}`);
    }
    
    // Step 3: Test app_features table with plant-related apps
    debugInfo.steps.push("=== Step 3: Testing app_features for plant apps ===");
    try {
      const { data: plantApps, error: plantError } = await supabase
        .from('apps_unified')
        .select('id, title, description')
        .or('title.ilike.%plant%,title.ilike.%garden%')
        .limit(5);
      
      if (plantError) {
        debugInfo.steps.push(`❌ Plant apps query error: ${plantError.message}`);
      } else {
        debugInfo.steps.push(`✅ Found ${plantApps.length} apps with plant/garden in title`);
        
        for (const app of plantApps) {
          debugInfo.steps.push(`📱 ${app.title} (ID: ${app.id})`);
          
          // Check if this app has features data
          const { data: featureData, error: featureError } = await supabase
            .from('app_features')
            .select('keywords_tfidf, primary_use_case')
            .eq('app_id', app.id)
            .single();
          
          if (featureError) {
            debugInfo.steps.push(`   ❌ No features data: ${featureError.message}`);
          } else {
            debugInfo.steps.push(`   ✅ Has features data. Use case: ${featureData.primary_use_case || 'null'}`);
            const tfidfKeywords = featureData.keywords_tfidf?.keywords || {};
            const plantKeywords = ['plant', 'garden', 'grow', 'care', 'water'];
            const foundKeywords = plantKeywords.filter(k => tfidfKeywords[k]);
            debugInfo.steps.push(`   📊 Plant TF-IDF keywords found: ${foundKeywords.join(', ') || 'none'}`);
          }
        }
      }
    } catch (err: any) {
      debugInfo.steps.push(`❌ Plant apps check failed: ${err.message}`);
    }
    
    // Step 4: Test simpler search - just use hybrid retriever without smart features
    debugInfo.steps.push("=== Step 4: Testing basic hybrid retrieval ===");
    try {
      const { hybridRetrieval } = await import('@/lib/recommendation/retrievers/hybrid-retriever');
      const hybridResults = await hybridRetrieval(query, undefined, 5);
      debugInfo.steps.push(`✅ Hybrid retrieval returned ${hybridResults.length} results`);
      
      if (hybridResults.length > 0) {
        for (const result of hybridResults.slice(0, 3)) {
          debugInfo.steps.push(`📱 ${result.app_data.name} (score: ${result.final_score.toFixed(2)})`);
        }
      }
    } catch (err: any) {
      debugInfo.steps.push(`❌ Hybrid retrieval failed: ${err.message}`);
    }
    
    // Step 5: Test environment variables
    debugInfo.steps.push("=== Step 5: Checking environment variables ===");
    const hasGemini = !!process.env.GEMINI_API_KEY;
    const hasDeepSeek = !!process.env.DEEPSEEK_API_KEY;
    const hasSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_KEY;
    
    debugInfo.steps.push(`🔑 GEMINI_API_KEY: ${hasGemini ? 'present' : 'missing'}`);
    debugInfo.steps.push(`🔑 DEEPSEEK_API_KEY: ${hasDeepSeek ? 'present' : 'missing'}`);
    debugInfo.steps.push(`🔑 Supabase keys: ${hasSupabase ? 'present' : 'missing'}`);
    
    return NextResponse.json({
      success: true,
      debug_info: debugInfo
    });
    
  } catch (error: any) {
    console.error('❌ Debug plant search error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}