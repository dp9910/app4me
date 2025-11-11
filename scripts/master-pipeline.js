// master-pipeline.js

const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const EventEmitter = require('events');
require('dotenv').config({ path: '.env.local' });

// --- ProgressTracker Class for Real-time UI Updates ---
class ProgressTracker extends EventEmitter {
  constructor(sessionId) {
    super();
    this.sessionId = sessionId;
    this.currentStep = 0;
    this.totalSteps = 6;
    this.steps = [
      { id: 'query_analysis', name: 'Query Analysis & Classification', icon: 'psychology', status: 'pending' },
      { id: 'keyword_processing', name: 'Weighted Keyword Processing', icon: 'label', status: 'pending' },
      { id: 'diversified_search', name: 'Diversified Category Search', icon: 'hub', status: 'pending' },
      { id: 'category_filtering', name: 'Category-Specific Filtering', icon: 'filter_alt', status: 'pending' },
      { id: 'semantic_ranking', name: 'AI Semantic Ranking', icon: 'auto_awesome', status: 'pending' },
      { id: 'final_selection', name: 'Weighted Final Selection', icon: 'verified', status: 'pending' }
    ];
    this.data = {
      query: '',
      query_type: null,
      categories: {},
      search_stats: {},
      final_results: []
    };
    this.startTime = Date.now();
  }

  updateStep(stepId, status, data = {}) {
    const step = this.steps.find(s => s.id === stepId);
    if (step) {
      step.status = status;
      step.data = { ...step.data, ...data };
      step.timestamp = Date.now();
      
      if (status === 'running') {
        this.currentStep = this.steps.findIndex(s => s.id === stepId);
      }

      // Merge step-specific data into global data
      Object.assign(this.data, data);
      
      const progress = {
        sessionId: this.sessionId,
        currentStep: this.currentStep,
        totalSteps: this.totalSteps,
        steps: this.steps,
        data: this.data,
        elapsed: Date.now() - this.startTime
      };

      // Emit for real-time updates (WebSocket/SSE)
      this.emit('progress', progress);
      
      // Also save to temp file for polling fallback
      fs.writeFileSync(`./temp-progress-${this.sessionId}.json`, JSON.stringify(progress, null, 2));
      
      console.log(`📡 Progress Update: ${stepId} → ${status}`);
    }
  }

  complete(finalResults) {
    this.data.final_results = finalResults;
    this.updateStep('final_selection', 'completed', {
      final_results: finalResults,
      total_duration: Date.now() - this.startTime
    });
    
    this.emit('completed', {
      sessionId: this.sessionId,
      results: finalResults,
      duration: Date.now() - this.startTime
    });
  }

  error(stepId, error) {
    this.updateStep(stepId, 'error', { error: error.message });
    this.emit('error', {
      sessionId: this.sessionId,
      step: stepId,
      error: error.message
    });
  }
}

