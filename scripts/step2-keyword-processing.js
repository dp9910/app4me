/**
 * Step 2: Keyword Processing
 * Process LLM analysis output and generate optimized search keywords
 */

const fs = require('fs');

class KeywordProcessor {
  constructor() {
    // Define keyword priorities and categories for better app matching
    this.keywordCategories = {
      // Primary domain keywords - highest priority
      primary: {
        sleep: ['sleep', 'insomnia', 'rest', 'pillow', 'bedtime', 'dream'],
        finance: ['budget', 'expense', 'money', 'financial', 'cost', 'spending'],
        fitness: ['fitness', 'workout', 'exercise', 'health', 'gym', 'training'],
        photo: ['photo', 'image', 'picture', 'camera', 'edit', 'filter'],
        music: ['music', 'song', 'audio', 'sound', 'playlist', 'radio'],
        productivity: ['productivity', 'task', 'focus', 'organize', 'schedule']
      },
      
      // Solution keywords - what user wants to do
      solution: [
        'tracker', 'monitor', 'schedule', 'timer', 'reminder', 'guide',
        'coach', 'manager', 'planner', 'analyzer', 'detector', 'blocker'
      ],
      
      // Feature keywords - app capabilities
      features: [
        'meditation', 'relaxation', 'white noise', 'sounds', 'stories',
        'filter', 'limit', 'block', 'track', 'analyze', 'record'
      ]
    };
  }

