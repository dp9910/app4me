import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize clients with environment validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

let supabaseAdmin: any = null;
if (supabaseUrl && supabaseServiceKey && supabaseUrl !== 'your-project-url-here') {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Initialize Gemini AI
let genAI: GoogleGenerativeAI | null = null;
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-gemini-api-key-here') {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

interface SearchRequest {
  lifestyle?: string[];
  intent?: string;
  wishText?: string;
  sessionId?: string;
}

interface SearchIntent {
  keywords: string[];
  categories: string[];
  problemSolved: string;
  mustHave: string[];
  niceToHave: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: SearchRequest = await request.json();
    const { lifestyle = [], intent, wishText, sessionId } = body;

    console.log('🔍 Search request:', { lifestyle, intent, wishText });

    // Check if services are configured
    if (!supabaseAdmin) {
      console.warn('⚠️ Supabase not configured, returning mock data');
      return NextResponse.json({
        success: true,
        apps: getMockApps(),
        intent: { keywords: lifestyle, categories: [], problemSolved: wishText || 'mock search' },
        totalFound: 6
      });
    }

    // Step 1: Extract intent with LLM
    const searchIntent = await extractSearchIntent(lifestyle, intent, wishText);
    console.log('🧠 Intent:', searchIntent);

    // Step 2: Query database with multiple strategies
    const candidateApps = await queryMultiStrategy(searchIntent);
    console.log(`📦 Found ${candidateApps.length} candidates`);

    // Step 3: LLM ranks and personalizes (limit for processing)
    const rankedApps = await rankAndPersonalize(
      candidateApps.slice(0, 20), // Limit to top 20 for LLM processing
      { lifestyle, intent, wishText }
    );

    // Step 4: Log search for analytics
    if (sessionId) {
      await logSearch(sessionId, searchIntent, rankedApps);
    }

    console.log(`✨ Returning ${rankedApps.length} results`);

    return NextResponse.json({
      success: true,
      apps: rankedApps.slice(0, 10), // Return top 10 results
      intent: searchIntent,
      totalFound: candidateApps.length
    });

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

function getMockApps() {
  return [
    {
      id: 'mock-1',
      name: 'FitTrack Pro',
      primary_category: 'Health & Fitness',
      icon_url_512: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=512&h=512&fit=crop&crop=center',
      short_description: 'Comprehensive fitness tracking app',
      rating_average: 4.5,
      rating_count: 2150
    },
    {
      id: 'mock-2',
      name: 'Mindful Moments',
      primary_category: 'Health & Fitness',
      icon_url_512: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=512&h=512&fit=crop&crop=center',
      short_description: 'Daily meditation and mindfulness',
      rating_average: 4.7,
      rating_count: 3420
    },
    {
      id: 'mock-3',
      name: 'TaskMaster',
      primary_category: 'Productivity',
      icon_url_512: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=512&h=512&fit=crop&crop=center',
      short_description: 'Advanced task management',
      rating_average: 4.2,
      rating_count: 1890
    },
    {
      id: 'mock-4',
      name: 'Healthy Eats',
      primary_category: 'Food & Drink',
      icon_url_512: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=512&h=512&fit=crop&crop=center',
      short_description: 'Healthy recipe discovery',
      rating_average: 4.4,
      rating_count: 2760
    },
    {
      id: 'mock-5',
      name: 'FocusFlow',
      primary_category: 'Productivity',
      icon_url_512: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=512&h=512&fit=crop&crop=center',
      short_description: 'Pomodoro and focus timer',
      rating_average: 4.6,
      rating_count: 2980
    },
    {
      id: 'mock-6',
      name: 'BudgetBuddy',
      primary_category: 'Finance',
      icon_url_512: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=512&h=512&fit=crop&crop=center',
      short_description: 'Personal finance tracking',
      rating_average: 4.1,
      rating_count: 4230
    }
  ];
}

async function extractSearchIntent(
  lifestyle: string[], 
  intent?: string, 
  wishText?: string
): Promise<SearchIntent> {
  // If no AI key or not configured, return basic intent
  if (!genAI) {
    return {
      keywords: [...lifestyle, intent, ...(wishText?.split(' ') || [])].filter(Boolean),
      categories: [],
      problemSolved: wishText || intent || 'general app discovery',
      mustHave: [],
      niceToHave: []
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Extract search intent from user input. Return JSON only.

User input:
- Lifestyle: ${lifestyle.join(', ') || 'none'}
- Goal: ${intent || 'none'}
- Wish: ${wishText || 'none'}

Extract:
{
  "keywords": ["array", "of", "keywords"],
  "categories": ["app store categories"],
  "problemSolved": "what problem user wants to solve",
  "mustHave": ["required features"],
  "niceToHave": ["optional features"]
}

Return ONLY valid JSON:`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    return JSON.parse(jsonMatch[0]);

  } catch (error) {
    console.error('Intent extraction error:', error);

    // Fallback: simple keyword extraction
    return {
      keywords: [
        ...lifestyle,
        intent,
        ...(wishText?.split(' ').filter(w => w.length > 3) || [])
      ].filter(Boolean),
      categories: [],
      problemSolved: wishText || intent || 'general app discovery',
      mustHave: [],
      niceToHave: []
    };
  }
}

async function queryMultiStrategy(intent: SearchIntent) {
  if (!supabaseAdmin) {
    return getMockApps();
  }

  const results: any[] = [];

  try {
    // Strategy 1: Keyword array overlap with AI insights
    if (intent.keywords.length > 0) {
      const { data: tagResults } = await supabaseAdmin
        .from('app_ai_insights')
        .select(`
          app_id,
          problem_tags,
          lifestyle_tags,
          one_liner_generic,
          apps (*)
        `)
        .overlaps('problem_tags', intent.keywords)
        .limit(20);

      if (tagResults) {
        results.push(...tagResults.map(t => ({
          ...t.apps,
          ai_insights: {
            problem_tags: t.problem_tags,
            lifestyle_tags: t.lifestyle_tags,
            one_liner_generic: t.one_liner_generic
          }
        })));
      }
    }

    // Strategy 2: Category match
    if (intent.categories.length > 0) {
      const { data: categoryResults } = await supabaseAdmin
        .from('apps')
        .select('*')
        .in('primary_category', intent.categories)
        .eq('is_active', true)
        .gte('rating_average', 4.0)
        .order('rating_count', { ascending: false })
        .limit(20);

      if (categoryResults) {
        results.push(...categoryResults);
      }
    }

    // Strategy 3: Full-text search
    if (intent.keywords.length > 0) {
      const searchText = intent.keywords.join(' | ');
      const { data: textResults } = await supabaseAdmin
        .from('apps')
        .select('*')
        .textSearch('full_description', searchText)
        .eq('is_active', true)
        .limit(20);

      if (textResults) {
        results.push(...textResults);
      }
    }

    // Fallback: Get some popular apps
    if (results.length === 0) {
      const { data: fallbackResults } = await supabaseAdmin
        .from('apps')
        .select('*')
        .eq('is_active', true)
        .gte('rating_average', 4.0)
        .order('rating_count', { ascending: false })
        .limit(15);

      if (fallbackResults) {
        results.push(...fallbackResults);
      }
    }

  } catch (error) {
    console.error('Database query error:', error);
  }

  // Remove duplicates by app_id
  const uniqueApps = Array.from(
    new Map(results.map(app => [app.app_id || app.id, app])).values()
  );

  return uniqueApps;
}

async function rankAndPersonalize(apps: any[], userContext: any) {
  if (apps.length === 0) return [];

  // If no Gemini API key, return apps with basic scoring
  if (!genAI) {
    return apps.map(app => ({
      ...app,
      relevance_score: 5,
      personalized_one_liner: app.ai_insights?.one_liner_generic || app.short_description || `${app.name} - ${app.primary_category}`,
      match_reason: 'Basic match'
    }));
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const results = [];

    // Process in batches of 10
    for (let i = 0; i < apps.length; i += 10) {
      const batch = apps.slice(i, i + 10);

      const prompt = `Rank these apps by relevance for the user and create personalized one-liners.

User context:
- Lifestyle: ${userContext.lifestyle?.join(', ') || 'general'}
- Goal: ${userContext.intent || 'improve life'}
- Wish: ${userContext.wishText || 'find useful apps'}

Apps:
${batch.map((app, idx) => `
${idx + 1}. ${app.name}
   Category: ${app.primary_category}
   Description: ${(app.short_description || app.full_description || '').substring(0, 200)}
   Rating: ${app.rating_average || 'N/A'}/5
`).join('\n')}

For each app, return JSON:
[
  {
    "appId": "the app_id or id",
    "relevanceScore": 1-10,
    "oneLiner": "If you [user situation], this app [benefit].",
    "reason": "why it matches"
  }
]

Return ONLY JSON array:`;

      try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);

          for (const insight of parsed) {
            const app = batch.find(a => 
              a.app_id === insight.appId || 
              a.id === insight.appId ||
              a.name === insight.appId
            );
            
            if (app) {
              results.push({
                ...app,
                relevance_score: insight.relevanceScore || 5,
                personalized_one_liner: insight.oneLiner || app.ai_insights?.one_liner_generic || app.short_description,
                match_reason: insight.reason || 'AI match'
              });
            }
          }
        }
      } catch (error) {
        console.error('LLM ranking error for batch:', error);
        // Fallback: return apps without personalization
        results.push(...batch.map(app => ({
          ...app,
          relevance_score: 5,
          personalized_one_liner: app.ai_insights?.one_liner_generic || app.short_description || `${app.name} - ${app.primary_category}`,
          match_reason: 'Fallback match'
        })));
      }
    }

    // Sort by relevance
    return results.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));

  } catch (error) {
    console.error('Personalization error:', error);
    return apps.map(app => ({
      ...app,
      relevance_score: 5,
      personalized_one_liner: app.ai_insights?.one_liner_generic || app.short_description,
      match_reason: 'Error fallback'
    }));
  }
}

async function logSearch(sessionId: string, intent: SearchIntent, results: any[]) {
  if (!supabaseAdmin) {
    console.log('📊 Mock search logged:', { sessionId, intent: intent.problemSolved, results: results.length });
    return;
  }
  
  try {
    await supabaseAdmin.from('search_logs').insert({
      session_id: sessionId,
      query_text: intent.problemSolved,
      lifestyle_context: intent.keywords,
      results_returned: results.length,
      apps_shown: results.map(r => r.id),
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Logging error:', error);
  }
}