// --- LLMAnalyzer Class Definition (from step1-llm-analysis.js) ---
class LLMAnalyzer {
  constructor() {
    this.openai = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY,
    });
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.geminiModel = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  }

  async analyzeQuery(userQuery) {
    console.log(`🧠 Analyzing query: "${userQuery}"`);
    console.log('=' .repeat(60));
    
    try {
      const classification = await this.classifyQuery(userQuery);
      console.log(`📋 Query Type: ${classification.query_type}`);
      
      let analysis;
      if (classification.query_type === 'problem') {
        console.log('🔍 Getting detailed problem analysis...');
        analysis = await this.getDetailedAnalysis(userQuery);
      } else {
        console.log('🔍 Getting detailed general search analysis...');
        analysis = await this.getDetailedGeneralAnalysis(userQuery);
      }
      
      console.log('\n📊 Analysis Results:');
      console.log('=' .repeat(40));
      console.log(`User Situation: ${analysis.user_situation}`);
      console.log(`Root Cause: ${analysis.root_cause || 'N/A'}`);
      console.log(`Urgency: ${analysis.urgency || 'N/A'}`);
      
      if (analysis.weighted_keywords) {
        console.log('\n🎯 Weighted Keywords:');
        console.log('-' .repeat(30));
        Object.entries(analysis.weighted_keywords).forEach(([category, data]) => {
          const weight = data.weight || 'N/A';
          const keywords = data.keywords || [];
          console.log(`${category.toUpperCase()} (${weight}): ${keywords.slice(0, 5).join(', ')}${keywords.length > 5 ? '...' : ''}`);
        });
        
        if (analysis.search_strategy) {
          console.log(`\n💡 Search Strategy: ${analysis.search_strategy}`);
        }
      }
      
      return analysis;
      
    } catch (error) {
      console.error('❌ LLM Analysis failed:', error.message);
      
      const keywords = this.extractBasicKeywords(userQuery);
      return {
        query_type: 'general',
        user_situation: `User is looking for apps related to: ${userQuery}`,
        root_cause: 'Various factors',
        urgency: 'short-term',
        keywords: keywords,
        weighted_keywords: {
          problem: { weight: 1.0, keywords: keywords.slice(0, 2) },
          solution: { weight: 0.9, keywords: [] },
          cause: { weight: 0.7, keywords: [] },
          context: { weight: 0.5, keywords: keywords.slice(2) }
        },
        search_strategy: 'Fallback analysis - basic keyword extraction',
        fallback: true
      };
    }
  }

  async classifyQuery(userQuery) {
    const quickPrompt = `Is this query a PROBLEM (personal issue) or GENERAL (app category)?
Query: "${userQuery}"

PROBLEM = "can't sleep", "stressed", "budget mess", "can't focus"
GENERAL = "fitness apps", "photo apps", "music apps"

Return: {"query_type": "problem"} or {"query_type": "general"}`;

    try {
      const response = await Promise.race([
        this.openai.chat.completions.create({
          model: "deepseek-chat",
          messages: [{ role: "user", content: quickPrompt }],
          max_tokens: 50,
          temperature: 0.3
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Classification timeout')), 5000)
        )
      ]);

      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not extract JSON from classification');
      }
    } catch (error) {
      console.error('⚠️ Classification failed, defaulting to general');
      return { query_type: 'general' };
    }
  }

  async getDetailedAnalysis(userQuery) {
    const detailedPrompt = `You are an expert app store curator helping users find the perfect apps. Analyze this user's query: "${userQuery}"

Your job is to categorize keywords by importance for app discovery, thinking like an app store search expert.

CATEGORIZE KEYWORDS BY PURPOSE:

**PROBLEM Keywords (Weight 1.0 - HIGHEST PRIORITY)**
- What the user is experiencing/struggling with
- Core symptoms or issues they want to solve
- Primary pain points
- Examples: "sleep", "insomnia", "budget mess", "anxiety", "productivity"

**SOLUTION Keywords (Weight 0.9 - VERY HIGH PRIORITY)** 
- Direct actions/tools that solve the problem
- What the user wants to DO or ACHIEVE
- App functionality they need
- Examples: "track", "meditate", "schedule", "block", "monitor", "plan"

**CAUSE Keywords (Weight 0.7 - MEDIUM PRIORITY)**
- Root causes or triggers of the problem  
- What's making the problem worse
- Environmental/behavioral factors to address
- Examples: "caffeine", "phone", "stress", "overspending", "procrastination"

**CONTEXT Keywords (Weight 0.5 - LOW PRIORITY)**
- Related concepts, general domain terms
- Supporting information
- Broad category terms
- Examples: "wellness", "lifestyle", "productivity", "health"

THINK STRATEGICALLY:
- Problem keywords find apps that directly address the core issue
- Solution keywords find apps with specific helpful features  
- Cause keywords find apps that address root causes
- Context keywords provide supporting/related apps

Return JSON:
{
  "query_type": "problem",
  "user_situation": "clear description of what user is experiencing",
  "root_cause": "analysis of underlying causes",
  "urgency": "immediate|short-term|long-term",
  "weighted_keywords": {
    "problem": {
      "weight": 1.0,
      "keywords": ["primary", "issue", "symptoms"]
    },
    "solution": {
      "weight": 0.9, 
      "keywords": ["actions", "tools", "features"]
    },
    "cause": {
      "weight": 0.7,
      "keywords": ["triggers", "root", "causes"] 
    },
    "context": {
      "weight": 0.5,
      "keywords": ["related", "domain", "terms"]
    }
  },
  "search_strategy": "brief explanation of which keywords should find the best apps"
}

Focus on keywords that would actually find relevant apps in app stores. Think about app titles, descriptions, and features.`;

    try {
      const result = await Promise.race([
        this.geminiModel.generateContent({
          contents: [{ role: "user", parts: [{ text: detailedPrompt }] }],
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.3
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Detailed analysis timeout')), 8000)
        )
      ]);

      const content = result.response.text();
      
      let jsonMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      let jsonText;
      
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      } else {
        const plainMatch = content.match(/\{[\s\S]*\}/);
        jsonText = plainMatch ? plainMatch[0] : null;
      }
      
      if (jsonText) {
        const analysis = JSON.parse(jsonText);
        
        if (analysis.weighted_keywords) {
          const allKeywords = [];
          Object.values(analysis.weighted_keywords).forEach(category => {
            if (category.keywords) {
              allKeywords.push(...category.keywords);
            }
          });
          analysis.keywords = [...new Set(allKeywords)];
        }
        
        return analysis;
      } else {
        throw new Error('Could not extract JSON from detailed response');
      }
      
    } catch (error) {
      console.error('⚠️ Detailed analysis failed:', error.message);
      
      const keywords = this.extractBasicKeywords(userQuery);
      return {
        query_type: 'problem',
        user_situation: `User is experiencing issues with ${keywords.slice(0, 2).join(' and ')}`,
        root_cause: 'Various lifestyle or behavioral factors',
        urgency: 'short-term',
        keywords: keywords,
        weighted_keywords: {
          problem: { weight: 1.0, keywords: keywords.slice(0, 2) },
          solution: { weight: 0.9, keywords: ['tracker', 'help'] },
          cause: { weight: 0.7, keywords: keywords.slice(2, 4) },
          context: { weight: 0.5, keywords: ['lifestyle', 'wellness'] }
        },
        search_strategy: 'Basic keyword extraction fallback - prioritizing main terms from query'
      };
    }
  }

  async getDetailedGeneralAnalysis(userQuery) {
    const generalPrompt = `You are an expert app store curator helping users find the perfect apps. Analyze this general app search query: "${userQuery}"

Your job is to understand what the user wants and create smart keyword categories for effective app discovery.

CATEGORIZE KEYWORDS BY PURPOSE:

**PRIMARY Keywords (Weight 1.0 - HIGHEST PRIORITY)**
- Main category or functionality the user wants
- Core app purpose or domain
- Examples: "plants", "fitness", "photo editing", "meditation", "budget"

**FUNCTIONAL Keywords (Weight 0.9 - VERY HIGH PRIORITY)** 
- Specific features or actions they want to perform
- What the app should DO or ENABLE
- Examples: "care guide", "track workouts", "edit photos", "manage money"

**DESCRIPTIVE Keywords (Weight 0.7 - MEDIUM PRIORITY)**
- Qualifiers, styles, or specific requirements
- How they want it done or what type
- Examples: "beginner friendly", "professional", "simple", "advanced"

**CONTEXT Keywords (Weight 0.5 - LOW PRIORITY)**
- Related concepts and broader category terms
- Supporting information
- Broad category terms
- Examples: "wellness", "lifestyle", "productivity", "health"

THINK STRATEGICALLY:
- Primary keywords find apps in the right category/domain
- Functional keywords find apps with specific helpful features  
- Descriptive keywords help filter for the right style/level
- Context keywords provide fallback options if needed

Return JSON:
{
  "query_type": "general",
  "user_intent": "clear description of what the user is looking for",
  "app_category": "primary category or domain (e.g., 'plant care', 'fitness', 'photo editing')",
  "search_focus": "specific focus or functionality they want",
  "weighted_keywords": {
    "primary": {
      "weight": 1.0,
      "keywords": ["main", "category", "terms"]
    },
    "functional": {
      "weight": 0.9, 
      "keywords": ["features", "actions", "functions"]
    },
    "descriptive": {
      "weight": 0.7,
      "keywords": ["qualifiers", "style", "requirements"] 
    },
    "context": {
      "weight": 0.5,
      "keywords": ["related", "broader", "terms"]
    }
  },
  "search_strategy": "brief explanation of how to find the best apps using these keywords"
}

Focus on keywords that would actually find relevant apps in app stores. Think about app titles, descriptions, and categories.`;

    try {
      const result = await Promise.race([
        this.geminiModel.generateContent({
          contents: [{ role: "user", parts: [{ text: generalPrompt }] }],
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.3
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('General analysis timeout')), 8000)
        )
      ]);

      const content = result.response.text();
      
      let jsonMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      let jsonText;
      
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      } else {
        const plainMatch = content.match(/\{[\s\S]*\}/);
        jsonText = plainMatch ? plainMatch[0] : null;
      }
      
      if (jsonText) {
        const analysis = JSON.parse(jsonText);
        
        if (analysis.weighted_keywords) {
          const allKeywords = [];
          Object.values(analysis.weighted_keywords).forEach(category => {
            if (category.keywords) {
              allKeywords.push(...category.keywords);
            }
          });
          analysis.keywords = [...new Set(allKeywords)];
        }
        
        analysis.urgency = analysis.urgency || null;
        analysis.root_cause = null;
        analysis.user_situation = analysis.user_intent || `Looking for ${userQuery} apps`;
        
        return analysis;
      } else {
        throw new Error('Could not extract JSON from general analysis response');
      }
      
    } catch (error) {
      console.error('⚠️ General analysis failed:', error.message);
      
      const keywords = this.extractSmartGeneralKeywords(userQuery);
      return {
        query_type: 'general',
        user_situation: `User is looking for ${userQuery} apps`,
        user_intent: `Find apps related to ${userQuery}`,
        app_category: this.detectAppCategory(keywords),
        search_focus: keywords[0] || userQuery,
        root_cause: null,
        urgency: null,
        keywords: keywords,
        weighted_keywords: {
          primary: { weight: 1.0, keywords: keywords.slice(0, 2) },
          functional: { weight: 0.9, keywords: [] },
          descriptive: { weight: 0.7, keywords: keywords.slice(2, 4) },
          context: { weight: 0.5, keywords: keywords.slice(4) }
        },
        search_strategy: 'Enhanced general search - prioritizing main category and functional terms',
        fallback: true
      };
    }
  }

  extractSmartGeneralKeywords(query) {
    const stopWords = new Set(['i', 'want', 'need', 'help', 'me', 'to', 'a', 'an', 'the', 'and', 'or', 'but', 'app', 'apps', 'for', 'of', 'with', 'my', 'that', 'can']);
    
    const words = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));

    const categoryKeywords = {
      plant: ['plant', 'garden', 'flower', 'care', 'grow', 'water', 'indoor', 'gardening'],
      fitness: ['fitness', 'workout', 'exercise', 'health', 'gym', 'training', 'run', 'cycling'],
      photo: ['photo', 'image', 'picture', 'camera', 'edit', 'filter', 'photography'],
      music: ['music', 'song', 'audio', 'sound', 'playlist', 'radio', 'streaming'],
      food: ['food', 'recipe', 'cook', 'cooking', 'kitchen', 'meal', 'restaurant'],
      finance: ['money', 'budget', 'expense', 'financial', 'bank', 'payment', 'investment'],
      travel: ['travel', 'trip', 'hotel', 'flight', 'booking', 'vacation', 'tourism'],
      education: ['learn', 'study', 'education', 'course', 'lesson', 'tutorial', 'language']
    };

    let primaryCategory = null;
    for (const [category, catWords] of Object.entries(categoryKeywords)) {
      if (words.some(word => catWords.includes(word))) {
        primaryCategory = category;
        break;
      }
    }

    const smartKeywords = [];
    
    smartKeywords.push(...words.slice(0, 3));
    
    if (primaryCategory && categoryKeywords[primaryCategory]) {
      const relevantSynonyms = categoryKeywords[primaryCategory]
        .filter(syn => !smartKeywords.includes(syn))
        .slice(0, 2);
      smartKeywords.push(...relevantSynonyms);
    }
    
    return [...new Set(smartKeywords)];
  }

  detectAppCategory(keywords) {
    const categoryMap = {
      'plant care': ['plant', 'garden', 'flower', 'care', 'grow'],
      'fitness': ['fitness', 'workout', 'exercise', 'health', 'gym'],
      'photography': ['photo', 'image', 'picture', 'camera', 'edit'],
      'music': ['music', 'song', 'audio', 'sound', 'playlist'],
      'cooking': ['food', 'recipe', 'cook', 'cooking', 'kitchen'],
      'finance': ['money', 'budget', 'expense', 'financial', 'bank'],
      'travel': ['travel', 'trip', 'hotel', 'flight', 'vacation'],
      'education': ['learn', 'study', 'education', 'course', 'lesson']
    };

    for (const [category, terms] of Object.entries(categoryMap)) {
      if (keywords.some(keyword => terms.some(term => keyword.includes(term)))) {
        return category;
      }
    }
    
    return 'general';
  }

  extractBasicKeywords(query) {
    const stopWords = new Set(['i', 'want', 'need', 'help', 'me', 'to', 'a', 'an', 'the', 'and', 'or', 'but', 'app', 'apps', 'for', 'cant', 'too', 'much', 'with', 'my']);
    
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 5);
  }
}

