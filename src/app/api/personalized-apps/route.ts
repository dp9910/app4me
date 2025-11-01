import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase/client';

// Default fallback interests if user has none set
const DEFAULT_INTERESTS = ['productivity', 'entertainment', 'education', 'fitness', 'games'];

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

// Function to process user interests for iTunes search
function processUserInterests(appInterests: string[]): string[] {
  if (!appInterests || appInterests.length === 0) {
    // Return random default interests
    const shuffled = DEFAULT_INTERESTS.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3); // Return 3 random interests
  }
  
  // Use user interests directly, clean them up
  return appInterests
    .map(interest => interest.trim().toLowerCase())
    .filter(interest => interest.length > 0)
    .slice(0, 5); // Limit to 5 interests to avoid too many API calls
}

// Function to fetch apps from iTunes API for a specific interest
async function fetchItunesAppsForInterest(interest: string, limit: number = 10): Promise<any[]> {
  try {
    const searchTerm = interest; // Use the interest directly as search term
    
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&country=US&entity=software&limit=${limit * 2}`; // Get more to filter
    
    console.log(`Fetching iTunes apps for interest "${interest}" with search term "${searchTerm}"`);
    
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
        id: app.trackId?.toString() || `itunes_${interest}_${index}`,
        name: app.trackName,
        artist: app.artistName,
        category: app.primaryGenreName || interest,
        icon: app.artworkUrl512 || app.artworkUrl100 || app.artworkUrl60,
        url: app.trackViewUrl,
        rating: parseFloat((app.averageUserRating || 0).toFixed(1)),
        description: app.description || `${app.trackName} by ${app.artistName}`,
        rank: index + 1,
        price: app.formattedPrice || 'Free',
        bundleId: app.bundleId,
        releaseDate: app.releaseDate,
        source: 'itunes',
        searchCategory: interest,
        version: app.version,
        ratingCount: app.userRatingCount || 0,
        fileSize: app.fileSizeBytes,
        minimumOsVersion: app.minimumOsVersion
      }));

    console.log(`Found ${transformedApps.length} apps for interest "${interest}"`);
    return transformedApps;
    
  } catch (error: any) {
    console.error(`Error fetching iTunes apps for interest "${interest}":`, error.message);
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

    // Process user interests directly
    const userInterests = processUserInterests(personalizationData.app_interests);
    console.log('Processed user interests:', userInterests);

    // Fetch apps for each user interest
    const personalizedApps: any[] = [];
    const interestResults: { [key: string]: any[] } = {};

    for (const interest of userInterests) {
      const interestApps = await fetchItunesAppsForInterest(interest, 20);
      interestResults[interest] = interestApps;
      personalizedApps.push(...interestApps);
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
      processedInterests: userInterests,
      interestResults: Object.keys(interestResults).reduce((acc, interest) => {
        acc[interest] = interestResults[interest].length;
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