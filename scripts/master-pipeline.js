/**
 * Master Pipeline: Weighted Search System
 * 
 * Runs all 4 steps of the intelligent app discovery pipeline:
 * 1. LLM Analysis (with weighted categorization)
 * 2. Keyword Processing (priority-based) 
 * 3. Database Filtering (weighted search)
 * 4. Semantic Search (on filtered candidates)
 */

const LLMAnalyzer = require('./step1-llm-analysis');
const KeywordProcessor = require('./step2-keyword-processing');
const DatabaseFilter = require('./step3-database-filtering');
const SemanticSearchFiltered = require('./step4-semantic-search');
const fs = require('fs');

class MasterPipeline {
  constructor() {
    this.llmAnalyzer = new LLMAnalyzer();
    this.keywordProcessor = new KeywordProcessor();
    this.databaseFilter = new DatabaseFilter();
    this.semanticSearch = new SemanticSearchFiltered();
  }

  /**
   * Run the complete weighted search pipeline
   */
  async runPipeline(userQuery, options = {}) {
    const {
      limit = 15,
      saveIntermediateFiles = true,
      showDetailedLogs = true
    } = options;

    console.log('🚀 MASTER PIPELINE: Weighted Search System');
    console.log('=' .repeat(80));
    console.log(`Query: "${userQuery}"`);
    console.log(`Target Results: ${limit} apps\n`);

    const pipeline = {
      start_time: Date.now(),
      query: userQuery,
      steps: {},
      final_results: null
    };

    try {
      // STEP 1: LLM Analysis with Weighted Categories
      console.log('🧠 STEP 1: LLM Analysis & Weighted Categorization');
      console.log('-' .repeat(50));
      const step1Start = Date.now();
      
      const analysis = await this.llmAnalyzer.analyzeQuery(userQuery);
      pipeline.steps.llm_analysis = {
        duration: Date.now() - step1Start,
        result: analysis,
        success: true
      };
      
      if (saveIntermediateFiles) {
        fs.writeFileSync('./temp-analysis.json', JSON.stringify(analysis, null, 2));
      }

      // STEP 2: Weighted Keyword Processing  
      console.log('\n🔍 STEP 2: Weighted Keyword Processing');
      console.log('-' .repeat(50));
      const step2Start = Date.now();
      
      const keywordData = this.keywordProcessor.processAnalysis();
      pipeline.steps.keyword_processing = {
        duration: Date.now() - step2Start,
        result: keywordData,
        success: true
      };
      
      if (saveIntermediateFiles) {
        fs.writeFileSync('./temp-keywords.json', JSON.stringify(keywordData, null, 2));
      }

      // STEP 3: Weighted Database Filtering
      console.log('\n🗃️ STEP 3: Weighted Database Filtering');
      console.log('-' .repeat(50));
      const step3Start = Date.now();
      
      const candidates = await this.databaseFilter.filterApps();
      pipeline.steps.database_filtering = {
        duration: Date.now() - step3Start,
        result: candidates,
        success: true,
        candidate_count: candidates.candidates?.length || 0
      };
      
      if (saveIntermediateFiles) {
        fs.writeFileSync('./temp-candidates.json', JSON.stringify(candidates, null, 2));
      }

      // STEP 4: Semantic Search on Filtered Candidates
      console.log('\n🎯 STEP 4: Semantic Search with Weighted Ranking');
      console.log('-' .repeat(50));
      const step4Start = Date.now();
      
      const finalResults = await this.semanticSearch.searchCandidates('./temp-candidates.json', userQuery);
      pipeline.steps.semantic_search = {
        duration: Date.now() - step4Start,
        result: finalResults,
        success: true,
        final_count: finalResults.results?.length || 0
      };

      // Apply weighted ranking to final results
      if (finalResults.results) {
        finalResults.results = this.applyWeightedRanking(
          finalResults.results, 
          keywordData.search_terms,
          analysis.weighted_keywords
        );
      }

      pipeline.final_results = finalResults;
      pipeline.total_duration = Date.now() - pipeline.start_time;

      // FINAL ANALYSIS
      this.analyzePipelineResults(pipeline, showDetailedLogs);

      if (saveIntermediateFiles) {
        fs.writeFileSync('./temp-pipeline-results.json', JSON.stringify(pipeline, null, 2));
        console.log('\n💾 Complete pipeline results saved to temp-pipeline-results.json');
      }

      return pipeline;

    } catch (error) {
      console.error(`❌ Pipeline failed: ${error.message}`);
      pipeline.error = error.message;
      pipeline.total_duration = Date.now() - pipeline.start_time;
      
      return pipeline;
    }
  }