// --- KeywordProcessor Class Definition (from step2-keyword-processing.js) ---
class KeywordProcessor {
  constructor() {
    this.generateWeightedSearchTerms = this.generateWeightedSearchTerms.bind(this);
  }
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

  generateWeightedSearchTerms(processedKeywords) {
    const categories = processedKeywords.weighted_categories;
    const queryType = processedKeywords.query_type;

    let highPriority = [];
    let mediumPriority = [];
    let lowPriority = [];

    if (queryType !== 'general') {
      if (categories && categories.problem && categories.problem.keywords) {
        highPriority = highPriority.concat(categories.problem.keywords);
      }
      if (categories && categories.solution && categories.solution.keywords) {
        highPriority = highPriority.concat(categories.solution.keywords);
      }
      if (categories && categories.cause && categories.cause.keywords) {
        mediumPriority = mediumPriority.concat(categories.cause.keywords);
      }
      if (categories && categories.context && categories.context.keywords) {
        lowPriority = lowPriority.concat(categories.context.keywords);
      }
    } else {
      if (categories && categories.primary && categories.primary.keywords) {
        highPriority = highPriority.concat(categories.primary.keywords);
      }
      if (categories && categories.functional && categories.functional.keywords) {
        highPriority = highPriority.concat(categories.functional.keywords);
      }
      if (categories && categories.descriptive && categories.descriptive.keywords) {
        mediumPriority = mediumPriority.concat(categories.descriptive.keywords);
      }
      if (categories && categories.context && categories.context.keywords) {
        lowPriority = lowPriority.concat(categories.context.keywords);
      }
    }

    return {
      high_priority: [...new Set(highPriority)],
      medium_priority: [...new Set(mediumPriority)],
      low_priority: [...new Set(lowPriority)]
    };
  }
}

