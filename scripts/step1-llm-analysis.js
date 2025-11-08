/**
 * Step 1: LLM Analysis
 * Extract user situation and root cause from user query using LLM
 */

const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

class LLMAnalyzer {
  constructor() {
    // Use DeepSeek for quick classification
    this.openai = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY,
    });

    // Use Gemini Flash for detailed analysis
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.geminiModel = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  }

  /**
   * Analyze user query and extract detailed context
   */
  async analyzeQuery(userQuery) {
    console.log(`🧠 Analyzing query: "${userQuery}"`);
    console.log('=' .repeat(60));
    
    try {
      // Step 1: Quick classification (problem vs general)
      const classification = await this.classifyQuery(userQuery);
      console.log(`📋 Query Type: ${classification.query_type}`);
      
      // Step 2: Detailed analysis
      let analysis;
      if (classification.query_type === 'problem') {
        console.log('🔍 Getting detailed problem analysis...');
        analysis = await this.getDetailedAnalysis(userQuery);
      } else {
        const keywords = this.extractBasicKeywords(userQuery);
        analysis = {
          query_type: 'general',
          user_situation: `Looking for ${userQuery} apps`,
          root_cause: null,
          urgency: null,
          keywords: keywords,
          weighted_keywords: {
            problem: { weight: 1.0, keywords: keywords.slice(0, 3) },
            solution: { weight: 0.9, keywords: [] },
            cause: { weight: 0.7, keywords: [] },
            context: { weight: 0.5, keywords: keywords.slice(3) }
          },
          search_strategy: 'General app search - focusing on main query terms'
        };
      }
      
      console.log('\n📊 Analysis Results:');
      console.log('=' .repeat(40));
      console.log(`User Situation: ${analysis.user_situation}`);
      console.log(`Root Cause: ${analysis.root_cause || 'N/A'}`);
      console.log(`Urgency: ${analysis.urgency || 'N/A'}`);
      
      // Display weighted keywords if available
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
      
      // Fallback analysis
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

  /**
   * Quick classification: problem vs general query
   */
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

  /**
   * Detailed problem analysis using Gemini with weighted keyword categorization
   */
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
      
      // Extract JSON from response
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
        
        // Process weighted keywords structure
        if (analysis.weighted_keywords) {
          // Flatten all keywords for backward compatibility
          const allKeywords = [];
          Object.values(analysis.weighted_keywords).forEach(category => {
            if (category.keywords) {
              allKeywords.push(...category.keywords);
            }
          });
          analysis.keywords = [...new Set(allKeywords)]; // Remove duplicates
        }
        
        return analysis;
      } else {
        throw new Error('Could not extract JSON from detailed response');
      }
      
    } catch (error) {
      console.error('⚠️ Detailed analysis failed:', error.message);
      
      // Fallback with basic keyword extraction
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

  /**
   * Basic keyword extraction fallback
   */
  extractBasicKeywords(query) {
    const stopWords = new Set(['i', 'want', 'need', 'help', 'me', 'to', 'a', 'an', 'the', 'and', 'or', 'but', 'app', 'apps', 'for', 'cant', 'too', 'much', 'with', 'my']);
    
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 5); // Limit to first 5 words
  }
}

// Test function
async function testLLMAnalysis() {
  if (process.argv.length < 3) {
    console.log('Usage: node step1-llm-analysis.js "your query here"');
    console.log('Example: node step1-llm-analysis.js "i cant sleep properly, maybe too much coffee or phone"');
    return;
  }

  const query = process.argv.slice(2).join(' ');
  
  const analyzer = new LLMAnalyzer();
  const analysis = await analyzer.analyzeQuery(query);
  
  console.log('\n🎯 Final Analysis Object:');
  console.log('=' .repeat(40));
  console.log(JSON.stringify(analysis, null, 2));
  
  // Save to file for next step
  const fs = require('fs');
  fs.writeFileSync('./temp-analysis.json', JSON.stringify(analysis, null, 2));
  console.log('\n💾 Analysis saved to temp-analysis.json');
}

// Export for use in other scripts
module.exports = LLMAnalyzer;

// Run test if called directly
if (require.main === module) {
  testLLMAnalysis().catch(console.error);
}