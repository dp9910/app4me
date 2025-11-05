/**
 * Debug Semantic Search Issues
 */
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function debugSemanticSearch() {
  console.log('🐛 === DEBUGGING SEMANTIC SEARCH ===\n');
  
  // Step 1: Test embedding generation
  console.log('🔢 Step 1: Testing embedding generation');
  console.log('=' .repeat(50));
  
  const testQuery = "help me track my daily habits";
  console.log(`Query: "${testQuery}"`);
  
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    
    console.log('🤖 Calling Gemini API...');
    const result = await model.embedContent(testQuery);
    const queryEmbedding = result.embedding.values;
    
    console.log(`✅ Embedding generated successfully!`);
    console.log(`📊 Dimensions: ${queryEmbedding.length}`);
    console.log(`📈 Sample values: [${queryEmbedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
    
    // Step 2: Test database embeddings
    console.log('\n📊 Step 2: Testing database embeddings');
    console.log('=' .repeat(50));
    
    const { data: sampleEmbeddings, error } = await supabase
      .from('app_embeddings')
      .select(`
        app_id,
        embedding,
        apps_unified!inner(title, description, primary_category)
      `)
      .limit(5);
      
    if (error) {
      console.error('❌ Error fetching embeddings:', error);
      return;
    }
    
    console.log(`📱 Found ${sampleEmbeddings.length} sample embeddings`);
    
    // Step 3: Test similarity calculation
    console.log('\n🧮 Step 3: Testing similarity calculation');
    console.log('=' .repeat(50));
    
    let foundMatches = 0;
    let maxSimilarity = 0;
    let bestMatch = null;
    
    for (const app of sampleEmbeddings) {
      try {
        const appEmbedding = JSON.parse(app.embedding);
        console.log(`📱 ${app.apps_unified.title}: ${appEmbedding.length} dimensions`);
        
        // Check dimension compatibility
        if (queryEmbedding.length !== appEmbedding.length) {
          console.log(`  ⚠️ Dimension mismatch: query=${queryEmbedding.length}, app=${appEmbedding.length}`);
          continue;
        }
        
        // Calculate cosine similarity
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < queryEmbedding.length; i++) {
          dotProduct += queryEmbedding[i] * appEmbedding[i];
          normA += queryEmbedding[i] * queryEmbedding[i];
          normB += appEmbedding[i] * appEmbedding[i];
        }
        
        const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
        console.log(`  📊 Similarity: ${similarity.toFixed(4)}`);
        
        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
          bestMatch = app.apps_unified.title;
        }
        
        if (similarity > 0.4) {
          foundMatches++;
          console.log(`  ✅ Above threshold (0.4)!`);
        }
        
      } catch (err) {
        console.log(`  ❌ Error processing ${app.apps_unified.title}: ${err.message}`);
      }
    }
    
    console.log('\n📋 Summary:');
    console.log(`🔍 Best match: ${bestMatch} (${maxSimilarity.toFixed(4)})`);
    console.log(`✅ Matches above 0.4 threshold: ${foundMatches}`);
    
    // Step 4: Test with larger sample
    console.log('\n🔍 Step 4: Testing with larger sample');
    console.log('=' .repeat(50));
    
    const { data: largerSample, error: largerError } = await supabase
      .from('app_embeddings')
      .select(`
        app_id,
        embedding,
        apps_unified!inner(title, primary_category)
      `)
      .limit(50);
      
    if (largerError) {
      console.error('❌ Error fetching larger sample:', largerError);
      return;
    }
    
    console.log(`📊 Testing with ${largerSample.length} apps...`);
    
    let totalMatches = 0;
    let highMatches = 0;
    let dimensionMismatches = 0;
    
    for (const app of largerSample) {
      try {
        const appEmbedding = JSON.parse(app.embedding);
        
        if (queryEmbedding.length !== appEmbedding.length) {
          dimensionMismatches++;
          continue;
        }
        
        // Calculate cosine similarity
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < queryEmbedding.length; i++) {
          dotProduct += queryEmbedding[i] * appEmbedding[i];
          normA += queryEmbedding[i] * queryEmbedding[i];
          normB += appEmbedding[i] * appEmbedding[i];
        }
        
        const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
        
        if (similarity > 0.4) {
          totalMatches++;
          console.log(`✅ ${app.apps_unified.title}: ${similarity.toFixed(4)}`);
        }
        
        if (similarity > 0.6) {
          highMatches++;
        }
        
      } catch (err) {
        // Skip problematic embeddings
      }
    }
    
    console.log('\n📊 Large Sample Results:');
    console.log(`📱 Total apps tested: ${largerSample.length}`);
    console.log(`⚠️ Dimension mismatches: ${dimensionMismatches}`);
    console.log(`✅ Matches above 0.4: ${totalMatches}`);
    console.log(`🔥 High matches above 0.6: ${highMatches}`);
    
    if (totalMatches === 0) {
      console.log('\n🤔 Possible Issues:');
      console.log('   • Query embedding model different from stored embeddings');
      console.log('   • Similarity threshold too high');
      console.log('   • Dimension mismatch between models');
      console.log('   • Different normalization between stored and fresh embeddings');
    }
    
  } catch (err) {
    console.error('❌ Error in embedding generation:', err.message);
  }
}

debugSemanticSearch().catch(console.error);