// --- DatabaseFilter Class Definition (from step3-database-filtering.js) ---
class DatabaseFilter {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }

  async filterApps(keywordData) {
    console.log('🗃️ Filtering apps from database...');
    console.log('=' .repeat(60));
    
    try {
      if (!keywordData || !keywordData.search_terms) {
        throw new Error('Keyword data with search_terms must be provided to filterApps.');
      }

      // Use new diversified search approach
      if (keywordData.original_analysis && keywordData.original_analysis.weighted_keywords) {
        return await this.filterAppsDiversified(keywordData);
      }

      // Fallback to old approach if no weighted keywords
      const { high_priority, medium_priority, low_priority } = keywordData.search_terms;
      const primaryDomain = keywordData.processed_keywords.primary_domain;
      
      console.log(`🎯 Primary Domain: ${primaryDomain || 'general'}`);
      console.log(`⚖️ Using weighted priority search hierarchy`);
      
      console.log(`\n🔥 HIGH PRIORITY: ${high_priority.slice(0, 5).join(', ')}${high_priority.length > 5 ? '...' : ''}`);
      const highPriorityCandidates = await this.searchWithKeywords(high_priority, 'HIGH', 30);
      
      let allCandidates = [...highPriorityCandidates];
      console.log(`✅ Found ${highPriorityCandidates.length} HIGH priority candidates`);
      
      if (allCandidates.length < 20) {
        if (medium_priority.length > 0) {
          console.log(`\n🔶 MEDIUM PRIORITY: ${medium_priority.join(', ')}`);
          const mediumPriorityCandidates = await this.searchWithKeywords(medium_priority, 'MEDIUM', 15);
          
          const combined = [
            ...allCandidates.map(app => ({ ...app, priority_level: 'HIGH' })),
            ...mediumPriorityCandidates.map(app => ({ ...app, priority_level: 'MEDIUM' }))
          ];
          allCandidates = this.combineAndDeduplicate(combined);
          
          console.log(`✅ Added ${mediumPriorityCandidates.length} MEDIUM priority candidates (Total: ${allCandidates.length})`);
        }
      }
      
      if (allCandidates.length < 15) {
        if (low_priority.length > 0) {
          console.log(`\n🔹 LOW PRIORITY: ${low_priority.slice(0, 3).join(', ')}`);
          const lowPriorityCandidates = await this.searchWithKeywords(low_priority, 'LOW', 10);
          
          const combined = [
            ...allCandidates.map(app => ({ ...app, priority_level: app.priority_level || 'HIGH' })),
            ...lowPriorityCandidates.map(app => ({ ...app, priority_level: 'LOW' }))
          ];
          allCandidates = this.combineAndDeduplicate(combined);
          
          console.log(`✅ Added ${lowPriorityCandidates.length} LOW priority candidates (Total: ${allCandidates.length})`);
        }
      }
      
      const sortedCandidates = this.prioritizeAndSortWeighted(allCandidates);
      
      console.log(`\n📊 Total unique candidate apps: ${sortedCandidates.length}`);
      
      const priorityBreakdown = {
        HIGH: sortedCandidates.filter(app => app.priority_level === 'HIGH').length,
        MEDIUM: sortedCandidates.filter(app => app.priority_level === 'MEDIUM').length,
        LOW: sortedCandidates.filter(app => app.priority_level === 'LOW').length
      };
      
      console.log(`📊 Priority Breakdown: HIGH: ${priorityBreakdown.HIGH}, MEDIUM: ${priorityBreakdown.MEDIUM}, LOW: ${priorityBreakdown.LOW}`);
      
      if (sortedCandidates.length > 0) {
        console.log('\n🎯 Top candidates:');
        sortedCandidates.slice(0, 10).forEach((app, i) => {
          const priorityIcon = app.priority_level === 'HIGH' ? '🔥' : app.priority_level === 'MEDIUM' ? '🔶' : '🔹';
          console.log(`   ${i+1}. ${app.title} (${app.source}) ${priorityIcon} ${app.priority_level} - Rating: ${app.rating} - Cat: ${app.primary_category}`);
        });
      }
      
      const result = {
        weighted_search: true,
        primary_domain: primaryDomain,
        candidates: sortedCandidates,
        priority_breakdown: priorityBreakdown,
        stats: {
          high_priority_matches: priorityBreakdown.HIGH,
          medium_priority_matches: priorityBreakdown.MEDIUM,
          low_priority_matches: priorityBreakdown.LOW,
          total_unique: sortedCandidates.length
        },
        timestamp: new Date().toISOString()
      };
      
      return result;
      
    } catch (error) {
      console.error('❌ Database filtering failed:', error.message);
      throw error;
    }
  }

  async filterAppsDiversified(keywordData) {
    console.log('🎯 Using DIVERSIFIED search strategy for balanced category representation');
    console.log(`📚 Ensuring apps from each weighted keyword category`);
    
    const categories = keywordData.original_analysis.weighted_keywords;
    const primaryDomain = keywordData.processed_keywords.primary_domain;
    
    // Calculate quotas based on category weights (total target: ~35 apps)
    const totalApps = 35;
    let quotas = {};
    
    Object.entries(categories).forEach(([category, data]) => {
      const weight = data.weight || 0.5;
      // Minimum 3 apps per category, scaled by weight
      quotas[category] = Math.max(3, Math.ceil(totalApps * weight * 0.3));
    });
    
    console.log('\n📊 Category Quotas:');
    Object.entries(quotas).forEach(([category, quota]) => {
      const keywords = categories[category]?.keywords || [];
      console.log(`   ${category.toUpperCase()}: ${quota} apps (keywords: ${keywords.slice(0, 3).join(', ')}${keywords.length > 3 ? '...' : ''})`);
    });
    
    // Search each category independently
    const categoryResults = {};
    let totalFound = 0;
    
    for (const [category, data] of Object.entries(categories)) {
      if (!data.keywords || data.keywords.length === 0) continue;
      
      console.log(`\n🔍 Searching ${category.toUpperCase()} category...`);
      console.log(`   Keywords: ${data.keywords.slice(0, 5).join(', ')}${data.keywords.length > 5 ? '...' : ''}`);
      
      const categoryApps = await this.searchWithKeywords(
        data.keywords, 
        category.toUpperCase(), 
        quotas[category] || 5
      );
      
      // Tag apps with their source category
      const taggedApps = categoryApps.map(app => ({
        ...app,
        source_category: category,
        category_weight: data.weight,
        priority_level: this.getCategoryPriorityLevel(category, data.weight)
      }));
      
      categoryResults[category] = taggedApps;
      totalFound += taggedApps.length;
      
      console.log(`   ✅ Found ${taggedApps.length} ${category} apps`);
    }
    
    // Combine all category results
    const allCandidates = [];
    Object.values(categoryResults).forEach(apps => {
      allCandidates.push(...apps);
    });
    
    // Remove duplicates while preserving highest category weight
    const deduplicated = this.combineAndDeduplicateWithCategory(allCandidates);
    const sortedCandidates = this.prioritizeByDiversity(deduplicated);
    
    console.log(`\n📊 Category Breakdown:`)
    Object.entries(categoryResults).forEach(([category, apps]) => {
      const finalCount = sortedCandidates.filter(app => app.source_category === category).length;
      console.log(`   ${category.toUpperCase()}: ${finalCount} apps (${apps.length} found, ${apps.length - finalCount} removed as duplicates)`);
    });
    
    console.log(`\n📊 Total unique candidate apps: ${sortedCandidates.length}`);
    
    if (sortedCandidates.length > 0) {
      console.log('\n🎯 Top diversified candidates:');
      sortedCandidates.slice(0, 15).forEach((app, i) => {
        const categoryIcon = this.getCategoryIcon(app.source_category);
        console.log(`   ${i+1}. ${app.title} (${app.source}) ${categoryIcon} ${app.source_category?.toUpperCase()} - Rating: ${app.rating} - Weight: ${app.category_weight}`);
      });
    }
    
    const result = {
      diversified_search: true,
      primary_domain: primaryDomain,
      candidates: sortedCandidates,
      category_breakdown: Object.fromEntries(
        Object.entries(categoryResults).map(([cat, apps]) => [
          cat, 
          {
            found: apps.length,
            final: sortedCandidates.filter(app => app.source_category === cat).length,
            weight: categories[cat]?.weight || 0.5
          }
        ])
      ),
      stats: {
        total_unique: sortedCandidates.length,
        categories_searched: Object.keys(categoryResults).length
      },
      timestamp: new Date().toISOString()
    };
    
    return result;
  }

  getCategoryPriorityLevel(category, weight) {
    if (weight >= 0.9) return 'HIGH';
    if (weight >= 0.7) return 'MEDIUM';
    return 'LOW';
  }

  getCategoryIcon(category) {
    const icons = {
      problem: '⚠️',
      solution: '✅',
      cause: '🎯',
      context: '💡',
      primary: '🔥',
      functional: '⚙️',
      descriptive: '📝'
    };
    return icons[category] || '📱';
  }

  combineAndDeduplicateWithCategory(allCandidates) {
    const seen = new Map();
    
    for (const app of allCandidates) {
      const id = app.id;
      
      if (!seen.has(id)) {
        seen.set(id, app);
      } else {
        const existing = seen.get(id);
        // Prefer app from higher weight category
        if ((app.category_weight || 0) > (existing.category_weight || 0)) {
          seen.set(id, app);
        } else if ((app.category_weight || 0) === (existing.category_weight || 0)) {
          // If same weight, prefer higher search priority
          if ((app.search_priority || 0) > (existing.search_priority || 0)) {
            seen.set(id, app);
          }
        }
      }
    }
    
    return Array.from(seen.values());
  }

  prioritizeByDiversity(candidates) {
    // Sort to ensure diversity while respecting category weights
    return candidates.sort((a, b) => {
      // First by category weight
      if ((a.category_weight || 0) !== (b.category_weight || 0)) {
        return (b.category_weight || 0) - (a.category_weight || 0);
      }
      
      // Then by search priority within category
      if ((a.search_priority || 0) !== (b.search_priority || 0)) {
        return (b.search_priority || 0) - (a.search_priority || 0);
      }
      
      // Finally by rating
      return (b.rating || 0) - (a.rating || 0);
    });
  }

  combineAndDeduplicate(allCandidates) {
    const seen = new Map();
    
    for (const app of allCandidates) {
      const id = app.id;
      
      if (!seen.has(id)) {
        seen.set(id, app);
      } else {
        const existing = seen.get(id);
        if ((app.search_priority || 0) > (existing.search_priority || 0)) {
          seen.set(id, app);
        }
      }
    }
    
    return Array.from(seen.values());
  }

  async searchWithKeywords(keywords, priorityLevel, limit = 30) {
    if (keywords.length === 0) return [];
    
    const allResults = [];
    
    const titleResults = await this.searchAppsByTitle(keywords.slice(0, 3), Math.min(limit, 15));
    allResults.push(...titleResults.map(app => ({ ...app, source: 'title', search_priority: 3 })));
    
    if (allResults.length < limit * 0.7) {
      const featureResults = await this.searchAppsByFeatures(keywords.slice(0, 4), Math.min(limit - allResults.length, 15));
      allResults.push(...featureResults.map(app => ({ ...app, source: 'features', search_priority: 2 })));
    }
    
    if (priorityLevel !== 'HIGH' && allResults.length < limit * 0.5) {
      const descResults = await this.searchAppsByDescription(keywords.slice(0, 2), Math.min(limit - allResults.length, 10));
      allResults.push(...descResults.map(app => ({ ...app, source: 'description', search_priority: 1 })));
    }
    
    return this.combineAndDeduplicate(allResults);
  }

  async searchAppsByTitle(titleKeywords, limit = 50) {
    if (titleKeywords.length === 0) return [];
    
    console.log(`🔍 Searching app titles for: ${titleKeywords.join(', ')}`);
    
    try {
      const titleConditions = titleKeywords.map(keyword => 
        `title.ilike.%${keyword}%`
      ).join(',');
      
      let { data: titleMatches, error } = await this.supabase
        .from('apps_unified')
        .select('id, title, developer, primary_category, description, rating, rating_count, icon_url, price')
        .or(titleConditions)
        .gte('rating', 2.0)
        .order('rating', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('❌ Title phrase search error:', error.message);
        return [];
      }

      if (!titleMatches || titleMatches.length === 0) {
        console.log('⚠️ No phrase matches found, trying individual word search for titles.');
        const individualWordConditions = titleKeywords.flatMap(keyword => 
          keyword.split(/\s+/).map(word => `title.ilike.%${word}%`)
        ).join(',');

        let { data: wordMatches, error: wordError } = await this.supabase
          .from('apps_unified')
          .select('id, title, developer, primary_category, description, rating, rating_count, icon_url, price')
          .or(individualWordConditions)
          .gte('rating', 2.0)
          .order('rating', { ascending: false })
          .limit(limit);

        if (wordError) {
          console.error('❌ Title individual word search error:', wordError.message);
          return [];
        }
        return wordMatches || [];
      }
      
      return titleMatches || [];
      
    } catch (error) {
      console.error('❌ Title search failed:', error.message);
      return [];
    }
  }

  async searchAppsByFeatures(featureKeywords, limit = 100) {
    if (featureKeywords.length === 0) return [];
    
    console.log(`🔍 Searching app features for: ${featureKeywords.slice(0, 3).join(', ')}...`);
    
    try {
      const { data: featureData, error: featureError } = await this.supabase
        .from('app_features')
        .select('app_id, primary_use_case, key_benefit, target_user')
        .limit(1);
      
      if (featureError || !featureData || featureData.length === 0) {
        console.log('⚠️ No app_features table found, skipping feature search');
        return [];
      }
      
      const featureConditions = featureKeywords.slice(0, 5).map(keyword => 
        `primary_use_case.ilike.%${keyword}%,key_benefit.ilike.%${keyword}%,target_user.ilike.%${keyword}%`
      ).flat().join(',');
      
      const { data: featureMatches, error } = await this.supabase
        .from('app_features')
        .select('app_id')
        .or(featureConditions)
        .limit(limit);
      
      if (error) {
        console.error('❌ Feature search error:', error.message);
        return [];
      }
      
      if (!featureMatches || featureMatches.length === 0) {
        return [];
      }
      
      const appIds = featureMatches.map(f => f.app_id);
      const { data: apps, error: appError } = await this.supabase
        .from('apps_unified')
        .select('id, title, developer, primary_category, description, rating, rating_count, icon_url, price')
        .in('id', appIds)
        .gte('rating', 1.5)
        .order('rating', { ascending: false });
      
      if (appError) {
        console.error('❌ App details fetch error:', appError.message);
        return [];
      }
      
      return apps || [];
      
    } catch (error) {
      console.error('❌ Feature search failed:', error.message);
      return [];
    }
  }

  async searchAppsByDescription(descriptionKeywords, limit = 30) {
    if (descriptionKeywords.length === 0) return [];
    
    console.log(`🔍 Searching app descriptions for: ${descriptionKeywords.join(', ')}`);
    
    try {
      const descConditions = descriptionKeywords.slice(0, 3).map(keyword => 
        `description.ilike.%${keyword}%`
      ).join(',');
      
      const { data: descMatches, error } = await this.supabase
        .from('apps_unified')
        .select('id, title, developer, primary_category, description, rating, rating_count, icon_url, price')
        .or(descConditions)
        .gte('rating', 2.5)
        .order('rating', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('❌ Description search error:', error.message);
        return [];
      }
      
      return descMatches || [];
      
    } catch (error) {
      console.error('❌ Description search failed:', error.message);
      return [];
    }
  }

  prioritizeAndSortWeighted(candidates) {
    return candidates.sort((a, b) => {
      const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      const priorityA = priorityOrder[a.priority_level] || 1;
      const priorityB = priorityOrder[b.priority_level] || 1;
      
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }
      
      if (a.search_priority !== b.search_priority) {
        return (b.search_priority || 0) - (a.search_priority || 0);
      }
      
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      return ratingB - ratingA;
    });
  }
}

