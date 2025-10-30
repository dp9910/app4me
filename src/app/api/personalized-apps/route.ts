import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase/client';

// Category mappings for iTunes search terms
const CATEGORY_MAPPINGS: { [key: string]: string[] } = {
  'productivity': ['productivity', 'task management', 'todo', 'notes', 'organization'],
  'budget': ['budget', 'finance', 'expense tracker', 'money manager', 'personal finance'],
  'fitness': ['fitness', 'workout', 'exercise', 'health tracker', 'gym'],
  'gaming': ['games', 'puzzle', 'strategy', 'action', 'arcade'],
  'music': ['music', 'audio', 'streaming', 'podcast', 'radio'],
  'social': ['social media', 'messaging', 'chat', 'communication', 'networking'],
  'photo': ['photo editing', 'camera', 'photography', 'image editor', 'filters'],
  'education': ['education', 'learning', 'language', 'study', 'courses'],
  'travel': ['travel', 'maps', 'navigation', 'hotels', 'flights'],
  'shopping': ['shopping', 'ecommerce', 'deals', 'marketplace', 'retail'],
  'food': ['food', 'recipes', 'cooking', 'restaurant', 'delivery'],
  'news': ['news', 'current events', 'journalism', 'media', 'headlines'],
  'weather': ['weather', 'forecast', 'climate', 'meteorology'],
  'business': ['business', 'professional', 'enterprise', 'corporate', 'work'],
  'entertainment': ['entertainment', 'streaming', 'videos', 'comedy', 'shows'],
  'lifestyle': ['lifestyle', 'home', 'design', 'fashion', 'beauty']
};

// Helper function to get authenticated user from request
async function getAuthenticatedUser(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  console.log('Authorization header:', authorization ? 'Present' : 'Missing');
  
  if (!authorization) {
    return { user: null, error: 'No authorization header' };
  }

  const token = authorization.replace('Bearer ', '');
  console.log('Token length:', token.length);
  
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError) {
    console.error('Auth error:', authError);
    return { user: null, error: `Auth error: ${authError.message}` };
  }
  
  if (!user) {
    console.error('No user found');
    return { user: null, error: 'No user found' };
  }
  
  console.log('Authenticated user:', user.id, user.email);
  return { user, error: null };
}

// Function to extract categories from user interests
function extractCategoriesFromInterests(appInterests: string[]): string[] {
  const matchedCategories = new Set<string>();
  
  appInterests.forEach(interest => {
    const lowerInterest = interest.toLowerCase();
    
    // Check direct matches and partial matches
    Object.entries(CATEGORY_MAPPINGS).forEach(([category, keywords]) => {
      if (keywords.some(keyword => 
        lowerInterest.includes(keyword.toLowerCase()) || 
        keyword.toLowerCase().includes(lowerInterest)
      )) {
        matchedCategories.add(category);
      }
    });
  });
  
  // If no matches found, use some default categories
  if (matchedCategories.size === 0) {
    return ['productivity', 'utilities', 'lifestyle'];
  }
  
  return Array.from(matchedCategories);
}

// Function to fetch apps from iTunes API for a specific category
async function fetchItunesAppsForCategory(category: string, limit: number = 10): Promise<any[]> {
  try {
    const searchTerms = CATEGORY_MAPPINGS[category] || [category];
    const searchTerm = searchTerms[0]; // Use the primary search term
    
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&country=US&entity=software&limit=${limit * 2}`; // Get more to filter
    
    console.log(`Fetching iTunes apps for category "${category}" with search term "${searchTerm}"`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AppDiscovery/1.0',
      },
      // Cache for 30 minutes
      next: { revalidate: 1800 }
    });

    if (!response.ok) {
      throw new Error(`iTunes API responded with status: ${response.status}`);
    }

    const data = await response.json();
    const apps = data.results || [];
    
    // Transform and filter the apps
    const transformedApps = apps
      .filter((app: any) => app.trackName && app.artistName) // Filter out incomplete data
      .slice(0, limit) // Limit results
      .map((app: any, index: number) => ({
        id: app.trackId?.toString() || `itunes_${category}_${index}`,
        name: app.trackName,
        artist: app.artistName,
        category: app.primaryGenreName || category,
        icon: app.artworkUrl512 || app.artworkUrl100 || app.artworkUrl60,
        url: app.trackViewUrl,
        rating: parseFloat((app.averageUserRating || 0).toFixed(1)),
        description: app.description || `${app.trackName} by ${app.artistName}`,
        rank: index + 1,
        price: app.formattedPrice || 'Free',
        bundleId: app.bundleId,
        releaseDate: app.releaseDate,
        source: 'itunes',
        searchCategory: category,
        version: app.version,
        ratingCount: app.userRatingCount || 0,
        fileSize: app.fileSizeBytes,
        minimumOsVersion: app.minimumOsVersion
      }));

    console.log(`Found ${transformedApps.length} apps for category "${category}"`);
    return transformedApps;
    
  } catch (error: any) {
    console.error(`Error fetching iTunes apps for category "${category}":`, error.message);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user
    const { user, error: authError } = await getAuthenticatedUser(request);
    
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    // Get user personalization data
    const { data: personalizationData, error: personalError } = await supabaseAdmin
      .from('user_personalization')
      .select('app_interests, app_interests_text, nickname')
      .eq('user_id', user.id)
      .single();

    if (personalError && personalError.code !== 'PGRST116') {
      console.error('Error fetching personalization:', personalError);
      return NextResponse.json({ error: 'Failed to fetch user preferences' }, { status: 500 });
    }

    // If no personalization data, prompt user to set it
    if (!personalizationData || !personalizationData.app_interests || personalizationData.app_interests.length === 0) {
      console.log('No personalization data found for user.');
      return NextResponse.json({
        success: false,
        data: [],
        personalized: false,
        error: 'No interests found in your profile. Please set your app interests in your profile to get personalized recommendations.',
        lastUpdated: new Date().toISOString(),
        total: 0
      });
    }

    console.log('User app interests:', personalizationData.app_interests);

    // Extract categories from user interests
    const userCategories = extractCategoriesFromInterests(personalizationData.app_interests);
    console.log('Matched categories:', userCategories);

    // Fetch apps for each user category
    const personalizedApps: any[] = [];
    const categoryResults: { [key: string]: any[] } = {};

    for (const category of userCategories) {
      const categoryApps = await fetchItunesAppsForCategory(category, 20);
      categoryResults[category] = categoryApps;
      personalizedApps.push(...categoryApps);
    }

    // Shuffle and limit the results
    const shuffledApps = personalizedApps
      .sort(() => Math.random() - 0.5) // Shuffle
      .slice(0, 30); // Limit to 30 apps

    return NextResponse.json({
      success: true,
      data: shuffledApps,
      personalized: true,
      userNickname: personalizationData.nickname,
      userInterests: personalizationData.app_interests,
      matchedCategories: userCategories,
      categoryResults: Object.keys(categoryResults).reduce((acc, cat) => {
        acc[cat] = categoryResults[cat].length;
        return acc;
      }, {} as { [key: string]: number }),
      message: `Found ${shuffledApps.length} personalized app recommendations based on your interests!`,
      lastUpdated: new Date().toISOString(),
      total: shuffledApps.length
    });

  } catch (error: any) {
    console.error('Error in GET /api/personalized-apps:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch personalized apps',
      data: []
    }, { status: 500 });
  }
}