  /**
   * Process weighted analysis and generate prioritized search keywords
   */
  processAnalysis(analysis) {
    console.log('🔍 Processing weighted keywords from LLM analysis...');
    console.log('=' .repeat(60));
    
    try {
      if (!analysis) {
        throw new Error('Analysis object must be provided to processAnalysis.');
      }
      console.log(`📋 Query Type: ${analysis.query_type}`);
      console.log(`📝 User Situation: ${analysis.user_situation.substring(0, 100)}...`);
      
      // Process weighted keywords if available
      let processedKeywords;
      if (analysis.weighted_keywords) {
        processedKeywords = this.processWeightedKeywords(analysis.weighted_keywords, analysis.query_type);
        console.log('✅ Using weighted keyword analysis');
      } else {
        // Fallback to old method
        processedKeywords = this.extractAndPrioritizeKeywords(analysis);
        console.log('⚠️ Using fallback keyword processing');
      }
      
      // Generate weighted database search terms
      const searchTerms = this.generateWeightedSearchTerms(processedKeywords, analysis.search_strategy);
      
      const result = {
        original_analysis: analysis,
        processed_keywords: processedKeywords,
        search_terms: searchTerms,
        timestamp: new Date().toISOString()
      };
      
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
      
      if (analysis.search_strategy) {
        console.log(`\n💡 Strategy: ${analysis.search_strategy.substring(0, 100)}...`);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Keyword processing failed:', error.message);
      throw error;
    }
  }

  /**
   * Process weighted keywords from LLM analysis (handles both problem and general queries)
   */
  processWeightedKeywords(weightedKeywords, queryType = 'problem') {
    const processed = {
      weighted_categories: {},
      all_keywords: [],
      primary_domain: null,
      query_type: queryType
    };
    
    // Process each weighted category
    Object.entries(weightedKeywords).forEach(([category, data]) => {
      const weight = data.weight || 0.5;
      const keywords = data.keywords || [];
      
      processed.weighted_categories[category] = {
        weight: weight,
        keywords: keywords,
        priority: this.calculatePriority(weight)
      };
      
      processed.all_keywords.push(...keywords);
    });
    
    // Domain detection differs by query type
    if (queryType === 'problem') {
      // For problem queries, detect domain from problem keywords
      const problemKeywords = processed.weighted_categories.problem?.keywords || [];
      processed.primary_domain = this.detectDomainFromKeywords(problemKeywords);
    } else {
      // For general queries, detect domain from primary keywords
      const primaryKeywords = processed.weighted_categories.primary?.keywords || [];
      processed.primary_domain = this.detectDomainFromKeywords(primaryKeywords, 'general');
    }
    
    // Remove duplicates
    processed.all_keywords = [...new Set(processed.all_keywords)];
    
    return processed;
  }

  /**
   * Calculate priority level from weight
   */
  calculatePriority(weight) {
    if (weight >= 0.9) return 'high';
    if (weight >= 0.7) return 'medium'; 
    return 'low';
  }

  /**
   * Detect domain from keywords (handles both problem and general queries)
   */
  detectDomainFromKeywords(keywords, queryType = 'problem') {
    const domainMap = {
      sleep: ['sleep', 'insomnia', 'rest', 'bedtime', 'dream'],
      finance: ['budget', 'money', 'expense', 'financial', 'spending'],
      fitness: ['fitness', 'workout', 'exercise', 'health', 'gym'],
      productivity: ['productivity', 'focus', 'distraction', 'time management'],
      // Additional domains for general queries
      'plant care': ['plants', 'plant', 'garden', 'gardening', 'flower', 'care', 'grow'],
      photography: ['photo', 'image', 'picture', 'camera', 'edit', 'photography'],
      music: ['music', 'song', 'audio', 'sound', 'playlist', 'radio'],
      cooking: ['food', 'recipe', 'cook', 'cooking', 'kitchen', 'meal'],
      travel: ['travel', 'trip', 'hotel', 'flight', 'vacation', 'tourism'],
      education: ['learn', 'study', 'education', 'course', 'lesson', 'tutorial']
    };
    
    for (const [domain, terms] of Object.entries(domainMap)) {
      if (keywords.some(keyword => terms.some(term => keyword.toLowerCase().includes(term)))) {
        console.log(`🎯 Detected domain: ${domain}`);
        return domain;
      }
    }
    
    return queryType === 'general' ? 'general' : 'general';
  }

  /**
   * Generate weighted search terms for database filtering (handles both problem and general queries)
   */
  generateWeightedSearchTerms(processedKeywords, strategy) {
    const categories = processedKeywords.weighted_categories || {};
    const queryType = processedKeywords.query_type || 'problem';
    
    let highPriority, mediumPriority, lowPriority;
    
    if (queryType === 'problem') {
      // Problem query structure: PROBLEM + SOLUTION (high), CAUSE (medium), CONTEXT (low)
      highPriority = [
        ...(categories.problem?.keywords || []),
        ...(categories.solution?.keywords || [])
      ];
      mediumPriority = [...(categories.cause?.keywords || [])];
      lowPriority = [...(categories.context?.keywords || [])];
      
    } else {
      // General query structure: PRIMARY + FUNCTIONAL (high), DESCRIPTIVE (medium), CONTEXT (low)
      highPriority = [
        ...(categories.primary?.keywords || []),
        ...(categories.functional?.keywords || [])
      ];
      mediumPriority = [...(categories.descriptive?.keywords || [])];
      lowPriority = [...(categories.context?.keywords || [])];
    }
    
    // Generate specific search strategies for each priority level
    const searchTerms = {
      high_priority: this.optimizeKeywordsForSearch([...new Set(highPriority)], 'high'),
      medium_priority: this.optimizeKeywordsForSearch([...new Set(mediumPriority)], 'medium'),
      low_priority: this.optimizeKeywordsForSearch([...new Set(lowPriority)], 'low'),
      
      // Legacy format for backward compatibility
      title_keywords: [...new Set(highPriority.slice(0, 5))],
      feature_keywords: [...new Set([...highPriority, ...mediumPriority].slice(0, 8))],
      description_keywords: [...new Set(highPriority.slice(0, 3))],
      
      weights: {
        high: 1.0,
        medium: 0.7,
        low: 0.5
      },
      
      query_type: queryType
    };
    
    return searchTerms;
  }

  /**
   * Optimize keywords for database search based on priority
   */
  optimizeKeywordsForSearch(keywords, priority) {
    // Filter out very long phrases for SQL search efficiency
    const optimized = keywords.filter(keyword => {
      const words = keyword.split(' ');
      return words.length <= 3; // Max 3 words for SQL ILIKE search
    });
    
    // For high priority, also add single-word versions of key phrases
    if (priority === 'high') {
      const singleWords = [];
      optimized.forEach(keyword => {
        if (keyword.includes(' ')) {
          const words = keyword.split(' ');
          words.forEach(word => {
            if (word.length > 3) {
              singleWords.push(word);
            }
          });
        }
      });
      optimized.push(...singleWords);
    }
    
    // Remove duplicates and return
    return [...new Set(optimized)];
  }

  /**
   * Extract and prioritize keywords from LLM analysis
   */
  extractAndPrioritizeKeywords(analysis) {
    const allKeywords = analysis.keywords || [];
    
    // Detect primary domain
    const primaryDomain = this.detectPrimaryDomain(allKeywords);
    
    // Categorize keywords
    const core = this.filterKeywordsByCategory(allKeywords, 'core', primaryDomain);
    const solution = this.filterKeywordsByCategory(allKeywords, 'solution');
    const features = this.filterKeywordsByCategory(allKeywords, 'features');
    
    // Additional processing for specific domains
    const domainSpecific = this.extractDomainSpecificKeywords(analysis, primaryDomain);
    
    return {
      primary_domain: primaryDomain,
      core: [...new Set([...core, ...domainSpecific])], // Remove duplicates
      solution: solution,
      features: features,
      all_original: allKeywords
    };
  }

  /**
   * Detect the primary domain from keywords
   */
  detectPrimaryDomain(keywords) {
    const keywordSet = new Set(keywords.map(k => k.toLowerCase()));
    
    for (const [domain, domainKeywords] of Object.entries(this.keywordCategories.primary)) {
      const matches = domainKeywords.filter(dk => keywordSet.has(dk)).length;
      if (matches > 0) {
        console.log(`🎯 Detected domain: ${domain} (${matches} matches)`);
        return domain;
      }
    }
    
    return null;
  }

  /**
   * Filter keywords by category
   */
  filterKeywordsByCategory(keywords, category, primaryDomain = null) {
    const keywordSet = new Set(keywords.map(k => k.toLowerCase()));
    
    if (category === 'core' && primaryDomain) {
      // Return domain-specific core keywords
      const domainKeywords = this.keywordCategories.primary[primaryDomain] || [];
      return domainKeywords.filter(dk => keywordSet.has(dk));
    }
    
    if (category === 'solution') {
      return keywords.filter(k => 
        this.keywordCategories.solution.some(sk => k.toLowerCase().includes(sk))
      );
    }
    
    if (category === 'features') {
      return keywords.filter(k => 
        this.keywordCategories.features.some(fk => k.toLowerCase().includes(fk))
      );
    }
    
    return [];
  }

  /**
   * Extract domain-specific keywords from user situation and root cause
   */
  extractDomainSpecificKeywords(analysis, primaryDomain) {
    const text = `${analysis.user_situation} ${analysis.root_cause || ''}`.toLowerCase();
    const extracted = [];
    
    // Domain-specific extraction patterns
    const patterns = {
      sleep: {
        problems: ['insomnia', 'sleepless', 'tired', 'fatigue', 'restless'],
        solutions: ['pillow', 'meditation', 'relaxation', 'sounds'],
        causes: ['caffeine', 'coffee', 'screen', 'phone', 'blue light']
      },
      finance: {
        problems: ['debt', 'broke', 'expensive', 'overspending'],
        solutions: ['budget', 'saving', 'tracking'],
        causes: ['impulse', 'credit card', 'subscription']
      }
    };
    
    if (primaryDomain && patterns[primaryDomain]) {
      const domainPatterns = patterns[primaryDomain];
      
      // Extract problem-specific terms
      Object.values(domainPatterns).flat().forEach(term => {
        if (text.includes(term) && !extracted.includes(term)) {
          extracted.push(term);
        }
      });
    }
    
    return extracted;
  }

  /**
   * Generate optimized database search terms
   */
  generateSearchTerms(processedKeywords) {
    // Title keywords - most specific terms for title matching
    const titleKeywords = [
      ...processedKeywords.core.slice(0, 3), // Top 3 core terms
      ...processedKeywords.solution.slice(0, 2) // Top 2 solution terms
    ].filter(Boolean);
    
    // Feature keywords - broader terms for app_features table
    const featureKeywords = [
      ...processedKeywords.core,
      ...processedKeywords.features,
      // Add variations and synonyms
      ...this.generateSynonyms(processedKeywords.core.slice(0, 2))
    ].filter(Boolean);
    
    // Description keywords - focused terms for description search
    const descriptionKeywords = [
      ...processedKeywords.core.slice(0, 3),
      ...processedKeywords.solution.slice(0, 2),
      // Add specific problem-solution pairs
      ...this.generateProblemSolutionPairs(processedKeywords)
    ].filter(Boolean);
    
    return {
      title_keywords: [...new Set(titleKeywords)],
      feature_keywords: [...new Set(featureKeywords)],
      description_keywords: [...new Set(descriptionKeywords)]
    };
  }

  /**
   * Generate synonyms for core keywords
   */
  generateSynonyms(coreKeywords) {
    const synonymMap = {
      sleep: ['rest', 'nap', 'bedtime', 'slumber'],
      budget: ['money', 'finance', 'expense', 'cost'],
      fitness: ['health', 'exercise', 'workout'],
      photo: ['image', 'picture', 'photography'],
      music: ['audio', 'sound', 'song']
    };
    
    const synonyms = [];
    coreKeywords.forEach(keyword => {
      if (synonymMap[keyword]) {
        synonyms.push(...synonymMap[keyword]);
      }
    });
    
    return synonyms;
  }

  /**
   * Generate problem-solution keyword pairs
   */
  generateProblemSolutionPairs(processedKeywords) {
    const pairs = [];
    
    // If core contains "sleep", add sleep-specific solutions
    if (processedKeywords.core.includes('sleep')) {
      pairs.push('sleep tracker', 'sleep sounds', 'sleep timer', 'sleep schedule');
    }
    
    if (processedKeywords.core.includes('budget')) {
      pairs.push('expense tracker', 'budget planner', 'money manager');
    }
    
    return pairs;
  }
}

// Test function
async function testKeywordProcessing() {
  const processor = new KeywordProcessor();
  
  try {
    const result = processor.processAnalysis();
    
    // Save processed keywords for next step
    fs.writeFileSync('./temp-keywords.json', JSON.stringify(result, null, 2));
    console.log('\n💾 Processed keywords saved to temp-keywords.json');
    
    return result;
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Export for use in other scripts
module.exports = KeywordProcessor;

// Run test if called directly
if (require.main === module) {
  testKeywordProcessing().catch(console.error);
}