// --- SemanticSearchFiltered Class Definition (from step4-semantic-search.js) ---
class SemanticSearchFiltered {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.embeddingModel = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
  }

  async searchCandidates(candidateData, originalQuery) {
    console.log('🔍 Performing semantic search on filtered candidates...');
    console.log('=' .repeat(60));
    
    try {
      if (!candidateData || !originalQuery) {
        throw new Error('Candidate data and original query must be provided.');
      }

      const candidates = candidateData.candidates;
      
      console.log(`📊 Total candidates: ${candidates.length}`);
      console.log(`🎯 Primary domain: ${candidateData.primary_domain}`);
      console.log(`🔤 Original query: "${originalQuery}"`);
      
      if (candidates.length === 0) {
        console.log('❌ No candidates to search');
        return [];
      }
      
      this.logCandidateBreakdown(candidates);
      
      console.log('\n🧠 Generating query embedding...');
      const embeddingResponse = await this.embeddingModel.embedContent(originalQuery);
      const queryEmbedding = embeddingResponse.embedding.values;
      console.log(`✅ Generated embedding with ${queryEmbedding.length} dimensions`);
      
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
          if (!isNaN(similarity) && similarity > 0.2) {
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
      
      similarities.sort((a, b) => b.similarity - a.similarity);
      
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
          
          // Show quality boosts if app has final_score (after weighted ranking)
          if (app.final_score && app.quality_reasons && app.quality_reasons.length > 0) {
            console.log(`     Quality Boost: ${app.quality_reasons.join(', ')}`);
          }
          
          console.log(`     Category: ${app.primary_category || 'Unknown'}`);
          console.log('');
        });
        
        this.analyzeResults(results, candidateData.primary_domain);
      }
      
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

  isSleepRelated(app) {
    const text = `${app.title} ${app.description || ''}`.toLowerCase();
    const sleepTerms = ['sleep', 'insomnia', 'rest', 'pillow', 'bedtime', 'meditation', 'relaxation', 'dream'];
    return sleepTerms.some(term => text.includes(term));
  }

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
    
    const avgSimilarity = results.reduce((sum, app) => sum + app.similarity_score, 0) / results.length;
    const highQualityApps = results.filter(app => app.similarity_score > 0.4).length;
    
    console.log(`\n📊 Quality Metrics:`);
    console.log(`   Average Similarity: ${avgSimilarity.toFixed(4)}`);
    console.log(`   High Quality Apps (>0.4): ${highQualityApps}/${results.length}`);
    console.log(`   Top Similarity: ${results[0]?.similarity_score.toFixed(4) || 'N/A'}`);
  }

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

