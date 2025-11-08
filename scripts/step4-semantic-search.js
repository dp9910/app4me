/**
 * Step 4: Semantic Search on Filtered Candidates
 * Apply semantic similarity search only to the filtered candidate apps
 */

const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

class SemanticSearchFiltered {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.embeddingModel = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
  }

  /**
   * Perform semantic search on filtered candidates
   */
  async searchCandidates(candidatesFile = './temp-candidates.json', originalQuery) {
    console.log('🔍 Performing semantic search on filtered candidates...');
    console.log('=' .repeat(60));
    
    try {
      // Load filtered candidates
      const candidateData = JSON.parse(fs.readFileSync(candidatesFile, 'utf8'));
      const candidates = candidateData.candidates;
      
      console.log(`📊 Total candidates: ${candidates.length}`);
      console.log(`🎯 Primary domain: ${candidateData.primary_domain}`);
      console.log(`🔤 Original query: "${originalQuery}"`);
      
      if (candidates.length === 0) {
        console.log('❌ No candidates to search');
        return [];
      }
      
      // Show candidate breakdown
      this.logCandidateBreakdown(candidates);
      
      // Generate query embedding
      console.log('\n🧠 Generating query embedding...');
      const embeddingResponse = await this.embeddingModel.embedContent(originalQuery);
      const queryEmbedding = embeddingResponse.embedding.values;
      console.log(`✅ Generated embedding with ${queryEmbedding.length} dimensions`);
      
      // Get embeddings for candidate apps
      const candidateIds = candidates.map(app => app.id);
      console.log(`\n📊 Fetching embeddings for ${candidateIds.length} candidates...`);
      
      const { data: candidateEmbeddings, error: embeddingError } = await this.supabase
        .from('new_embeddings')
        .select('app_id, embedding')
        .in('app_id', candidateIds);
      
      if (embeddingError) {
        throw new Error(`Error fetching candidate embeddings: ${embeddingError.message}`);
      }
      
      console.log(`✅ Found embeddings for ${candidateEmbeddings.length}/${candidateIds.length} candidates`);
      
      // Calculate similarities
      console.log('\n🧮 Calculating semantic similarities...');
      const similarities = [];
      let processed = 0;
      
      for (const embedding of candidateEmbeddings) {
        try {
          let appEmbedding = embedding.embedding;
          if (typeof appEmbedding === 'string' && appEmbedding.startsWith('[')) {
            appEmbedding = JSON.parse(appEmbedding);
          }
          
          const similarity = this.cosineSimilarity(queryEmbedding, appEmbedding);
          if (!isNaN(similarity) && similarity > 0.2) { // Low threshold since these are pre-filtered
            similarities.push({
              app_id: embedding.app_id,
              similarity: similarity
            });
          }
          processed++;
        } catch (err) {
          console.log(`⚠️ Skipped embedding for app ${embedding.app_id}: ${err.message}`);
        }
      }
      
      console.log(`✅ Processed ${processed} embeddings, found ${similarities.length} with similarity > 0.2`);
      
      // Sort by similarity
      similarities.sort((a, b) => b.similarity - a.similarity);
      
      // Combine with app details
      const results = similarities.map(sim => {
        const candidate = candidates.find(app => app.id === sim.app_id);
        if (!candidate) return null;
        
        return {
          ...candidate,
          similarity_score: sim.similarity,
          relevance: sim.similarity
        };
      }).filter(Boolean);
      
      console.log(`\n📊 Final Results: ${results.length} apps with semantic ranking`);
      
      if (results.length > 0) {
        console.log('\n🏆 Top semantic matches:');
        results.slice(0, 15).forEach((app, i) => {
          const sleepRelated = this.isSleepRelated(app);
          const indicator = sleepRelated ? '🛌' : '  ';
          console.log(`${indicator} ${i+1}. ${app.title}`);
          console.log(`     Similarity: ${app.similarity_score.toFixed(4)} | Source: ${app.source} | Rating: ${app.rating}`);
          console.log(`     Category: ${app.primary_category || 'Unknown'}`);
          console.log('');
        });
        
        // Analysis
        this.analyzeResults(results, candidateData.primary_domain);
      }
      
      // Save final results
      const finalResult = {
        original_query: originalQuery,
        primary_domain: candidateData.primary_domain,
        search_pipeline: {
          total_candidates: candidates.length,
          candidates_with_embeddings: candidateEmbeddings.length,
          final_results: results.length
        },
        results: results,
        timestamp: new Date().toISOString()
      };
      
      return finalResult;
      
    } catch (error) {
      console.error('❌ Semantic search on candidates failed:', error.message);
      throw error;
    }
  }

  /**
   * Log breakdown of candidates by source
   */
  logCandidateBreakdown(candidates) {
    const breakdown = candidates.reduce((acc, app) => {
      acc[app.source] = (acc[app.source] || 0) + 1;
      return acc;
    }, {});
    
    console.log(`\n📈 Candidate Breakdown:`);
    Object.entries(breakdown).forEach(([source, count]) => {
      console.log(`   ${source}: ${count} apps`);
    });
  }

  /**
   * Check if app appears sleep-related
   */
  isSleepRelated(app) {
    const text = `${app.title} ${app.description || ''}`.toLowerCase();
    const sleepTerms = ['sleep', 'insomnia', 'rest', 'pillow', 'bedtime', 'meditation', 'relaxation', 'dream'];
    return sleepTerms.some(term => text.includes(term));
  }

  /**
   * Analyze final results quality
   */
  analyzeResults(results, primaryDomain) {
    console.log('\n📈 RESULT ANALYSIS');
    console.log('=' .repeat(40));
    
    if (primaryDomain === 'sleep') {
      const sleepApps = results.filter(app => this.isSleepRelated(app));
      console.log(`🛌 Sleep-related apps: ${sleepApps.length}/${results.length} (${(sleepApps.length/results.length*100).toFixed(1)}%)`);
      
      if (sleepApps.length > 0) {
        console.log('   Top sleep apps:');
        sleepApps.slice(0, 5).forEach((app, i) => {
          console.log(`     ${i+1}. ${app.title} (${app.similarity_score.toFixed(4)})`);
        });
      }
      
      // Check for specific top sleep apps
      const topSleepApps = ['Pillow: Sleep Tracker', 'Simple Habit Sleep, Meditation', 'Meditopia: Sleep, Meditation'];
      console.log('\n🎯 Checking for known top sleep apps:');
      topSleepApps.forEach(appName => {
        const found = results.find(r => r.title === appName);
        if (found) {
          const position = results.indexOf(found) + 1;
          console.log(`   ✅ ${appName} - Position ${position} (${found.similarity_score.toFixed(4)})`);
        } else {
          console.log(`   ❌ ${appName} - NOT FOUND`);
        }
      });
    }
    
    // Overall quality metrics
    const avgSimilarity = results.reduce((sum, app) => sum + app.similarity_score, 0) / results.length;
    const highQualityApps = results.filter(app => app.similarity_score > 0.4).length;
    
    console.log(`\n📊 Quality Metrics:`);
    console.log(`   Average Similarity: ${avgSimilarity.toFixed(4)}`);
    console.log(`   High Quality Apps (>0.4): ${highQualityApps}/${results.length}`);
    console.log(`   Top Similarity: ${results[0]?.similarity_score.toFixed(4) || 'N/A'}`);
  }

  /**
   * Calculate cosine similarity
   */
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

// Test function
async function testSemanticSearchFiltered() {
  if (process.argv.length < 3) {
    console.log('Usage: node step4-semantic-search.js "original query"');
    console.log('Example: node step4-semantic-search.js "i cant sleep properly, maybe too much coffee or phone"');
    return;
  }

  const originalQuery = process.argv.slice(2).join(' ');
  
  const semanticSearch = new SemanticSearchFiltered();
  
  try {
    const result = await semanticSearch.searchCandidates('./temp-candidates.json', originalQuery);
    
    // Save final results
    fs.writeFileSync('./temp-final-results.json', JSON.stringify(result, null, 2));
    console.log('\n💾 Final results saved to temp-final-results.json');
    
    return result;
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Export for use in other scripts
module.exports = SemanticSearchFiltered;

// Run test if called directly
if (require.main === module) {
  testSemanticSearchFiltered().catch(console.error);
}