  /**
   * Apply weighted ranking to final semantic results
   */
  applyWeightedRanking(results, searchTerms, weightedKeywords) {
    console.log('\n⚖️ Applying weighted ranking to results...');
    
    return results.map(app => {
      let weightedScore = app.similarity_score;
      let boostReasons = [];
      
      // Check which keyword categories this app matches
      const title = app.title.toLowerCase();
      const description = (app.description || '').toLowerCase();
      const appText = `${title} ${description}`;
      
      // Apply category-based boosts
      Object.entries(weightedKeywords).forEach(([category, data]) => {
        const categoryWeight = data.weight;
        const keywords = data.keywords || [];
        
        const matches = keywords.filter(keyword => 
          appText.includes(keyword.toLowerCase())
        );
        
        if (matches.length > 0) {
          const boost = 1 + (categoryWeight - 0.5) * 0.3; // Scale boost based on weight
          weightedScore *= boost;
          boostReasons.push(`${category} match (${categoryWeight}): ${matches.slice(0, 2).join(', ')}`);
        }
      });
      
      return {
        ...app,
        original_similarity: app.similarity_score,
        weighted_similarity: weightedScore,
        boost_reasons: boostReasons,
        weight_applied: boostReasons.length > 0
      };
    }).sort((a, b) => b.weighted_similarity - a.weighted_similarity);
  }

  /**
   * Analyze and display pipeline results
   */
  analyzePipelineResults(pipeline, showDetailedLogs) {
    console.log('\n' + '=' .repeat(80));
    console.log('📊 PIPELINE ANALYSIS');
    console.log('=' .repeat(80));
    
    // Performance metrics
    console.log('\n⚡ Performance:');
    Object.entries(pipeline.steps).forEach(([step, data]) => {
      console.log(`   ${step}: ${data.duration}ms`);
    });
    console.log(`   Total: ${pipeline.total_duration}ms`);
    
    // Data flow metrics
    console.log('\n📈 Data Flow:');
    console.log(`   LLM Categories: ${Object.keys(pipeline.steps.llm_analysis?.result?.weighted_keywords || {}).length}`);
    console.log(`   Keywords Generated: ${pipeline.steps.keyword_processing?.result?.processed_keywords?.all_keywords?.length || 0}`);
    console.log(`   Database Candidates: ${pipeline.steps.database_filtering?.candidate_count || 0}`);
    console.log(`   Final Results: ${pipeline.steps.semantic_search?.final_count || 0}`);
    
    // Quality analysis
    if (pipeline.final_results?.results) {
      const results = pipeline.final_results.results;
      console.log('\n🎯 Quality Analysis:');
      
      const avgSimilarity = results.reduce((sum, app) => sum + (app.weighted_similarity || app.similarity_score), 0) / results.length;
      const topScore = results[0]?.weighted_similarity || results[0]?.similarity_score || 0;
      const withBoosts = results.filter(app => app.weight_applied).length;
      
      console.log(`   Average Similarity: ${avgSimilarity.toFixed(4)}`);
      console.log(`   Top Score: ${topScore.toFixed(4)}`);
      console.log(`   Apps with Weight Boosts: ${withBoosts}/${results.length}`);
      
      // Domain-specific analysis
      const domain = pipeline.steps.keyword_processing?.result?.processed_keywords?.primary_domain;
      if (domain === 'sleep') {
        const sleepApps = results.filter(app => {
          const text = `${app.title} ${app.description || ''}`.toLowerCase();
          return text.includes('sleep') || text.includes('meditation') || text.includes('rest');
        });
        console.log(`   Sleep-related apps: ${sleepApps.length}/${results.length} (${(sleepApps.length/results.length*100).toFixed(1)}%)`);
      }
    }
    
    // Top results preview
    if (showDetailedLogs && pipeline.final_results?.results) {
      console.log('\n🏆 TOP WEIGHTED RESULTS:');
      console.log('-' .repeat(50));
      pipeline.final_results.results.slice(0, 10).forEach((app, i) => {
        const boost = app.weight_applied ? ' ⚡' : '';
        console.log(`${i+1}. ${app.title}${boost}`);
        console.log(`   Weighted Score: ${(app.weighted_similarity || app.similarity_score).toFixed(4)}`);
        if (app.boost_reasons && app.boost_reasons.length > 0) {
          console.log(`   Boosts: ${app.boost_reasons[0]}`);
        }
        console.log('');
      });
    }
  }
}

// Test function
async function testMasterPipeline() {
  if (process.argv.length < 3) {
    console.log('Usage: node master-pipeline.js "your query here"');
    console.log('Example: node master-pipeline.js "i cant sleep properly, maybe too much coffee or phone"');
    return;
  }

  const query = process.argv.slice(2).join(' ');
  
  const pipeline = new MasterPipeline();
  
  try {
    const results = await pipeline.runPipeline(query, {
      limit: 15,
      saveIntermediateFiles: true,
      showDetailedLogs: true
    });
    
    if (results.error) {
      console.log(`\n❌ Pipeline failed: ${results.error}`);
      process.exit(1);
    } else {
      console.log('\n✅ Pipeline completed successfully!');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('💥 Pipeline error:', error.message);
    process.exit(1);
  }
}

// Export for use as module
module.exports = MasterPipeline;

// Run test if called directly
if (require.main === module) {
  testMasterPipeline();
}