/**
 * Master Pipeline: Weighted Search System
 * 
 * Runs all 4 steps of the intelligent app discovery pipeline:
 * 1. LLM Analysis (with weighted categorization)
 * 2. Keyword Processing (priority-based) 
 * 3. Database Filtering (weighted search)
 * 4. Semantic Search (on filtered candidates)
 */
class MasterPipeline {
  constructor() {
    this.llmAnalyzer = new LLMAnalyzer();
    this.keywordProcessor = new KeywordProcessor();
    this.databaseFilter = new DatabaseFilter();
    this.semanticSearch = new SemanticSearchFiltered();
  }

  async runPipeline(userQuery, options = {}) {
    const {
      limit = 15,
      saveIntermediateFiles = true,
      showDetailedLogs = true,
      sessionId = `session_${Date.now()}`,
      progressCallback = null
    } = options;

    // Initialize progress tracker
    const progress = new ProgressTracker(sessionId);
    if (progressCallback) {
      progress.on('progress', progressCallback);
      progress.on('completed', progressCallback);
      progress.on('error', progressCallback);
    }

    console.log('🚀 MASTER PIPELINE: Weighted Search System');
    console.log('=' .repeat(80));
    console.log(`Query: "${userQuery}"`);
    console.log(`Target Results: ${limit} apps\n`);

    // Initialize progress tracking
    progress.data.query = userQuery;
    progress.updateStep('query_analysis', 'running', { 
      query: userQuery, 
      target_results: limit 
    });

    const pipeline = {
      start_time: Date.now(),
      query: userQuery,
      steps: {},
      final_results: null,
      sessionId: sessionId
    };

    try {
      // STEP 1: LLM Analysis with Weighted Categories
      console.log('🧠 STEP 1: LLM Analysis & Weighted Categorization');
      console.log('-' .repeat(50));
      const step1Start = Date.now();
      
      const analysis = await this.llmAnalyzer.analyzeQuery(userQuery);
      
      // Update progress with analysis results
      progress.updateStep('query_analysis', 'completed', {
        query_type: analysis.query_type,
        user_situation: analysis.user_situation,
        root_cause: analysis.root_cause,
        urgency: analysis.urgency,
        categories: analysis.weighted_keywords,
        search_strategy: analysis.search_strategy
      });
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
      progress.updateStep('keyword_processing', 'running');
      const step2Start = Date.now();
      
      const keywordData = this.keywordProcessor.processAnalysis(analysis);
      
      // Update progress with keyword processing results
      progress.updateStep('keyword_processing', 'completed', {
        processed_keywords: keywordData.processed_keywords,
        search_terms: keywordData.search_terms,
        high_priority_count: keywordData.search_terms.high_priority.length,
        medium_priority_count: keywordData.search_terms.medium_priority.length,
        low_priority_count: keywordData.search_terms.low_priority.length
      });
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
      progress.updateStep('diversified_search', 'running');
      const step3Start = Date.now();
      
      const candidates = await this.databaseFilter.filterApps(keywordData);
      
      // Update progress with filtering results
      progress.updateStep('category_filtering', 'completed', {
        candidates_found: candidates.candidates?.length || 0,
        category_breakdown: candidates.category_breakdown || {},
        diversified_search: candidates.diversified_search || false,
        search_stats: candidates.stats || {}
      });
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
      progress.updateStep('semantic_ranking', 'running');
      const step4Start = Date.now();
      
      const finalResults = await this.semanticSearch.searchCandidates(candidates, userQuery);
      
      // Update progress with semantic search results
      progress.updateStep('semantic_ranking', 'completed', {
        semantic_results: finalResults.results?.length || 0,
        top_similarity_score: finalResults.results?.[0]?.similarity_score || 0,
        average_similarity: finalResults.results?.length > 0 
          ? (finalResults.results.reduce((sum, app) => sum + (app.similarity_score || 0), 0) / finalResults.results.length).toFixed(4)
          : 0
      });
      pipeline.steps.semantic_search = {
        duration: Date.now() - step4Start,
        result: finalResults,
        success: true,
        final_count: finalResults.results?.length || 0
      };

      if (finalResults.results) {
        progress.updateStep('final_selection', 'running');
        
        finalResults.results = this.applyWeightedRanking(
          finalResults.results, 
          keywordData.search_terms,
          analysis.weighted_keywords
        );
      }

      pipeline.final_results = finalResults;
      pipeline.total_duration = Date.now() - pipeline.start_time;

      // Complete progress tracking
      progress.complete({
        total_apps: finalResults.results?.length || 0,
        top_apps: finalResults.results?.slice(0, 5) || [],
        pipeline_duration: pipeline.total_duration,
        category_diversity: candidates.category_breakdown || {}
      });

      this.analyzePipelineResults(pipeline, showDetailedLogs);

      if (saveIntermediateFiles) {
        fs.writeFileSync('./temp-pipeline-results.json', JSON.stringify(pipeline, null, 2));
        console.log('\n💾 Complete pipeline results saved to temp-pipeline-results.json');
      }

      return pipeline;

    } catch (error) {
      console.error(`❌ Pipeline failed: ${error.message}`);
      
      // Update progress with error
      const currentStepId = progress.steps[progress.currentStep]?.id || 'unknown';
      progress.error(currentStepId, error);
      
      pipeline.error = error.message;
      pipeline.total_duration = Date.now() - pipeline.start_time;
      
      return pipeline;
    }
  }

