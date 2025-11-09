console.log('--- EXECUTING LATEST VERSION OF step2-keyword-processing.js ---');

/**
 * Step 2: Keyword Processing
 * Process LLM analysis output and generate optimized search keywords
 */

const fs = require('fs');

class KeywordProcessor {
  /**
   * Main function to process the analysis from Step 1.
   * @param {object} analysis - The output from LLMAnalyzer.
   * @returns {object} - An object containing processed keywords and search terms.
   */
  processAnalysis(analysis) {
    if (!analysis || !analysis.weighted_keywords) {
      throw new Error('Invalid analysis object provided to processAnalysis.');
    }

    console.log('🔍 Processing weighted keywords from LLM analysis...');
    console.log('=' .repeat(60));
    console.log(`📋 Query Type: ${analysis.query_type}`);
    console.log(`📝 User Situation: ${analysis.user_situation.substring(0, 100)}...`);

    const processedKeywords = this.processWeightedKeywords(analysis.weighted_keywords, analysis.query_type);
    const searchTerms = this.generateWeightedSearchTerms(processedKeywords);

    console.log('\n📊 Weighted Keyword Processing:');
    console.log('=' .repeat(40));
    Object.entries(processedKeywords.weighted_categories || {}).forEach(([category, data]) => {
      console.log(`${category.toUpperCase()} (${data.weight}): ${data.keywords.slice(0, 4).join(', ')}${data.keywords.length > 4 ? '...' : ''}`);
    });

    console.log('\n🎯 Prioritized Database Search:');
    console.log('=' .repeat(40));
    console.log(`High Priority: ${searchTerms.high_priority.slice(0, 5).join(', ')}`);
    console.log(`Medium Priority: ${searchTerms.medium_priority.slice(0, 5).join(', ')}`);
    console.log(`Low Priority: ${searchTerms.low_priority.slice(0, 3).join(', ')}`);

    return {
      original_analysis: analysis,
      processed_keywords: processedKeywords,
      search_terms: searchTerms,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Normalizes the weighted keywords from the LLM.
   * @param {object} weightedKeywords - The weighted_keywords object from the LLM.
   * @param {string} queryType - The query type from the LLM.
   * @returns {object} - A standardized object with lowercase categories.
   */
  processWeightedKeywords(weightedKeywords, queryType) {
    const processed = {
      weighted_categories: {},
      all_keywords: [],
      query_type: queryType || 'problem'
    };

    for (const [category, data] of Object.entries(weightedKeywords)) {
      const lowerCategory = category.toLowerCase();
      processed.weighted_categories[lowerCategory] = {
        weight: data.weight || 0.5,
        keywords: data.keywords || []
      };
      processed.all_keywords.push(...(data.keywords || []));
    }

    processed.all_keywords = [...new Set(processed.all_keywords)];
    return processed;
  }

  /**
   * Generates prioritized keyword arrays for the database search.
   * @param {object} processedKeywords - The output of processWeightedKeywords.
   * @returns {object} - An object with high, medium, and low priority keyword arrays.
   */
  generateWeightedSearchTerms(processedKeywords) {
    const categories = processedKeywords.weighted_categories;
    const queryType = processedKeywords.query_type;

    let highPriority = [];
    let mediumPriority = [];
    let lowPriority = [];

    // Default to 'problem' structure for any non-general query type
    if (queryType !== 'general') {
      highPriority = [
        ...(categories.problem?.keywords || []),
        ...(categories.solution?.keywords || [])
      ];
      mediumPriority = [...(categories.cause?.keywords || [])];
      lowPriority = [...(categories.context?.keywords || [])];
    } else {
      // Handle 'general' query structure
      highPriority = [
        ...(categories.primary?.keywords || []),
        ...(categories.functional?.keywords || [])
      ];
      mediumPriority = [...(categories.descriptive?.keywords || [])];
      lowPriority = [...(categories.context?.keywords || [])];
    }

    return {
      high_priority: [...new Set(highPriority)],
      medium_priority: [...new Set(mediumPriority)],
      low_priority: [...new Set(lowPriority)]
    };
  }
}

module.exports = KeywordProcessor;

// Standalone test function
if (require.main === module) {
  const testAnalysis = {
    "query_type": "relocation_social",
    "user_situation": "The user has recently moved to a new town and is looking to build a social circle and familiarize themselves with the local area.",
    "weighted_keywords": {
      "PROBLEM": { "weight": 1, "keywords": ["new in town", "make friends"] },
      "SOLUTION": { "weight": 0.9, "keywords": ["meet people", "local events"] },
      "CAUSE": { "weight": 0.7, "keywords": ["relocation", "isolation"] },
      "CONTEXT": { "weight": 0.5, "keywords": ["social", "community"] }
    }
  };

  const processor = new KeywordProcessor();
  const result = processor.processAnalysis(testAnalysis);
  fs.writeFileSync('./temp-keywords.json', JSON.stringify(result, null, 2));
  console.log('\n💾 Standalone test complete. Processed keywords saved to temp-keywords.json');
}