  applyWeightedRanking(results, searchTerms, weightedKeywords) {
    console.log('\n⚖️ Applying weighted ranking to results...');
    
    return results.map(app => {
      let weightedScore = app.similarity_score;
      let boostReasons = [];
      
      const title = app.title.toLowerCase();
      const description = (app.description || '').toLowerCase();
      const appText = `${title} ${description}`;
      
      // Apply category keyword weighting
      Object.entries(weightedKeywords).forEach(([category, data]) => {
        const categoryWeight = data.weight;
        const keywords = data.keywords || [];
        
        const matches = keywords.filter(keyword => 
          appText.includes(keyword.toLowerCase())
        );
        
        if (matches.length > 0) {
          const boost = 1 + (categoryWeight - 0.5) * 0.3;
          weightedScore *= boost;
          boostReasons.push(`${category} match (${categoryWeight}): ${matches.slice(0, 2).join(', ')}`);
        }
      });
      
      // Apply rating and review count boost with credibility weighting
      const rating = parseFloat(app.rating) || 0;
      const reviewCount = parseInt(app.rating_count) || 0;
      
      let qualityScore = 1;
      let qualityReasons = [];
      
      if (rating > 0 && reviewCount > 0) {
        // Calculate credibility-weighted rating score
        // More reviews = more credible rating, but diminishing returns
        const credibilityFactor = Math.min(Math.log10(reviewCount + 1) / 4, 1); // Scale 0-1, log-based
        const weightedRating = rating * credibilityFactor;
        
        // Tiered boosts based on weighted rating and review volume
        if (reviewCount >= 50000 && rating >= 4.5) {
          qualityScore *= 1.25;
          qualityReasons.push(`excellent quality (${rating}⭐, ${reviewCount.toLocaleString()} reviews)`);
        } else if (reviewCount >= 10000 && rating >= 4.3) {
          qualityScore *= 1.20;
          qualityReasons.push(`very high quality (${rating}⭐, ${reviewCount.toLocaleString()} reviews)`);
        } else if (reviewCount >= 5000 && rating >= 4.0) {
          qualityScore *= 1.15;
          qualityReasons.push(`high quality (${rating}⭐, ${reviewCount.toLocaleString()} reviews)`);
        } else if (reviewCount >= 1000 && rating >= 3.8) {
          qualityScore *= 1.10;
          qualityReasons.push(`good quality (${rating}⭐, ${reviewCount.toLocaleString()} reviews)`);
        } else if (reviewCount >= 100 && rating >= 4.0) {
          qualityScore *= 1.05;
          qualityReasons.push(`decent quality (${rating}⭐, ${reviewCount.toLocaleString()} reviews)`);
        }
        
        // Penalty for low review count with perfect rating (likely fake/unreliable)
        if (reviewCount < 10 && rating === 5.0) {
          qualityScore *= 0.95;
          qualityReasons.push(`low review count (${reviewCount} reviews)`);
        }
        
      } else if (rating > 0) {
        // Only rating available, apply smaller boost
        if (rating >= 4.5) {
          qualityScore *= 1.02;
          qualityReasons.push(`high rating but few reviews (${rating}⭐)`);
        }
      }
      
      // Apply quality boost to weighted score
      const finalScore = weightedScore * qualityScore;
      
      return {
        ...app,
        original_similarity: app.similarity_score,
        weighted_similarity: weightedScore,
        quality_score: qualityScore,
        final_score: finalScore,
        boost_reasons: boostReasons,
        quality_reasons: qualityReasons,
        weight_applied: boostReasons.length > 0 || qualityReasons.length > 0
      };
    }).sort((a, b) => {
      // Primary sort by final score (semantic + keyword + quality)
      if (Math.abs(b.final_score - a.final_score) > 0.001) {
        return b.final_score - a.final_score;
      }
      // Tie-breaker: rating
      if (Math.abs((b.rating || 0) - (a.rating || 0)) > 0.01) {
        return (b.rating || 0) - (a.rating || 0);
      }
      // Final tie-breaker: review count
      return (b.rating_count || 0) - (a.rating_count || 0);
    });
  }

  analyzePipelineResults(pipeline, showDetailedLogs) {
    console.log('\n' + '=' .repeat(80));
    console.log('📊 PIPELINE ANALYSIS');
    console.log('=' .repeat(80));
    
    console.log('\n⚡ Performance:');
    Object.entries(pipeline.steps).forEach(([step, data]) => {
      console.log(`   ${step}: ${data.duration}ms`);
    });
    console.log(`   Total: ${pipeline.total_duration}ms`);
    
    console.log('\n📈 Data Flow:');
    console.log(`   LLM Categories: ${Object.keys(pipeline.steps.llm_analysis?.result?.weighted_keywords || {}).length}`);
    console.log(`   Keywords Generated: ${pipeline.steps.keyword_processing?.result?.processed_keywords?.all_keywords?.length || 0}`);
    console.log(`   Database Candidates: ${pipeline.steps.database_filtering?.candidate_count || 0}`);
    console.log(`   Final Results: ${pipeline.steps.semantic_search?.final_count || 0}`);
    
    if (pipeline.final_results?.results) {
      const results = pipeline.final_results.results;
      const weightedKeywords = pipeline.steps.llm_analysis?.result?.weighted_keywords;

      console.log('\n🎯 Quality Analysis:');
      
      const avgSimilarity = results.reduce((sum, app) => sum + (app.final_score || app.weighted_similarity || app.similarity_score), 0) / results.length;
      const topScore = results[0]?.final_score || results[0]?.weighted_similarity || results[0]?.similarity_score || 0;
      const withBoosts = results.filter(app => app.weight_applied).length;
      const withQualityBoosts = results.filter(app => app.quality_reasons && app.quality_reasons.length > 0).length;
      
      console.log(`   Average Similarity: ${avgSimilarity.toFixed(4)}`);
      console.log(`   Top Score: ${topScore.toFixed(4)}`);
      console.log(`   Apps with Weight Boosts: ${withBoosts}/${results.length}`);
      console.log(`   Apps with Quality Boosts: ${withQualityBoosts}/${results.length}`);
      
      if (showDetailedLogs && results.length > 0 && weightedKeywords) {
        console.log('\n🏆 DIVERSE APP RECOMMENDATIONS BY KEYWORD CATEGORY:');
        console.log('-' .repeat(60));

        const categorizedApps = {
          PROBLEM: [],
          SOLUTION: [],
          CAUSE: [],
          CONTEXT: []
        };

        const assignedAppIds = new Set();

        // Iterate through ranked results and assign to the highest matching keyword category
        for (const app of results) {
          if (assignedAppIds.has(app.id)) continue;

          const appText = `${app.title} ${app.description || ''}`.toLowerCase();
          let assignedCategory = null;
          let highestWeight = -1; // Initialize with a value lower than any possible weight

          Object.entries(weightedKeywords).forEach(([category, data]) => {
            const categoryWeight = data.weight;
            const keywords = data.keywords || [];
            
            if (keywords.some(keyword => appText.includes(keyword.toLowerCase()))) {
              if (categoryWeight > highestWeight) {
                highestWeight = categoryWeight;
                assignedCategory = category.toUpperCase();
              }
            }
          });

          if (assignedCategory && categorizedApps[assignedCategory]) {
            categorizedApps[assignedCategory].push(app);
            assignedAppIds.add(app.id);
          } else {
            // If no specific category match, or if it's already assigned, add to a general pool
            // For now, we'll just skip if not explicitly categorized to avoid duplicates
            // Or, we can add to a generic 'OTHER' category if needed
          }
        }

        const categoriesOrder = ['PROBLEM', 'SOLUTION', 'CAUSE', 'CONTEXT'];
        categoriesOrder.forEach(category => {
          if (categorizedApps[category].length > 0) {
            console.log(`\n--- ${category} Apps (Top 5) ---`);
            categorizedApps[category].slice(0, 5).forEach((app, i) => {
              const score = app.final_score || app.weighted_similarity || app.similarity_score;
              const rating = app.rating ? ` - ${app.rating}⭐` : '';
              const reviews = app.rating_count ? ` (${parseInt(app.rating_count).toLocaleString()} reviews)` : '';
              console.log(`${i+1}. ${app.title} (Score: ${score.toFixed(4)}${rating}${reviews})`);
            });
          }
        });

        // Display overall top 5 if there are still unassigned apps or to ensure overall top apps are visible
        const overallTopApps = results.filter(app => !assignedAppIds.has(app.id));
        if (overallTopApps.length > 0 || Object.values(categorizedApps).flat().length < 5) {
            console.log('\n--- Overall Top 5 Apps (for general relevance) ---');
            results.slice(0, 5).forEach((app, i) => {
                console.log(`${i+1}. ${app.title} (Score: ${(app.weighted_similarity || app.similarity_score).toFixed(4)})`);
            });
        }
      }
    }
  }
}

module.exports = {
  MasterPipeline,
  ProgressTracker
};

// Run test if called directly
if (require.main === module) {
  async function testMasterPipeline() {
    if (process.argv.length < 3) {
      console.log('Usage: node master-pipeline.js "your query here"');
      console.log('Example: node master-pipeline.js "i cant sleep properly, maybe too much coffee or phone"');
      return;
    }
  
    const query = process.argv.slice(2).join(' ');
    
    const pipeline = new MasterPipeline();
    
    // Optional progress callback for testing
    const progressCallback = (update) => {
      if (update.sessionId && update.steps && update.steps[update.currentStep]) {
        console.log(`📡 Progress: ${update.currentStep + 1}/${update.totalSteps} - ${update.steps[update.currentStep].name}`);
      }
    };
    
    try {
      const results = await pipeline.runPipeline(query, {
        limit: 15,
        saveIntermediateFiles: true,
        showDetailedLogs: true,
        sessionId: `test_${Date.now()}`,
        progressCallback: progressCallback
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
  testMasterPipeline();
}
